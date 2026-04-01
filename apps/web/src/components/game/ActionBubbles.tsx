import Tile from "../tile/Tile.js";

export interface ActionOption {
  id: string;
  label: string;
  color: string;
  tiles: { char: string; highlight?: boolean; back?: boolean }[];
  onClick: () => void;
}

interface ActionBubblesProps {
  discardInfo?: { playerName: string; char: string } | null;
  actions: ActionOption[];
  onPass?: () => void;
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

  if (discardHint && actions.length === 0) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-amber-400/70" style={{ textShadow: "0 1px 4px rgba(0,0,0,.8)" }}>
          再次点击确认打出
        </span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end pb-28 pointer-events-none animate-[fadeIn_0.12s_ease]">
      {/* Backdrop — transparent, just catches clicks */}
      <div className="absolute inset-0 pointer-events-auto" onClick={onPass} />

      {/* Bubble container */}
      <div className="relative pointer-events-auto flex flex-col items-center gap-3">
        {/* Discarded tile info */}
        {discardInfo && (
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="text-xs text-white/50">{discardInfo.playerName} 打出</span>
            <Tile char={discardInfo.char} variant="face" size="md" highlight />
          </div>
        )}

        {/* Action cards row */}
        <div className="flex gap-2 flex-wrap justify-center max-w-[calc(100vw-1rem)] px-2">
          {actions.map((action) => (
            <div
              key={action.id}
              onClick={action.onClick}
              className="flex flex-col items-center gap-1.5 cursor-pointer px-3 py-2 rounded-xl bg-black/30 backdrop-blur-sm border border-white/[.08] hover:bg-black/40 hover:border-white/[.15] hover:-translate-y-0.5 transition-all"
            >
              <div className="flex gap-0.5 items-end">
                {action.tiles.map((t, i) => (
                  t.back
                    ? <Tile key={i} variant="back" size="md" />
                    : <Tile key={i} char={t.char} variant="face" size="md" highlight={t.highlight} />
                ))}
              </div>
              <span className="text-xs font-semibold tracking-wide" style={{ color: action.color }}>
                {action.label}
              </span>
            </div>
          ))}

          {/* Pass button — inline with actions */}
          {onPass && (
            <div
              onClick={onPass}
              className="flex flex-col items-center justify-center cursor-pointer px-4 py-2 rounded-xl bg-black/20 backdrop-blur-sm border border-white/[.06] hover:bg-black/30 hover:border-white/[.12] transition-all"
            >
              <span className="text-sm text-white/40 hover:text-white/60 font-medium">过</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
