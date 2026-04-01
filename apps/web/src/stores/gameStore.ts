import { create } from "zustand";
import type {
  ClientGameState,
  AvailableActions,
  RoomInfo,
  GameAction,
} from "@majiang/shared";
import type { Socket } from "socket.io-client";
import type { ClientEvents, ServerEvents } from "@majiang/shared";

type GameSocket = Socket<ServerEvents, ClientEvents>;

interface GameStore {
  // Connection
  connected: boolean;
  roomId: string | null;
  myIndex: number;

  // Room & player
  roomInfo: RoomInfo | null;
  playerName: string;
  errorMessage: string | null;

  // Game state
  gameState: ClientGameState | null;
  availableActions: AvailableActions | null;

  // UI state
  selectedTileId: number | null;

  // Socket ref (not serializable, but fine for zustand)
  socket: GameSocket | null;

  // Actions — state setters
  setConnected: (connected: boolean) => void;
  setRoom: (roomId: string, myIndex: number) => void;
  setGameState: (state: ClientGameState) => void;
  setAvailableActions: (actions: AvailableActions | null) => void;
  setRoomInfo: (room: RoomInfo) => void;
  setErrorMessage: (msg: string | null) => void;
  setPlayerName: (name: string) => void;
  selectTile: (id: number | null) => void;
  setSocket: (socket: GameSocket | null) => void;

  // Actions — socket emitters
  createRoom: (playerName: string, ruleSetId: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  addBot: (name: string) => void;
  startGame: () => void;
  submitAction: (action: GameAction) => void;

  reset: () => void;
}

const initialState = {
  connected: false,
  roomId: null,
  myIndex: 0,
  roomInfo: null,
  playerName: "",
  errorMessage: null,
  gameState: null,
  availableActions: null,
  selectedTileId: null,
  socket: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setConnected: (connected) => set({ connected }),
  setRoom: (roomId, myIndex) => set({ roomId, myIndex }),
  setGameState: (gameState) => set({ gameState }),
  setAvailableActions: (actions) => set({ availableActions: actions }),
  setRoomInfo: (room) => set({ roomInfo: room }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  setPlayerName: (name) => set({ playerName: name }),
  selectTile: (id) => set({ selectedTileId: id }),
  setSocket: (socket) => set({ socket }),

  createRoom: (playerName, ruleSetId) => {
    const { socket } = get();
    if (!socket) return;
    set({ playerName });
    socket.emit("createRoom", { playerName, ruleSetId }, (room) => {
      set({ roomInfo: room, roomId: room.id });
    });
  },

  joinRoom: (roomId, playerName) => {
    const { socket } = get();
    if (!socket) return;
    set({ playerName });
    socket.emit("joinRoom", { roomId, playerName }, (room) => {
      if (room) {
        set({ roomInfo: room, roomId: room.id });
      } else {
        set({ errorMessage: "Failed to join room" });
      }
    });
  },

  addBot: (name) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit("addBot", { name });
  },

  startGame: () => {
    const { socket } = get();
    if (!socket) return;
    socket.emit("startGame");
  },

  submitAction: (action) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit("playerAction", action);
    set({ availableActions: null });
  },

  reset: () => set({ ...initialState }),
}));
