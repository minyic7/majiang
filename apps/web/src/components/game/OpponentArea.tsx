import Tile from "../tile/Tile.js";

interface OpponentAreaProps {
  name: string;
  handCount: number;
  discards: string[];
  melds: string[][];
  flowerCount: number;
  position: "north" | "west" | "east";
  isCurrentTurn?: boolean;
  onFlowerClick?: () => void;
}

export default function OpponentArea({
  name,
  handCount,
  discards,
  melds,
  flowerCount,
  position,
  isCurrentTurn,
  onFlowerClick,
}: OpponentAreaProps) {
  if (position === "north") {
    return <NorthPlayer
      name={name}
      handCount={handCount}
      discards={discards}
      melds={melds}
      flowerCount={flowerCount}
      isCurrentTurn={isCurrentTurn}
      onFlowerClick={onFlowerClick}
    />;
  }

  return <SidePlayer
    name={name}
    handCount={handCount}
    discards={discards}
    melds={melds}
    flowerCount={flowerCount}
    position={position}
    isCurrentTurn={isCurrentTurn}
    onFlowerClick={onFlowerClick}
  />;
}

/* ── North (对家) — single compact horizontal strip ── */

function NorthPlayer({
  name,
  handCount,
  discards,
  melds,
  flowerCount,
  isCurrentTurn,
  onFlowerClick,
}: Omit<OpponentAreaProps, "position">) {
  return (
    <div className="flex items-center gap-2 h-full overflow-hidden px-1">
      {/* Name + badge */}
      <div className="flex flex-col items-center gap-0.5 shrink-0 w-8">
        <span className={`text-[9px] font-medium leading-tight ${isCurrentTurn ? "text-amber-300" : "text-white/45"}`}>
          {name}
        </span>
        <Badge count={handCount} />
      </div>

      {/* Hand backs */}
      <div className="flex gap-px shrink-0">
        {Array.from({ length: handCount }, (_, i) => (
          <Tile key={i} variant="back" size="sm" />
        ))}
      </div>

      {/* Discards — compact wrapping grid, max 2 rows */}
      <div className="flex flex-wrap gap-px content-start max-h-[42px] overflow-hidden flex-1 min-w-0">
        {discards.map((c, i) => (
          <Tile key={i} char={c} variant="face" size="sm" />
        ))}
      </div>

      {/* Melds */}
      {melds.length > 0 && (
        <div className="flex gap-1 shrink-0">
          {melds.map((meld, i) => (
            <div key={i} className="flex gap-px">
              {meld.map((c, j) => (
                <Tile key={j} char={c} variant="face" size="sm" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Flower */}
      <FlowerIcon count={flowerCount} onClick={onFlowerClick} />
    </div>
  );
}

/* ── West / East — vertical strip, minimal chrome ── */

function SidePlayer({
  name,
  handCount,
  discards,
  melds,
  flowerCount,
  position,
  isCurrentTurn,
  onFlowerClick,
}: OpponentAreaProps) {
  const rotate = position === "west" ? -90 : 90;
  const isWest = position === "west";

  return (
    <div className="flex flex-col gap-1 h-full overflow-hidden">
      {/* Top: name + badge + flower */}
      <div className="flex items-center gap-1 shrink-0 px-0.5">
        <span className={`text-[9px] font-medium flex-1 truncate ${isCurrentTurn ? "text-amber-300" : "text-white/45"}`}>
          {name}
        </span>
        <Badge count={handCount} />
        <FlowerIcon count={flowerCount} onClick={onFlowerClick} />
      </div>

      {/* Hand backs — rotated tiles vertically */}
      <div className={`flex flex-col gap-px items-center shrink-0 ${isWest ? "" : ""}`}>
        {Array.from({ length: handCount }, (_, i) => (
          <Tile key={i} variant="back" size="sm" rotate={rotate} />
        ))}
      </div>

      {/* Discards — rotated, compact vertical list */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-wrap gap-px content-start items-start justify-center">
          {discards.map((c, i) => (
            <Tile key={i} char={c} variant="face" size="sm" rotate={rotate} />
          ))}
        </div>
      </div>

      {/* Melds — rotated groups */}
      {melds.length > 0 && (
        <div className="flex flex-col gap-1 shrink-0 items-center">
          {melds.map((meld, i) => (
            <div key={i} className="flex gap-px">
              {meld.map((c, j) => (
                <Tile key={j} char={c} variant="face" size="sm" rotate={rotate} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="bg-red-700 text-white rounded-full text-[10px] font-medium px-1.5 py-px">
      {count}
    </span>
  );
}

function FlowerIcon({ count, onClick }: { count: number; onClick?: () => void }) {
  return (
    <span
      onClick={onClick}
      className="text-[13px] cursor-pointer opacity-70 hover:opacity-100 transition-opacity shrink-0"
      title={`花牌 (${count})`}
    >
      🌸{count > 0 && <sup className="text-[7px] text-green-400">{count}</sup>}
    </span>
  );
}
