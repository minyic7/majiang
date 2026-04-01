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

/** Connect a typed socket to the test server. */
function connectSocket(port: number): TypedClientSocket {
  return io(`http://127.0.0.1:${port}`, {
    path: "/socket.io/",
    transports: ["websocket"],
  }) as TypedClientSocket;
}

/** Create a room, add 3 bots, return the full room info. */
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

/**
 * Wire auto-play: hu if possible, discard last tile if canDiscard, pass otherwise.
 * Returns arrays to track state updates and action count.
 */
function wireAutoPlay(socket: TypedClientSocket) {
  const stateUpdates: ClientGameState[] = [];
  let actionCount = 0;

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
      actionCount++;
      return;
    }

    if (actions.canDiscard && hand && hand.length > 0) {
      socket.emit("playerAction", {
        type: ActionType.Discard,
        playerIndex: myIndex,
        tile: hand[hand.length - 1],
      });
      actionCount++;
      return;
    }

    socket.emit("playerAction", { type: ActionType.Pass, playerIndex: myIndex });
    actionCount++;
  });

  return { stateUpdates, getActionCount: () => actionCount };
}

/** Play a full game to completion. Returns gameOver payload and tracked state. */
async function playGameToCompletion(socket: TypedClientSocket) {
  const { stateUpdates, getActionCount } = wireAutoPlay(socket);

  const gameOverPromise = waitForEvent<{
    winnerId: number | null;
    winType: string;
    scores: number[];
    payments: number[];
    breakdown: string[];
  }>(socket, "gameOver", null, 60_000);

  socket.emit("startGame");

  await waitForEvent<ClientGameState>(socket, "gameStateUpdate", null, 10_000);

  const gameOver = await gameOverPromise;
  return { gameOver, stateUpdates, getActionCount };
}

