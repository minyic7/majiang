import { describe, it, expect } from "vitest";
import { GamePhase, Suit, registerRuleSet, fuzhouRuleSet } from "@majiang/shared";
import type { ClientGameState, Tile, TileInstance, RuleSet } from "@majiang/shared";
import { GameEngine } from "../GameEngine.js";
import type { PlayerInfo, GameEngineCallbacks } from "../GameEngine.js";
import { StubRuleSet } from "./StubRuleSet.js";

registerRuleSet(StubRuleSet);

const testPlayers: PlayerInfo[] = [
  { name: "Alice", isBot: true },
  { name: "Bob", isBot: true },
  { name: "Charlie", isBot: true },
  { name: "Diana", isBot: true },
];

describe("GameEngine", () => {
  it("should create with correct initial state", () => {
    const engine = new GameEngine(StubRuleSet, testPlayers);
    const gs = engine.gameState;

    expect(gs.phase).toBe(GamePhase.Waiting);
    expect(gs.players).toHaveLength(4);
    expect(gs.ruleSetId).toBe("stub");

    // Exactly one dealer
    const dealers = gs.players.filter((p) => p.isDealer);
    expect(dealers).toHaveLength(1);

    // All seat winds assigned
    const winds = gs.players.map((p) => p.seatWind);
    expect(winds).toContain("east");
    expect(winds).toContain("south");
    expect(winds).toContain("west");
    expect(winds).toContain("north");
  });

  it("should deal tiles and transition to playing", async () => {
    const stateUpdates: ClientGameState[] = [];
    const callbacks: GameEngineCallbacks = {
      onStateUpdate: (_idx, state) => stateUpdates.push(state),
      onGameOver: () => {},
      botDelayMs: 0,
    };

    const engine = new GameEngine(StubRuleSet, testPlayers, callbacks);

    // Start game (bots play automatically, game will finish)
    await engine.startGame();

    // Game should have ended (either finished or draw)
    expect([GamePhase.Finished, GamePhase.Draw]).toContain(engine.gameState.phase);

    // Should have received state updates
    expect(stateUpdates.length).toBeGreaterThan(0);
  });

  it("should deal correct number of tiles to each player", () => {
    const engine = new GameEngine(StubRuleSet, testPlayers);

    // Access deal via startGame — but we need to check state after dealing
    // We'll manually check by looking at the first state update
    const states: ClientGameState[] = [];
    const engineWithCallbacks = new GameEngine(StubRuleSet, testPlayers, {
      onStateUpdate: (idx, state) => {
        if (idx === 0) states.push(state);
      },
    });

    // The first state update after deal should have 13 tiles per player
    const firstUpdatePromise = new Promise<ClientGameState>((resolve) => {
      new GameEngine(StubRuleSet, testPlayers, {
        onStateUpdate: (idx, state) => {
          if (idx === 0 && state.phase === GamePhase.Playing) {
            resolve(state);
          }
        },
        botDelayMs: 0,
      }).startGame();
    });

    return firstUpdatePromise.then((state) => {
      // Player 0 should see their own hand
      expect(state.players[0].hand).toBeDefined();
      expect(state.players[0].hand!.length).toBe(StubRuleSet.initialHandSize);

      // Other players' hands should be hidden
      expect(state.players[1].hand).toBeUndefined();
      expect(state.players[2].hand).toBeUndefined();
      expect(state.players[3].hand).toBeUndefined();

      // But handCount should be set
      expect(state.players[1].handCount).toBe(StubRuleSet.initialHandSize);
    });
  });

  it("should produce valid ClientGameState that hides other hands", () => {
    const engine = new GameEngine(StubRuleSet, testPlayers);

    // Manually check toClientGameState
    const clientState = engine.toClientGameState(2);
    expect(clientState.myIndex).toBe(2);
    expect(clientState.ruleSetId).toBe("stub");

    // Player 2 should see their own hand (empty before deal)
    expect(clientState.players[2].hand).toBeDefined();
    // Other players should not
    expect(clientState.players[0].hand).toBeUndefined();
    expect(clientState.players[1].hand).toBeUndefined();
    expect(clientState.players[3].hand).toBeUndefined();
  });

  it("should complete a full game with all bots", async () => {
    let gameOverResult: { winnerId: number | null; winType: string; scores: number[] } | null = null;

    const engine = new GameEngine(StubRuleSet, testPlayers, {
      onGameOver: (result) => {
        gameOverResult = result;
      },
      botDelayMs: 0,
    });

    await engine.startGame();

    expect(gameOverResult).not.toBeNull();
    expect(gameOverResult!.scores).toHaveLength(4);

    if (gameOverResult!.winnerId !== null) {
      expect(engine.gameState.phase).toBe(GamePhase.Finished);
    } else {
      expect(engine.gameState.phase).toBe(GamePhase.Draw);
      expect(gameOverResult!.winType).toBe("draw");
    }
  });

  it("should track wall remaining in client state", async () => {
    let lastWallRemaining = -1;

    const engine = new GameEngine(StubRuleSet, testPlayers, {
      onStateUpdate: (idx, state) => {
        if (idx === 0) {
          lastWallRemaining = state.wallRemaining;
        }
      },
      botDelayMs: 0,
    });

    await engine.startGame();

    // Wall should have been depleted during game
    expect(lastWallRemaining).toBeGreaterThanOrEqual(0);
  });
});

