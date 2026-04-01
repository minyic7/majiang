import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Tile from "../tile/Tile.js";

interface HandTile {
  id: number;
  char: string;
  suit?: string;
}

interface PlayerHandProps {
  tiles: HandTile[];
  drawnTile?: HandTile | null;
  onSelect?: (id: number) => void;
  onDiscard?: (id: number) => void;
  selectedId?: number | null;
  size?: "sm" | "md" | "lg";
}

export default function PlayerHand({ tiles, drawnTile, onSelect, onDiscard, selectedId, size = "lg" }: PlayerHandProps) {
  const prefersReduced = useReducedMotion();

  // Combine hand + drawn tile into one row, drawn tile at the end
  const allTiles = drawnTile ? [...tiles, drawnTile] : tiles;
  let prevSuit: string | undefined;

  const duration = prefersReduced ? 0 : 0.2;

  return (
    <div className="flex gap-0.5 items-center justify-center min-w-0 flex-shrink overflow-x-auto">
      <AnimatePresence mode="popLayout">
        {allTiles.map((t) => {
          const isDrawn = drawnTile && t.id === drawnTile.id;
          const needsGap = !isDrawn && prevSuit !== undefined && t.suit !== undefined && t.suit !== prevSuit;
          if (!isDrawn) prevSuit = t.suit;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ duration, type: "tween" }}
              className={`${needsGap ? "ml-1" : ""} ${isDrawn ? "ml-2" : ""}`}
            >
              <Tile
                char={t.char}
                variant="face"
                size={size}
                selected={selectedId === t.id}
                drawn={!!isDrawn}
                onClick={() => {
                  if (selectedId === t.id) {
                    onDiscard?.(t.id);
                  } else {
                    onSelect?.(t.id);
                  }
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
