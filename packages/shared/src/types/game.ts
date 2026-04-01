import type { Tile, TileInstance } from "./tile.js";

export enum GamePhase {
  Waiting = "waiting",
  Dealing = "dealing",
  Playing = "playing",
  Finished = "finished",
  Draw = "draw",
}

export enum MeldType {
  Chi = "chi",
  Peng = "peng",
  MingGang = "ming_gang",
  AnGang = "an_gang",
  BuGang = "bu_gang",
}

export interface Meld {
  type: MeldType;
  tiles: TileInstance[];
  sourceTile?: TileInstance;
  sourcePlayer?: number;
}

export interface PlayerState {
  name: string;
  hand: TileInstance[];
  melds: Meld[];
  discards: TileInstance[];
  flowers: TileInstance[];
  isDealer: boolean;
  seatWind: "east" | "south" | "west" | "north";
}

export interface GameState {
  phase: GamePhase;
  players: PlayerState[];
  wall: TileInstance[];
  wallTail: TileInstance[];
  currentTurn: number;
  dealerIndex: number;
  lastDiscard: { tile: TileInstance; playerIndex: number } | null;
  ruleSetId: string;
  goldenTile?: Tile;
  flippedTile?: Tile;
  currentRound: number;
  prevalentWind: "east" | "south" | "west" | "north";
  roundInWind: number;
}
