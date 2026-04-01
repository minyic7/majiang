interface TileWallProps {
  remaining: number;
  totalStacks?: number;
  direction: "horizontal" | "vertical";
  consumeFrom?: "start" | "end";
  /** Which side the top layer offsets toward (faces center of table) */
  faceCenter?: "top" | "bottom" | "left" | "right";
}

const TILE_W = 14;
const TILE_H = 21;
const OFFSET = 2;

export default function TileWall({
  remaining,
  totalStacks = 18,
  direction,
  consumeFrom = "start",
  faceCenter = "bottom",
}: TileWallProps) {
  const fullStacks = Math.floor(remaining / 2);
  const hasHalf = remaining % 2 === 1;
  const totalVisible = fullStacks + (hasHalf ? 1 : 0);

  // Build array of stack sizes, aligned based on consumeFrom
  const stacks: number[] = [];
  if (consumeFrom === "start") {
    // Consumed from start → remaining tiles at the end
    for (let i = 0; i < totalVisible; i++) {
      stacks.push(i < fullStacks ? 2 : 1);
    }
  } else {
    // Consumed from end → remaining tiles at the start
    for (let i = 0; i < totalVisible; i++) {
      stacks.push(i < fullStacks ? 2 : 1);
    }
  }

  // Top layer offset direction
  const offX = faceCenter === "left" ? -OFFSET : faceCenter === "right" ? OFFSET : 0;
  const offY = faceCenter === "top" ? -OFFSET : faceCenter === "bottom" ? OFFSET : 0;

  const isHorizontal = direction === "horizontal";

  return (
    <div className={`flex ${isHorizontal ? "flex-row" : "flex-col"} gap-px`}>
      {stacks.map((count, i) => (
        <div
          key={i}
          className="relative shrink-0"
          style={{
            width: isHorizontal ? TILE_W + Math.abs(offX) : TILE_H + Math.abs(offX),
            height: isHorizontal ? TILE_H + Math.abs(offY) : TILE_W + Math.abs(offY),
          }}
        >
          {/* Bottom layer */}
          <div
            className="absolute rounded-sm"
            style={{
              width: isHorizontal ? TILE_W : TILE_H,
              height: isHorizontal ? TILE_H : TILE_W,
              background: "linear-gradient(135deg, #3a6530, #2d5025)",
              border: "0.5px solid #4a7838",
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              top: offY > 0 ? 0 : Math.abs(offY),
              left: offX > 0 ? 0 : Math.abs(offX),
            }}
          />
          {/* Top layer */}
          {count === 2 && (
            <div
              className="absolute rounded-sm"
              style={{
                width: isHorizontal ? TILE_W : TILE_H,
                height: isHorizontal ? TILE_H : TILE_W,
                background: "linear-gradient(135deg, #82b860, #68a048)",
                border: "0.5px solid #98c87c",
                boxShadow: "0 1px 3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
                top: offY > 0 ? offY : 0,
                left: offX > 0 ? offX : 0,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