describe("Lobby → Game-Over integration flow", () => {
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

  // ---------- Test 1: Complete Single Game Flow ----------

  it(
    "complete single game: lobby → room → play → game over",
    async () => {
      const socket = connectSocket(port);
      sockets.push(socket);
      await waitForEvent(socket, "connect");

      // Create room and verify
      const roomInfo = await new Promise<RoomInfo>((resolve) => {
        socket.emit("createRoom", { playerName: "Player1", ruleSetId: "fuzhou" }, resolve);
      });
      expect(roomInfo.id).toBeTruthy();
      expect(roomInfo.players).toHaveLength(1);
      expect(roomInfo.ruleSetId).toBe("fuzhou");

      // Add 3 bots and verify full room
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

      // Wire auto-play and start
      const { stateUpdates, getActionCount } = wireAutoPlay(socket);

      const gameOverPromise = waitForEvent<{
        winnerId: number | null;
        winType: string;
        scores: number[];
        payments: number[];
        breakdown: string[];
      }>(socket, "gameOver", null, 60_000);

      socket.emit("startGame");

      // Verify initial state
      await waitForEvent<ClientGameState>(socket, "gameStateUpdate", null, 10_000);
      const initialState = stateUpdates[0];
      expect(initialState.players).toHaveLength(4);
      expect(initialState.myIndex).toBe(0);
      expect(initialState.goldenTile).toBeDefined();
      const myHand = initialState.players[initialState.myIndex].hand;
      expect(myHand).toBeDefined();
      expect(myHand!.length).toBeGreaterThanOrEqual(13);

      // Wait for game over
      const gameOver = await gameOverPromise;
      expect(gameOver.scores).toHaveLength(4);
      expect(gameOver.payments).toHaveLength(4);
      expect(gameOver.breakdown).toBeDefined();
      expect(stateUpdates.length).toBeGreaterThanOrEqual(2);
      expect(getActionCount()).toBeGreaterThanOrEqual(1);
    },
    90_000,
  );

  // ---------- Test 2: Two Consecutive Games (Room Reuse) ----------

  it(
    "two consecutive games without state leakage",
    async () => {
      // --- Game 1 ---
      let socket = connectSocket(port);
      sockets.push(socket);
      await waitForEvent(socket, "connect");
      await setupRoom(socket, "Player1");

      const game1 = await playGameToCompletion(socket);
      expect(game1.gameOver.scores).toHaveLength(4);
      const game1StateCount = game1.stateUpdates.length;

      // Disconnect after first game
      socket.disconnect();
      sockets.length = 0;

      // --- Game 2 ---
      socket = connectSocket(port);
      sockets.push(socket);
      await waitForEvent(socket, "connect");
      await setupRoom(socket, "Player1");

      const game2 = await playGameToCompletion(socket);
      expect(game2.gameOver.scores).toHaveLength(4);

      // Verify no state leakage: game 2 tracked its own updates starting fresh
      expect(game2.stateUpdates.length).toBeGreaterThanOrEqual(2);
      // The first state of game 2 should have fresh wall count (not leftover from game 1)
      const game2Initial = game2.stateUpdates[0];
      expect(game2Initial.players).toHaveLength(4);
      expect(game2Initial.myIndex).toBe(0);
      // Wall should be near-full at start (varies by ruleset but should not be near 0)
      expect(game2Initial.wallRemaining).toBeGreaterThan(10);
    },
    180_000,
  );

  // ---------- Test 3: Error Handling ----------

  describe("error handling", () => {
    it("rejects startGame with < 4 players", async () => {
      const socket = connectSocket(port);
      sockets.push(socket);
      await waitForEvent(socket, "connect");

      await new Promise<RoomInfo>((resolve) => {
        socket.emit("createRoom", { playerName: "Solo", ruleSetId: "fuzhou" }, resolve);
      });

      // Only 1 player — starting should produce actionError
      const errorPromise = waitForEvent<{ message: string; code: string }>(
        socket,
        "actionError",
        null,
        5_000,
      );
      socket.emit("startGame");
      const err = await errorPromise;
      expect(err.code).toBe("CANNOT_START");
      expect(err.message).toContain("4 players");
    });

    it("rejects playerAction when no game is in progress", async () => {
      const socket = connectSocket(port);
      sockets.push(socket);
      await waitForEvent(socket, "connect");

      await new Promise<RoomInfo>((resolve) => {
        socket.emit("createRoom", { playerName: "Solo", ruleSetId: "fuzhou" }, resolve);
      });

      const errorPromise = waitForEvent<{ message: string; code: string }>(
        socket,
        "actionError",
        null,
        5_000,
      );
      socket.emit("playerAction", { type: ActionType.Discard, playerIndex: 0 } as any);
      const err = await errorPromise;
      expect(err.code).toBe("NO_GAME");
    });

    it("returns null when joining nonexistent room", async () => {
      const socket = connectSocket(port);
      sockets.push(socket);
      await waitForEvent(socket, "connect");

      const result = await new Promise<RoomInfo | null>((resolve) => {
        socket.emit("joinRoom", { roomId: "nonexistent-room", playerName: "Ghost" }, resolve);
      });
      expect(result).toBeNull();
    });
  });

  // ---------- Test 4: Action Verification ----------

  it(
    "action round-trip: discard appears in player discards",
    async () => {
      const socket = connectSocket(port);
      sockets.push(socket);
      await waitForEvent(socket, "connect");
      await setupRoom(socket, "ActionPlayer");

      const stateUpdates: ClientGameState[] = [];
      let discardedTileId: string | undefined;
      let discardVerified = false;

      socket.on("gameStateUpdate" as any, (state: ClientGameState) => {
        stateUpdates.push(state);

        // After we discard, check that the tile shows up in our discards
        if (discardedTileId && !discardVerified) {
          const myDiscards = state.players[state.myIndex].discards;
          if (myDiscards.some((t: { id: string }) => t.id === discardedTileId)) {
            discardVerified = true;
          }
        }
      });

      let firstActionSeen = false;
      const actionFieldsChecked = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("No actionRequired received")), 30_000);

        socket.on("actionRequired" as any, (actions: AvailableActions) => {
          const latestState = stateUpdates[stateUpdates.length - 1];
          if (!latestState) return;
          const myIndex = latestState.myIndex;
          const hand = latestState.players[myIndex].hand;

          // Verify actionRequired fields on first action
          if (!firstActionSeen) {
            firstActionSeen = true;
            clearTimeout(timer);
            // Check that expected boolean fields exist
            expect(typeof actions.canDiscard).toBe("boolean");
            expect(typeof actions.canHu).toBe("boolean");
            expect(typeof actions.canPass).toBe("boolean");
            resolve();
          }

          // If it's our turn to discard, track which tile we discard
          if (actions.canDiscard && hand && hand.length > 0) {
            const tile = hand[hand.length - 1];
            if (!discardedTileId) {
              discardedTileId = tile.id;
            }
            socket.emit("playerAction", {
              type: ActionType.Discard,
              playerIndex: myIndex,
              tile,
            });
            return;
          }

          if (actions.canHu) {
            socket.emit("playerAction", { type: ActionType.Hu, playerIndex: myIndex });
            return;
          }

          socket.emit("playerAction", { type: ActionType.Pass, playerIndex: myIndex });
        });
      });

      const gameOverPromise = waitForEvent<{
        winnerId: number | null;
        winType: string;
        scores: number[];
      }>(socket, "gameOver", null, 60_000);

      socket.emit("startGame");

      // Verify actionRequired fields
      await actionFieldsChecked;

      // Wait for first state that shows canDiscard was true after draw
      await waitForEvent<ClientGameState>(
        socket,
        "gameStateUpdate",
        (state) => {
          const hand = state.players[state.myIndex].hand;
          // After drawing, hand length is 14 (13 + drawn tile)
          return !!(hand && hand.length > 13);
        },
        30_000,
      );

      // Wait for game to finish
      await gameOverPromise;

      // Verify the discard round-trip: our tile appeared in discards
      expect(discardedTileId).toBeDefined();
      expect(discardVerified).toBe(true);
    },
    90_000,
  );
});
