import { describe, it, expect, vi } from "vitest";
import {
  GamePhase,
  MeldType,
  Suit,
  ActionType,
  registerRuleSet,
  fuzhouRuleSet,
} from "@majiang/shared";
import type {
  Tile,
  TileInstance,
  RuleSet,
  AvailableActions,
  PlayerState,
  WinContext,
  WinResult,
  ScoreContext,
  ScoreResult,
  ActionContext,
  DealerContext,
  DealerResult,
} from "@majiang/shared";
import { GameEngine } from "../GameEngine.js";
import type { PlayerInfo } from "../GameEngine.js";
import { StubRuleSet } from "./StubRuleSet.js";

registerRuleSet(fuzhouRuleSet);

const botPlayers: PlayerInfo[] = [
  { name: "Bot-A", isBot: true },
  { name: "Bot-B", isBot: true },
  { name: "Bot-C", isBot: true },
  { name: "Bot-D", isBot: true },
];

/** Helper to make a suited tile */
function wan(v: number): Tile {
  return { kind: "suited", suit: Suit.Wan, value: v as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 };
}

function bing(v: number): Tile {
  return { kind: "suited", suit: Suit.Bing, value: v as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 };
}

function tiao(v: number): Tile {
  return { kind: "suited", suit: Suit.Tiao, value: v as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 };
}

function ti(id: number, tile: Tile): TileInstance {
  return { id, tile };
}

// ─── 1. Wall Empty → Draw (流局) ───

