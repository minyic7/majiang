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

  // Discard hint — inline, no modal
  if (discardHint && actions.length === 0) {
    return (
      <div className="flex justify-center">
        <span className="text-[9px] text-amber-400/70" style={{ textShadow: "0 1px 4px rgba(0,0,0,.8)" }}>
          再次点击确认打出
        </span>
      </div>
    );
  }

  // Full-screen modal overlay for claim actions
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-[fadeIn_0.15s_ease]">
      <div className="flex flex-col items-center gap-6">
        {/* Discarded tile info */}
        {discardInfo && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/50">{discardInfo.playerName} 打出</span>
            <Tile char={discardInfo.char} variant="face" size="lg" highlight />
          </div>
        )}

        {/* Action options */}
        <div className="flex gap-4 flex-wrap justify-center">
          {actions.map((action) => (
            <div
              key={action.id}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 cursor-pointer px-4 py-3 rounded-xl bg-white/[.06] hover:bg-white/[.12] transition-colors"
            >
              <div className="flex gap-1 items-end">
                {action.tiles.map((t, i) => (
                  t.back
                    ? <Tile key={i} variant="back" size="lg" />
                    : <Tile key={i} char={t.char} variant="face" size="lg" highlight={t.highlight} />
                ))}
              </div>
              <span className="text-sm font-medium tracking-wide" style={{ color: action.color }}>
                {action.label}
              </span>
            </div>
          ))}
        </div>

        {/* Pass button */}
        {onPass && (
          <button
            onClick={onPass}
            className="cursor-pointer px-6 py-2 rounded-lg bg-white/[.06] hover:bg-white/[.12] text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            过
          </button>
        )}
      </div>
    </div>
  );
}
