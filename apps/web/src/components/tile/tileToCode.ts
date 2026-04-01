import type { Tile } from "@majiang/shared";

const DRAGON_CODES: Record<string, string> = { red: "zhong", green: "fa", white: "bai" };

/** Convert a shared Tile type to the tile code string used by getTileArt() */
export function tileToCode(tile: Tile): string {
  switch (tile.kind) {
    case "suited":
      return `${tile.suit}${tile.value}`;
    case "wind":
      return tile.windType;
    case "dragon":
      return DRAGON_CODES[tile.dragonType];
    case "season":
      return tile.seasonType;
    case "plant":
      return tile.plantType;
    default:
      return (tile as { kind: string }).kind;
  }
}
