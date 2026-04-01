import { describe, it, expect, beforeEach } from "vitest";
import { GamePhase, registerRuleSet } from "@majiang/shared";
import type { ClientGameState, AvailableActions } from "@majiang/shared";
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
