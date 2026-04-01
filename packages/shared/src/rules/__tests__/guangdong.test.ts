import { describe, it, expect } from "vitest";
import { guangdongRuleSet } from "../guangdong.js";
import { getRuleSet } from "../registry.js";
import type { TileInstance, Tile, SuitedTile } from "../../types/tile.js";
import { Suit } from "../../types/tile.js";
import type { PlayerState, Meld } from "../../types/game.js";
import { MeldType, GamePhase } from "../../types/game.js";
import type { GameState } from "../../types/game.js";

// ─── Helpers ───

let nextId = 0;
function ti(tile: Tile): TileInstance {
  return { id: nextId++, tile };
}

function suited(suit: "wan" | "bing" | "tiao", value: number): Tile {
  return { kind: "suited", suit: suit as Suit, value: value as SuitedTile["value"] };
}

function wind(w: "east" | "south" | "west" | "north"): Tile {
  return { kind: "wind", windType: w };
}

function dragon(d: "red" | "green" | "white"): Tile {
  return { kind: "dragon", dragonType: d };
}

function makePlayer(
  hand: TileInstance[],
  melds: Meld[] = [],
): PlayerState {
  return {
    name: "Test",
    hand,
    melds,
    discards: [],
    flowers: [],
    isDealer: false,
    seatWind: "east",
  };
}

function makeGameState(playerIndex: number): GameState {
  return {
    phase: GamePhase.Playing,
    players: Array.from({ length: 4 }, () => makePlayer([])),
    wall: [],
    wallTail: [],
    currentTurn: playerIndex,
    dealerIndex: 0,
    lastDiscard: null,
    ruleSetId: "guangdong",
    currentRound: 1,
    prevalentWind: "east",
    roundInWind: 1,
  };
}

const baseWinContext = {
  isSelfDraw: false,
  isFirstAction: false,
  isDealer: false,
  isRobbingKong: false,
};

// ─── Tile Pool ───

describe("createTilePool", () => {
  const pool = guangdongRuleSet.createTilePool();

  it("creates 136 tiles", () => {
    expect(pool.length).toBe(136);
  });

  it("has no flower or season tiles", () => {
    const bonus = pool.filter((t) => t.kind === "season" || t.kind === "plant");
    expect(bonus.length).toBe(0);
  });

  it("has 108 suited tiles", () => {
    expect(pool.filter((t) => t.kind === "suited").length).toBe(108);
  });

  it("has 16 wind tiles", () => {
    expect(pool.filter((t) => t.kind === "wind").length).toBe(16);
  });

  it("has 12 dragon tiles", () => {
    expect(pool.filter((t) => t.kind === "dragon").length).toBe(12);
  });
});

// ─── Basic Properties ───

describe("basic properties", () => {
  it("has correct id and name", () => {
    expect(guangdongRuleSet.id).toBe("guangdong");
    expect(guangdongRuleSet.name).toBe("广东麻将");
  });

  it("initialHandSize is 13", () => {
    expect(guangdongRuleSet.initialHandSize).toBe(13);
  });

  it("hasBonusTiles is false", () => {
    expect(guangdongRuleSet.hasBonusTiles).toBe(false);
  });

  it("isBonusTile always returns false", () => {
    expect(guangdongRuleSet.isBonusTile(suited("wan", 1))).toBe(false);
    expect(guangdongRuleSet.isBonusTile(wind("east"))).toBe(false);
  });

  it("does not have determineGoldenTile", () => {
    expect(guangdongRuleSet.determineGoldenTile).toBeUndefined();
  });
});

// ─── Win Detection ───

