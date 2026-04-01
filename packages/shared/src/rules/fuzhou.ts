import type { Tile, TileInstance, SuitedTile } from "../types/tile.js";
import { Suit, isSuitedTile, isBonusTile as isBonusTileGuard } from "../types/tile.js";
import type { PlayerState, Meld } from "../types/game.js";
import { MeldType } from "../types/game.js";
import type {
  RuleSet,
  WinContext,
  WinResult,
  ScoreContext,
  ScoreResult,
  ActionContext,
  AvailableActions,
  DealerContext,
  DealerResult,
} from "../types/rules.js";
import type { RuleSetUIConfig, TrackerSection } from "../types/ui.js";
import { registerRuleSet } from "./registry.js";

// ─── Tile Identity Helpers ───

/** Check if two tiles are the same type (ignoring instance id) */
export function sameTile(a: Tile, b: Tile): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "suited":
      return (b as SuitedTile).suit === a.suit && (b as SuitedTile).value === a.value;
    case "wind":
      return b.kind === "wind" && b.windType === a.windType;
    case "dragon":
      return b.kind === "dragon" && b.dragonType === a.dragonType;
    case "season":
      return b.kind === "season" && b.seasonType === a.seasonType;
    case "plant":
      return b.kind === "plant" && b.plantType === a.plantType;
  }
}

/** Get a string key for tile identity */
export function tileKey(tile: Tile): string {
  switch (tile.kind) {
    case "suited":
      return `${tile.suit}_${tile.value}`;
    case "wind":
      return `wind_${tile.windType}`;
    case "dragon":
      return `dragon_${tile.dragonType}`;
    case "season":
      return `season_${tile.seasonType}`;
    case "plant":
      return `plant_${tile.plantType}`;
  }
}

// ─── Golden Tile (金牌) ───

const WIND_ORDER: Array<"east" | "south" | "west" | "north"> = ["east", "south", "west", "north"];
const DRAGON_ORDER: Array<"red" | "green" | "white"> = ["red", "green", "white"];

/**
 * Given the flipped indicator tile, determine the golden tile (next in sequence).
 * Suited: wraps 9→1 within same suit.
 * Winds: east→south→west→north→east.
 * Dragons: red→green→white→red.
 */
export function determineGoldenTile(flippedTile: Tile): Tile {
  switch (flippedTile.kind) {
    case "suited": {
      const nextVal = (flippedTile.value % 9) + 1;
      return { kind: "suited", suit: flippedTile.suit, value: nextVal as SuitedTile["value"] };
    }
    case "wind": {
      const idx = WIND_ORDER.indexOf(flippedTile.windType);
      return { kind: "wind", windType: WIND_ORDER[(idx + 1) % 4] };
    }
    case "dragon": {
      const idx = DRAGON_ORDER.indexOf(flippedTile.dragonType);
      return { kind: "dragon", dragonType: DRAGON_ORDER[(idx + 1) % 3] };
    }
    case "season":
    case "plant":
      // Bonus tiles shouldn't be the indicator — but handle gracefully by returning as-is
      return flippedTile;
  }
}

/** Count how many golden tiles are in a set of tile instances */
function countGoldenTiles(tiles: TileInstance[], goldenTile: Tile | null): number {
  if (!goldenTile) return 0;
  const gKey = tileKey(goldenTile);
  return tiles.filter((t) => tileKey(t.tile) === gKey).length;
}

// ─── Count Helpers ───

