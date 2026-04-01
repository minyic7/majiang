import { useMemo } from "react";

interface TileWallProps {
  /** Total remaining tiles (draws from head, supplements from tail) */
  remaining: number;
  /** Total tile positions (stacks = positions, each stack has 2 tiles) */
  totalStacks?: number;
  size?: number;
  /** How many tiles drawn from head (consumed from front) */
  drawnFromHead?: number;
  /** How many tiles drawn from tail (supplements) */
  drawnFromTail?: number;
}

const TILE_W = 14;
const TILE_H = 9;
const GAP = 1;
const LAYER_OFFSET = 2; // top layer offset for 3D effect

interface StackPos {
  x: number;
  y: number;
  w: number;
  h: number;
  side: "top" | "right" | "bottom" | "left";
}

function computePositions(size: number): StackPos[] {
  const positions: StackPos[] = [];
  // Top: left to right (draw direction →)
  for (let x = 0; x < size - TILE_W; x += TILE_W + GAP) {
    positions.push({ x, y: 0, w: TILE_W, h: TILE_H, side: "top" });
  }
  // Right: top to bottom
  for (let y = TILE_H + GAP; y < size - TILE_W; y += TILE_W + GAP) {
    positions.push({ x: size - TILE_H, y, w: TILE_H, h: TILE_W, side: "right" });
  }
  // Bottom: right to left
  for (let x = size - TILE_W; x >= TILE_H; x -= TILE_W + GAP) {
    positions.push({ x, y: size - TILE_H, w: TILE_W, h: TILE_H, side: "bottom" });
  }
  // Left: bottom to top
  for (let y = size - TILE_W; y > TILE_H + GAP; y -= TILE_W + GAP) {
    positions.push({ x: 0, y, w: TILE_H, h: TILE_W, side: "left" });
  }
  return positions;
}

export default function TileWall({
  remaining,
  totalStacks,
  size = 300,
  drawnFromHead = 0,
  drawnFromTail = 0,
}: TileWallProps) {
  const positions = useMemo(() => computePositions(size), [size]);
  const maxStacks = totalStacks ?? positions.length;

  // Each stack has 2 tiles. Remaining tiles maps to stacks:
  // - Full stack (2 tiles) = both layers visible
  // - Half stack (1 tile) = bottom layer only
  // - Empty = nothing
  // Draw from head = stacks removed from index 0
  // Draw from tail = stacks removed from end

  const totalTiles = remaining;
  const headEmpty = drawnFromHead > 0 ? Math.ceil(drawnFromHead / 2) : 0;
  const tailEmpty = drawnFromTail > 0 ? Math.ceil(drawnFromTail / 2) : 0;

  // Simple approach: distribute remaining tiles across visible stacks
  const visibleStart = headEmpty;
  const visibleEnd = maxStacks - tailEmpty;
  const visibleStacks = Math.max(0, visibleEnd - visibleStart);
  const fullStacks = Math.floor(totalTiles / 2);
  const hasHalf = totalTiles % 2 === 1;

  return (
    <svg width={size} height={size} className="block">
      {/* Shadow filter for top layer */}
      <defs>
        <filter id="stackShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.5" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>

      {positions.map((p, i) => {
        if (i < visibleStart || i >= visibleEnd) return null;

        const stackIndex = i - visibleStart;
        // Count from head: first stacks are full, last might be half
        const tilesInStack = stackIndex < fullStacks ? 2 : stackIndex === fullStacks && hasHalf ? 1 : 0;
        if (tilesInStack === 0) return null;

        // Layer offsets based on wall side
        const topDx = p.side === "left" ? LAYER_OFFSET : p.side === "right" ? -LAYER_OFFSET : 0;
        const topDy = p.side === "top" ? LAYER_OFFSET : p.side === "bottom" ? -LAYER_OFFSET : 0;

        return (
          <g key={i}>
            {/* Bottom layer */}
            <rect
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              rx={1.5}
              fill="#5C8C48"
              stroke="#7CAC64"
              strokeWidth={0.5}
            />
            {/* Top layer (only if stack has 2 tiles) */}
            {tilesInStack === 2 && (
              <rect
                x={p.x + topDx}
                y={p.y + topDy}
                width={p.w}
                height={p.h}
                rx={1.5}
                fill="#78A860"
                stroke="#98C87C"
                strokeWidth={0.5}
                filter="url(#stackShadow)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
