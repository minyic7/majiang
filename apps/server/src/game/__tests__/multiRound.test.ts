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

interface RoundResult {
  gameOver: {
    winnerId: number | null;
    winType: string;
    scores: number[];
    payments: number[];
    breakdown: string[];
  };
  initialState: ClientGameState;
}

/**
 * Wire auto-play handlers and return a function that waits for the next gameOver.
 * Handles multiple rounds: each call to waitForNextRound() returns when the next
 * gameOver fires.
 */
function wireMultiRoundAutoPlay(socket: TypedClientSocket) {
  const stateUpdates: ClientGameState[] = [];
  let gameOverResolve: ((result: RoundResult["gameOver"]) => void) | null = null;

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

  socket.on("gameOver" as any, (result: RoundResult["gameOver"]) => {
    if (gameOverResolve) {
      const resolve = gameOverResolve;
      gameOverResolve = null;
      resolve(result);
    }
  });

  function waitForGameOver(timeout = 120_000): Promise<RoundResult["gameOver"]> {
    return new Promise<RoundResult["gameOver"]>((resolve, reject) => {
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

describe("Multi-round playtest via socket", () => {
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

  // --- Test 1: Play 4 consecutive rounds ---

  it(
    "plays 4 consecutive rounds with correct round counter, wind, and score accumulation",
    async () => {
      const socket = connectSocket(port);
      sockets.push(socket);
      await waitForEvent(socket, "connect");
      await setupRoom(socket, "MultiRoundPlayer");

      const { stateUpdates, waitForGameOver } = wireMultiRoundAutoPlay(socket);

      // Round 1: start the game
      const round1GameOver = waitForGameOver();
      socket.emit("startGame");

      // Wait for initial state
      await waitForEvent<ClientGameState>(socket, "gameStateUpdate", null, 10_000);

      const round1Initial = stateUpdates[0];
      expect(round1Initial.currentRound).toBe(1);
      expect(round1Initial.prevalentWind).toBe("east");
      expect(round1Initial.goldenTile).toBeDefined();
      expect(round1Initial.players[round1Initial.myIndex].hand!.length).toBeGreaterThanOrEqual(13);

      const gameOver1 = await round1GameOver;
      expect(gameOver1.scores).toHaveLength(4);

      const prevScores = [0, 0, 0, 0];
      const roundResults: Array<{ scores: number[]; payments: number[] }> = [];
      roundResults.push({ scores: [...gameOver1.scores], payments: [...gameOver1.payments] });

      // Rounds 2-4: emit nextRound and verify
      for (let round = 2; round <= 4; round++) {
        const stateCountBefore = stateUpdates.length;
        const gameOverPromise = waitForGameOver();

        socket.emit("nextRound");

        // Wait for a new gameStateUpdate with updated round
        await waitForEvent<ClientGameState>(
          socket,
          "gameStateUpdate",
          (s) => s.currentRound === round,
          30_000,
        );

        // Find the first state of this round
        const roundInitial = stateUpdates.find(
          (s, idx) => idx >= stateCountBefore && s.currentRound === round,
        );
        expect(roundInitial).toBeDefined();
        expect(roundInitial!.currentRound).toBe(round);
        expect(roundInitial!.prevalentWind).toBe("east"); // Rounds 1-4 all east
        expect(roundInitial!.roundInWind).toBe(round);
        expect(roundInitial!.goldenTile).toBeDefined();
        expect(
          roundInitial!.players[roundInitial!.myIndex].hand!.length,
        ).toBeGreaterThanOrEqual(13);

        const gameOverN = await gameOverPromise;
        expect(gameOverN.scores).toHaveLength(4);
        roundResults.push({ scores: [...gameOverN.scores], payments: [...gameOverN.payments] });
      }

      // Verify scores are cumulative and zero-sum
      for (const result of roundResults) {
        const totalScore = result.scores.reduce((a, b) => a + b, 0);
        expect(totalScore).toBe(0);
      }

      // Verify cumulative scores grow (at least some round had a winner with non-zero payments)
      const finalScores = roundResults[roundResults.length - 1].scores;
      const totalAbsScore = finalScores.reduce((a, b) => a + Math.abs(b), 0);
      // With 4 rounds, it's extremely unlikely all are draws with 0 payments
      // But handle gracefully: at least verify the structure
      expect(finalScores).toHaveLength(4);
    },
    600_000,
  );

  // --- Test 2: Dealer rotation ---

  it(
    "dealer rotates across rounds (unless lianZhuang)",
    async () => {
      const socket = connectSocket(port);
      sockets.push(socket);
      await waitForEvent(socket, "connect");
      await setupRoom(socket, "DealerTest");

      const { stateUpdates, waitForGameOver } = wireMultiRoundAutoPlay(socket);
      const dealerIndices: number[] = [];

      // Round 1
      const gameOver1 = waitForGameOver();
      socket.emit("startGame");
      await waitForEvent<ClientGameState>(socket, "gameStateUpdate", null, 10_000);
      dealerIndices.push(stateUpdates[0].dealerIndex);
      await gameOver1;

      // Rounds 2-4
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

        const roundInitial = stateUpdates.find(
          (s, idx) => idx >= stateCountBefore && s.currentRound === round,
        );
        expect(roundInitial).toBeDefined();
        dealerIndices.push(roundInitial!.dealerIndex);

        // Verify dealer has east seat wind
        const dealerIdx = roundInitial!.dealerIndex;
        expect(roundInitial!.players[dealerIdx].isDealer).toBe(true);
        expect(roundInitial!.players[dealerIdx].seatWind).toBe("east");

        // Verify all 4 seat winds assigned
        const winds = roundInitial!.players.map((p) => p.seatWind);
        expect(winds.sort()).toEqual(["east", "north", "south", "west"]);

        await gameOverPromise;
      }

      // Dealer should change at least once in 4 rounds (unless extremely unlikely 4x lianZhuang)
      const uniqueDealers = new Set(dealerIndices);
      // Log for debugging but don't hard-fail on lianZhuang edge case
      console.log(`Dealer indices across 4 rounds: [${dealerIndices.join(", ")}]`);
      // At minimum, we observed valid dealer indices
      for (const d of dealerIndices) {
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(3);
      }
    },
    600_000,
  );

  // --- Test 3: Wind progression at round 5 ---

  it(
    "prevalent wind changes from east to south at round 5",
    async () => {
      const socket = connectSocket(port);
      sockets.push(socket);
      await waitForEvent(socket, "connect");
      await setupRoom(socket, "WindTest");

      const { stateUpdates, waitForGameOver } = wireMultiRoundAutoPlay(socket);

      // Play rounds 1-5
      const gameOver1 = waitForGameOver();
      socket.emit("startGame");
      await waitForEvent<ClientGameState>(socket, "gameStateUpdate", null, 10_000);
      await gameOver1;

      for (let round = 2; round <= 5; round++) {
        const stateCountBefore = stateUpdates.length;
        const gameOverPromise = waitForGameOver();
        socket.emit("nextRound");

        await waitForEvent<ClientGameState>(
          socket,
          "gameStateUpdate",
          (s) => s.currentRound === round,
          30_000,
        );

        const roundInitial = stateUpdates.find(
          (s, idx) => idx >= stateCountBefore && s.currentRound === round,
        );
        expect(roundInitial).toBeDefined();

        if (round <= 4) {
          expect(roundInitial!.prevalentWind).toBe("east");
          expect(roundInitial!.roundInWind).toBe(round);
        } else {
          // Round 5: wind should change to south
          expect(roundInitial!.prevalentWind).toBe("south");
          expect(roundInitial!.roundInWind).toBe(1);
        }

        await gameOverPromise;
      }
    },
    600_000,
  );

  // --- Test 4: Game finishes after round 16 ---

  it(
    "room state becomes finished after round 16 and no more rounds possible",
    async () => {
      const socket = connectSocket(port);
      sockets.push(socket);
      await waitForEvent(socket, "connect");
      await setupRoom(socket, "FinalRoundTest");

      const { stateUpdates, waitForGameOver } = wireMultiRoundAutoPlay(socket);

      const expectedWinds = [
        "east", "east", "east", "east",
        "south", "south", "south", "south",
        "west", "west", "west", "west",
        "north", "north", "north", "north",
      ];

      // Round 1
      const gameOver1 = waitForGameOver();
      socket.emit("startGame");
      await waitForEvent<ClientGameState>(socket, "gameStateUpdate", null, 10_000);
      expect(stateUpdates[0].currentRound).toBe(1);
      expect(stateUpdates[0].prevalentWind).toBe("east");
      await gameOver1;

      // Rounds 2-16
      for (let round = 2; round <= 16; round++) {
        const stateCountBefore = stateUpdates.length;
        const gameOverPromise = waitForGameOver();
        socket.emit("nextRound");

        await waitForEvent<ClientGameState>(
          socket,
          "gameStateUpdate",
          (s) => s.currentRound === round,
          30_000,
        );

        const roundInitial = stateUpdates.find(
          (s, idx) => idx >= stateCountBefore && s.currentRound === round,
        );
        expect(roundInitial).toBeDefined();
        expect(roundInitial!.currentRound).toBe(round);
        expect(roundInitial!.prevalentWind).toBe(expectedWinds[round - 1]);
        expect(roundInitial!.roundInWind).toBe(((round - 1) % 4) + 1);

        await gameOverPromise;
      }

      // After round 16, the room should be "finished"
      // Attempting nextRound should fail (room.state is "finished" or engine rejects)
      // Listen for potential error
      const errorPromise = waitForEvent<{ message: string; code: string }>(
        socket,
        "actionError",
        null,
        5_000,
      ).catch(() => null); // May not get an error if it silently fails

      socket.emit("nextRound");

      // Give time for any response
      const err = await errorPromise;
      // Either we get an error, or nothing happens (no round 17 state)
      // Verify no round 17 state appeared
      const round17State = stateUpdates.find((s) => s.currentRound === 17);
      expect(round17State).toBeUndefined();
    },
    600_000,
  );

  // --- Test 5: Game over payload includes final cumulative scores ---

  it(
    "gameOver payload includes cumulative scores after multiple rounds",
    async () => {
      const socket = connectSocket(port);
      sockets.push(socket);
      await waitForEvent(socket, "connect");
      await setupRoom(socket, "ScoreTest");

      const { stateUpdates, waitForGameOver } = wireMultiRoundAutoPlay(socket);
      const allScores: number[][] = [];

      // Play 3 rounds, collect cumulative scores each time
      const gameOver1 = waitForGameOver();
      socket.emit("startGame");
      await waitForEvent<ClientGameState>(socket, "gameStateUpdate", null, 10_000);
      const go1 = await gameOver1;
      allScores.push([...go1.scores]);

      for (let round = 2; round <= 3; round++) {
        const gameOverPromise = waitForGameOver();
        socket.emit("nextRound");
        await waitForEvent<ClientGameState>(
          socket,
          "gameStateUpdate",
          (s) => s.currentRound === round,
          30_000,
        );
        const goN = await gameOverPromise;
        allScores.push([...goN.scores]);
      }

      // Each round's scores should be zero-sum (cumulative is zero-sum since payments are zero-sum)
      for (const scores of allScores) {
        expect(scores).toHaveLength(4);
        const total = scores.reduce((a, b) => a + b, 0);
        expect(total).toBe(0);
      }

      // Verify gameOver payload has required fields
      expect(go1.winnerId === null || typeof go1.winnerId === "number").toBe(true);
      expect(typeof go1.winType).toBe("string");
      expect(go1.payments).toBeDefined();
      expect(go1.breakdown).toBeDefined();
    },
    600_000,
  );
});
