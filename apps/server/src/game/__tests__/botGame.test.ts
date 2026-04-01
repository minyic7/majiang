import { describe, it, expect } from "vitest";
import { GamePhase, registerRuleSet, fuzhouRuleSet } from "@majiang/shared";
import { GameEngine } from "../GameEngine.js";
import type { PlayerInfo } from "../GameEngine.js";

registerRuleSet(fuzhouRuleSet);

const botPlayers: PlayerInfo[] = [
  { name: "Bot-A", isBot: true },
  { name: "Bot-B", isBot: true },
  { name: "Bot-C", isBot: true },
  { name: "Bot-D", isBot: true },
];

describe("Bot AI full game validation", () => {
  for (let gameNum = 1; gameNum <= 10; gameNum++) {
    it(`game ${gameNum}: completes without errors`, async () => {
      let gameOverResult: {
        winnerId: number | null;
        winType: string;
        scores: number[];
      } | null = null;

      const engine = new GameEngine(fuzhouRuleSet, botPlayers, {
        botDelayMs: 0,
        onGameOver: (result) => {
          gameOverResult = result;
        },
      });

      await engine.startGame();

      // Game should have ended
      expect(gameOverResult).not.toBeNull();
      expect(gameOverResult!.scores).toHaveLength(4);

      // Scores should be zero-sum
      const totalScore = gameOverResult!.scores.reduce((a, b) => a + b, 0);
      expect(totalScore).toBe(0);

      // Golden tile should have been set (Fuzhou feature)
      expect(engine.gameState.goldenTile).toBeDefined();
      expect(engine.gameState.flippedTile).toBeDefined();

      // Phase should be Finished or Draw
      expect([GamePhase.Finished, GamePhase.Draw]).toContain(
        engine.gameState.phase,
      );
    }, 30000);
  }
});
