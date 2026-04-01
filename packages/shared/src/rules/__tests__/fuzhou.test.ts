import { describe, it, expect } from "vitest";
import { fuzhouRuleSet, getUIConfig } from "../fuzhou.js";
import { getRuleSet } from "../registry.js";
import type { TileInstance, Tile, SuitedTile } from "../../types/tile.js";
import { Suit } from "../../types/tile.js";
import type { PlayerState, Meld } from "../../types/game.js";
import { MeldType } from "../../types/game.js";
import type { GameState } from "../../types/game.js";
import { GamePhase } from "../../types/game.js";

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

function makePlayer(hand: TileInstance[], melds: Meld[] = []): PlayerState {
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

function makeGameState(playerIndex: number, discarderIndex?: number): GameState {
  return {
    phase: GamePhase.Playing,
    players: Array.from({ length: 4 }, () => makePlayer([])),
    wall: [],
    wallTail: [],
    currentTurn: playerIndex,
    dealerIndex: 0,
    lastDiscard: null,
    ruleSetId: "fuzhou",
  };
}

// ─── Tile Pool ───

describe("createTilePool", () => {
  const pool = fuzhouRuleSet.createTilePool();

  it("creates 144 tiles", () => {
    expect(pool.length).toBe(144);
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

  it("has 4 season tiles", () => {
    expect(pool.filter((t) => t.kind === "season").length).toBe(4);
  });

  it("has 4 plant tiles", () => {
    expect(pool.filter((t) => t.kind === "plant").length).toBe(4);
  });
});

// ─── Bonus Tiles ───

describe("isBonusTile", () => {
  it("returns true for season tiles", () => {
    expect(fuzhouRuleSet.isBonusTile({ kind: "season", seasonType: "spring" })).toBe(true);
  });

  it("returns true for plant tiles", () => {
    expect(fuzhouRuleSet.isBonusTile({ kind: "plant", plantType: "plum" })).toBe(true);
  });

  it("returns false for suited tiles", () => {
    expect(fuzhouRuleSet.isBonusTile(suited("wan", 1))).toBe(false);
  });

  it("returns false for honor tiles", () => {
    expect(fuzhouRuleSet.isBonusTile(wind("east"))).toBe(false);
  });
});

// ─── Win Detection ───

describe("checkWin", () => {
  const baseContext = {
    isSelfDraw: false,
    isFirstAction: false,
    isDealer: false,
    isRobbingKong: false,
  };

  it("detects standard win (all sequences)", () => {
    // 1-2-3 wan, 4-5-6 wan, 7-8-9 wan, 1-2-3 bing + pair of 1 tiao
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("wan", 7)), ti(suited("wan", 8)), ti(suited("wan", 9)),
      ti(suited("bing", 1)), ti(suited("bing", 2)), ti(suited("bing", 3)),
      ti(suited("tiao", 1)),
    ];
    const winTile = ti(suited("tiao", 1));
    const player = makePlayer(hand);
    const result = fuzhouRuleSet.checkWin(player, winTile, baseContext);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("standard");
  });

  it("detects standard win with existing melds", () => {
    // 1 meld already exposed, need 3 melds + pair in hand
    const meld: Meld = {
      type: MeldType.Peng,
      tiles: [ti(suited("wan", 1)), ti(suited("wan", 1)), ti(suited("wan", 1))],
    };
    // hand: 4-5-6 wan, 7-8-9 wan, 1-2-3 bing + pair of east
    const hand = [
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("wan", 7)), ti(suited("wan", 8)), ti(suited("wan", 9)),
      ti(suited("bing", 1)), ti(suited("bing", 2)), ti(suited("bing", 3)),
      ti(wind("east")),
    ];
    const winTile = ti(wind("east"));
    const player = makePlayer(hand, [meld]);
    const result = fuzhouRuleSet.checkWin(player, winTile, baseContext);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("standard");
  });

  it("detects seven pairs", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 1)),
      ti(suited("wan", 2)), ti(suited("wan", 2)),
      ti(suited("wan", 3)), ti(suited("wan", 3)),
      ti(suited("bing", 4)), ti(suited("bing", 4)),
      ti(suited("tiao", 5)), ti(suited("tiao", 5)),
      ti(wind("east")), ti(wind("east")),
      ti(dragon("red")),
    ];
    const winTile = ti(dragon("red"));
    const player = makePlayer(hand);
    const result = fuzhouRuleSet.checkWin(player, winTile, baseContext);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("seven_pairs");
  });

  it("detects thirteen orphans", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 9)),
      ti(suited("bing", 1)), ti(suited("bing", 9)),
      ti(suited("tiao", 1)), ti(suited("tiao", 9)),
      ti(wind("east")), ti(wind("south")),
      ti(wind("west")), ti(wind("north")),
      ti(dragon("red")), ti(dragon("green")),
      ti(dragon("white")),
    ];
    const winTile = ti(suited("wan", 1)); // duplicate
    const player = makePlayer(hand);
    const result = fuzhouRuleSet.checkWin(player, winTile, baseContext);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("thirteen_orphans");
  });

  it("rejects non-winning hand", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 4)),
      ti(suited("wan", 5)), ti(suited("wan", 6)), ti(suited("wan", 7)),
      ti(suited("bing", 1)), ti(suited("bing", 3)), ti(suited("bing", 5)),
      ti(suited("tiao", 2)), ti(suited("tiao", 4)), ti(suited("tiao", 6)),
      ti(wind("east")),
    ];
    const winTile = ti(wind("south"));
    const player = makePlayer(hand);
    const result = fuzhouRuleSet.checkWin(player, winTile, baseContext);
    expect(result.isWin).toBe(false);
  });

  it("detects standard win with triplets", () => {
    // 3x wan1, 3x wan2, 3x wan3, 3x bing1 + pair of east
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 1)), ti(suited("wan", 1)),
      ti(suited("wan", 2)), ti(suited("wan", 2)), ti(suited("wan", 2)),
      ti(suited("wan", 3)), ti(suited("wan", 3)), ti(suited("wan", 3)),
      ti(suited("bing", 1)), ti(suited("bing", 1)), ti(suited("bing", 1)),
      ti(wind("east")),
    ];
    const winTile = ti(wind("east"));
    const player = makePlayer(hand);
    const result = fuzhouRuleSet.checkWin(player, winTile, baseContext);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("standard");
  });
});

