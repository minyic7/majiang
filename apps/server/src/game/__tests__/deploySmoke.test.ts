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

function wireAutoPlay(socket: TypedClientSocket) {
  const stateUpdates: ClientGameState[] = [];
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

  function cleanup() {
    socket.off("gameStateUpdate" as any);
    socket.off("actionRequired" as any);
    socket.off("actionError" as any);
  }

  return { stateUpdates, errors, cleanup };
}

describe("Deployment smoke test — multi-round + reconnect", () => {
  let httpServer: HttpServer;
  let ioServer: Server<ClientEvents, ServerEvents>;
  let port: number;

  beforeAll(async () => {
    httpServer = createServer();
    ioServer = new Server<ClientEvents, ServerEvents>(httpServer, {
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
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it(
    "plays 2 complete rounds, verifies payments/scores/nextRound, then tests disconnect+reconnect",
    async () => {
      // ── Connect & create room ──
      const socket = connectSocket(port);
      await waitForEvent(socket, "connect");

      const roomInfo = await new Promise<RoomInfo>((resolve) => {
        socket.emit("createRoom", { playerName: "DeployPlayer", ruleSetId: "fuzhou" }, resolve);
      });
      expect(roomInfo.id).toBeTruthy();

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

      const roomId = roomInfo.id;

      // ── Round 1 ──
      const auto1 = wireAutoPlay(socket);

      const gameOver1Promise = waitForEvent<{
        winnerId: number | null;
        winType: string;
        scores: number[];
        payments: number[];
        breakdown: string[];
      }>(socket, "gameOver", null, 120_000);

      socket.emit("startGame");

      const initialState1 = await waitForEvent<ClientGameState>(
        socket,
        "gameStateUpdate",
        null,
        15_000,
      );
      expect(initialState1.currentRound).toBe(1);
      expect(initialState1.players).toHaveLength(4);

      const gameOver1 = await gameOver1Promise;

      // Verify round 1 result has payments and scores
      expect(gameOver1.scores).toHaveLength(4);
      expect(gameOver1.payments).toBeDefined();
      expect(gameOver1.breakdown).toBeDefined();
      const scoreSum1 = gameOver1.scores.reduce((a, b) => a + b, 0);
      expect(scoreSum1).toBe(0);
      if (gameOver1.winnerId !== null) {
        const paymentSum1 = gameOver1.payments.reduce((a, b) => a + b, 0);
        expect(paymentSum1).toBe(0);
      }

      const round1Scores = [...gameOver1.scores];
      auto1.cleanup();

      // ── Round 2 via nextRound ──
      const auto2 = wireAutoPlay(socket);

      const gameOver2Promise = waitForEvent<{
        winnerId: number | null;
        winType: string;
        scores: number[];
        payments: number[];
        breakdown: string[];
      }>(socket, "gameOver", null, 120_000);

      socket.emit("nextRound");

      const initialState2 = await waitForEvent<ClientGameState>(
        socket,
        "gameStateUpdate",
        null,
        15_000,
      );
      expect(initialState2.currentRound).toBe(2);

      const gameOver2 = await gameOver2Promise;

      // Verify round 2 result
      expect(gameOver2.scores).toHaveLength(4);
      expect(gameOver2.payments).toBeDefined();
      const scoreSum2 = gameOver2.scores.reduce((a, b) => a + b, 0);
      expect(scoreSum2).toBe(0);

      // Scores carry over: round 2 cumulative = round 1 cumulative + round 2 payments
      for (let i = 0; i < 4; i++) {
        expect(gameOver2.scores[i]).toBe(round1Scores[i] + gameOver2.payments[i]);
      }

      auto2.cleanup();

      // ── Disconnect + Reconnect test ──
      // Disconnect the human player socket
      socket.disconnect();

      // Small delay to let server process the disconnect
      await new Promise((r) => setTimeout(r, 300));

      // Reconnect with a new socket
      const socket2 = connectSocket(port);
      await waitForEvent(socket2, "connect");

      // Emit reconnect event
      const statePromise = waitForEvent<ClientGameState>(
        socket2,
        "gameStateUpdate",
        null,
        10_000,
      );
      const roomUpdatePromise = waitForEvent<RoomInfo>(
        socket2,
        "roomUpdate",
        null,
        10_000,
      );

      socket2.emit("reconnect", { roomId, playerName: "DeployPlayer" });

      // Verify reconnect sends back game state and room info
      const reconnectState = await statePromise;
      expect(reconnectState.myIndex).toBe(0);
      expect(reconnectState.players).toHaveLength(4);

      const reconnectRoom = await roomUpdatePromise;
      expect(reconnectRoom.players[0].connected).toBe(true);
      expect(reconnectRoom.players[0].name).toBe("DeployPlayer");

      socket2.disconnect();

      console.log("\n====== DEPLOY SMOKE TEST PASSED ======");
      console.log(`  Round 1 scores: [${round1Scores.join(",")}]`);
      console.log(`  Round 2 scores: [${gameOver2.scores.join(",")}]`);
      console.log("=======================================\n");
    },
    600_000,
  );
});
