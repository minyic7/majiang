// ─── Base tile types (common to all mahjong variants) ───

export enum Suit {
  Wan = "wan",   // 万
  Bing = "bing", // 饼
  Tiao = "tiao", // 条
}

export interface SuitedTile {
  kind: "suited";
  suit: Suit;
  value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

export interface WindTile {
  kind: "wind";
  windType: "east" | "south" | "west" | "north";
}

export interface DragonTile {
  kind: "dragon";
  dragonType: "red" | "green" | "white";
}

export interface SeasonTile {
  kind: "season";
  seasonType: "spring" | "summer" | "autumn" | "winter";
}

export interface PlantTile {
  kind: "plant";
  plantType: "plum" | "orchid" | "bamboo" | "chrysanthemum";
}

export type HonorTile = WindTile | DragonTile;
export type BonusTile = SeasonTile | PlantTile;
export type Tile = SuitedTile | HonorTile | BonusTile;

/** A tile instance with unique ID (multiple copies of same tile exist) */
export interface TileInstance {
  id: number;
  tile: Tile;
}

export function isSuitedTile(tile: Tile): tile is SuitedTile {
  return tile.kind === "suited";
}

export function isHonorTile(tile: Tile): tile is HonorTile {
  return tile.kind === "wind" || tile.kind === "dragon";
}

export function isBonusTile(tile: Tile): tile is BonusTile {
  return tile.kind === "season" || tile.kind === "plant";
}