// ─── Scoring ───

describe("calculateScore", () => {
  const standardWin: { isWin: true; winType: string; multiplier: number } = {
    isWin: true,
    winType: "standard",
    multiplier: 1,
  };

  it("self-draw: all opponents pay", () => {
    const player = makePlayer([]);
    const result = fuzhouRuleSet.calculateScore(player, 0, standardWin, {
      isSelfDraw: true,
      discarderIndex: null,
      extra: { dealerIndex: 3 },
    });
    expect(result.payments[0]).toBeGreaterThan(0);
    expect(result.payments[1]).toBeLessThan(0);
    expect(result.payments[2]).toBeLessThan(0);
    expect(result.payments[3]).toBeLessThan(0);
    // Sum should be 0
    expect(result.payments.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("discard win: only discarder pays", () => {
    const player = makePlayer([]);
    const result = fuzhouRuleSet.calculateScore(player, 0, standardWin, {
      isSelfDraw: false,
      discarderIndex: 2,
      extra: { dealerIndex: 3 },
    });
    expect(result.payments[0]).toBeGreaterThan(0);
    expect(result.payments[1]).toBe(0);
    expect(result.payments[2]).toBeLessThan(0);
    expect(result.payments[3]).toBe(0);
    expect(result.payments.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("dealer bonus applies", () => {
    const player = makePlayer([]);
    // Winner is dealer (index 0)
    const dealerResult = fuzhouRuleSet.calculateScore(player, 0, standardWin, {
      isSelfDraw: false,
      discarderIndex: 1,
      extra: { dealerIndex: 0 },
    });
    // Non-dealer winner
    const nonDealerResult = fuzhouRuleSet.calculateScore(player, 2, standardWin, {
      isSelfDraw: false,
      discarderIndex: 1,
      extra: { dealerIndex: 3 },
    });
    expect(dealerResult.payments[0]).toBeGreaterThan(nonDealerResult.payments[2]);
  });
});

// ─── Response Actions ───

describe("getResponseActions", () => {
  it("detects peng opportunity", () => {
    const hand = [ti(suited("wan", 1)), ti(suited("wan", 1)), ti(suited("wan", 3))];
    const player = makePlayer(hand);
    const discard = ti(suited("wan", 1));
    const result = fuzhouRuleSet.getResponseActions(player, discard, {
      gameState: makeGameState(1, 0),
      playerIndex: 1,
      discarderIndex: 0,
    });
    expect(result.canPeng).toBe(true);
  });

  it("detects ming gang opportunity", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 1)), ti(suited("wan", 1)),
      ti(suited("wan", 3)),
    ];
    const player = makePlayer(hand);
    const discard = ti(suited("wan", 1));
    const result = fuzhouRuleSet.getResponseActions(player, discard, {
      gameState: makeGameState(1, 0),
      playerIndex: 1,
      discarderIndex: 0,
    });
    expect(result.canMingGang).toBe(true);
  });

  it("detects chi options from left neighbor", () => {
    // Player 1, discarder 0 (left neighbor)
    const hand = [ti(suited("wan", 2)), ti(suited("wan", 3)), ti(suited("tiao", 5))];
    const player = makePlayer(hand);
    const discard = ti(suited("wan", 1));
    const result = fuzhouRuleSet.getResponseActions(player, discard, {
      gameState: makeGameState(1, 0),
      playerIndex: 1,
      discarderIndex: 0,
    });
    expect(result.chiOptions.length).toBeGreaterThan(0);
  });

  it("disallows chi from non-left neighbor", () => {
    const hand = [ti(suited("wan", 2)), ti(suited("wan", 3)), ti(suited("tiao", 5))];
    const player = makePlayer(hand);
    const discard = ti(suited("wan", 1));
    const result = fuzhouRuleSet.getResponseActions(player, discard, {
      gameState: makeGameState(1, 2),
      playerIndex: 1,
      discarderIndex: 2,
    });
    expect(result.chiOptions.length).toBe(0);
  });

  it("detects hu opportunity on discard", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("wan", 7)), ti(suited("wan", 8)), ti(suited("wan", 9)),
      ti(suited("bing", 1)), ti(suited("bing", 2)), ti(suited("bing", 3)),
      ti(suited("tiao", 1)),
    ];
    const player = makePlayer(hand);
    const discard = ti(suited("tiao", 1));
    const result = fuzhouRuleSet.getResponseActions(player, discard, {
      gameState: makeGameState(1, 0),
      playerIndex: 1,
      discarderIndex: 0,
    });
    expect(result.canHu).toBe(true);
  });
});

