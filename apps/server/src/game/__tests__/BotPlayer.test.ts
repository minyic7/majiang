import { describe, it, expect } from "vitest";
import { ActionType, Suit } from "@majiang/shared";
import type { AvailableActions, TileInstance } from "@majiang/shared";
import { BotPlayer } from "../BotPlayer.js";

function makeTile(id: number, value: number): TileInstance {
  return { id, tile: { kind: "suited", suit: Suit.Wan, value: value as 1 } };
}

const noActions: AvailableActions = {
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

describe("BotPlayer", () => {
  describe("choosePostDrawAction", () => {
    it("should hu when possible", () => {
      const actions: AvailableActions = { ...noActions, canHu: true };
      const hand = [makeTile(0, 1), makeTile(1, 2)];
      const result = BotPlayer.choosePostDrawAction(actions, hand, 0);
      expect(result.type).toBe(ActionType.Hu);
    });

    it("should anGang when possible and not hu", () => {
      const gangTiles = [makeTile(0, 1), makeTile(1, 1), makeTile(2, 1), makeTile(3, 1)];
      const actions: AvailableActions = {
        ...noActions,
        anGangOptions: [gangTiles],
      };
      const hand = [...gangTiles, makeTile(4, 2)];
      const result = BotPlayer.choosePostDrawAction(actions, hand, 0);
      expect(result.type).toBe(ActionType.AnGang);
    });

    it("should discard when no special actions available", () => {
      const hand = [makeTile(0, 1), makeTile(1, 2), makeTile(2, 3)];
      const result = BotPlayer.choosePostDrawAction(noActions, hand, 0);
      expect(result.type).toBe(ActionType.Discard);
      expect(hand.map((t) => t.id)).toContain((result as { tile: TileInstance }).tile.id);
    });
  });

  describe("chooseResponseAction", () => {
    it("should hu when possible", () => {
      const actions: AvailableActions = { ...noActions, canHu: true, canPass: true };
      const result = BotPlayer.chooseResponseAction(actions, 1);
      expect(result.type).toBe(ActionType.Hu);
    });

    it("should peng when possible and not hu", () => {
      const actions: AvailableActions = { ...noActions, canPeng: true, canPass: true };
      const result = BotPlayer.chooseResponseAction(actions, 1);
      expect(result.type).toBe(ActionType.Peng);
    });

    it("should pass when nothing special available", () => {
      const actions: AvailableActions = { ...noActions, canPass: true, canDiscard: false };
      const result = BotPlayer.chooseResponseAction(actions, 1);
      expect(result.type).toBe(ActionType.Pass);
    });
  });

  describe("getThinkDelay", () => {
    it("should return a delay between 500 and 1000ms", () => {
      for (let i = 0; i < 20; i++) {
        const delay = BotPlayer.getThinkDelay();
        expect(delay).toBeGreaterThanOrEqual(500);
        expect(delay).toBeLessThan(1000);
      }
    });
  });
});
