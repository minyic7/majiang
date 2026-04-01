/**
 * QA Integration Test — Full 4-round Fuzhou mahjong session
 *
 * Plays 4 rounds via socket.io with auto-play bot logic and validates:
 * - gameOver has payments, breakdown, and scores after each round
 * - Scores are zero-sum after every round
 * - Golden tile was set at the start of each round
 * - After round 4, prevalent wind is still east
 *
 * Any assertion failure is a bug to report.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
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

async function setupRoom(socket: TypedClientSocket, playerName: string): Promise<RoomInfo> {
  const roomInfo = await new Promise<RoomInfo>((resolve) => {
    socket.emit("createRoom", { playerName, ruleSetId: "fuzhou" }, resolve);
  });

  const fullRoomPromise = waitForEvent<RoomInfo>(
    socket,
    "roomUpdate",
    (room) => room.players.length === 4,
  );
  socket.emit("addBot", { name: "Bot-1" });
  socket.emit("addBot", { name: "Bot-2" });
  socket.emit("addBot", { name: "Bot-3" });
  return fullRoomPromise;
}

interface GameOverPayload {
  winnerId: number | null;
  winType: string;
  scores: number[];
  payments: number[];
  breakdown: string[];
}

function wireMultiRoundAutoPlay(socket: TypedClientSocket) {
  const stateUpdates: ClientGameState[] = [];
  let gameOverResolve: ((result: GameOverPayload) => void) | null = null;

  socket.on("gameStateUpdate" as any, (state: ClientGameState) => {
    stateUpdates.push(state);
  });

  socket.on("actionRequired" as any, (actions: AvailableActions) => {
    const latestState = stateUpdates[stateUpdates.length - 1];
    if (!latestState) return;

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

  socket.on("gameOver" as any, (result: GameOverPayload) => {
    if (gameOverResolve) {
      const resolve = gameOverResolve;
      gameOverResolve = null;
      resolve(result);
    }
  });

  function waitForGameOver(timeout = 120_000): Promise<GameOverPayload> {
    return new Promise<GameOverPayload>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timeout waiting for gameOver after ${timeout}ms`)),
        timeout,
      );
      gameOverResolve = (result) => {
        clearTimeout(timer);
        resolve(result);
      };
    });
  }

  return { stateUpdates, waitForGameOver };
}

interface RoundSummary {
  round: number;
  winnerId: number | null;
  winType: string;
  scores: number[];
  payments: number[];
  breakdown: string[];
  goldenTile: string;
  prevalentWind: string;
  roundInWind: number;
}

describe("QA: Full 4-round Fuzhou mahjong session", () => {
  let httpServer: HttpServer;
  let port: number;
  const sockets: TypedClientSocket[] = [];

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

  afterEach(() => {
    for (const s of sockets) s.disconnect();
    sockets.length = 0;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it(
    "plays 4 rounds: validates gameOver payload, zero-sum scores, golden tile, and wind",
    async () => {
      const socket = connectSocket(port);
      sockets.push(socket);
      await waitForEvent(socket, "connect");
      await setupRoom(socket, "QA-Player");

      const { stateUpdates, waitForGameOver } = wireMultiRoundAutoPlay(socket);
      const roundSummaries: RoundSummary[] = [];

      // ── Round 1 ──
      const gameOver1Promise = waitForGameOver();
      socket.emit("startGame");
      await waitForEvent<ClientGameState>(socket, "gameStateUpdate", null, 10_000);

      const round1State = stateUpdates[0];
      expect(round1State.currentRound).toBe(1);
      expect(round1State.prevalentWind).toBe("east");
      expect(round1State.goldenTile).toBeDefined();
      expect(round1State.players[round1State.myIndex].hand!.length).toBeGreaterThanOrEqual(13);

      const gameOver1 = await gameOver1Promise;
      verifyGameOver(gameOver1, 1);
      roundSummaries.push(buildSummary(1, gameOver1, round1State));

      // ── Rounds 2-4 ──
      for (let round = 2; round <= 4; round++) {
        const stateCountBefore = stateUpdates.length;
        const gameOverPromise = waitForGameOver();

        socket.emit("nextRound");

        await waitForEvent<ClientGameState>(
          socket,
          "gameStateUpdate",
          (s) => s.currentRound === round,
          30_000,
        );

        const roundState = stateUpdates.find(
          (s, idx) => idx >= stateCountBefore && s.currentRound === round,
        );
        expect(roundState).toBeDefined();

        // Golden tile set for this round
        expect(roundState!.goldenTile).toBeDefined();

        // Wind is still east for rounds 1-4
        expect(roundState!.prevalentWind).toBe("east");
        expect(roundState!.roundInWind).toBe(round);

        // Fresh hand dealt
        expect(
          roundState!.players[roundState!.myIndex].hand!.length,
        ).toBeGreaterThanOrEqual(13);

        const gameOverN = await gameOverPromise;
        verifyGameOver(gameOverN, round);
        roundSummaries.push(buildSummary(round, gameOverN, roundState!));
      }

      // ── Final wind assertion: after round 4 wind is still east ──
      const lastRoundState = stateUpdates.find((s) => s.currentRound === 4);
      expect(lastRoundState).toBeDefined();
      expect(lastRoundState!.prevalentWind).toBe("east");

      // ── Log summary ──
      console.log("\n╔══════════════════════════════════════════════════╗");
      console.log("║     QA SUMMARY — 4-Round Fuzhou Mahjong Session  ║");
      console.log("╚══════════════════════════════════════════════════╝\n");

      for (const s of roundSummaries) {
        console.log(`  Round ${s.round} | Wind: ${s.prevalentWind} (${s.roundInWind})`);
        console.log(`    Winner: Player ${s.winnerId ?? "none (draw)"} — ${s.winType}`);
        console.log(`    Golden tile: ${s.goldenTile}`);
        console.log(`    Payments: [${s.payments.join(", ")}]`);
        console.log(`    Scores:   [${s.scores.join(", ")}]`);
        console.log(`    Breakdown: ${s.breakdown.join(" | ")}`);
        console.log("");
      }

      const finalScores = roundSummaries[roundSummaries.length - 1].scores;
      console.log(`  Final cumulative scores: [${finalScores.join(", ")}]`);
      console.log(`  Score sum: ${finalScores.reduce((a, b) => a + b, 0)} (expected 0)`);
      console.log(`  Total state updates: ${stateUpdates.length}`);
      console.log("");
    },
    600_000,
  );
});

// ── Helpers ──

function verifyGameOver(gameOver: GameOverPayload, round: number): void {
  // Payments present
  expect(gameOver.payments).toBeDefined();
  expect(gameOver.payments).toHaveLength(4);

  // Breakdown present
  expect(gameOver.breakdown).toBeDefined();
  expect(Array.isArray(gameOver.breakdown)).toBe(true);

  // Scores present and zero-sum
  expect(gameOver.scores).toBeDefined();
  expect(gameOver.scores).toHaveLength(4);
  const scoreSum = gameOver.scores.reduce((a, b) => a + b, 0);
  expect(scoreSum).toBe(0);
}

function buildSummary(
  round: number,
  gameOver: GameOverPayload,
  state: ClientGameState,
): RoundSummary {
  return {
    round,
    winnerId: gameOver.winnerId,
    winType: gameOver.winType,
    scores: [...gameOver.scores],
    payments: [...gameOver.payments],
    breakdown: [...gameOver.breakdown],
    goldenTile: JSON.stringify(state.goldenTile),
    prevalentWind: state.prevalentWind,
    roundInWind: state.roundInWind,
  };
}
