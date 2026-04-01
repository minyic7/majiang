import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { getRequestListener } from "@hono/node-server";
import type { ClientEvents, ServerEvents } from "@majiang/shared";
import { getAllRuleSets } from "@majiang/shared";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/api/health", (c) => c.json({ ok: true }));
app.get("/api/rulesets", (c) => {
  const sets = getAllRuleSets();
  return c.json(sets.map((s) => ({ id: s.id, name: s.name, description: s.description })));
});

const port = Number(process.env.PORT) || 7702;

// Use getRequestListener to properly bridge Hono with Node.js http server
const httpServer = createServer(getRequestListener(app.fetch));

const io = new Server<ClientEvents, ServerEvents>(httpServer, {
  cors: { origin: "*" },
  path: "/socket.io/",
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
