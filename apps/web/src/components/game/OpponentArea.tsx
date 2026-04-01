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

export default function OpponentArea(props: OpponentAreaProps) {
  if (props.position === "north") return <NorthPlayer {...props} />;
  return <SidePlayer {...props} />;
}

/* ── North (对家) ──
   Layout from wireframe:
   Row 1: hand backs (full width strip)
   Row 2: [discards (flex-1)] [melds (shrink)]
*/
function NorthPlayer({
  name, handCount, discards, melds, flowerCount, isCurrentTurn, onFlowerClick,
}: OpponentAreaProps) {
  return (
    <div className="flex flex-col gap-1 h-full overflow-hidden">
      {/* Row 1: hand backs */}
      <div className="shrink-0 flex items-center gap-1 px-0.5">
        <NameBadge name={name} count={handCount} isCurrentTurn={isCurrentTurn} />
        <div className="flex gap-px flex-1 justify-center">
          {Array.from({ length: handCount }, (_, i) => (
            <Tile key={i} variant="back" size="sm" />
          ))}
        </div>
        <FlowerIcon count={flowerCount} onClick={onFlowerClick} />
      </div>
      {/* Row 2: discards + melds side by side */}
      <div className="flex-1 min-h-0 flex gap-1 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex flex-wrap gap-px content-start">
            {discards.map((c, i) => <Tile key={i} char={c} variant="face" size="sm" />)}
          </div>
        </div>
        {melds.length > 0 && (
          <div className="shrink-0 flex flex-wrap gap-1 content-start">
            {melds.map((meld, i) => (
              <div key={i} className="flex gap-px">
                {meld.map((c, j) => <Tile key={j} char={c} variant="face" size="sm" />)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── West / East (侧家) ──
   Layout from wireframe (two columns side by side):
   Col 1: hand backs (vertical) + discards (vertical)
   Col 2: melds (smaller block)
   Name/badge at top
*/
function SidePlayer({
  name, handCount, discards, melds, flowerCount, position, isCurrentTurn, onFlowerClick,
}: OpponentAreaProps) {
  const rotate = position === "west" ? -90 as const : 90 as const;

  return (
    <div className="flex flex-col gap-1 h-full overflow-hidden">
      {/* Top bar: name + badge + flower */}
      <div className="flex items-center gap-1 shrink-0 px-0.5">
        <NameBadge name={name} count={handCount} isCurrentTurn={isCurrentTurn} />
        <FlowerIcon count={flowerCount} onClick={onFlowerClick} />
      </div>
      {/* Main content: two columns */}
      <div className="flex-1 min-h-0 flex gap-1 overflow-hidden">
        {/* Col 1: hand + discards stacked vertically */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 overflow-hidden">
          {/* Hand backs */}
          <div className="shrink-0 flex flex-col gap-px items-center">
            {Array.from({ length: handCount }, (_, i) => (
              <Tile key={i} variant="back" size="sm" rotate={rotate} />
            ))}
          </div>
          {/* Discards */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="flex flex-col gap-px items-center">
              {discards.map((c, i) => (
                <Tile key={i} char={c} variant="face" size="sm" rotate={rotate} />
              ))}
            </div>
          </div>
        </div>
        {/* Col 2: melds */}
        {melds.length > 0 && (
          <div className="shrink-0 flex flex-col gap-1 items-center">
            {melds.map((meld, i) => (
              <div key={i} className="flex flex-col gap-px">
                {meld.map((c, j) => (
                  <Tile key={j} char={c} variant="face" size="sm" rotate={rotate} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NameBadge({ name, count, isCurrentTurn }: { name: string; count: number; isCurrentTurn?: boolean }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <span className={`text-[9px] font-medium ${isCurrentTurn ? "text-amber-300" : "text-white/45"}`}>{name}</span>
      <span className="bg-red-700 text-white rounded-full text-[10px] font-medium px-1.5 py-px">{count}</span>
    </div>
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
