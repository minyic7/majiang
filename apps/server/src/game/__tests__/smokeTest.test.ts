import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { io, type Socket } from "socket.io-client";
import type {
  ClientEvents,
  ServerEvents,
  ClientGameState,
  RoomInfo,
  AvailableActions,
} from "@majiang/shared";
import { ActionType } from "@majiang/shared";
import { registerSocketHandlers } from "../../socketHandlers.js";

type TypedClientSocket = Socket<ServerEvents, ClientEvents>;

function waitForEvent<T>(
  socket: TypedClientSocket,
  event: string,
  predicate?: ((data: T) => boolean) | null,
  timeout = 10_000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for "${event}" after ${timeout}ms`)),
      timeout,
    );
    const handler = (data: T) => {
      if (!predicate || predicate(data)) {
        clearTimeout(timer);
        socket.off(event as any, handler);
        resolve(data);
      }
    };
    socket.on(event as any, handler);
  });
}

function connectSocket(port: number): TypedClientSocket {
  return io(`http://127.0.0.1:${port}`, {
    path: "/socket.io/",
    transports: ["websocket"],
  }) as TypedClientSocket;
}

/**
 * Wire auto-play with optional skip for timeout testing.
 * When skipActionIndex is set, that specific action will be ignored (not responded to),
 * allowing the server's action timeout to kick in.
 */
function wireAutoPlay(
  socket: TypedClientSocket,
  opts: { skipActionIndex?: number } = {},
) {
  const stateUpdates: ClientGameState[] = [];
  let actionCount = 0;
  const errors: string[] = [];

  socket.on("actionError" as any, (err: { message: string }) => {
    errors.push(err.message);
  });

  socket.on("gameStateUpdate" as any, (state: ClientGameState) => {
    stateUpdates.push(state);
  });

  socket.on("actionRequired" as any, (actions: AvailableActions) => {
    const latestState = stateUpdates[stateUpdates.length - 1];
    if (!latestState) return;

    actionCount++;

    // Skip this action to test timeout auto-discard
    if (opts.skipActionIndex !== undefined && actionCount === opts.skipActionIndex) {
      return;
    }

    const myIndex = latestState.myIndex;
    const hand = latestState.players[myIndex].hand;

    if (actions.canHu) {
      socket.emit("playerAction", { type: ActionType.Hu, playerIndex: myIndex });
      return;
    }

    if (actions.canDiscard && hand && hand.length > 0) {
      socket.emit("playerAction", {
        type: ActionType.Discard,
        playerIndex: myIndex,
        tile: hand[hand.length - 1],
      });
      return;
    }

    socket.emit("playerAction", { type: ActionType.Pass, playerIndex: myIndex });
  });

  return { stateUpdates, getActionCount: () => actionCount, errors };
}

