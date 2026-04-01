import { ActionType } from "@majiang/shared";
import type { GameAction, AvailableActions, TileInstance } from "@majiang/shared";

export class BotPlayer {
  static choosePostDrawAction(
    actions: AvailableActions,
    hand: TileInstance[],
    playerIndex: number
  ): GameAction {
    // Priority: Hu > AnGang > Discard
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

    // Discard a random tile
    if (actions.canDiscard && hand.length > 0) {
      const randomIndex = Math.floor(Math.random() * hand.length);
      return {
        type: ActionType.Discard,
        playerIndex,
        tile: hand[randomIndex],
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
    playerIndex: number
  ): GameAction {
    // Priority: Hu > Peng > Pass (no chi for basic bot)
    if (actions.canHu) {
      return { type: ActionType.Hu, playerIndex };
    }

    if (actions.canPeng) {
      return { type: ActionType.Peng, playerIndex, targetTile: undefined as never };
    }

    if (actions.canMingGang) {
      return { type: ActionType.MingGang, playerIndex, targetTile: undefined as never };
    }

    return { type: ActionType.Pass, playerIndex };
  }

  /** Delay to simulate thinking (returns ms) */
  static getThinkDelay(): number {
    return 500 + Math.floor(Math.random() * 500);
  }
}