describe("GameEngine - ClientGameState privacy", () => {
  it("should show correct wallRemaining and wallTailRemaining", () => {
    const engine = new GameEngine(StubRuleSet, testPlayers);
    const state = engine.toClientGameState(0);

    expect(typeof state.wallRemaining).toBe("number");
    expect(typeof state.wallTailRemaining).toBe("number");
    expect(state.wallRemaining).toBeGreaterThanOrEqual(0);
    expect(state.wallTailRemaining).toBeGreaterThanOrEqual(0);
  });

  it("should include melds, discards, and flowers for all players", () => {
    const engine = new GameEngine(StubRuleSet, testPlayers);
    const state = engine.toClientGameState(1);

    for (const player of state.players) {
      expect(Array.isArray(player.melds)).toBe(true);
      expect(Array.isArray(player.discards)).toBe(true);
      expect(Array.isArray(player.flowers)).toBe(true);
    }
  });
});

describe("GameEngine - chained claims", () => {
  it("should handle chained peng claims: peng → discard → peng → discard", async () => {
    const players: PlayerInfo[] = [
      { name: "P0", isBot: true },
      { name: "P1", isBot: true },
      { name: "P2", isBot: true },
      { name: "P3", isBot: true },
    ];

    const wan = (value: number, id: number): TileInstance => ({
      id,
      tile: { kind: "suited", suit: Suit.Wan, value } as Tile,
    });

    let gameOverResult: { winnerId: number | null; winType: string } | null = null;

    const engine = new GameEngine(StubRuleSet, players, {
      botDelayMs: 0,
      onGameOver: (result) => {
        gameOverResult = result;
      },
    });

    const gs = engine.gameState;
    gs.dealerIndex = 0;
    gs.currentTurn = 0;
    for (let i = 0; i < 4; i++) {
      gs.players[i].isDealer = i === 0;
    }

    // Setup: P0 hand is all wan1 so bot always discards wan1.
    // P1 has 2x wan1 (can peng) + 11x wan2 (after peng, all wan2, always discards wan2).
    // P2 has 2x wan2 (can peng after P1 discards wan2) + 11x wan3.
    // P3 has misc tiles (no matching pairs for wan1/wan2/wan3).
    gs.players[0].hand = Array.from({ length: 13 }, (_, i) => wan(1, 100 + i));
    gs.players[1].hand = [
      wan(1, 200), wan(1, 201),
      ...Array.from({ length: 11 }, (_, i) => wan(2, 202 + i)),
    ];
    gs.players[2].hand = [
      wan(2, 300), wan(2, 301),
      ...Array.from({ length: 11 }, (_, i) => wan(3, 302 + i)),
    ];
    gs.players[3].hand = Array.from({ length: 13 }, (_, i) => wan(4, 400 + i));

    // Wall: first tile is wan1 (P0 draws this, hand stays all wan1, discards wan1).
    // Remaining tiles let the game finish after the chain.
    gs.wall = [
      wan(1, 500),
      wan(5, 501), wan(5, 502), wan(5, 503), wan(5, 504),
    ];
    gs.wallTail = [];
    gs.phase = GamePhase.Playing;

    await (engine as any).playLoop();

    // Player 1 should have a peng meld of wan1
    const p1Melds = gs.players[1].melds;
    expect(p1Melds.length).toBeGreaterThanOrEqual(1);
    expect(p1Melds[0].tiles.some((t: TileInstance) =>
      t.tile.kind === "suited" && (t.tile as any).value === 1
    )).toBe(true);

    // Player 2 should have a peng meld of wan2 (chained claim worked!)
    const p2Melds = gs.players[2].melds;
    expect(p2Melds.length).toBeGreaterThanOrEqual(1);
    expect(p2Melds[0].tiles.some((t: TileInstance) =>
      t.tile.kind === "suited" && (t.tile as any).value === 2
    )).toBe(true);

    // Player 2 discarded after peng (went through discard flow, not draw)
    expect(gs.players[2].discards.length).toBeGreaterThanOrEqual(1);

    // Game should end in a draw (wall runs out)
    expect(gameOverResult).not.toBeNull();
    expect(gameOverResult!.winType).toBe("draw");
  });
});