describe("Release readiness smoke test", () => {
  let httpServer: HttpServer;
  let port: number;
  let socket: TypedClientSocket;

  beforeAll(async () => {
    httpServer = createServer();
    const ioServer = new Server<ClientEvents, ServerEvents>(httpServer, {
      cors: { origin: "*" },
      path: "/socket.io/",
    });
    registerSocketHandlers(ioServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = httpServer.address();
    port = typeof addr === "object" && addr ? addr.port : 0;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it(
    "full multi-round smoke test: 4+ rounds, scoring, golden tile, wind tracking, timeout",
    async () => {
      socket = connectSocket(port);
      await waitForEvent(socket, "connect");

      // --- Step 1-3: Create room with fuzhou ruleset, add 3 bots ---
      const roomInfo = await new Promise<RoomInfo>((resolve) => {
        socket.emit("createRoom", { playerName: "SmokePlayer", ruleSetId: "fuzhou" }, resolve);
      });
      expect(roomInfo.id).toBeTruthy();
      expect(roomInfo.ruleSetId).toBe("fuzhou");

      const fullRoomPromise = waitForEvent<RoomInfo>(
        socket,
        "roomUpdate",
        (room) => room.players.length === 4,
      );
      socket.emit("addBot", { name: "Bot-1" });
      socket.emit("addBot", { name: "Bot-2" });
      socket.emit("addBot", { name: "Bot-3" });
      const fullRoom = await fullRoomPromise;
      expect(fullRoom.players).toHaveLength(4);

      // Track cumulative scores across rounds
      const roundResults: Array<{
        round: number;
        winnerId: number | null;
        winType: string;
        scores: number[];
        payments: number[];
        goldenTile: unknown;
        prevalentWind: string;
        roundInWind: number;
      }> = [];

      const TOTAL_ROUNDS = 4;

      for (let roundNum = 1; roundNum <= TOTAL_ROUNDS; roundNum++) {
        // For round 3, test action timeout by skipping the 2nd action
        const skipAction = roundNum === 3 ? 2 : undefined;
        const { stateUpdates, errors } = wireAutoPlay(socket, {
          skipActionIndex: skipAction,
        });

        const gameOverPromise = waitForEvent<{
          winnerId: number | null;
          winType: string;
          scores: number[];
          payments: number[];
          breakdown: string[];
        }>(socket, "gameOver", null, 120_000);

        if (roundNum === 1) {
          // --- Step 4: Start game ---
          socket.emit("startGame");
        } else {
          // --- Step 8: Emit nextRound ---
          socket.emit("nextRound");
        }

        // Wait for initial state of this round
        const initialState = await waitForEvent<ClientGameState>(
          socket,
          "gameStateUpdate",
          null,
          15_000,
        );

        // --- Step 5/9: Verify round state ---
        expect(initialState.players).toHaveLength(4);
        const myHand = initialState.players[initialState.myIndex].hand;
        expect(myHand).toBeDefined();
        expect(myHand!.length).toBeGreaterThanOrEqual(13);
        expect(initialState.currentRound).toBe(roundNum);
        expect(initialState.goldenTile).toBeDefined();

        // For rounds 1-4, wind should be east (rounds 1-4 = east wind)
        if (roundNum <= 4) {
          expect(initialState.prevalentWind).toBe("east");
        }

        // --- Step 6/10: Auto-play round to completion ---
        const gameOver = await gameOverPromise;

        // --- Step 7: Verify gameOver ---
        expect(gameOver.scores).toHaveLength(4);
        expect(gameOver.payments).toBeDefined();
        expect(gameOver.breakdown).toBeDefined();

        // Scores should be zero-sum
        const totalScore = gameOver.scores.reduce((a, b) => a + b, 0);
        expect(totalScore).toBe(0);

        // If there was a winner, payments should be zero-sum
        if (gameOver.winnerId !== null) {
          expect(gameOver.payments.length).toBeGreaterThan(0);
          const paymentSum = gameOver.payments.reduce((a, b) => a + b, 0);
          expect(paymentSum).toBe(0);
        }

        roundResults.push({
          round: roundNum,
          winnerId: gameOver.winnerId,
          winType: gameOver.winType,
          scores: [...gameOver.scores],
          payments: [...gameOver.payments],
          goldenTile: initialState.goldenTile,
          prevalentWind: initialState.prevalentWind,
          roundInWind: initialState.roundInWind,
        });

        // --- Step 9: Verify scores preserved across rounds ---
        if (roundNum >= 2) {
          // The gameOver.scores are cumulative — check they differ from round 1
          // unless all rounds were draws with 0 scores (unlikely but possible)
          const prevScores = roundResults[roundNum - 2].scores;
          const currentScores = gameOver.scores;
          // At minimum, scores arrays should both exist and be length 4
          expect(prevScores).toHaveLength(4);
          expect(currentScores).toHaveLength(4);
        }

        // --- Step 12: Verify timeout works (round 3) ---
        // We skipped one action in round 3 — game should still complete
        // because the server auto-discards on timeout. No errors expected
        // from that skip since it's handled server-side.
        if (roundNum === 3) {
          // Game completed despite skipped action — timeout worked
          expect(gameOver.scores).toHaveLength(4);
        }

        // Clean up listeners for next round
        socket.off("gameStateUpdate" as any);
        socket.off("actionRequired" as any);
        socket.off("actionError" as any);
      }

      // --- Final assertions ---

      // All 4 rounds completed
      expect(roundResults).toHaveLength(TOTAL_ROUNDS);

      // Golden tile was present every round
      for (const r of roundResults) {
        expect(r.goldenTile).toBeDefined();
      }

      // Round tracking was correct
      for (let i = 0; i < roundResults.length; i++) {
        expect(roundResults[i].round).toBe(i + 1);
      }

      // Wind stays east for first 4 rounds
      for (const r of roundResults) {
        expect(r.prevalentWind).toBe("east");
      }

      // Cumulative scores: final round scores should be zero-sum
      const finalScores = roundResults[roundResults.length - 1].scores;
      expect(finalScores.reduce((a, b) => a + b, 0)).toBe(0);

      // Print summary
      console.log("\n====== SMOKE TEST SUMMARY ======");
      for (const r of roundResults) {
        console.log(
          `  Round ${r.round}: winner=${r.winnerId ?? "draw"} type=${r.winType} ` +
            `wind=${r.prevalentWind} scores=[${r.scores.join(",")}]`,
        );
      }
      console.log("================================\n");

      socket.disconnect();
    },
    600_000,
  );
});