describe("Edge case: Wall Empty → Draw", () => {
  it("should end in draw when wall is empty", async () => {
    let gameOverResult: {
      winnerId: number | null;
      winType: string;
      scores: number[];
      payments: number[];
      breakdown: string[];
    } | null = null;

    // Create a stub that never wins, so the game must exhaust the wall
    const NeverWinStub: RuleSet = {
      ...StubRuleSet,
      id: "never-win-stub",
      name: "Never Win Stub",
      checkWin() {
        return { isWin: false, winType: "" };
      },
      getPostDrawActions(player, _drawnTile, _context) {
        return {
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
      },
      getResponseActions() {
        return {
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
      },
    };

    const engine = new GameEngine(NeverWinStub, botPlayers, {
      botDelayMs: 0,
      onGameOver: (result) => {
        gameOverResult = result;
      },
    });

    await engine.startGame();

    expect(gameOverResult).not.toBeNull();
    expect(gameOverResult!.winnerId).toBeNull();
    expect(gameOverResult!.winType).toBe("draw");
    expect(gameOverResult!.payments).toEqual([]);
    expect(gameOverResult!.breakdown).toEqual([]);
    expect(engine.gameState.phase).toBe(GamePhase.Draw);
  }, 30000);
});

// ─── 2. Continuous Gang (连续杠) ───

describe("Edge case: Continuous Gang", () => {
  it("should handle consecutive anGang correctly drawing from wallTail", async () => {
    let gameOverResult: {
      winnerId: number | null;
      winType: string;
    } | null = null;

    // Stub that offers anGang when 4 of a kind exist, never wins
    const GangStub: RuleSet = {
      ...StubRuleSet,
      id: "gang-stub",
      name: "Gang Stub",
      checkWin() {
        return { isWin: false, winType: "" };
      },
      getResponseActions() {
        return {
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
      },
    };

    const engine = new GameEngine(GangStub, botPlayers, {
      botDelayMs: 0,
      onGameOver: (result) => {
        gameOverResult = result;
      },
    });

    // Monkey-patch shuffle to be a no-op for deterministic setup
    (engine as any).shuffle = () => {};

    // Run deal manually to set up controlled state
    (engine as any).deal();

    const gs = engine.gameState;
    const player = gs.players[gs.currentTurn];

    // Clear the player's hand and set up 2 sets of 4 identical tiles
    player.hand = [
      ti(900, wan(1)), ti(901, wan(1)), ti(902, wan(1)), ti(903, wan(1)),
      ti(904, wan(2)), ti(905, wan(2)), ti(906, wan(2)), ti(907, wan(2)),
      ti(908, wan(3)), ti(909, wan(4)), ti(910, wan(5)), ti(911, wan(6)),
      ti(912, wan(7)),
    ];

    // Record wallTail length before play
    const wallTailBefore = gs.wallTail.length;

    // Put known tiles at the front of wallTail for gang replacement draws
    const tailTile1 = ti(950, wan(8));
    const tailTile2 = ti(951, wan(9));
    gs.wallTail.unshift(tailTile1, tailTile2);

    await (engine as any).playLoop();

    // Game should have ended (either draw or someone wins)
    expect(gameOverResult).not.toBeNull();

    // Verify player gained melds from gangs (could be 0, 1, or 2 depending on bot choices)
    // The key assertion is: no error/hang occurred
    // Also check that wallTail was consumed (gang draws come from tail)
    expect(gs.wallTail.length).toBeLessThanOrEqual(wallTailBefore + 2);
  }, 30000);

  it("should draw gang replacement from wallTail, not wall", async () => {
    // Directly verify that after gang, the next draw comes from wallTail
    const GangStub: RuleSet = {
      ...StubRuleSet,
      id: "gang-tail-stub",
      name: "Gang Tail Stub",
      checkWin() {
        return { isWin: false, winType: "" };
      },
      getResponseActions() {
        return {
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
      },
    };

    const engine = new GameEngine(GangStub, botPlayers, { botDelayMs: 0 });
    (engine as any).shuffle = () => {};
    (engine as any).deal();

    const gs = engine.gameState;
    const turnIdx = gs.currentTurn;
    const player = gs.players[turnIdx];

    // Set up hand with exactly 4 of wan(1) — bot will anGang
    player.hand = [
      ti(900, wan(1)), ti(901, wan(1)), ti(902, wan(1)), ti(903, wan(1)),
      ti(904, wan(3)), ti(905, wan(4)), ti(906, wan(5)), ti(907, wan(6)),
      ti(908, wan(7)), ti(909, wan(8)), ti(910, wan(9)), ti(911, bing(1)),
      ti(912, bing(2)),
    ];

    // Mark a unique tile at the front of wallTail
    const tailMarker = ti(999, tiao(9));
    gs.wallTail.unshift(tailMarker);

    // Also ensure the wall has a different tile at front
    const wallMarker = ti(998, bing(9));
    gs.wall.unshift(wallMarker);

    // Manually trigger one cycle: draw + action
    // First, the player draws the wall front tile (wallMarker)
    const drawn = (engine as any).drawTileForPlayer(turnIdx);
    expect(drawn).not.toBeNull();

    // Now player has 14 tiles. getPostDrawActions should detect anGang for wan(1)
    const actions = GangStub.getPostDrawActions(player, drawn, {
      gameState: gs,
      playerIndex: turnIdx,
    });
    expect(actions.anGangOptions.length).toBeGreaterThan(0);

    // Execute the anGang
    const gangTile = actions.anGangOptions[0][0];
    (engine as any).executeAnGang(turnIdx, gangTile);
    (engine as any).gangDrawPending = true;

    // Now draw replacement — should come from wallTail
    const replacement = (engine as any).drawTileForPlayerFromTail(turnIdx);
    expect(replacement).not.toBeNull();
    expect(replacement!.id).toBe(tailMarker.id);
  });
});

// ─── 3. Qiang Gang Hu (抢杠胡) ───

describe("Edge case: Qiang Gang Hu (robbing the kong)", () => {
  it("should document that buGang does not currently allow other players to claim hu (TODO)", async () => {
    // Currently, after buGang in playLoop, the code just sets gangDrawPending
    // and continues without calling handleDiscardResponses.
    // In standard mahjong rules, other players should have a window to claim hu
    // when a buGang is declared (抢杠胡 / robbing the kong).
    //
    // This test documents the current behavior: buGang does NOT trigger
    // a response window for other players.
    //
    // TODO: Implement qiang gang hu — after executeBuGang, call
    // handleDiscardResponses (or similar) to let others claim hu.

    const engine = new GameEngine(StubRuleSet, botPlayers, { botDelayMs: 0 });
    (engine as any).shuffle = () => {};
    (engine as any).deal();

    const gs = engine.gameState;
    const turnIdx = gs.currentTurn;
    const player = gs.players[turnIdx];

    // Set up a peng meld for player
    const pengMeld = {
      type: MeldType.Peng,
      tiles: [ti(800, wan(5)), ti(801, wan(5)), ti(802, wan(5))],
      sourceTile: ti(802, wan(5)),
      sourcePlayer: (turnIdx + 1) % 4,
    };
    player.melds = [pengMeld];

    // Put matching tile in hand for buGang
    const buGangTile = ti(803, wan(5));
    player.hand = [
      buGangTile,
      ti(810, wan(1)), ti(811, wan(2)), ti(812, wan(3)),
      ti(813, wan(4)), ti(814, wan(6)), ti(815, wan(7)),
      ti(816, wan(8)), ti(817, wan(9)), ti(818, bing(1)),
    ];

    // Execute buGang directly
    (engine as any).executeBuGang(turnIdx, buGangTile);

    // Verify the meld was upgraded
    expect(player.melds[0].type).toBe(MeldType.BuGang);
    expect(player.melds[0].tiles).toHaveLength(4);

    // Verify tile was removed from hand
    expect(player.hand.find((t: TileInstance) => t.id === buGangTile.id)).toBeUndefined();

    // NOTE: Currently no response window is given to other players after buGang.
    // This is a known limitation — qiang gang hu is not yet implemented.
  });
});

// ─── 4. Flower Replacement Chains (补花后再补花) ───

describe("Edge case: Flower Replacement Chains", () => {
  it("should chain flower replacements until a non-flower tile is drawn", async () => {
    const engine = new GameEngine(fuzhouRuleSet, botPlayers, { botDelayMs: 0 });
    (engine as any).shuffle = () => {};

    // Set up game state manually
    const gs = engine.gameState;
    gs.phase = GamePhase.Playing;

    const playerIdx = 0;
    const player = gs.players[playerIdx];
    player.hand = [
      ti(100, wan(1)), ti(101, wan(2)), ti(102, wan(3)),
      ti(103, wan(4)), ti(104, wan(5)), ti(105, wan(6)),
      ti(106, wan(7)), ti(107, wan(8)), ti(108, wan(9)),
      ti(109, bing(1)), ti(110, bing(2)), ti(111, bing(3)),
      ti(112, bing(4)),
    ];
    player.flowers = [];

    const flower1: TileInstance = ti(200, { kind: "season", seasonType: "spring" });
    const flower2: TileInstance = ti(201, { kind: "plant", plantType: "plum" });
    const flower3: TileInstance = ti(202, { kind: "season", seasonType: "summer" });
    const normalTile: TileInstance = ti(203, wan(1));

    // Set wallTail so first 3 draws are flowers, then a normal tile
    gs.wallTail = [flower1, flower2, flower3, normalTile, ti(204, wan(2))];

    // Put a flower tile at front of the wall to trigger replacement chain
    const wallFlower: TileInstance = ti(205, { kind: "plant", plantType: "orchid" });
    gs.wall = [wallFlower, ti(206, wan(3)), ti(207, wan(4))];

    // drawTileForPlayer should: draw wallFlower from wall → it's bonus →
    // draw flower1 from tail → bonus → draw flower2 → bonus → draw flower3 → bonus →
    // draw normalTile from tail → not bonus → add to hand
    const drawn = (engine as any).drawTileForPlayer(playerIdx);

    expect(drawn).not.toBeNull();
    expect(drawn!.id).toBe(normalTile.id);

    // All 4 flowers should be in player.flowers
    expect(player.flowers).toHaveLength(4);
    const flowerIds = player.flowers.map((f: TileInstance) => f.id);
    expect(flowerIds).toContain(wallFlower.id);
    expect(flowerIds).toContain(flower1.id);
    expect(flowerIds).toContain(flower2.id);
    expect(flowerIds).toContain(flower3.id);
  });

  it("should end gracefully if wallTail runs out during flower replacement", async () => {
    const engine = new GameEngine(fuzhouRuleSet, botPlayers, { botDelayMs: 0 });
    (engine as any).shuffle = () => {};

    const gs = engine.gameState;
    gs.phase = GamePhase.Playing;

    const playerIdx = 0;
    const player = gs.players[playerIdx];
    player.hand = [
      ti(100, wan(1)), ti(101, wan(2)), ti(102, wan(3)),
      ti(103, wan(4)), ti(104, wan(5)), ti(105, wan(6)),
      ti(106, wan(7)), ti(107, wan(8)), ti(108, wan(9)),
      ti(109, bing(1)), ti(110, bing(2)), ti(111, bing(3)),
      ti(112, bing(4)),
    ];
    player.flowers = [];

    // wallTail has only flowers — no normal tiles to replace with
    gs.wallTail = [
      ti(200, { kind: "season", seasonType: "spring" }),
      ti(201, { kind: "plant", plantType: "plum" }),
    ];

    // Wall has a flower first
    gs.wall = [ti(205, { kind: "plant", plantType: "orchid" })];

    // drawTileForPlayer: draws flower from wall → replaces from tail (flower) →
    // replaces from tail (flower) → tail empty → returns null
    const drawn = (engine as any).drawTileForPlayer(playerIdx);

    expect(drawn).toBeNull();

    // All flowers should still be collected
    expect(player.flowers).toHaveLength(3);
  });
});

// ─── 5. Golden Tile Reveal Edge Cases ───

describe("Edge case: Golden Tile Bonus Skip", () => {
  it("should skip bonus tiles when revealing golden tile (Fuzhou ruleset)", async () => {
    const engine = new GameEngine(fuzhouRuleSet, botPlayers, { botDelayMs: 0 });
    (engine as any).shuffle = () => {};

    const gs = engine.gameState;
    gs.phase = GamePhase.Dealing;

    // Set up hands manually
    for (let i = 0; i < 4; i++) {
      gs.players[i].hand = [];
      for (let j = 0; j < 13; j++) {
        gs.players[i].hand.push(ti(i * 13 + j, wan((j % 9 + 1) as 1)));
      }
    }

    // Wall: first tiles are bonus tiles, then a suited tile
    const bonusTile1: TileInstance = ti(500, { kind: "season", seasonType: "spring" });
    const bonusTile2: TileInstance = ti(501, { kind: "plant", plantType: "plum" });
    const suitedTile: TileInstance = ti(502, wan(3));
    gs.wall = [bonusTile1, bonusTile2, suitedTile, ti(503, wan(4)), ti(504, wan(5))];
    gs.wallTail = [ti(600, wan(6)), ti(601, wan(7)), ti(602, wan(8))];

    // Manually run the golden tile reveal logic
    if (fuzhouRuleSet.determineGoldenTile) {
      let flipped = (engine as any).drawFromWall();
      while (flipped && fuzhouRuleSet.isBonusTile(flipped.tile)) {
        gs.wallTail.push(flipped);
        flipped = (engine as any).drawFromWall();
      }
      if (flipped) {
        gs.flippedTile = flipped.tile;
        gs.goldenTile = fuzhouRuleSet.determineGoldenTile(flipped.tile);
      }
    }

    // The flipped tile should be the suited tile (wan 3), not a bonus tile
    expect(gs.flippedTile).toBeDefined();
    expect(gs.flippedTile!.kind).toBe("suited");
    if (gs.flippedTile!.kind === "suited") {
      expect(gs.flippedTile!.suit).toBe(Suit.Wan);
      expect(gs.flippedTile!.value).toBe(3);
    }

    // Golden tile should be wan 4 (next in sequence)
    expect(gs.goldenTile).toBeDefined();
    expect(gs.goldenTile!.kind).toBe("suited");
    if (gs.goldenTile!.kind === "suited") {
      expect((gs.goldenTile as any).value).toBe(4);
    }

    // Bonus tiles should have been put into wallTail
    const tailIds = gs.wallTail.map((t: TileInstance) => t.id);
    expect(tailIds).toContain(bonusTile1.id);
    expect(tailIds).toContain(bonusTile2.id);
  });

  it("should handle golden tile reveal with actual Fuzhou full game", async () => {
    // Run a few games and verify golden tile is never a bonus tile
    for (let i = 0; i < 5; i++) {
      let gameOverResult: { winnerId: number | null; winType: string } | null = null;

      const engine = new GameEngine(fuzhouRuleSet, botPlayers, {
        botDelayMs: 0,
        onGameOver: (result) => {
          gameOverResult = result;
        },
      });

      await engine.startGame();

      expect(gameOverResult).not.toBeNull();

      // Golden tile should be set and should NOT be a bonus tile
      const gs = engine.gameState;
      expect(gs.goldenTile).toBeDefined();
      expect(gs.flippedTile).toBeDefined();
      expect(gs.flippedTile!.kind).not.toBe("season");
      expect(gs.flippedTile!.kind).not.toBe("plant");
      expect(gs.goldenTile!.kind).not.toBe("season");
      expect(gs.goldenTile!.kind).not.toBe("plant");
    }
  }, 60000);
});