function countTilesByKey(tiles: TileInstance[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tiles) {
    const key = tileKey(t.tile);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** All unique non-bonus tile keys in the game (34 tile types) */
const ALL_TILE_KEYS: string[] = (() => {
  const keys: string[] = [];
  for (const suit of [Suit.Wan, Suit.Bing, Suit.Tiao]) {
    for (let v = 1; v <= 9; v++) keys.push(`${suit}_${v}`);
  }
  for (const w of WIND_ORDER) keys.push(`wind_${w}`);
  for (const d of DRAGON_ORDER) keys.push(`dragon_${d}`);
  return keys;
})();

// ─── Win Detection with Wildcard Support ───

/**
 * Check if counts can form `remaining` melds (backtracking).
 * `wildcards` = number of golden tiles available as wildcards.
 */
function canFormMelds(
  counts: Map<string, number>,
  sortedKeys: string[],
  remaining: number,
  wildcards: number,
): boolean {
  if (remaining === 0) {
    // All remaining counts must be coverable by wildcards
    let leftover = 0;
    for (const v of counts.values()) {
      if (v > 0) leftover += v;
    }
    return leftover === 0;
  }

  // Find first key with count > 0
  let firstKey: string | null = null;
  for (const key of sortedKeys) {
    if ((counts.get(key) ?? 0) > 0) {
      firstKey = key;
      break;
    }
  }

  if (!firstKey) {
    // No real tiles left — need wildcards to form remaining melds
    // Each meld needs 3 wildcards
    return wildcards >= remaining * 3;
  }

  const count = counts.get(firstKey)!;

  // Try triplet (with wildcard fill)
  {
    const need = 3 - Math.min(count, 3);
    if (need <= wildcards) {
      const used = Math.min(count, 3);
      counts.set(firstKey, count - used);
      if (canFormMelds(counts, sortedKeys, remaining - 1, wildcards - need)) {
        counts.set(firstKey, count);
        return true;
      }
      counts.set(firstKey, count);
    }
  }

  // Try sequence (suited tiles only, with wildcard fill)
  // Parse suit and value from key
  const parts = firstKey.split("_");
  const isSuited = parts[0] === "wan" || parts[0] === "bing" || parts[0] === "tiao";
  if (isSuited) {
    const suit = parts[0];
    const val = parseInt(parts[1], 10);
    if (val <= 7) {
      const key2 = `${suit}_${val + 1}`;
      const key3 = `${suit}_${val + 2}`;
      const c1 = count;
      const c2 = counts.get(key2) ?? 0;
      const c3 = counts.get(key3) ?? 0;

      // How many wildcards needed to fill missing tiles
      const need = (c1 >= 1 ? 0 : 1) + (c2 >= 1 ? 0 : 1) + (c3 >= 1 ? 0 : 1);
      if (need <= wildcards) {
        const u1 = c1 >= 1 ? 1 : 0;
        const u2 = c2 >= 1 ? 1 : 0;
        const u3 = c3 >= 1 ? 1 : 0;
        counts.set(firstKey, c1 - u1);
        counts.set(key2, c2 - u2);
        counts.set(key3, c3 - u3);
        if (canFormMelds(counts, sortedKeys, remaining - 1, wildcards - need)) {
          counts.set(firstKey, c1);
          counts.set(key2, c2);
          counts.set(key3, c3);
          return true;
        }
        counts.set(firstKey, c1);
        counts.set(key2, c2);
        counts.set(key3, c3);
      }
    }
  }

  // Use a wildcard to consume this tile as part of other formations
  // Skip this tile entirely by using wildcards to "absorb" it into meld patterns tried above
  // If we can't form melds with this tile, try using wildcards to bypass
  if (wildcards > 0 && count === 1) {
    // Use 2 wildcards + this tile as a triplet
    if (wildcards >= 2) {
      counts.set(firstKey, 0);
      if (canFormMelds(counts, sortedKeys, remaining - 1, wildcards - 2)) {
        counts.set(firstKey, count);
        return true;
      }
      counts.set(firstKey, count);
    }
  }

  return false;
}

/**
 * Check if tiles can form N melds + 1 pair, with wildcard support.
 */
function canFormMeldsPlusPair(
  tiles: TileInstance[],
  remaining: number,
  wildcards: number,
): boolean {
  const counts = countTilesByKey(tiles);
  const sortedKeys = [...new Set(tiles.map((t) => tileKey(t.tile)))].sort();

  // Try each tile type as the pair
  const triedPair = new Set<string>();
  for (const t of tiles) {
    const key = tileKey(t.tile);
    if (triedPair.has(key)) continue;
    triedPair.add(key);
    const c = counts.get(key)!;

    if (c >= 2) {
      // Use 2 real tiles as pair
      counts.set(key, c - 2);
      if (canFormMelds(counts, sortedKeys, remaining, wildcards)) {
        counts.set(key, c);
        return true;
      }
      counts.set(key, c);
    }

    if (c >= 1 && wildcards >= 1) {
      // Use 1 real tile + 1 wildcard as pair
      counts.set(key, c - 1);
      if (canFormMelds(counts, sortedKeys, remaining, wildcards - 1)) {
        counts.set(key, c);
        return true;
      }
      counts.set(key, c);
    }
  }

  // Pair entirely from wildcards
  if (wildcards >= 2) {
    if (canFormMelds(counts, sortedKeys, remaining, wildcards - 2)) {
      return true;
    }
  }

  return false;
}

/**
 * Check standard win with wildcard support.
 * `handTiles` should be NON-GOLD tiles only; `wildcards` = number of gold tiles.
 * Total tiles = handTiles.length + wildcards.
 */
function isStandardWin(handTiles: TileInstance[], meldCount: number, wildcards: number): boolean {
  const totalMelds = 4;
  const remaining = totalMelds - meldCount;
  if (handTiles.length + wildcards !== remaining * 3 + 2) return false;
  return canFormMeldsPlusPair(handTiles, remaining, wildcards);
}

/**
 * Check seven pairs with wildcard support.
 * `handTiles` = non-gold tiles; `wildcards` = gold count.
 */
function isSevenPairs(handTiles: TileInstance[], meldCount: number, wildcards: number): boolean {
  if (meldCount !== 0 || handTiles.length + wildcards !== 14) return false;
  const counts = countTilesByKey(handTiles);
  let singlesNeeded = 0;
  for (const c of counts.values()) {
    singlesNeeded += c % 2;
  }
  // Each unpaired tile needs 1 wildcard; remaining wildcards form pairs of 2
  const remainingWC = wildcards - singlesNeeded;
  if (remainingWC < 0 || remainingWC % 2 !== 0) return false;
  return counts.size + remainingWC / 2 === 7;
}

const TERMINAL_HONOR_KEYS = [
  "wan_1", "wan_9", "bing_1", "bing_9", "tiao_1", "tiao_9",
  "wind_east", "wind_south", "wind_west", "wind_north",
  "dragon_red", "dragon_green", "dragon_white",
];

/**
 * Check thirteen orphans with wildcard support.
 * `handTiles` = non-gold tiles; `wildcards` = gold count.
 */
function isThirteenOrphans(handTiles: TileInstance[], meldCount: number, wildcards: number): boolean {
  if (meldCount !== 0 || handTiles.length + wildcards !== 14) return false;
  const counts = countTilesByKey(handTiles);
  let missing = 0;
  let hasDuplicate = false;
  for (const key of TERMINAL_HONOR_KEYS) {
    const c = counts.get(key) ?? 0;
    if (c === 0) missing++;
    if (c >= 2) hasDuplicate = true;
  }
  // Need wildcards to fill missing types, and still need one duplicate somewhere
  if (missing > wildcards) return false;
  // If no natural duplicate, need 1 extra wildcard for the 14th tile (the pair)
  if (!hasDuplicate) return missing + 1 <= wildcards;
  return true;
}

/** Check if a hand is "plain" — all sequences (no triplets) in hand tiles, plus pair */
function isPlainWin(handTiles: TileInstance[], melds: Meld[]): boolean {
  // All exposed melds must be chi (sequences)
  for (const meld of melds) {
    if (meld.type !== MeldType.Chi) return false;
  }
  // Check that the hand can be decomposed into only sequences + 1 pair (no triplets)
  return canDecomposeSequencesOnly(handTiles, 4 - melds.length);
}

/** Decompose hand into only sequences + 1 pair (no triplets allowed) */
function canDecomposeSequencesOnly(tiles: TileInstance[], remaining: number): boolean {
  const counts = countTilesByKey(tiles);
  const sortedKeys = [...new Set(tiles.map((t) => tileKey(t.tile)))].sort();

  const triedPair = new Set<string>();
  for (const t of tiles) {
    const key = tileKey(t.tile);
    if (triedPair.has(key)) continue;
    triedPair.add(key);
    const c = counts.get(key)!;
    if (c >= 2) {
      counts.set(key, c - 2);
      if (formSequencesOnly(counts, sortedKeys, remaining)) {
        counts.set(key, c);
        return true;
      }
      counts.set(key, c);
    }
  }
  return false;
}

function formSequencesOnly(counts: Map<string, number>, sortedKeys: string[], remaining: number): boolean {
  if (remaining === 0) {
    for (const v of counts.values()) {
      if (v > 0) return false;
    }
    return true;
  }

  let firstKey: string | null = null;
  for (const key of sortedKeys) {
    if ((counts.get(key) ?? 0) > 0) {
      firstKey = key;
      break;
    }
  }
  if (!firstKey) return false;

  // Only try sequences (no triplets)
  const parts = firstKey.split("_");
  const isSuited = parts[0] === "wan" || parts[0] === "bing" || parts[0] === "tiao";
  if (!isSuited) return false; // honor tiles can't form sequences

  const suit = parts[0];
  const val = parseInt(parts[1], 10);
  if (val > 7) return false;

  const key2 = `${suit}_${val + 1}`;
  const key3 = `${suit}_${val + 2}`;
  const c1 = counts.get(firstKey)!;
  const c2 = counts.get(key2) ?? 0;
  const c3 = counts.get(key3) ?? 0;
  if (c1 >= 1 && c2 >= 1 && c3 >= 1) {
    counts.set(firstKey, c1 - 1);
    counts.set(key2, c2 - 1);
    counts.set(key3, c3 - 1);
    if (formSequencesOnly(counts, sortedKeys, remaining - 1)) {
      counts.set(firstKey, c1);
      counts.set(key2, c2);
      counts.set(key3, c3);
      return true;
    }
    counts.set(firstKey, c1);
    counts.set(key2, c2);
    counts.set(key3, c3);
  }
  return false;
}

// ─── Flower / Kong Scoring ───

/** Count flower points: flowers + kong equivalents */
function countFlowerPoints(player: PlayerState): number {
  let points = 0;

  // Actual flowers
  const flowers = player.flowers;
  const seasonCount = flowers.filter((f) => f.tile.kind === "season").length;
  const plantCount = flowers.filter((f) => f.tile.kind === "plant").length;

  // Complete set bonus: 4 of a category = 6 instead of 4
  points += seasonCount === 4 ? 6 : seasonCount;
  points += plantCount === 4 ? 6 : plantCount;

  // Kong equivalents
  for (const meld of player.melds) {
    if (meld.type === MeldType.MingGang || meld.type === MeldType.BuGang) {
      points += 1;
    } else if (meld.type === MeldType.AnGang) {
      points += 2;
    }
  }

  return points;
}

// ─── Golden Tile Win Type Detection ───

interface GoldenWinInfo {
  goldCount: number;
  isGoldenSparrow: boolean; // pair is 2 golden tiles
  isGoldenDragon: boolean;  // triplet of 3 golden tiles
  isThreeGoldsFall: boolean; // 3+ golds in hand (instant win)
}

function analyzeGoldenTiles(
  player: PlayerState,
  winningTile: TileInstance,
  goldenTile: Tile | null,
): GoldenWinInfo {
  if (!goldenTile) {
    return { goldCount: 0, isGoldenSparrow: false, isGoldenDragon: false, isThreeGoldsFall: false };
  }

  const gKey = tileKey(goldenTile);
  const allHand = [...player.hand, winningTile];
  const goldCount = allHand.filter((t) => tileKey(t.tile) === gKey).length;

  return {
    goldCount,
    isGoldenSparrow: goldCount >= 2, // pair of golds used as eyes
    isGoldenDragon: goldCount >= 3,  // triplet of golds (acts as a meld)
    isThreeGoldsFall: goldCount >= 3, // instant win with 3 golds
  };
}

// ─── RuleSet Implementation ───

export const fuzhouRuleSet: RuleSet = {
  id: "fuzhou",
  name: "福州麻将",
  description: "Fuzhou-style Mahjong with 144 tiles, golden tile wildcards, and flower scoring",

  initialHandSize: 13,
  hasBonusTiles: true,

  createTilePool(): Tile[] {
    const tiles: Tile[] = [];

    // Suited tiles: 3 suits x 9 values x 4 copies = 108
    for (const suit of [Suit.Wan, Suit.Bing, Suit.Tiao]) {
      for (let value = 1; value <= 9; value++) {
        for (let copy = 0; copy < 4; copy++) {
          tiles.push({ kind: "suited", suit, value: value as SuitedTile["value"] });
        }
      }
    }

    // Wind tiles: 4 types x 4 copies = 16
    for (const windType of ["east", "south", "west", "north"] as const) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({ kind: "wind", windType });
      }
    }

    // Dragon tiles: 3 types x 4 copies = 12
    for (const dragonType of ["red", "green", "white"] as const) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({ kind: "dragon", dragonType });
      }
    }

    // Season tiles: 4 x 1 copy = 4
    for (const seasonType of ["spring", "summer", "autumn", "winter"] as const) {
      tiles.push({ kind: "season", seasonType });
    }

    // Plant tiles: 4 x 1 copy = 4
    for (const plantType of ["plum", "orchid", "bamboo", "chrysanthemum"] as const) {
      tiles.push({ kind: "plant", plantType });
    }

    return tiles;
  },

  isBonusTile(tile: Tile): boolean {
    return isBonusTileGuard(tile);
  },

  checkWin(player: PlayerState, winningTile: TileInstance, context: WinContext): WinResult {
    const goldenTile = (context.extra?.goldenTile as Tile) ?? null;
    const allHandTiles = [...player.hand, winningTile];
    const meldCount = player.melds.length;

    // Count golden tiles used as wildcards
    const gKey = goldenTile ? tileKey(goldenTile) : null;
    let wildcards = 0;
    const nonGoldTiles: TileInstance[] = [];
    for (const t of allHandTiles) {
      if (gKey && tileKey(t.tile) === gKey) {
        wildcards++;
      } else {
        nonGoldTiles.push(t);
      }
    }

    const goldInfo = analyzeGoldenTiles(player, winningTile, goldenTile);

    // 三金倒 (Three Golds Fall): 3+ golden tiles = instant win
    if (goldInfo.isThreeGoldsFall) {
      return {
        isWin: true,
        winType: "three_golds_fall",
        multiplier: 40,
        description: "三金倒",
      };
    }

    // 抢金 (Robbing the Gold): first action + winning tile is golden
    if (
      context.isFirstAction &&
      goldenTile &&
      sameTile(winningTile.tile, goldenTile)
    ) {
      // Check if hand was already tenpai (the remaining hand forms a valid win)
      const handWithoutGold = player.hand;
      // With the golden tile as the winning tile, check if the rest of hand is winning
      // For 抢金, the player was already waiting and the gold completed their hand
      const handWildcards = goldenTile
        ? handWithoutGold.filter((t) => tileKey(t.tile) === gKey!).length
        : 0;
      const handNonGold = handWithoutGold.filter((t) => gKey ? tileKey(t.tile) !== gKey : true);

      if (
        isStandardWin(nonGoldTiles, meldCount, wildcards) ||
        isSevenPairs(nonGoldTiles, meldCount, wildcards) ||
        isThirteenOrphans(nonGoldTiles, meldCount, wildcards)
      ) {
        return {
          isWin: true,
          winType: "rob_gold",
          multiplier: 30,
          description: "抢金",
        };
      }
    }

    // Check thirteen orphans (with wildcard support)
    if (isThirteenOrphans(nonGoldTiles, meldCount, wildcards)) {
      return {
        isWin: true,
        winType: "thirteen_orphans",
        multiplier: 8,
        description: "十三幺",
      };
    }

    // Check seven pairs (with wildcard support)
    if (isSevenPairs(nonGoldTiles, meldCount, wildcards)) {
      return {
        isWin: true,
        winType: "seven_pairs",
        multiplier: 2,
        description: "七对",
      };
    }

    // Check standard win (with wildcard support)
    if (isStandardWin(nonGoldTiles, meldCount, wildcards)) {
      // Determine golden tile bonus win types
      // 金龙: 3 golden tiles used as triplet (already handled by three_golds_fall above for 3+)
      // 金雀: 2 golden tiles used as the pair (eyes)
      if (goldInfo.goldCount >= 3) {
        // This shouldn't happen since three_golds_fall catches 3+ above,
        // but keep for completeness
        return {
          isWin: true,
          winType: "golden_dragon",
          multiplier: 120,
          description: "金龙",
        };
      }

      if (goldInfo.goldCount === 2) {
        // Check if the 2 golds are used as the pair
        // Try forming melds with non-gold tiles only; if possible, golds are the pair
        const remainingMelds = 4 - meldCount;
        if (canFormMeldsPlusPairGoldenSparrow(nonGoldTiles, remainingMelds)) {
          return {
            isWin: true,
            winType: "golden_sparrow",
            multiplier: 60,
            description: "金雀",
          };
        }
      }

      // Check 平胡无花 / 平胡一花
      const flowerPoints = countFlowerPoints(player) + goldInfo.goldCount;
      const hasKongs = player.melds.some(
        (m) => m.type === MeldType.MingGang || m.type === MeldType.BuGang || m.type === MeldType.AnGang,
      );

      if (isPlainWin(nonGoldTiles, player.melds) && wildcards === 0) {
        if (!hasKongs && flowerPoints === 0) {
          return {
            isWin: true,
            winType: "plain_no_flowers",
            multiplier: 30,
            description: "平胡无花无杠",
          };
        }
        if (flowerPoints === 1) {
          return {
            isWin: true,
            winType: "plain_one_flower",
            multiplier: 15,
            description: "平胡一花",
          };
        }
      }

      return {
        isWin: true,
        winType: "standard",
        multiplier: 1,
        description: "平胡",
      };
    }

    return { isWin: false };
  },

  calculateScore(
    winner: PlayerState,
    winnerIndex: number,
    winResult: WinResult,
    context: ScoreContext,
  ): ScoreResult {
    const payments = [0, 0, 0, 0];
    const breakdown: string[] = [];
    const lianZhuang = (context.extra?.lianZhuangCount as number) ?? 0;
    const dealerIndex = (context.extra?.dealerIndex as number) ?? 0;
    const goldenTile = (context.extra?.goldenTile as Tile) ?? null;

    // Count flower points
    const flowerPts = countFlowerPoints(winner);
    const goldCount = goldenTile
      ? countGoldenTiles([...winner.hand, ...(context.extra?.winningTile ? [context.extra.winningTile as TileInstance] : [])], goldenTile)
      : 0;

    // Special hand bonus (only the highest applies)
    let specialBonus = 0;
    const winType = winResult.winType ?? "standard";
    switch (winType) {
      case "golden_dragon":
        specialBonus = 120;
        break;
      case "golden_sparrow":
        specialBonus = 60;
        break;
      case "three_golds_fall":
        specialBonus = 40;
        break;
      case "rob_gold":
        specialBonus = 30;
        break;
      case "plain_no_flowers":
        specialBonus = 30;
        break;
      case "thirteen_orphans":
        specialBonus = 30;
        break;
      case "plain_one_flower":
        specialBonus = 15;
        break;
      case "seven_pairs":
        specialBonus = 10;
        break;
    }

    // Base formula: (花番 + 金 + 连庄 + 5) * multiplier + special
    const base = flowerPts + goldCount + lianZhuang + 5;
    breakdown.push(`花番: ${flowerPts}, 金: ${goldCount}, 连庄: ${lianZhuang}`);
    breakdown.push(`底分: (${flowerPts} + ${goldCount} + ${lianZhuang} + 5) = ${base}`);

    if (specialBonus > 0) {
      breakdown.push(`特殊牌型: ${winResult.description ?? winType} +${specialBonus}`);
    }

    if (context.isSelfDraw) {
      // Self-draw: each of 3 opponents pays (base * 2 + special)
      const perPlayer = base * 2 + specialBonus;
      breakdown.push(`自摸: 每家付 ${perPlayer}`);
      for (let i = 0; i < 4; i++) {
        if (i === winnerIndex) continue;
        payments[i] = -perPlayer;
        payments[winnerIndex] += perPlayer;
      }
    } else {
      // Discard win: discarder pays (base * 2 + special)
      const discarder = context.discarderIndex!;
      const total = base * 2 + specialBonus;
      breakdown.push(`点炮: 玩家${discarder + 1}付 ${total}`);
      payments[discarder] = -total;
      payments[winnerIndex] = total;
    }

    return { payments, breakdown };
  },

  getResponseActions(
    player: PlayerState,
    discardTile: TileInstance,
    context: ActionContext,
  ): AvailableActions {
    const result: AvailableActions = {
      canDraw: false,
      canDiscard: false,
      canHu: false,
      canPeng: false,
      canMingGang: false,
      canPass: true,
      chiOptions: [],
      anGangOptions: [],
      buGangOptions: [],
    };

    const hand = player.hand;
    const discardKey = tileKey(discardTile.tile);
    const goldenTile = (context.gameState as GameState & { goldenTile?: Tile }).goldenTile ?? null;
    const goldenKey = goldenTile ? tileKey(goldenTile) : null;

    // Golden tiles cannot be claimed (chi/peng/gang)
    const isGoldenDiscard = goldenKey !== null && discardKey === goldenKey;

    // Count matching tiles in hand
    const matchingTiles = hand.filter((t) => tileKey(t.tile) === discardKey);

    // Check Hu (with golden tile wildcard support)
    const testHand = [...hand, discardTile];
    const meldCount = player.melds.length;
    const wildcards = goldenTile
      ? testHand.filter((t) => tileKey(t.tile) === goldenKey!).length
      : 0;
    const nonGoldHand = goldenKey
      ? testHand.filter((t) => tileKey(t.tile) !== goldenKey)
      : testHand;

    if (
      isStandardWin(nonGoldHand, meldCount, wildcards) ||
      isSevenPairs(nonGoldHand, meldCount, wildcards) ||
      isThirteenOrphans(nonGoldHand, meldCount, wildcards)
    ) {
      // Cannot hu on a golden tile discard (players can't claim golden tiles)
      if (!isGoldenDiscard) {
        result.canHu = true;
      }
    }

    // Golden tiles cannot be claimed for peng/gang/chi
    if (!isGoldenDiscard) {
      // Check Peng (need 2 matching tiles)
      if (matchingTiles.length >= 2) {
        result.canPeng = true;
      }

      // Check Ming Gang (need 3 matching tiles)
      if (matchingTiles.length >= 3) {
        result.canMingGang = true;
      }

      // Check Chi (only from left neighbor, suited tiles only)
      const discarderIndex = context.discarderIndex ?? -1;
      const playerIndex = context.playerIndex;
      const isLeftNeighbor = (discarderIndex + 1) % 4 === playerIndex;

      if (isLeftNeighbor && isSuitedTile(discardTile.tile)) {
        const suit = discardTile.tile.suit;
        const val = discardTile.tile.value;

        const suitTiles = hand.filter(
          (t) => isSuitedTile(t.tile) && t.tile.suit === suit,
        );

        const findTile = (v: number): TileInstance | undefined =>
          suitTiles.find((t) => isSuitedTile(t.tile) && t.tile.value === v);

        if (val >= 3) {
          const t1 = findTile(val - 2);
          const t2 = findTile(val - 1);
          if (t1 && t2) result.chiOptions.push([t1, t2]);
        }
        if (val >= 2 && val <= 8) {
          const t1 = findTile(val - 1);
          const t2 = findTile(val + 1);
          if (t1 && t2) result.chiOptions.push([t1, t2]);
        }
        if (val <= 7) {
          const t1 = findTile(val + 1);
          const t2 = findTile(val + 2);
          if (t1 && t2) result.chiOptions.push([t1, t2]);
        }
      }
    }

    return result;
  },

  getPostDrawActions(
    player: PlayerState,
    drawnTile: TileInstance,
    context: ActionContext,
  ): AvailableActions {
    const result: AvailableActions = {
      canDraw: false,
      canDiscard: true,
      canHu: false,
      canPeng: false,
      canMingGang: false,
      canPass: false,
      chiOptions: [],
      anGangOptions: [],
      buGangOptions: [],
    };

    const goldenTile = (context.gameState as GameState & { goldenTile?: Tile }).goldenTile ?? null;
    const goldenKey = goldenTile ? tileKey(goldenTile) : null;

    const allTiles = [...player.hand, drawnTile];
    const meldCount = player.melds.length;
    const nonGoldTiles = goldenKey
      ? allTiles.filter((t) => tileKey(t.tile) !== goldenKey)
      : allTiles;
    const wildcards = goldenTile
      ? allTiles.filter((t) => tileKey(t.tile) === goldenKey!).length
      : 0;

    // Check self-draw win (with wildcard support)
    if (
      isStandardWin(nonGoldTiles, meldCount, wildcards) ||
      isSevenPairs(nonGoldTiles, meldCount, wildcards) ||
      isThirteenOrphans(nonGoldTiles, meldCount, wildcards)
    ) {
      result.canHu = true;
    }

    // Check 三金倒 (Three Golds Fall) — instant win with 3+ golden tiles
    if (goldenTile && countGoldenTiles(allTiles, goldenTile) >= 3) {
      result.canHu = true;
    }

    // Check An Gang: 4 of same tile in hand
    const counts = countTilesByKey(allTiles);
    for (const [key, count] of counts) {
      if (count === 4) {
        const gangTiles = allTiles.filter((t) => tileKey(t.tile) === key);
        result.anGangOptions.push(gangTiles);
      }
    }

    // Check Bu Gang: have a peng meld and draw/hold matching tile
    for (let i = 0; i < player.melds.length; i++) {
      const meld = player.melds[i];
      if (meld.type === MeldType.Peng) {
        const meldKey = tileKey(meld.tiles[0].tile);
        const match = allTiles.find((t) => tileKey(t.tile) === meldKey);
        if (match) {
          result.buGangOptions.push({ tile: match, meldIndex: i });
        }
      }
    }

    return result;
  },

  getNextDealer(
    currentDealer: number,
    winnerIndex: number | null,
    context: DealerContext,
  ): DealerResult {
    if (winnerIndex === null) {
      return {
        nextDealer: currentDealer,
        nextLianZhuang: context.lianZhuangCount + 1,
      };
    }
    return {
      nextDealer: winnerIndex,
      nextLianZhuang: winnerIndex === currentDealer ? context.lianZhuangCount + 1 : 0,
    };
  },
};

