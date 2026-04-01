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
  const store = useGameStore();

  useEffect(() => {
    const socket: GameSocket = io(SOCKET_URL, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      store.setConnected(true);
    });

    socket.on("disconnect", () => {
      store.setConnected(false);
    });

    socket.on("gameStateUpdate", (state) => {
      store.setGameState(state);
    });

    socket.on("actionRequired", (actions) => {
      store.setAvailableActions(actions);
    });

    socket.on("gameOver", (result) => {
      // Handle game over — could be a modal or state update
      console.log("Game over:", result);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return socketRef;
}