describe("checkWin", () => {
  it("detects standard win (chicken hu)", () => {
    // 1-2-3万, 4-5-6万, 7-8-9万, 1-1-1饼, pair 2-2饼
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("wan", 7)), ti(suited("wan", 8)), ti(suited("wan", 9)),
      ti(suited("bing", 1)), ti(suited("bing", 1)), ti(suited("bing", 1)),
      ti(suited("bing", 2)),
    ];
    const player = makePlayer(hand);
    const result = guangdongRuleSet.checkWin(player, ti(suited("bing", 2)), baseWinContext);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("chicken_hu");
    expect(result.multiplier).toBe(1);
  });

  it("detects seven pairs", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 1)),
      ti(suited("wan", 3)), ti(suited("wan", 3)),
      ti(suited("bing", 5)), ti(suited("bing", 5)),
      ti(suited("tiao", 7)), ti(suited("tiao", 7)),
      ti(wind("east")), ti(wind("east")),
      ti(dragon("red")), ti(dragon("red")),
      ti(suited("wan", 9)),
    ];
    const player = makePlayer(hand);
    const result = guangdongRuleSet.checkWin(player, ti(suited("wan", 9)), baseWinContext);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("seven_pairs");
    expect(result.multiplier).toBe(4);
  });

  it("detects all triplets (碰碰胡)", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 1)), ti(suited("wan", 1)),
      ti(suited("bing", 3)), ti(suited("bing", 3)), ti(suited("bing", 3)),
      ti(suited("tiao", 5)), ti(suited("tiao", 5)), ti(suited("tiao", 5)),
      ti(wind("east")), ti(wind("east")), ti(wind("east")),
      ti(dragon("red")),
    ];
    const player = makePlayer(hand);
    const result = guangdongRuleSet.checkWin(player, ti(dragon("red")), baseWinContext);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("all_triplets");
    expect(result.multiplier).toBe(4);
  });

  it("detects mixed one suit (混一色)", () => {
    // All wan + honors
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("wan", 7)), ti(suited("wan", 8)), ti(suited("wan", 9)),
      ti(wind("east")), ti(wind("east")), ti(wind("east")),
      ti(dragon("red")),
    ];
    const player = makePlayer(hand);
    const result = guangdongRuleSet.checkWin(player, ti(dragon("red")), baseWinContext);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("mixed_one_suit");
    expect(result.multiplier).toBe(2);
  });

  it("detects pure one suit (清一色)", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("wan", 7)), ti(suited("wan", 8)), ti(suited("wan", 9)),
      ti(suited("wan", 1)), ti(suited("wan", 1)), ti(suited("wan", 1)),
      ti(suited("wan", 9)),
    ];
    const player = makePlayer(hand);
    const result = guangdongRuleSet.checkWin(player, ti(suited("wan", 9)), baseWinContext);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("pure_one_suit");
    expect(result.multiplier).toBe(8);
  });

  it("detects all honors (字一色)", () => {
    const hand = [
      ti(wind("east")), ti(wind("east")), ti(wind("east")),
      ti(wind("south")), ti(wind("south")), ti(wind("south")),
      ti(wind("west")), ti(wind("west")), ti(wind("west")),
      ti(dragon("red")), ti(dragon("red")), ti(dragon("red")),
      ti(dragon("green")),
    ];
    const player = makePlayer(hand);
    const result = guangdongRuleSet.checkWin(player, ti(dragon("green")), baseWinContext);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("all_honors");
    expect(result.multiplier).toBe(16);
  });

  it("rejects non-winning hand", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 3)), ti(suited("wan", 5)),
      ti(suited("bing", 2)), ti(suited("bing", 4)), ti(suited("bing", 6)),
      ti(suited("tiao", 1)), ti(suited("tiao", 3)), ti(suited("tiao", 5)),
      ti(wind("east")), ti(wind("south")), ti(wind("west")),
      ti(dragon("red")),
    ];
    const player = makePlayer(hand);
    const result = guangdongRuleSet.checkWin(player, ti(dragon("green")), baseWinContext);
    expect(result.isWin).toBe(false);
  });

  it("works with exposed melds", () => {
    // 2 melds exposed, 1 meld + pair in hand
    const melds: Meld[] = [
      { type: MeldType.Peng, tiles: [ti(suited("wan", 1)), ti(suited("wan", 1)), ti(suited("wan", 1))] },
      { type: MeldType.Chi, tiles: [ti(suited("bing", 4)), ti(suited("bing", 5)), ti(suited("bing", 6))] },
    ];
    const hand = [
      ti(suited("tiao", 7)), ti(suited("tiao", 8)), ti(suited("tiao", 9)),
      ti(suited("wan", 5)), ti(suited("wan", 5)),
      ti(dragon("red")), ti(dragon("red")),
    ];
    const player = makePlayer(hand, melds);
    const result = guangdongRuleSet.checkWin(player, ti(dragon("red")), baseWinContext);
    expect(result.isWin).toBe(true);
  });
});

