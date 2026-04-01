import { describe, it, expect } from "vitest";
import { ActionType, Suit } from "@majiang/shared";
import type { AvailableActions, TileInstance } from "@majiang/shared";
import { BotPlayer, scoreTile } from "../BotPlayer.js";

function makeTile(id: number, value: number, suit: Suit = Suit.Wan): TileInstance {
  return { id, tile: { kind: "suited", suit, value: value as 1 } };
}

function makeWindTile(id: number, windType: "east" | "south" | "west" | "north"): TileInstance {
  return { id, tile: { kind: "wind", windType } };
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

    it("should discard isolated tiles before connected ones", () => {
      // Hand: 1w, 2w, 3w, 9w (isolated) — should discard 9w
      const hand = [makeTile(0, 1), makeTile(1, 2), makeTile(2, 3), makeTile(3, 9)];
      const result = BotPlayer.choosePostDrawAction(noActions, hand, 0);
      expect(result.type).toBe(ActionType.Discard);
      expect((result as { tile: TileInstance }).tile.id).toBe(3);
    });

    it("should keep pairs over isolated tiles", () => {
      // Hand: 5w, 5w, 9w — should discard 9w (pair is more valuable)
      const hand = [makeTile(0, 5), makeTile(1, 5), makeTile(2, 9)];
      const result = BotPlayer.choosePostDrawAction(noActions, hand, 0);
      expect(result.type).toBe(ActionType.Discard);
      expect((result as { tile: TileInstance }).tile.id).toBe(2);
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

    it("should ming gang when possible and not hu or peng", () => {
      const actions: AvailableActions = { ...noActions, canMingGang: true, canPass: true };
      const result = BotPlayer.chooseResponseAction(actions, 1);
      expect(result.type).toBe(ActionType.MingGang);
    });

    it("should chi when chi options available and no higher priority action", () => {
      const chiPair: [TileInstance, TileInstance] = [makeTile(0, 2), makeTile(1, 3)];
      const actions: AvailableActions = {
        ...noActions,
        chiOptions: [chiPair],
        canPass: true,
      };
      const result = BotPlayer.chooseResponseAction(actions, 1);
      expect(result.type).toBe(ActionType.Chi);
      if (result.type === ActionType.Chi) {
        expect(result.tiles).toEqual(chiPair);
      }
    });

    it("should prefer peng over chi", () => {
      const chiPair: [TileInstance, TileInstance] = [makeTile(0, 2), makeTile(1, 3)];
      const actions: AvailableActions = {
        ...noActions,
        canPeng: true,
        chiOptions: [chiPair],
        canPass: true,
      };
      const result = BotPlayer.chooseResponseAction(actions, 1);
      expect(result.type).toBe(ActionType.Peng);
    });

    it("should pass when nothing special available", () => {
      const actions: AvailableActions = { ...noActions, canPass: true, canDiscard: false };
      const result = BotPlayer.chooseResponseAction(actions, 1);
      expect(result.type).toBe(ActionType.Pass);
    });
  });

  describe("scoreTile", () => {
    it("scores pairs higher than isolated tiles", () => {
      const hand = [makeTile(0, 5), makeTile(1, 5), makeTile(2, 9)];
      const pairScore = scoreTile(hand[0], hand);
      const isolatedScore = scoreTile(hand[2], hand);
      expect(pairScore).toBeGreaterThan(isolatedScore);
    });

    it("scores adjacent suited tiles higher than isolated ones", () => {
      const hand = [makeTile(0, 3), makeTile(1, 4), makeTile(2, 9)];
      const adjacentScore = scoreTile(hand[0], hand);
      const isolatedScore = scoreTile(hand[2], hand);
      expect(adjacentScore).toBeGreaterThan(isolatedScore);
    });

    it("scores wind tiles without adjacency bonus", () => {
      const windTile = makeWindTile(0, "east");
      const hand = [windTile, makeTile(1, 3), makeTile(2, 4)];
      const score = scoreTile(windTile, hand);
      // Wind tile alone: matching count = 1 -> 10, no adjacency
      expect(score).toBe(10);
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
