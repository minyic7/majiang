import Tile from "../tile/Tile.js";

export interface ActionOption {
  id: string;
  label: string;
  color: string;
  /** Tiles to display in the action card */
  tiles: { char: string; highlight?: boolean; back?: boolean }[];
  onClick: () => void;
}

interface ActionBubblesProps {
  /** The discarded tile info (null = self-draw actions) */
  discardInfo?: { playerName: string; char: string } | null;
  /** Available action cards */
  actions: ActionOption[];
  /** Pass button */
  onPass?: () => void;
  /** Discard hint (when selecting own tile) */
  discardHint?: boolean;
  visible: boolean;
}

export default function ActionBubbles({
  discardInfo,
  actions,
  onPass,
  discardHint,
  visible,
}: ActionBubblesProps) {
  if (!visible) return null;

  return (
    <div className="flex items-end gap-2 animate-[bubbleIn_0.16s_ease]">
      {/* Discard info */}
      {discardInfo && (
        <>
          <span className="text-[9px] text-white/40 self-center mr-0.5" style={{ textShadow: "0 1px 4px rgba(0,0,0,.9)" }}>
            {discardInfo.playerName}打出
          </span>
          <Tile char={discardInfo.char} variant="face" size="md" highlight />
          <div className="w-px h-10 bg-white/10 self-center mx-0.5" />
        </>
      )}

      {/* Discard hint */}
      {discardHint && (
        <span className="text-[8px] text-amber-400/70" style={{ textShadow: "0 1px 4px rgba(0,0,0,.8)" }}>
          再次点击确认打出
        </span>
      )}

      {/* Action cards */}
      {actions.map((action) => (
        <ActionCard key={action.id} action={action} />
      ))}

      {/* Pass button */}
      {onPass && (
        <button
          onClick={onPass}
          className="cursor-pointer px-3 py-1.5 rounded-lg bg-black/20 shadow-[0_2px_8px_rgba(0,0,0,.2)] text-[10px] text-white/40 self-center hover:text-white/70 hover:bg-black/30 transition-colors"
        >
          过
        </button>
      )}
    </div>
  );
}

function ActionCard({ action }: { action: ActionOption }) {
  return (
    <div
      onClick={action.onClick}
      className="flex flex-col items-center gap-1 cursor-pointer px-2 py-1.5 rounded-lg bg-black/28 backdrop-blur-sm shadow-[0_6px_24px_rgba(0,0,0,.35),0_1px_3px_rgba(0,0,0,.2)] hover:-translate-y-0.5 transition-transform"
    >
      <div className="flex gap-0.5 items-end">
        {action.tiles.map((t, i) => (
          t.back
            ? <Tile key={i} variant="back" size="md" />
            : <Tile key={i} char={t.char} variant="face" size="md" highlight={t.highlight} />
        ))}
      </div>
      <span className="text-[9px] font-medium whitespace-nowrap tracking-wide" style={{ color: action.color }}>
        {action.label}
      </span>
    </div>
  );
}
