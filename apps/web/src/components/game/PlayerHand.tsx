import { useState } from "react";
import Tile from "../tile/Tile.js";

interface HandTile {
  id: number;
  char: string;
  suit?: string; // for suit grouping gap
}

interface PlayerHandProps {
  tiles: HandTile[];
  drawnTile?: HandTile | null;
  onSelect?: (id: number) => void;
  onDiscard?: (id: number) => void;
  selectedId?: number | null;
}

export default function PlayerHand({ tiles, drawnTile, onSelect, onDiscard, selectedId }: PlayerHandProps) {
  // Group tiles by suit for visual spacing
  let prevSuit: string | undefined;

  return (
    <div className="flex items-center">
      <div className="flex gap-0.5 items-center">
        {tiles.map((t) => {
          const needsGap = prevSuit !== undefined && t.suit !== undefined && t.suit !== prevSuit;
          prevSuit = t.suit;
          return (
            <div key={t.id} className={needsGap ? "ml-1" : ""}>
              <Tile
                char={t.char}
                variant="face"
                size="lg"
                selected={selectedId === t.id}
                onClick={() => {
                  if (selectedId === t.id) {
                    // Second click = discard
                    onDiscard?.(t.id);
                  } else {
                    onSelect?.(t.id);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
      {/* Drawn tile — separated */}
      {drawnTile && (
        <div className="ml-3 flex items-center border-l border-white/10 pl-3">
          <Tile
            char={drawnTile.char}
            variant="face"
            size="lg"
            drawn
            selected={selectedId === drawnTile.id}
            onClick={() => {
              if (selectedId === drawnTile.id) {
                onDiscard?.(drawnTile.id);
              } else {
                onSelect?.(drawnTile.id);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
