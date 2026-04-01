import { create } from "zustand";
import type { ClientGameState, AvailableActions } from "@majiang/shared";

interface GameStore {
  // Connection
  connected: boolean;
  roomId: string | null;
  myIndex: number;

  // Game state
  gameState: ClientGameState | null;
  availableActions: AvailableActions | null;

  // UI state
  selectedTileId: number | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setRoom: (roomId: string, myIndex: number) => void;
  setGameState: (state: ClientGameState) => void;
  setAvailableActions: (actions: AvailableActions | null) => void;
  selectTile: (id: number | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  connected: false,
  roomId: null,
  myIndex: 0,
  gameState: null,
  availableActions: null,
  selectedTileId: null,

  setConnected: (connected) => set({ connected }),
  setRoom: (roomId, myIndex) => set({ roomId, myIndex }),
  setGameState: (gameState) => set({ gameState }),
  setAvailableActions: (actions) => set({ availableActions: actions }),
  selectTile: (id) => set({ selectedTileId: id }),
  reset: () => set({
    connected: false,
    roomId: null,
    myIndex: 0,
    gameState: null,
    availableActions: null,
    selectedTileId: null,
  }),
}));
