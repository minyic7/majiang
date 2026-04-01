import type { ReactNode } from "react";
import { WanArt } from "./WanTiles.js";
import { BingArt } from "./BingTiles.js";
import { TiaoArt } from "./TiaoTiles.js";
import { WindArt } from "./WindTiles.js";
import { DragonArt } from "./DragonTiles.js";
import { SeasonArt, PlantArt } from "./BonusTiles.js";

const WINDS = new Set(["east", "south", "west", "north"]);
const DRAGONS: Record<string, string> = { zhong: "red", fa: "green", bai: "white" };
const SEASONS = new Set(["spring", "summer", "autumn", "winter"]);
const PLANTS = new Set(["plum", "orchid", "bamboo", "chrysanthemum"]);

/**
 * Maps a tile code to its SVG artwork.
 *
 * Tile codes:
 *   Suited: "wan1"-"wan9", "bing1"-"bing9", "tiao1"-"tiao9"
 *   Winds:  "east", "south", "west", "north"
 *   Dragons: "zhong", "fa", "bai"
 *   Seasons: "spring", "summer", "autumn", "winter"
 *   Plants: "plum", "orchid", "bamboo", "chrysanthemum"
 */
export function getTileArt(code: string): ReactNode | null {
  // Suited tiles
  const suitMatch = code.match(/^(wan|bing|tiao)(\d)$/);
  if (suitMatch) {
    const value = parseInt(suitMatch[2], 10);
    switch (suitMatch[1]) {
      case "wan": return <WanArt value={value} />;
      case "bing": return <BingArt value={value} />;
      case "tiao": return <TiaoArt value={value} />;
    }
  }

  // Wind tiles
  if (WINDS.has(code)) return <WindArt type={code} />;

  // Dragon tiles
  if (code in DRAGONS) return <DragonArt type={DRAGONS[code]} />;

  // Season tiles
  if (SEASONS.has(code)) return <SeasonArt type={code} />;

  // Plant tiles
  if (PLANTS.has(code)) return <PlantArt type={code} />;

  return null;
}