// ─── Scoring ───

describe("calculateScore", () => {
  it("chicken hu discard: discarder pays 3 points", () => {
    const player = makePlayer([]);
    const winResult = { isWin: true, winType: "chicken_hu", multiplier: 1, description: "鸡胡" };
    const result = guangdongRuleSet.calculateScore(player, 0, winResult, {
      isSelfDraw: false,
      discarderIndex: 1,
    });
    expect(result.payments[0]).toBe(3);  // winner gets 3
    expect(result.payments[1]).toBe(-3); // discarder pays 3
    expect(result.payments[2]).toBe(0);
    expect(result.payments[3]).toBe(0);
  });

  it("chicken hu self-draw: each opponent pays 1", () => {
    const player = makePlayer([]);
    const winResult = { isWin: true, winType: "chicken_hu", multiplier: 1, description: "鸡胡" };
    const result = guangdongRuleSet.calculateScore(player, 0, winResult, {
      isSelfDraw: true,
      discarderIndex: null,
    });
    expect(result.payments[0]).toBe(3);
    expect(result.payments[1]).toBe(-1);
    expect(result.payments[2]).toBe(-1);
    expect(result.payments[3]).toBe(-1);
  });

  it("pure one suit self-draw: each opponent pays 8", () => {
    const player = makePlayer([]);
    const winResult = { isWin: true, winType: "pure_one_suit", multiplier: 8, description: "清一色" };
    const result = guangdongRuleSet.calculateScore(player, 2, winResult, {
      isSelfDraw: true,
      discarderIndex: null,
    });
    expect(result.payments[2]).toBe(24);
    expect(result.payments[0]).toBe(-8);
    expect(result.payments[1]).toBe(-8);
    expect(result.payments[3]).toBe(-8);
  });

  it("seven pairs discard: discarder pays 12", () => {
    const player = makePlayer([]);
    const winResult = { isWin: true, winType: "seven_pairs", multiplier: 4, description: "七对" };
    const result = guangdongRuleSet.calculateScore(player, 1, winResult, {
      isSelfDraw: false,
      discarderIndex: 3,
    });
    expect(result.payments[1]).toBe(12);
    expect(result.payments[3]).toBe(-12);
  });
});

// ─── Response Actions ───

describe("getResponseActions", () => {
  it("detects peng opportunity", () => {
    const hand = [ti(suited("wan", 5)), ti(suited("wan", 5)), ti(suited("bing", 1))];
    const player = makePlayer(hand);
    const gs = makeGameState(1);
    const result = guangdongRuleSet.getResponseActions(player, ti(suited("wan", 5)), {
      gameState: gs, playerIndex: 1, discarderIndex: 0,
    });
    expect(result.canPeng).toBe(true);
  });

  it("detects ming gang opportunity", () => {
    const hand = [ti(suited("wan", 5)), ti(suited("wan", 5)), ti(suited("wan", 5))];
    const player = makePlayer(hand);
    const gs = makeGameState(1);
    const result = guangdongRuleSet.getResponseActions(player, ti(suited("wan", 5)), {
      gameState: gs, playerIndex: 1, discarderIndex: 0,
    });
    expect(result.canMingGang).toBe(true);
  });

  it("detects chi from left neighbor", () => {
    const hand = [ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("bing", 9))];
    const player = makePlayer(hand);
    const gs = makeGameState(1);
    const result = guangdongRuleSet.getResponseActions(player, ti(suited("wan", 3)), {
      gameState: gs, playerIndex: 1, discarderIndex: 0,
    });
    expect(result.chiOptions.length).toBeGreaterThan(0);
  });

  it("no chi from non-left neighbor", () => {
    const hand = [ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("bing", 9))];
    const player = makePlayer(hand);
    const gs = makeGameState(1);
    const result = guangdongRuleSet.getResponseActions(player, ti(suited("wan", 3)), {
      gameState: gs, playerIndex: 1, discarderIndex: 2,
    });
    expect(result.chiOptions.length).toBe(0);
  });

  it("detects hu on discard", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("wan", 7)), ti(suited("wan", 8)), ti(suited("wan", 9)),
      ti(suited("bing", 1)), ti(suited("bing", 1)), ti(suited("bing", 1)),
      ti(suited("bing", 2)),
    ];
    const player = makePlayer(hand);
    const gs = makeGameState(0);
    const result = guangdongRuleSet.getResponseActions(player, ti(suited("bing", 2)), {
      gameState: gs, playerIndex: 0, discarderIndex: 1,
    });
    expect(result.canHu).toBe(true);
  });
});

