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

// ─── Helpers ───

/** Check if two tiles are the same (ignoring instance id) */
function sameTile(a: Tile, b: Tile): boolean {
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

/** Get a string key for tile identity (ignoring instance id) */
function tileKey(tile: Tile): string {
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

/** Count tiles by key */
function countTiles(tiles: TileInstance[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tiles) {
    const key = tileKey(t.tile);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Check if a set of tiles (as count map) can form N melds + 1 pair.
 * `remaining` is the number of melds still needed.
 */
function canFormMeldsPlusPair(counts: Map<string, number>, tiles: TileInstance[], remaining: number): boolean {
  // Try each tile as the pair
  const tried = new Set<string>();
  for (const t of tiles) {
    const key = tileKey(t.tile);
    if (tried.has(key)) continue;
    tried.add(key);
    const count = counts.get(key) ?? 0;
    if (count >= 2) {
      counts.set(key, count - 2);
      if (canFormMelds(counts, tiles, remaining)) {
        counts.set(key, count);
        return true;
      }
      counts.set(key, count);
    }
  }
  return false;
}

function canFormMelds(counts: Map<string, number>, tiles: TileInstance[], remaining: number): boolean {
  if (remaining === 0) {
    // All counts should be 0
    for (const v of counts.values()) {
      if (v > 0) return false;
    }
    return true;
  }

  // Find first non-zero tile
  let firstKey: string | null = null;
  let firstTile: Tile | null = null;
  for (const t of tiles) {
    const key = tileKey(t.tile);
    if ((counts.get(key) ?? 0) > 0) {
      firstKey = key;
      firstTile = t.tile;
      break;
    }
  }
  if (!firstKey || !firstTile) return false;

  const count = counts.get(firstKey)!;

  // Try triplet
  if (count >= 3) {
    counts.set(firstKey, count - 3);
    if (canFormMelds(counts, tiles, remaining - 1)) {
      counts.set(firstKey, count);
      return true;
    }
    counts.set(firstKey, count);
  }

  // Try sequence (suited tiles only)
  if (isSuitedTile(firstTile)) {
    const suit = firstTile.suit;
    const val = firstTile.value;
    if (val <= 7) {
      const key2 = `${suit}_${val + 1}`;
      const key3 = `${suit}_${val + 2}`;
      const c1 = count;
      const c2 = counts.get(key2) ?? 0;
      const c3 = counts.get(key3) ?? 0;
      if (c1 >= 1 && c2 >= 1 && c3 >= 1) {
        counts.set(firstKey, c1 - 1);
        counts.set(key2, c2 - 1);
        counts.set(key3, c3 - 1);
        if (canFormMelds(counts, tiles, remaining - 1)) {
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

  return false;
}

/** Check standard win: melds + pair */
function isStandardWin(handTiles: TileInstance[], meldCount: number): boolean {
  // Total tiles in hand should be 3*remaining_melds + 2 (pair)
  const totalMelds = 4;
  const remaining = totalMelds - meldCount;
  if (handTiles.length !== remaining * 3 + 2) return false;

  // Sort tiles for consistent key ordering
  const sorted = [...handTiles].sort((a, b) => tileKey(a.tile).localeCompare(tileKey(b.tile)));
  const counts = countTiles(sorted);
  return canFormMeldsPlusPair(counts, sorted, remaining);
}

/** Check seven pairs */
function isSevenPairs(handTiles: TileInstance[], meldCount: number): boolean {
  if (meldCount !== 0 || handTiles.length !== 14) return false;
  const counts = countTiles(handTiles);
  for (const c of counts.values()) {
    if (c % 2 !== 0) return false;
  }
  return counts.size === 7;
}

const TERMINAL_HONOR_KEYS = [
  "wan_1", "wan_9", "bing_1", "bing_9", "tiao_1", "tiao_9",
  "wind_east", "wind_south", "wind_west", "wind_north",
  "dragon_red", "dragon_green", "dragon_white",
];

/** Check thirteen orphans */
function isThirteenOrphans(handTiles: TileInstance[], meldCount: number): boolean {
  if (meldCount !== 0 || handTiles.length !== 14) return false;
  const counts = countTiles(handTiles);
  let hasDuplicate = false;
  for (const key of TERMINAL_HONOR_KEYS) {
    const c = counts.get(key) ?? 0;
    if (c === 0) return false;
    if (c === 2) hasDuplicate = true;
  }
  return hasDuplicate && counts.size === 13;
}

// ─── RuleSet Implementation ───

export const fuzhouRuleSet: RuleSet = {
  id: "fuzhou",
  name: "福州麻将",
  description: "Fuzhou-style Mahjong with 144 tiles including bonus tiles",

  initialHandSize: 13,
  hasBonusTiles: true,

  createTilePool(): Tile[] {
    const tiles: Tile[] = [];

    // Suited tiles: 3 suits × 9 values × 4 copies = 108
    for (const suit of [Suit.Wan, Suit.Bing, Suit.Tiao]) {
      for (let value = 1; value <= 9; value++) {
        for (let copy = 0; copy < 4; copy++) {
          tiles.push({ kind: "suited", suit, value: value as SuitedTile["value"] });
        }
      }
    }

    // Wind tiles: 4 types × 4 copies = 16
    for (const windType of ["east", "south", "west", "north"] as const) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({ kind: "wind", windType });
      }
    }

    // Dragon tiles: 3 types × 4 copies = 12
    for (const dragonType of ["red", "green", "white"] as const) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({ kind: "dragon", dragonType });
      }
    }

    // Season tiles: 4 × 1 copy each = 4
    for (const seasonType of ["spring", "summer", "autumn", "winter"] as const) {
      tiles.push({ kind: "season", seasonType });
    }

    // Plant tiles: 4 × 1 copy each = 4
    for (const plantType of ["plum", "orchid", "bamboo", "chrysanthemum"] as const) {
      tiles.push({ kind: "plant", plantType });
    }

    return tiles;
  },

  isBonusTile(tile: Tile): boolean {
    return isBonusTileGuard(tile);
  },

  checkWin(player: PlayerState, winningTile: TileInstance, context: WinContext): WinResult {
    // Combine hand with winning tile
    const allHandTiles = [...player.hand, winningTile];
    const meldCount = player.melds.length;

    // Check thirteen orphans first (highest)
    if (isThirteenOrphans(allHandTiles, meldCount)) {
      return {
        isWin: true,
        winType: "thirteen_orphans",
        multiplier: 8,
        description: "十三幺",
      };
    }

    // Check seven pairs
    if (isSevenPairs(allHandTiles, meldCount)) {
      return {
        isWin: true,
        winType: "seven_pairs",
        multiplier: 2,
        description: "七对",
      };
    }

    // Check standard win
    if (isStandardWin(allHandTiles, meldCount)) {
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
    _winner: PlayerState,
    winnerIndex: number,
    winResult: WinResult,
    context: ScoreContext,
  ): ScoreResult {
    const payments = [0, 0, 0, 0];
    const multiplier = winResult.multiplier ?? 1;
    const baseScore = 1;
    const score = baseScore * multiplier;
    const breakdown: string[] = [`基础分: ${baseScore}`, `番数: ${multiplier}x`];

    const dealerIndex = context.extra?.dealerIndex as number | undefined;

    if (context.isSelfDraw) {
      // Self-draw: all 3 opponents pay
      breakdown.push("自摸: 三家付");
      for (let i = 0; i < 4; i++) {
        if (i === winnerIndex) continue;
        let payment = score;
        // Dealer pays/receives double
        if (dealerIndex === winnerIndex || dealerIndex === i) {
          payment *= 2;
        }
        payments[i] = -payment;
        payments[winnerIndex] += payment;
      }
    } else {
      // Discard win: discarder pays
      const discarder = context.discarderIndex!;
      breakdown.push(`点炮: 玩家${discarder + 1}付`);
      let payment = score;
      if (dealerIndex === winnerIndex || dealerIndex === discarder) {
        payment *= 2;
      }
      payments[discarder] = -payment;
      payments[winnerIndex] = payment;
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

    // Count matching tiles in hand
    const matchingTiles = hand.filter((t) => tileKey(t.tile) === discardKey);

    // Check Hu
    const testHand = [...hand, discardTile];
    const meldCount = player.melds.length;
    if (
      isStandardWin(testHand, meldCount) ||
      isSevenPairs(testHand, meldCount) ||
      isThirteenOrphans(testHand, meldCount)
    ) {
      result.canHu = true;
    }

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

      // Find all suited tiles of same suit in hand
      const suitTiles = hand.filter(
        (t) => isSuitedTile(t.tile) && t.tile.suit === suit,
      );

      const findTile = (v: number): TileInstance | undefined =>
        suitTiles.find((t) => isSuitedTile(t.tile) && t.tile.value === v);

      // Check three possible chi combinations
      // val-2, val-1, val
      if (val >= 3) {
        const t1 = findTile(val - 2);
        const t2 = findTile(val - 1);
        if (t1 && t2) result.chiOptions.push([t1, t2]);
      }
      // val-1, val, val+1
      if (val >= 2 && val <= 8) {
        const t1 = findTile(val - 1);
        const t2 = findTile(val + 1);
        if (t1 && t2) result.chiOptions.push([t1, t2]);
      }
      // val, val+1, val+2
      if (val <= 7) {
        const t1 = findTile(val + 1);
        const t2 = findTile(val + 2);
        if (t1 && t2) result.chiOptions.push([t1, t2]);
      }
    }

    return result;
  },

  getPostDrawActions(
    player: PlayerState,
    drawnTile: TileInstance,
    _context: ActionContext,
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

    // Check self-draw win
    const allTiles = [...player.hand, drawnTile];
    const meldCount = player.melds.length;
    if (
      isStandardWin(allTiles, meldCount) ||
      isSevenPairs(allTiles, meldCount) ||
      isThirteenOrphans(allTiles, meldCount)
    ) {
      result.canHu = true;
    }

    // Check An Gang: 4 of same tile in hand (including drawn tile)
    const counts = countTiles(allTiles);
    for (const [key, count] of counts) {
      if (count === 4) {
        const gangTiles = allTiles.filter((t) => tileKey(t.tile) === key);
        result.anGangOptions.push(gangTiles);
      }
    }

    // Check Bu Gang: have a peng meld and draw matching tile
    for (let i = 0; i < player.melds.length; i++) {
      const meld = player.melds[i];
      if (meld.type === MeldType.Peng) {
        const meldKey = tileKey(meld.tiles[0].tile);
        // Check drawn tile or hand tiles
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
    _context: DealerContext,
  ): DealerResult {
    if (winnerIndex === null) {
      // Draw: dealer stays
      return {
        nextDealer: currentDealer,
        nextLianZhuang: _context.lianZhuangCount + 1,
      };
    }
    // Winner becomes dealer
    return {
      nextDealer: winnerIndex,
      nextLianZhuang: winnerIndex === currentDealer ? _context.lianZhuangCount + 1 : 0,
    };
  },
};

// ─── UI Config ───

export function getUIConfig(): RuleSetUIConfig {
  const trackerLayout: TrackerSection[] = [];

  // Suited tile sections
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

  // Honor tiles section
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

  // Bonus tiles section
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
    showFlowers: true,
    roundFormat: "wind-round",
    claimActions: ["hu", "gang", "peng", "chi"],
  };
}

// ─── Register ───

registerRuleSet(fuzhouRuleSet);
