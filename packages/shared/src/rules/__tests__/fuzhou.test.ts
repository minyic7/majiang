import { describe, it, expect } from "vitest";
import { fuzhouRuleSet, getUIConfig, determineGoldenTile, sameTile, tileKey } from "../fuzhou.js";
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

function makePlayer(
  hand: TileInstance[],
  melds: Meld[] = [],
  flowers: TileInstance[] = [],
): PlayerState {
  return {
    name: "Test",
    hand,
    melds,
    discards: [],
    flowers,
    isDealer: false,
    seatWind: "east",
  };
}

function makeGameState(
  playerIndex: number,
  discarderIndex?: number,
  goldenTile?: Tile,
): GameState & { goldenTile?: Tile } {
  return {
    phase: GamePhase.Playing,
    players: Array.from({ length: 4 }, () => makePlayer([])),
    wall: [],
    wallTail: [],
    currentTurn: playerIndex,
    dealerIndex: 0,
    lastDiscard: null,
    ruleSetId: "fuzhou",
    goldenTile: goldenTile ?? undefined,
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

  it("has 4 season + 4 plant tiles", () => {
    expect(pool.filter((t) => t.kind === "season").length).toBe(4);
    expect(pool.filter((t) => t.kind === "plant").length).toBe(4);
  });
});

// ─── Bonus Tiles ───

describe("isBonusTile", () => {
  it("returns true for season/plant tiles", () => {
    expect(fuzhouRuleSet.isBonusTile({ kind: "season", seasonType: "spring" })).toBe(true);
    expect(fuzhouRuleSet.isBonusTile({ kind: "plant", plantType: "plum" })).toBe(true);
  });

  it("returns false for suited/honor tiles", () => {
    expect(fuzhouRuleSet.isBonusTile(suited("wan", 1))).toBe(false);
    expect(fuzhouRuleSet.isBonusTile(wind("east"))).toBe(false);
  });
});

// ─── Golden Tile Determination ───

describe("determineGoldenTile", () => {
  it("suited tile: next value, wrapping 9→1", () => {
    const gold = determineGoldenTile(suited("wan", 3));
    expect(gold).toEqual(suited("wan", 4));
  });

  it("suited tile: 9 wraps to 1", () => {
    const gold = determineGoldenTile(suited("bing", 9));
    expect(gold).toEqual(suited("bing", 1));
  });

  it("wind: cycles east→south→west→north→east", () => {
    expect(determineGoldenTile(wind("east"))).toEqual(wind("south"));
    expect(determineGoldenTile(wind("north"))).toEqual(wind("east"));
  });

  it("dragon: cycles red→green→white→red", () => {
    expect(determineGoldenTile(dragon("white"))).toEqual(dragon("red"));
    expect(determineGoldenTile(dragon("red"))).toEqual(dragon("green"));
  });
});

// ─── Win Detection (no golden tile) ───

describe("checkWin (no golden tile)", () => {
  it("detects standard win (all sequences, no flowers = plain_no_flowers)", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("wan", 7)), ti(suited("wan", 8)), ti(suited("wan", 9)),
      ti(suited("bing", 1)), ti(suited("bing", 2)), ti(suited("bing", 3)),
      ti(suited("tiao", 1)),
    ];
    const result = fuzhouRuleSet.checkWin(makePlayer(hand), ti(suited("tiao", 1)), baseWinContext);
    expect(result.isWin).toBe(true);
    // All sequences + no flowers + no kongs = 平胡无花无杠
    expect(result.winType).toBe("plain_no_flowers");
  });

  it("detects standard win with existing melds", () => {
    const meld: Meld = {
      type: MeldType.Peng,
      tiles: [ti(suited("wan", 1)), ti(suited("wan", 1)), ti(suited("wan", 1))],
    };
    const hand = [
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("wan", 7)), ti(suited("wan", 8)), ti(suited("wan", 9)),
      ti(suited("bing", 1)), ti(suited("bing", 2)), ti(suited("bing", 3)),
      ti(wind("east")),
    ];
    const result = fuzhouRuleSet.checkWin(makePlayer(hand, [meld]), ti(wind("east")), baseWinContext);
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
    const result = fuzhouRuleSet.checkWin(makePlayer(hand), ti(dragon("red")), baseWinContext);
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
    const result = fuzhouRuleSet.checkWin(makePlayer(hand), ti(suited("wan", 1)), baseWinContext);
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
    const result = fuzhouRuleSet.checkWin(makePlayer(hand), ti(wind("south")), baseWinContext);
    expect(result.isWin).toBe(false);
  });

  it("detects standard win with all triplets", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 1)), ti(suited("wan", 1)),
      ti(suited("wan", 2)), ti(suited("wan", 2)), ti(suited("wan", 2)),
      ti(suited("wan", 3)), ti(suited("wan", 3)), ti(suited("wan", 3)),
      ti(suited("bing", 1)), ti(suited("bing", 1)), ti(suited("bing", 1)),
      ti(wind("east")),
    ];
    const result = fuzhouRuleSet.checkWin(makePlayer(hand), ti(wind("east")), baseWinContext);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("standard");
  });
});

