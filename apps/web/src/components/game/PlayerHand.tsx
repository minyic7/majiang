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
  // Combine hand + drawn tile into one row, drawn tile at the end
  const allTiles = drawnTile ? [...tiles, drawnTile] : tiles;
  let prevSuit: string | undefined;

  return (
    <div className="flex gap-0.5 items-center justify-center min-w-0 flex-shrink overflow-x-auto">
      {allTiles.map((t, i) => {
        const isDrawn = drawnTile && t.id === drawnTile.id;
        const needsGap = !isDrawn && prevSuit !== undefined && t.suit !== undefined && t.suit !== prevSuit;
        if (!isDrawn) prevSuit = t.suit;
        return (
          <div key={t.id} className={`${needsGap ? "ml-1" : ""} ${isDrawn ? "ml-2" : ""}`}>
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
          </div>
        );
      })}
    </div>
  );
}
