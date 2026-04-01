import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { getRequestListener } from "@hono/node-server";
import type { ClientEvents, ServerEvents } from "@majiang/shared";
import { getAllRuleSets, fuzhouRuleSet } from "@majiang/shared";
// Force side-effect registration of the Fuzhou ruleset
void fuzhouRuleSet;
import { roomManager } from "./game/Room.js";
import { registerSocketHandlers } from "./socketHandlers.js";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/api/health", (c) => c.json({ ok: true }));
app.get("/api/rulesets", (c) => {
  const sets = getAllRuleSets();
  return c.json(sets.map((s) => ({ id: s.id, name: s.name, description: s.description })));
});

// Room management endpoints
app.get("/api/rooms", (c) => {
  const rooms = roomManager.listRooms();
  return c.json(rooms.map((r) => r.toRoomInfo()));
});

app.post("/api/rooms", async (c) => {
  const body = await c.req.json<{ ruleSetId: string }>();
  if (!body.ruleSetId) {
    return c.json({ error: "ruleSetId is required" }, 400);
  }
  const room = roomManager.createRoom(body.ruleSetId);
  return c.json(room.toRoomInfo(), 201);
});

app.get("/api/rooms/:id", (c) => {
  const room = roomManager.getRoom(c.req.param("id"));
  if (!room) {
    return c.json({ error: "Room not found" }, 404);
  }
  return c.json(room.toRoomInfo());
});

const port = Number(process.env.PORT) || 7702;

// Use getRequestListener to properly bridge Hono with Node.js http server
const httpServer = createServer(getRequestListener(app.fetch));

const io = new Server<ClientEvents, ServerEvents>(httpServer, {
  cors: { origin: "*" },
  path: "/socket.io/",
});

registerSocketHandlers(io);

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
