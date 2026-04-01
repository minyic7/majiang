import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientEvents, ServerEvents } from "@majiang/shared";
import { useGameStore } from "../stores/gameStore.js";

type GameSocket = Socket<ServerEvents, ClientEvents>;

const SOCKET_URL = import.meta.env.DEV
  ? "http://localhost:7702"
  : window.location.origin;

export function useSocket() {
  const socketRef = useRef<GameSocket | null>(null);

  useEffect(() => {
    const socket: GameSocket = io(SOCKET_URL, {
      path: import.meta.env.DEV ? "/socket.io/" : "/majiang/socket.io/",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    const store = useGameStore.getState();
    store.setSocket(socket);

    socket.on("connect", () => {
      useGameStore.getState().setConnected(true);

      // Auto-reconnect to room if session info exists
      try {
        const roomId = sessionStorage.getItem("majiang_roomId");
        const playerName = sessionStorage.getItem("majiang_playerName");
        if (roomId && playerName) {
          socket.emit("reconnect", { roomId, playerName });
        }
      } catch { /* sessionStorage unavailable */ }
    });

    socket.on("disconnect", () => {
      useGameStore.getState().setConnected(false);
    });

    socket.on("gameStateUpdate", (state) => {
      useGameStore.getState().setGameState(state);
    });

    socket.on("actionRequired", (actions, timeoutMs) => {
      const store = useGameStore.getState();
      store.setAvailableActions(actions);
      store.setActionDeadline(Date.now() + timeoutMs);
    });

    socket.on("gameOver", (result) => {
      useGameStore.getState().setRoundResult(result);
    });

    socket.on("roomUpdate", (room) => {
      useGameStore.getState().setRoomInfo(room);
    });

    socket.on("actionError", (error) => {
      useGameStore.getState().setErrorMessage(error.message);
    });

    socket.on("error", (msg) => {
      useGameStore.getState().setErrorMessage(msg);
    });

    socket.on("chatMessage", ({ sender, text }) => {
      useGameStore.getState().addChatMessage({ sender, text });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      useGameStore.getState().setSocket(null);
    };
  }, []);

  return socketRef;
}
