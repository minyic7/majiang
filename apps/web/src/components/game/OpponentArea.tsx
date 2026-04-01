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
  const rotate = position === "west" ? -90 : position === "east" ? 90 : undefined;
  const tileSize = "sm" as const;

  if (position === "north") {
    return (
      <div className="flex flex-col gap-1.5 h-full">
        {/* Hand strip */}
        <div className="shrink-0 flex items-center justify-center h-12">
          <div className="flex gap-0.5">
            {Array.from({ length: handCount }, (_, i) => (
              <Tile key={i} variant="back" size="md" />
            ))}
          </div>
        </div>
        {/* Info row */}
        <div className="flex-1 flex gap-1 min-w-0">
          <Section label="弃牌区" className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-px">
              {discards.map((c, i) => <Tile key={i} char={c} variant="face" size="md" />)}
            </div>
          </Section>
          <Section label="吃碰杠" className="w-24 shrink-0">
            <div className="flex flex-wrap gap-px mt-0.5">
              {melds.flat().map((c, i) => <Tile key={i} char={c} variant="face" size="md" />)}
            </div>
          </Section>
          <div className="flex flex-col gap-1 w-9 shrink-0">
            <div className="flex justify-between items-center">
              <span className={`text-[9px] font-medium ${isCurrentTurn ? "text-amber-300" : "text-white/45"}`}>{name}</span>
            </div>
            <Badge count={handCount} />
            <FlowerIcon count={flowerCount} onClick={onFlowerClick} />
          </div>
        </div>
      </div>
    );
  }

  // West or East — vertical layout
  const isWest = position === "west";
  return (
    <div className={`flex ${isWest ? "flex-row" : "flex-row-reverse"} gap-1.5 h-full`}>
      {/* Hand strip */}
      <div className="w-6 shrink-0 flex items-center justify-center">
        <div className="flex flex-col gap-0.5">
          {Array.from({ length: handCount }, (_, i) => (
            <Tile key={i} variant="back" size="sm" rotate={rotate} />
          ))}
        </div>
      </div>
      {/* Info */}
      <div className="flex-1 flex flex-col gap-1 min-h-0">
        <div className="flex justify-between items-center">
          <span className={`text-[9px] font-medium ${isCurrentTurn ? "text-amber-300" : "text-white/45"}`}>{name}</span>
          <Badge count={handCount} />
          <FlowerIcon count={flowerCount} onClick={onFlowerClick} />
        </div>
        <Section label="弃牌" className="flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col gap-px mt-0.5 items-start">
            {discards.map((c, i) => (
              <Tile key={i} char={c} variant="face" size="sm" rotate={rotate} />
            ))}
          </div>
        </Section>
        {melds.length > 0 && (
        <Section label="吃碰杠" className="shrink-0 overflow-hidden">
          <div className="flex flex-col gap-1 mt-1">
            {melds.map((meld, i) => (
              <div key={i} className="flex gap-px items-center">
                {meld.map((c, j) => (
                  <Tile key={j} char={c} variant="face" size="sm" rotate={rotate} />
                ))}
              </div>
            ))}
          </div>
        </Section>
        )}
      </div>
    </div>
  );
}

function Section({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/[.07] border border-white/[.13] rounded-sm p-1 ${className}`}>
      <span className="text-[8px] text-white/35 font-medium block">{label}</span>
      {children}
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
      className="text-[13px] cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
      title={`花牌 (${count})`}
    >
      🌸{count > 0 && <sup className="text-[7px] text-green-400">{count}</sup>}
    </span>
  );
}