describe("GameEngine - golden tile", () => {
  const goldenPlayers: PlayerInfo[] = [
    { name: "P0", isBot: true },
    { name: "P1", isBot: true },
    { name: "P2", isBot: true },
    { name: "P3", isBot: true },
  ];

  it("should reveal golden tile during deal when RuleSet supports it", async () => {
    const engine = new GameEngine(fuzhouRuleSet, goldenPlayers, { botDelayMs: 0 });
    await engine.startGame();

    // After deal, goldenTile and flippedTile should be set
    expect(engine.gameState.goldenTile).toBeDefined();
    expect(engine.gameState.flippedTile).toBeDefined();
  });

  it("should not reveal golden tile for RuleSets without determineGoldenTile", async () => {
    const engine = new GameEngine(StubRuleSet, goldenPlayers, { botDelayMs: 0 });
    await engine.startGame();

    // StubRuleSet has no determineGoldenTile, so these should be undefined
    expect(engine.gameState.goldenTile).toBeUndefined();
    expect(engine.gameState.flippedTile).toBeUndefined();
  });

  it("should include goldenTile and flippedTile in ClientGameState", async () => {
    const states: ClientGameState[] = [];
    const engine = new GameEngine(fuzhouRuleSet, goldenPlayers, {
      botDelayMs: 0,
      onStateUpdate: (_idx, state) => {
        if (_idx === 0) states.push(state);
      },
    });
    await engine.startGame();

    // Find a state after dealing (Playing phase)
    const playingState = states.find((s) => s.phase === GamePhase.Playing);
    expect(playingState).toBeDefined();
    expect(playingState!.goldenTile).toBeDefined();
    expect(playingState!.flippedTile).toBeDefined();
  });

  it("should skip bonus tiles when flipping for golden tile", () => {
    // Create a RuleSet stub that has determineGoldenTile and bonus tiles
    const ruleSetWithGolden: RuleSet = {
      ...StubRuleSet,
      id: "stub-golden",
      hasBonusTiles: true,
      isBonusTile(tile: Tile): boolean {
        return tile.kind === "season" || tile.kind === "plant";
      },
      determineGoldenTile(flippedTile: Tile): Tile {
        // Simple: just return the tile itself as the golden tile
        return flippedTile;
      },
    };

    const engine = new GameEngine(ruleSetWithGolden, goldenPlayers);
    const gs = engine.gameState;

    // Pre-set hands so deal() doesn't need to deal from wall
    for (const p of gs.players) {
      p.hand = Array.from({ length: 13 }, (_, i) => ({
        id: 1000 + i,
        tile: { kind: "suited", suit: Suit.Wan, value: 1 } as Tile,
      }));
    }

    // Override shuffle to be a no-op so we control exact wall order
    (engine as any).shuffle = () => {};

    // Set up wall: bonus tiles at front, then a suited tile for the golden tile flip
    // deal() will re-create the wall from createTilePool, so we override createTilePool too
    // Actually simpler: just override the deal internals by monkey-patching
    // Let's instead directly test the golden tile reveal logic post-deal
    // by setting up the wall manually and calling deal()

    // Override createTilePool to return controlled tiles:
    // 52 suited tiles for hands (4 players x 13) + 2 bonus + 1 suited for golden flip
    const controlledTiles: Tile[] = [];
    // 52 wan-1 tiles for dealing
    for (let i = 0; i < 52; i++) {
      controlledTiles.push({ kind: "suited", suit: Suit.Wan, value: 1 } as Tile);
    }
    // These will end up in the wall after dealing:
    // 2 bonus tiles followed by suited wan-5
    controlledTiles.push({ kind: "season", seasonType: "spring" });
    controlledTiles.push({ kind: "season", seasonType: "summer" });
    controlledTiles.push({ kind: "suited", suit: Suit.Wan, value: 5 } as Tile);
    // A few more tiles for the wall tail
    for (let i = 0; i < 14; i++) {
      controlledTiles.push({ kind: "suited", suit: Suit.Wan, value: 2 } as Tile);
    }

    ruleSetWithGolden.createTilePool = () => controlledTiles;

    (engine as any).deal();

    // The bonus tiles should have been skipped
    // The flipped tile should be wan-5
    expect(gs.flippedTile).toEqual({ kind: "suited", suit: Suit.Wan, value: 5 });
    expect(gs.goldenTile).toEqual({ kind: "suited", suit: Suit.Wan, value: 5 });
  });
});
