import { useMemo } from "react";
import { useGameStore } from "../stores/gameStore.js";
import { getUIConfig, tileKey } from "@majiang/shared";
import type { TrackerSection } from "@majiang/shared";

export function useTileTracker(): TrackerSection[] | null {
  const gameState = useGameStore((s) => s.gameState);

  return useMemo(() => {
    if (!gameState) return null;

    const { trackerLayout: sections } = getUIConfig();

    // Count all visible tiles across all players
    const visibleCounts = new Map<string, number>();

    const increment = (key: string) => {
      visibleCounts.set(key, (visibleCounts.get(key) ?? 0) + 1);
    };

    for (const player of gameState.players) {
      // Discards
      for (const discard of player.discards) {
        increment(tileKey(discard.tile));
      }

      // Melds (exposed tiles)
      for (const meld of player.melds) {
        for (const ti of meld.tiles) {
          increment(tileKey(ti.tile));
        }
      }

      // Flowers
      for (const flower of player.flowers) {
        increment(tileKey(flower.tile));
      }
    }

    // Own hand (only the local player can see their hand)
    const myHand = gameState.players[gameState.myIndex]?.hand;
    if (myHand) {
      for (const ti of myHand) {
        increment(tileKey(ti.tile));
      }
    }

    // Golden tile counts as visible if present
    if (gameState.goldenTile) {
      increment(tileKey(gameState.goldenTile));
    }

    // Compute remaining for each tracker tile
    return sections.map((section) => ({
      ...section,
      tiles: section.tiles.map((tile) => ({
        ...tile,
        remaining: tile.copies - (visibleCounts.get(tile.id) ?? 0),
      })),
    }));
  }, [gameState]);
}
