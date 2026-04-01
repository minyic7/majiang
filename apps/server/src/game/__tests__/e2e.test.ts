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
// Importing @majiang/shared triggers side-effect registration of the "fuzhou" ruleset
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

describe("E2E game flow", () => {
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
    socket?.disconnect();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it(
    "complete game flow: create room → add bots → start → play → game over",
    async () => {
      // 1. Connect
      socket = io(`http://127.0.0.1:${port}`, {
        path: "/socket.io/",
        transports: ["websocket"],
      }) as TypedClientSocket;

      await waitForEvent(socket, "connect");

      // 2. Create room
      const roomInfo = await new Promise<RoomInfo>((resolve) => {
        socket.emit("createRoom", { playerName: "TestPlayer", ruleSetId: "fuzhou" }, resolve);
      });
      expect(roomInfo.id).toBeTruthy();
      expect(roomInfo.players).toHaveLength(1);
      expect(roomInfo.ruleSetId).toBe("fuzhou");

      // 3. Add 3 bots and wait for room to be full
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

      // Track state updates and action round-trips
      const stateUpdates: ClientGameState[] = [];
      let actionRoundTrips = 0;

      // Auto-respond to every actionRequired: respond immediately to keep the
      // game moving. Without this the engine waits ACTION_TIMEOUT_MS (15 s).
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
          actionRoundTrips++;
          return;
        }

        if (actions.canDiscard && hand && hand.length > 0) {
          socket.emit("playerAction", {
            type: ActionType.Discard,
            playerIndex: myIndex,
            tile: hand[hand.length - 1],
          });
          actionRoundTrips++;
          return;
        }

        // For response actions (after someone else discards), just pass
        socket.emit("playerAction", { type: ActionType.Pass, playerIndex: myIndex });
        actionRoundTrips++;
      });

      // 4. Start game
      const gameOverPromise = waitForEvent<{
        winnerId: number | null;
        winType: string;
        scores: number[];
      }>(socket, "gameOver", null, 60_000);

      socket.emit("startGame");

      // 5. Wait for at least one gameStateUpdate
      await waitForEvent<ClientGameState>(socket, "gameStateUpdate", null, 10_000);
      expect(stateUpdates.length).toBeGreaterThanOrEqual(1);

      const gameState = stateUpdates[0];
      expect(gameState.phase).toBeDefined();
      expect(gameState.myIndex).toBe(0);
      expect(gameState.players).toHaveLength(4);

      // 6. Verify golden tile (Fuzhou ruleset feature)
      expect(gameState.goldenTile).toBeDefined();
      expect(gameState.flippedTile).toBeDefined();

      // 7. Wait for game to complete (bots play automatically, human auto-responds)
      const gameOver = await gameOverPromise;
      expect(gameOver.scores).toHaveLength(4);

      // 8. Verify at least one action round-trip occurred
      expect(stateUpdates.length).toBeGreaterThanOrEqual(2);
    },
    90_000,
  );
});
