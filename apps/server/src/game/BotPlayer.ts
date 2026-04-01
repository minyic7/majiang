import { ActionType, tileKey } from "@majiang/shared";
import type { GameAction, AvailableActions, TileInstance, Tile } from "@majiang/shared";

/**
 * Score a tile based on how useful it is in the hand.
 * Higher score = more valuable = keep it.
 */
export function scoreTile(tile: TileInstance, hand: TileInstance[], goldenTile?: Tile): number {
  // Golden tiles should never be discarded
  if (goldenTile && tileKey(tile.tile) === tileKey(goldenTile)) {
    return 999;
  }

  let score = 0;
  const key = tileKey(tile.tile);

  // Pairs are valuable
  const matching = hand.filter((t) => tileKey(t.tile) === key).length;
  score += matching * 10;

  // Adjacent suited tiles are valuable (potential sequences)
  if (tile.tile.kind === "suited") {
    const suit = tile.tile.suit;
    const val = tile.tile.value;
    const hasAdj1 = hand.some(
      (t) =>
        t.tile.kind === "suited" &&
        t.tile.suit === suit &&
        Math.abs(t.tile.value - val) === 1
    );
    const hasAdj2 = hand.some(
      (t) =>
        t.tile.kind === "suited" &&
        t.tile.suit === suit &&
        Math.abs(t.tile.value - val) === 2
    );
    if (hasAdj1) score += 5;
    if (hasAdj2) score += 2;
  }

  return score;
}

export class BotPlayer {
  static choosePostDrawAction(
    actions: AvailableActions,
    hand: TileInstance[],
    playerIndex: number,
    goldenTile?: Tile
  ): GameAction {
    // 三金倒: if hand has 3+ golden tiles and can hu, always hu
    if (actions.canHu && goldenTile) {
      const goldenKey = tileKey(goldenTile);
      const goldenCount = hand.filter((t) => tileKey(t.tile) === goldenKey).length;
      if (goldenCount >= 3) {
        return { type: ActionType.Hu, playerIndex };
      }
    }

    // Priority: Hu > AnGang > BuGang > Discard
    if (actions.canHu) {
      return { type: ActionType.Hu, playerIndex };
    }

    if (actions.anGangOptions.length > 0) {
      return {
        type: ActionType.AnGang,
        playerIndex,
        tile: actions.anGangOptions[0][0],
      };
    }

    if (actions.buGangOptions.length > 0) {
      return {
        type: ActionType.BuGang,
        playerIndex,
        tile: actions.buGangOptions[0].tile,
      };
    }

    // Discard the tile with the lowest score
    if (actions.canDiscard && hand.length > 0) {
      const scored = hand.map((t) => ({ tile: t, score: scoreTile(t, hand, goldenTile) }));
      scored.sort((a, b) => a.score - b.score);
      return {
        type: ActionType.Discard,
        playerIndex,
        tile: scored[0].tile,
      };
    }

    // Fallback: discard first tile
    return {
      type: ActionType.Discard,
      playerIndex,
      tile: hand[0],
    };
  }

  static chooseResponseAction(
    actions: AvailableActions,
    playerIndex: number,
    goldenTile?: Tile,
    discardTile?: TileInstance
  ): GameAction {
    // Priority: Hu > Peng > MingGang > Chi > Pass
    if (actions.canHu) {
      return { type: ActionType.Hu, playerIndex };
    }

    if (actions.canPeng) {
      return {
        type: ActionType.Peng,
        playerIndex,
        targetTile: discardTile!,
      };
    }

    if (actions.canMingGang) {
      return {
        type: ActionType.MingGang,
        playerIndex,
        targetTile: discardTile!,
      };
    }

    if (actions.chiOptions.length > 0) {
      const pair = actions.chiOptions[0] as [TileInstance, TileInstance];
      return {
        type: ActionType.Chi,
        playerIndex,
        tiles: pair,
        targetTile: undefined as never,
      };
    }

    return { type: ActionType.Pass, playerIndex };
  }

  /** Delay to simulate thinking (returns ms) */
  static getThinkDelay(): number {
    return 500 + Math.floor(Math.random() * 500);
  }
}