// ─── Win Detection with Golden Tile Wildcards ───

describe("checkWin (with golden tile wildcards)", () => {
  it("golden tile substitutes for missing tile in sequence", () => {
    // Gold = tiao5. Hand has wan1, wan2, gold(tiao5 acts as wildcard for wan3),
    // wan4-5-6, wan7-8-9, bing1-2-3, pair of east
    const gold = suited("tiao", 5);
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(gold), // gold substitutes for wan3
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("wan", 7)), ti(suited("wan", 8)), ti(suited("wan", 9)),
      ti(suited("bing", 1)), ti(suited("bing", 2)), ti(suited("bing", 3)),
      ti(wind("east")),
    ];
    const ctx = { ...baseWinContext, extra: { goldenTile: gold } };
    const result = fuzhouRuleSet.checkWin(makePlayer(hand), ti(wind("east")), ctx);
    expect(result.isWin).toBe(true);
  });

  it("golden tile completes a pair", () => {
    // 4 complete melds in hand, need a pair — gold acts as wildcard to pair with a tile
    const gold = suited("tiao", 5);
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("wan", 7)), ti(suited("wan", 8)), ti(suited("wan", 9)),
      ti(suited("bing", 1)), ti(suited("bing", 2)), ti(suited("bing", 3)),
      ti(wind("east")),
    ];
    const ctx = { ...baseWinContext, extra: { goldenTile: gold } };
    // Winning tile is a gold tile — acts as wildcard to pair with east wind
    const result = fuzhouRuleSet.checkWin(makePlayer(hand), ti(gold), ctx);
    expect(result.isWin).toBe(true);
  });

  it("三金倒 (Three Golds Fall): 3 golden tiles = instant win", () => {
    const gold = suited("wan", 5);
    const hand = [
      ti(gold), ti(gold), // 2 golds in hand
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("bing", 4)), ti(suited("bing", 5)), ti(suited("bing", 6)),
      ti(suited("tiao", 7)), ti(suited("tiao", 8)), ti(suited("tiao", 9)),
      ti(wind("east")), ti(wind("south")),
    ];
    const ctx = { ...baseWinContext, extra: { goldenTile: gold } };
    // Drawing a 3rd gold triggers instant win
    const result = fuzhouRuleSet.checkWin(makePlayer(hand), ti(gold), ctx);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("three_golds_fall");
    expect(result.multiplier).toBe(40);
  });

  it("金雀 (Golden Sparrow): pair of golden tiles as eyes", () => {
    const gold = suited("wan", 5);
    // Hand has 4 complete melds of non-gold tiles, + 1 gold. Winning tile is 2nd gold = pair.
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 6)), ti(suited("wan", 7)), ti(suited("wan", 8)),
      ti(suited("bing", 1)), ti(suited("bing", 2)), ti(suited("bing", 3)),
      ti(suited("tiao", 4)), ti(suited("tiao", 5)), ti(suited("tiao", 6)),
      ti(gold), // 1 gold in hand
    ];
    const ctx = { ...baseWinContext, extra: { goldenTile: gold } };
    const result = fuzhouRuleSet.checkWin(makePlayer(hand), ti(gold), ctx);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("golden_sparrow");
    expect(result.multiplier).toBe(60);
  });

  it("抢金 (Robbing the Gold): first draw is golden + already tenpai", () => {
    const gold = suited("wan", 5);
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 6)), ti(suited("wan", 7)), ti(suited("wan", 8)),
      ti(suited("bing", 1)), ti(suited("bing", 2)), ti(suited("bing", 3)),
      ti(suited("tiao", 4)), ti(suited("tiao", 5)), ti(suited("tiao", 6)),
      ti(wind("east")),
    ];
    const ctx = {
      ...baseWinContext,
      isSelfDraw: true,
      isFirstAction: true,
      extra: { goldenTile: gold },
    };
    // Drawing the golden tile as first action while tenpai
    const result = fuzhouRuleSet.checkWin(makePlayer(hand), ti(gold), ctx);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("rob_gold");
    expect(result.multiplier).toBe(30);
  });
});

