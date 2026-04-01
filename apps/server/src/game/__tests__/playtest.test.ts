import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { io, type Socket } from "socket.io-client";
import { Hono } from "hono";
import { getRequestListener } from "@hono/node-server";
import type {
  ClientEvents,
  ServerEvents,
  ClientGameState,
  RoomInfo,
  AvailableActions,
} from "@majiang/shared";
import { ActionType, getAllRuleSets } from "@majiang/shared";
import { roomManager } from "../Room.js";
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

// --- Game statistics tracking ---
interface GameStats {
  gameNumber: number;
  winnerId: number | null;
  winType: string;
  scores: number[];
  payments: number[];
  breakdown: string[];
  totalTurns: number;
  errors: string[];
  initialHandSize: number;
  hadGoldenTile: boolean;
  hadFlowers: boolean;
}

describe("Full Fuzhou playtest", () => {
  let httpServer: HttpServer;
  let baseUrl: string;
  const allGameStats: GameStats[] = [];

  beforeAll(async () => {
    // Set up Hono app with REST routes (mirrors index.ts)
    const app = new Hono();
    app.get("/api/health", (c) => c.json({ ok: true }));
    app.get("/api/rulesets", (c) => {
      const sets = getAllRuleSets();
      return c.json(sets.map((s) => ({ id: s.id, name: s.name, description: s.description })));
    });
    app.get("/api/rooms", (c) => {
      const rooms = roomManager.listRooms();
      return c.json(rooms.map((r) => r.toRoomInfo()));
    });
    app.post("/api/rooms", async (c) => {
      const body = await c.req.json<{ ruleSetId: string }>();
      if (!body.ruleSetId) return c.json({ error: "ruleSetId is required" }, 400);
      const room = roomManager.createRoom(body.ruleSetId);
      return c.json(room.toRoomInfo(), 201);
    });
    app.get("/api/rooms/:id", (c) => {
      const room = roomManager.getRoom(c.req.param("id"));
      if (!room) return c.json({ error: "Room not found" }, 404);
      return c.json(room.toRoomInfo());
    });

    httpServer = createServer(getRequestListener(app.fetch));
    const ioServer = new Server<ClientEvents, ServerEvents>(httpServer, {
      cors: { origin: "*" },
      path: "/socket.io/",
    });
    registerSocketHandlers(ioServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = httpServer.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));

    // --- Print summary report ---
    const wins = allGameStats.filter((g) => g.winnerId !== null);
    const draws = allGameStats.filter((g) => g.winType === "draw");
    const allErrors = allGameStats.flatMap((g) => g.errors);
    const avgTurns =
      allGameStats.length > 0
        ? Math.round(allGameStats.reduce((s, g) => s + g.totalTurns, 0) / allGameStats.length)
        : 0;

    console.log("\n====== PLAYTEST SUMMARY ======");
    console.log(`Games played: ${allGameStats.length}`);
    console.log(`Wins: ${wins.length} (players: ${wins.map((g) => g.winnerId).join(", ")})`);
    console.log(`Draws: ${draws.length}`);
    console.log(`Errors encountered: ${allErrors.length > 0 ? allErrors.join("; ") : "none"}`);
    console.log(`Average game length: ${avgTurns} turns`);
    for (const g of allGameStats) {
      console.log(
        `  Game ${g.gameNumber}: winner=${g.winnerId ?? "draw"} type=${g.winType} ` +
          `scores=[${g.scores.join(",")}] turns=${g.totalTurns} ` +
          `payments=[${g.payments.join(",")}] breakdown=[${g.breakdown.join("; ")}]`,
      );
    }
    console.log("==============================\n");
  });

  // --- REST endpoint tests ---
  describe("REST endpoints", () => {
    it("GET /api/rulesets returns fuzhou", async () => {
      const res = await fetch(`${baseUrl}/api/rulesets`);
      expect(res.status).toBe(200);
      const data: { id: string; name: string; description: string }[] = await res.json();
      expect(Array.isArray(data)).toBe(true);
      const fuzhou = data.find((r) => r.id === "fuzhou");
      expect(fuzhou).toBeDefined();
      expect(fuzhou!.name).toBeTruthy();
    });

    it("GET /api/rooms returns array", async () => {
      const res = await fetch(`${baseUrl}/api/rooms`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("POST /api/rooms creates room and GET /api/rooms/:id returns it", async () => {
      const createRes = await fetch(`${baseUrl}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleSetId: "fuzhou" }),
      });
      expect(createRes.status).toBe(201);
      const room: RoomInfo = await createRes.json();
      expect(room.id).toBeTruthy();
      expect(room.ruleSetId).toBe("fuzhou");

      const getRes = await fetch(`${baseUrl}/api/rooms/${room.id}`);
      expect(getRes.status).toBe(200);
      const fetched: RoomInfo = await getRes.json();
      expect(fetched.id).toBe(room.id);
    });
  });

  // --- Full game tests (run 3 games) ---
  for (let gameNum = 1; gameNum <= 3; gameNum++) {
    it(
      `game ${gameNum}: full Fuzhou game completes with valid gameOver payload`,
      async () => {
        const stats: GameStats = {
          gameNumber: gameNum,
          winnerId: null,
          winType: "",
          scores: [],
          payments: [],
          breakdown: [],
          totalTurns: 0,
          errors: [],
          initialHandSize: 0,
          hadGoldenTile: false,
          hadFlowers: false,
        };

        const socket: TypedClientSocket = io(baseUrl, {
          path: "/socket.io/",
          transports: ["websocket"],
        }) as TypedClientSocket;

        try {
          await waitForEvent(socket, "connect");

          // Create room
          const roomInfo = await new Promise<RoomInfo>((resolve) => {
            socket.emit(
              "createRoom",
              { playerName: `Player-G${gameNum}`, ruleSetId: "fuzhou" },
              resolve,
            );
          });
          expect(roomInfo.id).toBeTruthy();
          expect(roomInfo.ruleSetId).toBe("fuzhou");

          // Add 3 bots
          const fullRoomPromise = waitForEvent<RoomInfo>(
            socket,
            "roomUpdate",
            (room) => room.players.length === 4,
          );
          socket.emit("addBot", { name: `Bot-${gameNum}-1` });
          socket.emit("addBot", { name: `Bot-${gameNum}-2` });
          socket.emit("addBot", { name: `Bot-${gameNum}-3` });
          const fullRoom = await fullRoomPromise;
          expect(fullRoom.players).toHaveLength(4);

          // Track events
          const stateUpdates: ClientGameState[] = [];
          let actionCount = 0;

          // Listen for errors
          socket.on("actionError" as any, (err: { message: string }) => {
            stats.errors.push(err.message);
          });

          socket.on("gameStateUpdate" as any, (state: ClientGameState) => {
            stateUpdates.push(state);
          });

          // Auto-respond to actions
          socket.on("actionRequired" as any, (actions: AvailableActions) => {
            const latestState = stateUpdates[stateUpdates.length - 1];
            if (!latestState) return;

            const myIndex = latestState.myIndex;
            const hand = latestState.players[myIndex].hand;
            actionCount++;

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

            // For response actions, just pass
            socket.emit("playerAction", { type: ActionType.Pass, playerIndex: myIndex });
          });

          // Start game and wait for gameOver
          const gameOverPromise = waitForEvent<{
            winnerId: number | null;
            winType: string;
            scores: number[];
            payments: number[];
            breakdown: string[];
          }>(socket, "gameOver", null, 120_000);

          socket.emit("startGame");

          // Wait for initial state
          const initialState = await waitForEvent<ClientGameState>(
            socket,
            "gameStateUpdate",
            null,
            10_000,
          );

          // Verify initial deal
          const myHand = initialState.players[initialState.myIndex].hand;
          stats.initialHandSize = myHand ? myHand.length : 0;
          // Hand should be 13 tiles (or 14 if dealer draws first)
          expect(stats.initialHandSize).toBeGreaterThanOrEqual(13);

          // Verify golden tile
          stats.hadGoldenTile = initialState.goldenTile != null;
          expect(initialState.goldenTile).toBeDefined();
          expect(initialState.flippedTile).toBeDefined();

          // Check for flowers
          stats.hadFlowers = initialState.players.some(
            (p) => p.flowers && p.flowers.length > 0,
          );

          // Verify 4 players
          expect(initialState.players).toHaveLength(4);

          // Wait for game over
          const gameOver = await gameOverPromise;

          // Populate stats
          stats.winnerId = gameOver.winnerId;
          stats.winType = gameOver.winType;
          stats.scores = gameOver.scores;
          stats.payments = gameOver.payments ?? [];
          stats.breakdown = gameOver.breakdown ?? [];
          stats.totalTurns = actionCount;

          // Verify gameOver payload
          expect(gameOver.scores).toHaveLength(4);

          // Verify payments and breakdown exist
          expect(gameOver.payments).toBeDefined();
          expect(gameOver.breakdown).toBeDefined();

          if (gameOver.winnerId !== null) {
            // Win: payments should be non-empty
            expect(gameOver.payments.length).toBeGreaterThan(0);
            // Payments should be zero-sum
            const paymentSum = gameOver.payments.reduce((a, b) => a + b, 0);
            expect(paymentSum).toBe(0);
          }

          // Scores should be zero-sum
          const totalScore = gameOver.scores.reduce((a, b) => a + b, 0);
          expect(totalScore).toBe(0);

          allGameStats.push(stats);
        } finally {
          socket.disconnect();
        }
      },
      120_000,
    );
  }
});
