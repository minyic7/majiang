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
} from "@majiang/shared";
import type { Tile, TileInstance, PlayerState } from "@majiang/shared";
import { Suit, MeldType } from "@majiang/shared";

/**
 * Minimal RuleSet stub for unit testing the game engine.
 * Uses only wan 1-9 x4 = 36 tiles. No bonus tiles.
 * Win condition: hand has exactly 1 pair (2 matching tiles) with rest in melds of 3.
 * For simplicity in tests, checkWin always returns true.
 */
export const StubRuleSet: RuleSet = {
  id: "stub",
  name: "Stub Rules",
  description: "Minimal rule set for testing",

  initialHandSize: 13,
  hasBonusTiles: false,

  createTilePool(): Tile[] {
    const tiles: Tile[] = [];
    const suits = [Suit.Wan, Suit.Bing, Suit.Tiao];
    for (const suit of suits) {
      for (let value = 1; value <= 9; value++) {
        for (let copy = 0; copy < 4; copy++) {
          tiles.push({
            kind: "suited",
            suit,
            value: value as Tile extends { value: infer V } ? V : never,
          } as Tile);
        }
      }
    }
    return tiles; // 108 tiles
  },

  isBonusTile(_tile: Tile): boolean {
    return false;
  },

  checkWin(_player: PlayerState, _winningTile: TileInstance, _context: WinContext): WinResult {
    return { isWin: true, winType: "stub-win" };
  },

  calculateScore(_winner: PlayerState, winnerIndex: number, _winResult: WinResult, context: ScoreContext): ScoreResult {
    // Winner gets +3, each loser pays -1
    const payments = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      if (i === winnerIndex) {
        payments[i] = 3;
      } else {
        payments[i] = -1;
      }
    }
    return { payments, breakdown: ["stub scoring"] };
  },

  getResponseActions(player: PlayerState, discardTile: TileInstance, _context: ActionContext): AvailableActions {
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

    // Check peng: player has 2 matching tiles in hand
    const matchCount = player.hand.filter(
      (t) => tilesEqual(t.tile, discardTile.tile)
    ).length;

    if (matchCount >= 2) {
      result.canPeng = true;
    }
    if (matchCount >= 3) {
      result.canMingGang = true;
    }

    return result;
  },

  getPostDrawActions(player: PlayerState, drawnTile: TileInstance, _context: ActionContext): AvailableActions {
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

    // Check anGang: player has 4 of the same tile in hand
    const tileCounts = new Map<string, TileInstance[]>();
    for (const t of player.hand) {
      const key = tileKey(t.tile);
      const arr = tileCounts.get(key) ?? [];
      arr.push(t);
      tileCounts.set(key, arr);
    }
    for (const [, group] of tileCounts) {
      if (group.length === 4) {
        result.anGangOptions.push(group);
      }
    }

    // Check buGang: player has a peng meld and the drawn tile matches
    for (let i = 0; i < player.melds.length; i++) {
      const meld = player.melds[i];
      if (meld.type === MeldType.Peng && tilesEqual(meld.tiles[0].tile, drawnTile.tile)) {
        result.buGangOptions.push({ tile: drawnTile, meldIndex: i });
      }
    }

    return result;
  },

  getNextDealer(currentDealer: number, winnerIndex: number | null, _context: DealerContext): DealerResult {
    if (winnerIndex === currentDealer) {
      return { nextDealer: currentDealer, nextLianZhuang: _context.lianZhuangCount + 1 };
    }
    return { nextDealer: (currentDealer + 1) % 4, nextLianZhuang: 0 };
  },
};

function tileKey(tile: Tile): string {
  if (tile.kind === "suited") return `${tile.suit}-${tile.value}`;
  if (tile.kind === "wind") return `wind-${tile.windType}`;
  if (tile.kind === "dragon") return `dragon-${tile.dragonType}`;
  if (tile.kind === "season") return `season-${tile.seasonType}`;
  if (tile.kind === "plant") return `plant-${tile.plantType}`;
  return "unknown";
}

function tilesEqual(a: Tile, b: Tile): boolean {
  return tileKey(a) === tileKey(b);
}