// ─── Plain Win Detection ───

describe("checkWin (plain win categories)", () => {
  it("平胡无花无杠: plain win with 0 flowers and no kongs", () => {
    // All sequences, no golds, no flowers, no kongs
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("bing", 1)), ti(suited("bing", 2)), ti(suited("bing", 3)),
      ti(suited("tiao", 4)), ti(suited("tiao", 5)), ti(suited("tiao", 6)),
      ti(suited("tiao", 1)),
    ];
    const result = fuzhouRuleSet.checkWin(makePlayer(hand), ti(suited("tiao", 1)), baseWinContext);
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("plain_no_flowers");
    expect(result.multiplier).toBe(30);
  });

  it("平胡一花: plain win with exactly 1 flower", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("bing", 1)), ti(suited("bing", 2)), ti(suited("bing", 3)),
      ti(suited("tiao", 4)), ti(suited("tiao", 5)), ti(suited("tiao", 6)),
      ti(suited("tiao", 1)),
    ];
    const flowers = [ti({ kind: "season", seasonType: "spring" })];
    const result = fuzhouRuleSet.checkWin(
      makePlayer(hand, [], flowers),
      ti(suited("tiao", 1)),
      baseWinContext,
    );
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("plain_one_flower");
    expect(result.multiplier).toBe(15);
  });

  it("plain win with 2+ flowers is just standard", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("wan", 4)), ti(suited("wan", 5)), ti(suited("wan", 6)),
      ti(suited("bing", 1)), ti(suited("bing", 2)), ti(suited("bing", 3)),
      ti(suited("tiao", 4)), ti(suited("tiao", 5)), ti(suited("tiao", 6)),
      ti(suited("tiao", 1)),
    ];
    const flowers = [
      ti({ kind: "season", seasonType: "spring" }),
      ti({ kind: "season", seasonType: "summer" }),
    ];
    const result = fuzhouRuleSet.checkWin(
      makePlayer(hand, [], flowers),
      ti(suited("tiao", 1)),
      baseWinContext,
    );
    expect(result.isWin).toBe(true);
    expect(result.winType).toBe("standard");
  });
});

// ─── Scoring ───

