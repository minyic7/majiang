import type { GameState, PlayerState } from "./game.js";
import type { AvailableActions } from "./rules.js";
import type { TileInstance } from "./tile.js";

/** Client game state — hides other players' hands */
export interface ClientGameState {
  phase: GameState["phase"];
  players: ClientPlayerState[];
  currentTurn: number;
  dealerIndex: number;
  wallRemaining: number;
  wallTailRemaining: number;
  lastDiscard: GameState["lastDiscard"];
  ruleSetId: string;
  myIndex: number;
}

export interface ClientPlayerState {
  name: string;
  handCount: number;
  hand?: TileInstance[]; // Only present for the local player
  melds: PlayerState["melds"];
  discards: TileInstance[];
  flowers: TileInstance[];
  isDealer: boolean;
  seatWind: string;
}

/** Socket.IO event types */
export interface ServerEvents {
  gameStateUpdate: (state: ClientGameState) => void;
  actionRequired: (actions: AvailableActions) => void;
  gameOver: (result: { winnerId: number | null; winType: string; scores: number[] }) => void;
  actionError: (error: { message: string; code: string }) => void;
  roomUpdate: (room: RoomInfo) => void;
  error: (msg: string) => void;
}

export interface ClientEvents {
  createRoom: (data: { playerName: string; ruleSetId: string }, cb: (room: RoomInfo) => void) => void;
  joinRoom: (data: { roomId: string; playerName: string }, cb: (room: RoomInfo | null) => void) => void;
  addBot: (data: { name: string }) => void;
  startGame: () => void;
  playerAction: (action: import("./action.js").GameAction) => void;
}

export interface RoomInfo {
  id: string;
  players: { name: string; isBot: boolean; ready: boolean }[];
  ruleSetId: string;
  started: boolean;
}
