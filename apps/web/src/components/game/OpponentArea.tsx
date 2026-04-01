import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
  const prefersReduced = useReducedMotion();
  const dur = prefersReduced ? 0 : 0.15;
  const meldDur = prefersReduced ? 0 : 0.2;

  return (
    <div className="flex items-end justify-center gap-3 h-full overflow-hidden">
      {/* Hand backs */}
      <motion.div
        layout
        transition={{ duration: dur }}
        className="shrink-0 flex gap-0.5 items-end pt-4 pb-1"
      >
        {Array.from({ length: handCount }, (_, i) => (
          <Tile key={i} variant="back" size="md" />
        ))}
      </motion.div>
      {/* Melds (right side = opponent's left hand) */}
      {melds.length > 0 && (
        <div className="shrink-0 border border-white/[.12] rounded-sm px-1.5 pt-4 pb-1 flex gap-2 items-end">
          <AnimatePresence>
            {melds.map((meld, i) => (
              <motion.div
                key={`meld-${i}-${meld.join(",")}`}
                initial={{ opacity: 0, scale: 0.8, x: -15 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: meldDur }}
                className="flex gap-px"
              >
                {meld.map((c, j) => (
                  <Tile key={j} char={c} variant="face" size="md" />
                ))}
              </motion.div>
            ))}
          </AnimatePresence>
          <span className="text-[11px] text-white/30 font-medium">副露</span>
        </div>
      )}
      {/* Name + badge + flower */}
      <div className="shrink-0 flex flex-col items-center gap-0.5 pb-1">
        <FlowerIcon count={flowerCount} onClick={onFlowerClick} />
        <NameBadge name={name} count={handCount} isCurrentTurn={isCurrentTurn} />
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
  const isWest = position === "west";
  const prefersReduced = useReducedMotion();
  const dur = prefersReduced ? 0 : 0.15;
  const meldDur = prefersReduced ? 0 : 0.2;

  const nameBlock = (
    <div className="shrink-0 flex items-center gap-1">
      <NameBadge name={name} count={handCount} isCurrentTurn={isCurrentTurn} />
      <FlowerIcon count={flowerCount} onClick={onFlowerClick} />
    </div>
  );

  const handBlock = (
    <motion.div
      layout
      transition={{ duration: dur }}
      className="shrink-0 flex flex-col gap-0.5 items-center"
    >
      {Array.from({ length: handCount }, (_, i) => (
        <Tile key={i} variant="back" size="md" rotate={rotate} />
      ))}
    </motion.div>
  );

  const meldsBlock = melds.length > 0 ? (
    <div className="shrink-0 border border-white/[.12] rounded-sm p-1.5 flex flex-col gap-1 items-center">
      {isWest && <span className="text-[11px] text-white/30 font-medium">副露</span>}
      <AnimatePresence>
        {melds.map((meld, i) => (
          <motion.div
            key={`meld-${i}-${meld.join(",")}`}
            initial={{ opacity: 0, scale: 0.8, y: -15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: meldDur }}
            className="flex flex-col gap-px"
          >
            {meld.map((c, j) => (
              <Tile key={j} char={c} variant="face" size="md" rotate={rotate} />
            ))}
          </motion.div>
        ))}
      </AnimatePresence>
      {!isWest && <span className="text-[11px] text-white/30 font-medium">副露</span>}
    </div>
  ) : null;

  // West: name+flower(top) → melds → hand(bottom) — left hand = top
  // East: hand(top) → melds → name+flower(bottom) — left hand = bottom
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full overflow-hidden">
      {isWest ? (
        <>{nameBlock}{meldsBlock}{handBlock}</>
      ) : (
        <>{handBlock}{meldsBlock}{nameBlock}</>
      )}
    </div>
  );
}

function NameBadge({ name, count, isCurrentTurn }: { name: string; count: number; isCurrentTurn?: boolean }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <span className={`text-xs font-medium ${isCurrentTurn ? "text-amber-300" : "text-white/45"}`}>{name}</span>
      <span className="bg-red-700 text-white rounded-full text-xs font-medium px-1.5 py-px">{count}</span>
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
      🌸{count > 0 && <sup className="text-xs text-green-400">{count}</sup>}
    </span>
  );
}