// ─── Post-Draw Actions ───

describe("getPostDrawActions", () => {
  it("always allows discard", () => {
    const hand = [ti(suited("wan", 1))];
    const player = makePlayer(hand);
    const gs = makeGameState(0);
    const result = guangdongRuleSet.getPostDrawActions(player, ti(suited("bing", 3)), {
      gameState: gs, playerIndex: 0,
    });
    expect(result.canDiscard).toBe(true);
  });

  it("detects self-draw win", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("wan", 7)), ti(suited("wan", 8)), ti(suited("wan", 9)),
      ti(suited("bing", 1)), ti(suited("bing", 1)), ti(suited("bing", 1)),
      ti(suited("bing", 2)),
    ];
    const player = makePlayer(hand);
    const gs = makeGameState(0);
    const result = guangdongRuleSet.getPostDrawActions(player, ti(suited("bing", 2)), {
      gameState: gs, playerIndex: 0,
    });
    expect(result.canHu).toBe(true);
  });

  it("detects an gang", () => {
    const hand = [
      ti(suited("wan", 5)), ti(suited("wan", 5)), ti(suited("wan", 5)),
      ti(suited("bing", 1)),
    ];
    const player = makePlayer(hand);
    const gs = makeGameState(0);
    const result = guangdongRuleSet.getPostDrawActions(player, ti(suited("wan", 5)), {
      gameState: gs, playerIndex: 0,
    });
    expect(result.anGangOptions.length).toBe(1);
  });

  it("detects bu gang", () => {
    const melds: Meld[] = [
      { type: MeldType.Peng, tiles: [ti(suited("wan", 3)), ti(suited("wan", 3)), ti(suited("wan", 3))] },
    ];
    const hand = [ti(suited("bing", 1))];
    const player = makePlayer(hand, melds);
    const gs = makeGameState(0);
    const result = guangdongRuleSet.getPostDrawActions(player, ti(suited("wan", 3)), {
      gameState: gs, playerIndex: 0,
    });
    expect(result.buGangOptions.length).toBe(1);
    expect(result.buGangOptions[0].meldIndex).toBe(0);
  });
});

// ─── Dealer Logic ───

describe("getNextDealer", () => {
  it("winner becomes next dealer", () => {
    const result = guangdongRuleSet.getNextDealer(0, 2, { lianZhuangCount: 0 });
    expect(result.nextDealer).toBe(2);
    expect(result.nextLianZhuang).toBe(0);
  });

  it("dealer stays on draw", () => {
    const result = guangdongRuleSet.getNextDealer(1, null, { lianZhuangCount: 0 });
    expect(result.nextDealer).toBe(1);
    expect(result.nextLianZhuang).toBe(1);
  });

  it("lianZhuang increments when dealer wins", () => {
    const result = guangdongRuleSet.getNextDealer(0, 0, { lianZhuangCount: 2 });
    expect(result.nextDealer).toBe(0);
    expect(result.nextLianZhuang).toBe(3);
  });
});

// ─── Registration ───

describe("registration", () => {
  it("is registered in the rule set registry", () => {
    const rs = getRuleSet("guangdong");
    expect(rs).toBeDefined();
    expect(rs?.id).toBe("guangdong");
  });
});