// ─── Post-Draw Actions ───

describe("getPostDrawActions", () => {
  it("always allows discard", () => {
    const hand = [ti(suited("wan", 1)), ti(suited("wan", 3))];
    const player = makePlayer(hand);
    const drawn = ti(suited("tiao", 5));
    const result = fuzhouRuleSet.getPostDrawActions(player, drawn, {
      gameState: makeGameState(0),
      playerIndex: 0,
    });
    expect(result.canDiscard).toBe(true);
  });

  it("detects self-draw win", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("wan", 7)), ti(suited("wan", 8)), ti(suited("wan", 9)),
      ti(suited("bing", 1)), ti(suited("bing", 2)), ti(suited("bing", 3)),
      ti(suited("tiao", 1)),
    ];
    const player = makePlayer(hand);
    const drawn = ti(suited("tiao", 1));
    const result = fuzhouRuleSet.getPostDrawActions(player, drawn, {
      gameState: makeGameState(0),
      playerIndex: 0,
    });
    expect(result.canHu).toBe(true);
  });

  it("detects an gang option", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 1)), ti(suited("wan", 1)),
      ti(suited("bing", 5)),
    ];
    const player = makePlayer(hand);
    const drawn = ti(suited("wan", 1));
    const result = fuzhouRuleSet.getPostDrawActions(player, drawn, {
      gameState: makeGameState(0),
      playerIndex: 0,
    });
    expect(result.anGangOptions.length).toBe(1);
    expect(result.anGangOptions[0].length).toBe(4);
  });

  it("detects bu gang option", () => {
    const pengMeld: Meld = {
      type: MeldType.Peng,
      tiles: [ti(suited("wan", 5)), ti(suited("wan", 5)), ti(suited("wan", 5))],
    };
    const hand = [ti(suited("bing", 1)), ti(suited("bing", 2))];
    const player = makePlayer(hand, [pengMeld]);
    const drawn = ti(suited("wan", 5));
    const result = fuzhouRuleSet.getPostDrawActions(player, drawn, {
      gameState: makeGameState(0),
      playerIndex: 0,
    });
    expect(result.buGangOptions.length).toBe(1);
    expect(result.buGangOptions[0].meldIndex).toBe(0);
  });
});

// ─── Dealer Logic ───

describe("getNextDealer", () => {
  it("winner becomes dealer", () => {
    const result = fuzhouRuleSet.getNextDealer(0, 2, { lianZhuangCount: 0 });
    expect(result.nextDealer).toBe(2);
    expect(result.nextLianZhuang).toBe(0);
  });

  it("dealer stays on draw", () => {
    const result = fuzhouRuleSet.getNextDealer(1, null, { lianZhuangCount: 2 });
    expect(result.nextDealer).toBe(1);
    expect(result.nextLianZhuang).toBe(3);
  });

  it("dealer wins increments lianZhuang", () => {
    const result = fuzhouRuleSet.getNextDealer(0, 0, { lianZhuangCount: 1 });
    expect(result.nextDealer).toBe(0);
    expect(result.nextLianZhuang).toBe(2);
  });
});

// ─── Registration ───

describe("registration", () => {
  it("is registered in registry", () => {
    const rs = getRuleSet("fuzhou");
    expect(rs).toBeDefined();
    expect(rs!.id).toBe("fuzhou");
  });
});

// ─── UI Config ───

describe("getUIConfig", () => {
  const config = getUIConfig();

  it("has 5 tracker sections", () => {
    expect(config.trackerLayout.length).toBe(5);
  });

  it("shows flowers", () => {
    expect(config.showFlowers).toBe(true);
  });

  it("uses wind-round format", () => {
    expect(config.roundFormat).toBe("wind-round");
  });

  it("has correct claim actions", () => {
    expect(config.claimActions).toEqual(["hu", "gang", "peng", "chi"]);
  });
});
