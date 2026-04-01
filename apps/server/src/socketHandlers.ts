import type { Server, Socket } from "socket.io";
import type { ClientEvents, ServerEvents, GameAction } from "@majiang/shared";
import type { GameEngineCallbacks } from "./game/GameEngine.js";
import { roomManager } from "./game/Room.js";
import type { Room } from "./game/Room.js";

/** Track which socket belongs to which room and player seat */
const socketToRoom = new Map<string, { roomId: string; playerIndex: number }>();

export function registerSocketHandlers(
  io: Server<ClientEvents, ServerEvents>
): void {
  io.on("connection", (socket: Socket<ClientEvents, ServerEvents>) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("createRoom", ({ playerName, ruleSetId }, cb) => {
      try {
        const room = roomManager.createRoom(ruleSetId);
        const added = room.addPlayer(playerName, socket.id);
        if (!added) {
          socket.emit("actionError", { message: "Failed to join room", code: "JOIN_FAILED" });
          return;
        }
        socket.join(room.id);
        const playerIndex = room.players.length - 1;
        socketToRoom.set(socket.id, { roomId: room.id, playerIndex });
        const roomInfo = room.toRoomInfo();
        cb(roomInfo);
        socket.emit("roomUpdate", roomInfo);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        socket.emit("actionError", { message, code: "CREATE_ROOM_ERROR" });
      }
    });

    socket.on("joinRoom", ({ roomId, playerName }, cb) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) {
          cb(null);
          return;
        }
        const added = room.addPlayer(playerName, socket.id);
        if (!added) {
          socket.emit("actionError", { message: "Room is full or game already started", code: "JOIN_FAILED" });
          cb(null);
          return;
        }
        socket.join(roomId);
        const playerIndex = room.players.length - 1;
        socketToRoom.set(socket.id, { roomId, playerIndex });
        const roomInfo = room.toRoomInfo();
        cb(roomInfo);
        io.to(roomId).emit("roomUpdate", roomInfo);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        socket.emit("actionError", { message, code: "JOIN_ROOM_ERROR" });
        cb(null);
      }
    });

    socket.on("addBot", ({ name }) => {
      try {
        const mapping = socketToRoom.get(socket.id);
        if (!mapping) {
          socket.emit("actionError", { message: "Not in a room", code: "NOT_IN_ROOM" });
          return;
        }
        const room = roomManager.getRoom(mapping.roomId);
        if (!room) {
          socket.emit("actionError", { message: "Room not found", code: "ROOM_NOT_FOUND" });
          return;
        }
        const added = room.addBot(name);
        if (!added) {
          socket.emit("actionError", { message: "Cannot add bot", code: "ADD_BOT_FAILED" });
          return;
        }
        io.to(room.id).emit("roomUpdate", room.toRoomInfo());
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        socket.emit("actionError", { message, code: "ADD_BOT_ERROR" });
      }
    });

    socket.on("startGame", () => {
      try {
        const mapping = socketToRoom.get(socket.id);
        if (!mapping) {
          socket.emit("actionError", { message: "Not in a room", code: "NOT_IN_ROOM" });
          return;
        }
        const room = roomManager.getRoom(mapping.roomId);
        if (!room) {
          socket.emit("actionError", { message: "Room not found", code: "ROOM_NOT_FOUND" });
          return;
        }
        if (!room.canStart()) {
          socket.emit("actionError", { message: "Cannot start: need exactly 4 players", code: "CANNOT_START" });
          return;
        }

        const callbacks = buildCallbacks(io, room);
        const engine = room.start(callbacks);

        // Run game loop asynchronously — don't await
        engine.startGame().catch((err) => {
          const message = err instanceof Error ? err.message : "Game error";
          io.to(room.id).emit("error", message);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        socket.emit("actionError", { message, code: "START_GAME_ERROR" });
      }
    });

    socket.on("playerAction", (action: GameAction) => {
      try {
        const mapping = socketToRoom.get(socket.id);
        if (!mapping) {
          socket.emit("actionError", { message: "Not in a room", code: "NOT_IN_ROOM" });
          return;
        }
        const room = roomManager.getRoom(mapping.roomId);
        if (!room || !room.engine) {
          socket.emit("actionError", { message: "Game not in progress", code: "NO_GAME" });
          return;
        }
        room.engine.submitAction(mapping.playerIndex, action);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        socket.emit("actionError", { message, code: "ACTION_ERROR" });
      }
    });

    socket.on("nextRound", () => {
      console.log(`nextRound requested by ${socket.id} — not yet implemented`);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      const mapping = socketToRoom.get(socket.id);
      if (!mapping) return;

      const room = roomManager.getRoom(mapping.roomId);
      socketToRoom.delete(socket.id);

      if (!room) return;

      if (room.state === "waiting") {
        room.removePlayer(socket.id);
        io.to(room.id).emit("roomUpdate", room.toRoomInfo());
      } else if (room.state === "playing") {
        // Mark player as disconnected (clear socketId so bot logic can take over)
        const player = room.players[mapping.playerIndex];
        if (player) {
          player.socketId = undefined;
        }
        io.to(room.id).emit("roomUpdate", room.toRoomInfo());
      }
    });
  });
}

function buildCallbacks(
  io: Server<ClientEvents, ServerEvents>,
  room: Room
): GameEngineCallbacks {
  return {
    onStateUpdate: (playerIndex, state) => {
      const player = room.players[playerIndex];
      if (player?.socketId) {
        io.to(player.socketId).emit("gameStateUpdate", state);
      }
    },
    onActionRequired: (playerIndex, actions) => {
      const player = room.players[playerIndex];
      if (player?.socketId) {
        io.to(player.socketId).emit("actionRequired", actions);
      }
    },
    onGameOver: (result) => {
      io.to(room.id).emit("gameOver", result);
      room.state = "finished";
    },
  };
}
