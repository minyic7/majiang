import type { TileInstance } from "./tile.js";

export enum ActionType {
  Draw = "draw",
  Discard = "discard",
  Chi = "chi",
  Peng = "peng",
  MingGang = "ming_gang",
  AnGang = "an_gang",
  BuGang = "bu_gang",
  Hu = "hu",
  Pass = "pass",
}

export type GameAction =
  | { type: ActionType.Draw; playerIndex: number }
  | { type: ActionType.Discard; playerIndex: number; tile: TileInstance }
  | { type: ActionType.Chi; playerIndex: number; tiles: [TileInstance, TileInstance]; targetTile: TileInstance }
  | { type: ActionType.Peng; playerIndex: number; targetTile: TileInstance }
  | { type: ActionType.MingGang; playerIndex: number; targetTile: TileInstance }
  | { type: ActionType.AnGang; playerIndex: number; tile: TileInstance }
  | { type: ActionType.BuGang; playerIndex: number; tile: TileInstance }
  | { type: ActionType.Hu; playerIndex: number }
  | { type: ActionType.Pass; playerIndex: number };
