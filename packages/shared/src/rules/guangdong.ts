import type { Tile, TileInstance, SuitedTile } from "../types/tile.js";
import { Suit, isSuitedTile } from "../types/tile.js";
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
import { registerRuleSet } from "./registry.js";
import { sameTile, tileKey } from "./fuzhou.js";

// ─── Count Helpers ───

function countTilesByKey(tiles: TileInstance[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tiles) {
    const key = tileKey(t.tile);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

// ─── Win Detection (no wildcard support needed) ───

function canFormMelds(
  counts: Map<string, number>,
  sortedKeys: string[],
  remaining: number,
): boolean {
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

  const count = counts.get(firstKey)!;

  // Try triplet
  if (count >= 3) {
    counts.set(firstKey, count - 3);
    if (canFormMelds(counts, sortedKeys, remaining - 1)) {
      counts.set(firstKey, count);
      return true;
    }
    counts.set(firstKey, count);
  }

  // Try sequence (suited tiles only)
  const parts = firstKey.split("_");
  const suitName = parts[0];
  if (suitName === "wan" || suitName === "bing" || suitName === "tiao") {
    const val = parseInt(parts[1], 10);
    if (val <= 7) {
      const key2 = `${suitName}_${val + 1}`;
      const key3 = `${suitName}_${val + 2}`;
      const c1 = count;
      const c2 = counts.get(key2) ?? 0;
      const c3 = counts.get(key3) ?? 0;
      if (c1 >= 1 && c2 >= 1 && c3 >= 1) {
        counts.set(firstKey, c1 - 1);
        counts.set(key2, c2 - 1);
        counts.set(key3, c3 - 1);
        if (canFormMelds(counts, sortedKeys, remaining - 1)) {
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

function canFormMeldsPlusPair(tiles: TileInstance[], remaining: number): boolean {
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
      if (canFormMelds(counts, sortedKeys, remaining)) {
        counts.set(key, c);
        return true;
      }
      counts.set(key, c);
    }
  }
  return false;
}

function isStandardWin(handTiles: TileInstance[], meldCount: number): boolean {
  const remaining = 4 - meldCount;
  if (handTiles.length !== remaining * 3 + 2) return false;
  return canFormMeldsPlusPair(handTiles, remaining);
}

function isSevenPairs(handTiles: TileInstance[], meldCount: number): boolean {
  if (meldCount !== 0 || handTiles.length !== 14) return false;
  const counts = countTilesByKey(handTiles);
  if (counts.size !== 7) return false;
  for (const c of counts.values()) {
    if (c !== 2) return false;
  }
  return true;
}

// ─── Scoring Helpers ───

function isAllTriplets(player: PlayerState, allHand: TileInstance[]): boolean {
  for (const meld of player.melds) {
    if (meld.type === MeldType.Chi) return false;
  }
  // Hand portion must be triplets + pair
  const remaining = 4 - player.melds.length;
  if (allHand.length !== remaining * 3 + 2) return false;
  const counts = countTilesByKey(allHand);
  let pairs = 0;
  let trips = 0;
  for (const c of counts.values()) {
    if (c === 2) pairs++;
    else if (c === 3) trips++;
    else return false;
  }
  return pairs === 1 && trips === remaining;
}

function isMixedOneSuit(player: PlayerState, allHand: TileInstance[]): boolean {
  const suits = new Set<Suit>();
  let hasHonor = false;
  const checkTile = (tile: Tile) => {
    if (isSuitedTile(tile)) suits.add(tile.suit);
    else hasHonor = true;
  };
  for (const t of allHand) checkTile(t.tile);
  for (const meld of player.melds) {
    for (const t of meld.tiles) checkTile(t.tile);
  }
  return suits.size === 1 && hasHonor;
}

function isPureOneSuit(player: PlayerState, allHand: TileInstance[]): boolean {
  const suits = new Set<Suit>();
  let hasHonor = false;
  const checkTile = (tile: Tile) => {
    if (isSuitedTile(tile)) suits.add(tile.suit);
    else hasHonor = true;
  };
  for (const t of allHand) checkTile(t.tile);
  for (const meld of player.melds) {
    for (const t of meld.tiles) checkTile(t.tile);
  }
  return suits.size === 1 && !hasHonor;
}

function isAllHonors(player: PlayerState, allHand: TileInstance[]): boolean {
  const checkTile = (tile: Tile) => tile.kind === "wind" || tile.kind === "dragon";
  for (const t of allHand) {
    if (!checkTile(t.tile)) return false;
  }
  for (const meld of player.melds) {
    for (const t of meld.tiles) {
      if (!checkTile(t.tile)) return false;
    }
  }
  return true;
}

// ─── RuleSet Implementation ───

export const guangdongRuleSet: RuleSet = {
  id: "guangdong",
  name: "广东麻将",
  description: "Guangdong-style Mahjong with 136 tiles, no flowers, chicken hu scoring",

  initialHandSize: 13,
  hasBonusTiles: false,

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

    return tiles; // 136 total
  },

  isBonusTile(_tile: Tile): boolean {
    return false; // No bonus tiles in Guangdong
  },

  checkWin(player: PlayerState, winningTile: TileInstance, _context: WinContext): WinResult {
    const allHandTiles = [...player.hand, winningTile];
    const meldCount = player.melds.length;

    // Seven pairs (higher priority)
    if (isSevenPairs(allHandTiles, meldCount)) {
      return { isWin: true, winType: "seven_pairs", multiplier: 4, description: "七对" };
    }

    // Standard win: 4 melds + 1 pair
    if (isStandardWin(allHandTiles, meldCount)) {
      // Check for special patterns (highest first)
      if (isAllHonors(player, allHandTiles)) {
        return { isWin: true, winType: "all_honors", multiplier: 16, description: "字一色" };
      }
      if (isPureOneSuit(player, allHandTiles)) {
        return { isWin: true, winType: "pure_one_suit", multiplier: 8, description: "清一色" };
      }
      if (isAllTriplets(player, allHandTiles)) {
        return { isWin: true, winType: "all_triplets", multiplier: 4, description: "碰碰胡" };
      }
      if (isMixedOneSuit(player, allHandTiles)) {
        return { isWin: true, winType: "mixed_one_suit", multiplier: 2, description: "混一色" };
      }

      // Chicken hu (basic win)
      return { isWin: true, winType: "chicken_hu", multiplier: 1, description: "鸡胡" };
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
    const breakdown: string[] = [];
    const multiplier = winResult.multiplier ?? 1;

    // Base point value per multiplier unit
    const points = multiplier;
    breakdown.push(`牌型: ${winResult.description ?? winResult.winType} (${points}番)`);

    if (context.isSelfDraw) {
      // Self-draw: each opponent pays the points
      breakdown.push(`自摸: 每家付 ${points}`);
      for (let i = 0; i < 4; i++) {
        if (i === winnerIndex) continue;
        payments[i] = -points;
        payments[winnerIndex] += points;
      }
    } else {
      // Discard win: only discarder pays (but pays triple to compensate)
      const discarder = context.discarderIndex!;
      const total = points * 3;
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
    const matchingTiles = hand.filter((t) => tileKey(t.tile) === discardKey);

    // Check Hu
    const testHand = [...hand, discardTile];
    const meldCount = player.melds.length;
    if (isStandardWin(testHand, meldCount) || isSevenPairs(testHand, meldCount)) {
      result.canHu = true;
    }

    // Check Peng
    if (matchingTiles.length >= 2) {
      result.canPeng = true;
    }

    // Check Ming Gang
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

    const allTiles = [...player.hand, drawnTile];
    const meldCount = player.melds.length;

    // Check self-draw win
    if (isStandardWin(allTiles, meldCount) || isSevenPairs(allTiles, meldCount)) {
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

    // Check Bu Gang: have a peng meld and hold matching tile
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
      // Draw: dealer stays, lianZhuang increments
      return {
        nextDealer: currentDealer,
        nextLianZhuang: context.lianZhuangCount + 1,
      };
    }
    // Winner becomes dealer
    return {
      nextDealer: winnerIndex,
      nextLianZhuang: winnerIndex === currentDealer ? context.lianZhuangCount + 1 : 0,
    };
  },
};

// ─── Register ───

registerRuleSet(guangdongRuleSet);