describe("calculateScore", () => {
  it("self-draw: all 3 opponents pay with Fuzhou formula", () => {
    const flowers = [ti({ kind: "season", seasonType: "spring" })];
    const player = makePlayer([], [], flowers);
    const result = fuzhouRuleSet.calculateScore(player, 0, {
      isWin: true,
      winType: "standard",
      multiplier: 1,
    }, {
      isSelfDraw: true,
      discarderIndex: null,
      extra: { dealerIndex: 0, lianZhuangCount: 0 },
    });
    // base = 1 flower + 0 gold + 0 lianZhuang + 5 = 6
    // self-draw per player = 6*2 + 0 special = 12
    expect(result.payments[0]).toBe(36); // winner gets 12*3
    expect(result.payments[1]).toBe(-12);
    expect(result.payments[2]).toBe(-12);
    expect(result.payments[3]).toBe(-12);
    expect(result.payments.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("discard win: only discarder pays", () => {
    const player = makePlayer([]);
    const result = fuzhouRuleSet.calculateScore(player, 0, {
      isWin: true,
      winType: "standard",
      multiplier: 1,
    }, {
      isSelfDraw: false,
      discarderIndex: 2,
      extra: { dealerIndex: 3, lianZhuangCount: 0 },
    });
    // base = 0 + 0 + 0 + 5 = 5, discard = 5*2 = 10
    expect(result.payments[0]).toBe(10);
    expect(result.payments[2]).toBe(-10);
    expect(result.payments[1]).toBe(0);
    expect(result.payments[3]).toBe(0);
  });

  it("flower scoring: kongs add flower points", () => {
    const kangMeld: Meld = {
      type: MeldType.AnGang,
      tiles: [ti(suited("wan", 1)), ti(suited("wan", 1)), ti(suited("wan", 1)), ti(suited("wan", 1))],
    };
    const player = makePlayer([], [kangMeld]);
    const result = fuzhouRuleSet.calculateScore(player, 0, {
      isWin: true,
      winType: "standard",
      multiplier: 1,
    }, {
      isSelfDraw: false,
      discarderIndex: 1,
      extra: { dealerIndex: 3, lianZhuangCount: 0 },
    });
    // flower points = 2 (an gang), base = 2 + 0 + 0 + 5 = 7, discard = 7*2 = 14
    expect(result.payments[0]).toBe(14);
    expect(result.payments[1]).toBe(-14);
  });

  it("special hand bonus (golden sparrow)", () => {
    const player = makePlayer([]);
    const result = fuzhouRuleSet.calculateScore(player, 0, {
      isWin: true,
      winType: "golden_sparrow",
      multiplier: 60,
    }, {
      isSelfDraw: false,
      discarderIndex: 1,
      extra: { dealerIndex: 3, lianZhuangCount: 0 },
    });
    // base = 0+0+0+5 = 5, discard = 5*2 + 60 = 70
    expect(result.payments[0]).toBe(70);
    expect(result.payments[1]).toBe(-70);
  });

  it("lianZhuang adds to base score", () => {
    const player = makePlayer([]);
    const result = fuzhouRuleSet.calculateScore(player, 0, {
      isWin: true,
      winType: "standard",
      multiplier: 1,
    }, {
      isSelfDraw: false,
      discarderIndex: 1,
      extra: { dealerIndex: 0, lianZhuangCount: 3 },
    });
    // base = 0 + 0 + 3 + 5 = 8, discard = 8*2 = 16
    expect(result.payments[0]).toBe(16);
    expect(result.payments[1]).toBe(-16);
  });

  it("complete flower set gives bonus (4 seasons = 6 pts)", () => {
    const flowers = [
      ti({ kind: "season", seasonType: "spring" }),
      ti({ kind: "season", seasonType: "summer" }),
      ti({ kind: "season", seasonType: "autumn" }),
      ti({ kind: "season", seasonType: "winter" }),
    ];
    const player = makePlayer([], [], flowers);
    const result = fuzhouRuleSet.calculateScore(player, 0, {
      isWin: true,
      winType: "standard",
      multiplier: 1,
    }, {
      isSelfDraw: false,
      discarderIndex: 1,
      extra: { dealerIndex: 3, lianZhuangCount: 0 },
    });
    // flower points = 6 (complete season set), base = 6+0+0+5 = 11, discard = 11*2 = 22
    expect(result.payments[0]).toBe(22);
    expect(result.payments[1]).toBe(-22);
  });
});

// ─── Response Actions ───

describe("getResponseActions", () => {
  it("detects peng opportunity", () => {
    const hand = [ti(suited("wan", 1)), ti(suited("wan", 1)), ti(suited("wan", 3))];
    const discard = ti(suited("wan", 1));
    const result = fuzhouRuleSet.getResponseActions(makePlayer(hand), discard, {
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
    const discard = ti(suited("wan", 1));
    const result = fuzhouRuleSet.getResponseActions(makePlayer(hand), discard, {
      gameState: makeGameState(1, 0),
      playerIndex: 1,
      discarderIndex: 0,
    });
    expect(result.canMingGang).toBe(true);
  });

  it("detects chi from left neighbor", () => {
    const hand = [ti(suited("wan", 2)), ti(suited("wan", 3)), ti(suited("tiao", 5))];
    const discard = ti(suited("wan", 1));
    const result = fuzhouRuleSet.getResponseActions(makePlayer(hand), discard, {
      gameState: makeGameState(1, 0),
      playerIndex: 1,
      discarderIndex: 0,
    });
    expect(result.chiOptions.length).toBeGreaterThan(0);
  });

  it("disallows chi from non-left neighbor", () => {
    const hand = [ti(suited("wan", 2)), ti(suited("wan", 3)), ti(suited("tiao", 5))];
    const discard = ti(suited("wan", 1));
    const result = fuzhouRuleSet.getResponseActions(makePlayer(hand), discard, {
      gameState: makeGameState(1, 2),
      playerIndex: 1,
      discarderIndex: 2,
    });
    expect(result.chiOptions.length).toBe(0);
  });

  it("blocks claims on golden tile discards", () => {
    const gold = suited("wan", 5);
    const hand = [ti(gold), ti(gold), ti(suited("wan", 3))];
    const discard = ti(gold);
    const result = fuzhouRuleSet.getResponseActions(makePlayer(hand), discard, {
      gameState: makeGameState(1, 0, gold),
      playerIndex: 1,
      discarderIndex: 0,
    });
    expect(result.canPeng).toBe(false);
    expect(result.canMingGang).toBe(false);
    expect(result.chiOptions.length).toBe(0);
  });

  it("detects hu with wildcard support", () => {
    const gold = suited("wan", 5);
    // Hand needs a 3wan to complete, but has gold(=5wan) as wildcard
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(gold), // gold subs for 3wan
      ti(suited("wan", 6)), ti(suited("wan", 7)), ti(suited("wan", 8)),
      ti(suited("bing", 1)), ti(suited("bing", 2)), ti(suited("bing", 3)),
      ti(suited("tiao", 4)), ti(suited("tiao", 5)), ti(suited("tiao", 6)),
      ti(wind("east")),
    ];
    const discard = ti(wind("east"));
    const result = fuzhouRuleSet.getResponseActions(makePlayer(hand), discard, {
      gameState: makeGameState(1, 0, gold),
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
    const drawn = ti(suited("tiao", 5));
    const result = fuzhouRuleSet.getPostDrawActions(makePlayer(hand), drawn, {
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
    const result = fuzhouRuleSet.getPostDrawActions(makePlayer(hand), ti(suited("tiao", 1)), {
      gameState: makeGameState(0),
      playerIndex: 0,
    });
    expect(result.canHu).toBe(true);
  });

  it("detects an gang", () => {
    const hand = [
      ti(suited("wan", 1)), ti(suited("wan", 1)), ti(suited("wan", 1)),
      ti(suited("bing", 5)),
    ];
    const result = fuzhouRuleSet.getPostDrawActions(makePlayer(hand), ti(suited("wan", 1)), {
      gameState: makeGameState(0),
      playerIndex: 0,
    });
    expect(result.anGangOptions.length).toBe(1);
  });

  it("detects bu gang", () => {
    const pengMeld: Meld = {
      type: MeldType.Peng,
      tiles: [ti(suited("wan", 5)), ti(suited("wan", 5)), ti(suited("wan", 5))],
    };
    const hand = [ti(suited("bing", 1)), ti(suited("bing", 2))];
    const result = fuzhouRuleSet.getPostDrawActions(makePlayer(hand, [pengMeld]), ti(suited("wan", 5)), {
      gameState: makeGameState(0),
      playerIndex: 0,
    });
    expect(result.buGangOptions.length).toBe(1);
    expect(result.buGangOptions[0].meldIndex).toBe(0);
  });

  it("detects 三金倒 instant win on drawing 3rd gold", () => {
    const gold = suited("wan", 5);
    const hand = [
      ti(gold), ti(gold),
      ti(suited("wan", 1)), ti(suited("wan", 2)), ti(suited("wan", 3)),
      ti(suited("bing", 4)), ti(suited("bing", 5)), ti(suited("bing", 6)),
      ti(suited("tiao", 7)), ti(suited("tiao", 8)), ti(suited("tiao", 9)),
      ti(wind("east")), ti(wind("south")),
    ];
    const result = fuzhouRuleSet.getPostDrawActions(makePlayer(hand), ti(gold), {
      gameState: makeGameState(0, undefined, gold),
      playerIndex: 0,
    });
    expect(result.canHu).toBe(true);
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

  it("has 金牌 center info label", () => {
    expect(config.centerInfoLabel).toBe("金牌");
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