// ─── Helper for golden sparrow detection ───

/** Check if non-gold tiles alone can form all remaining melds (golds used as pair) */
function canFormMeldsPlusPairGoldenSparrow(nonGoldTiles: TileInstance[], remaining: number): boolean {
  if (nonGoldTiles.length !== remaining * 3) return false;
  const counts = countTilesByKey(nonGoldTiles);
  const sortedKeys = [...new Set(nonGoldTiles.map((t) => tileKey(t.tile)))].sort();
  return canFormMelds(counts, sortedKeys, remaining, 0);
}

// ─── GameState extension type (used for golden tile on gameState) ───

type GameState = import("../types/game.js").GameState;

// ─── UI Config ───

export function getUIConfig(): RuleSetUIConfig {
  const trackerLayout: TrackerSection[] = [];

  const suitConfigs: { label: string; color: string; suit: Suit }[] = [
    { label: "万", color: "#e74c3c", suit: Suit.Wan },
    { label: "饼", color: "#3498db", suit: Suit.Bing },
    { label: "条", color: "#27ae60", suit: Suit.Tiao },
  ];

  for (const { label, color, suit } of suitConfigs) {
    trackerLayout.push({
      label,
      color,
      tiles: Array.from({ length: 9 }, (_, i) => ({
        id: `${suit}_${i + 1}`,
        display: `${i + 1}${label}`,
        copies: 4,
      })),
    });
  }

  const honorTiles = [
    { id: "wind_east", display: "东", copies: 4 },
    { id: "wind_south", display: "南", copies: 4 },
    { id: "wind_west", display: "西", copies: 4 },
    { id: "wind_north", display: "北", copies: 4 },
    { id: "dragon_red", display: "中", copies: 4 },
    { id: "dragon_green", display: "发", copies: 4 },
    { id: "dragon_white", display: "白", copies: 4 },
  ];
  trackerLayout.push({ label: "字", color: "#8e44ad", tiles: honorTiles });

  const bonusTiles = [
    { id: "season_spring", display: "春", copies: 1 },
    { id: "season_summer", display: "夏", copies: 1 },
    { id: "season_autumn", display: "秋", copies: 1 },
    { id: "season_winter", display: "冬", copies: 1 },
    { id: "plant_plum", display: "梅", copies: 1 },
    { id: "plant_orchid", display: "兰", copies: 1 },
    { id: "plant_bamboo", display: "竹", copies: 1 },
    { id: "plant_chrysanthemum", display: "菊", copies: 1 },
  ];
  trackerLayout.push({ label: "花", color: "#f39c12", tiles: bonusTiles });

  return {
    trackerLayout,
    centerInfoLabel: "金牌",
    showFlowers: true,
    roundFormat: "wind-round",
    claimActions: ["hu", "gang", "peng", "chi"],
  };
}

// ─── Register ───

registerRuleSet(fuzhouRuleSet);
