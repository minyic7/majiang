import type { TrackerSection } from "@majiang/shared";

interface TileTrackerProps {
  sections: TrackerSection[];
}

export default function TileTracker({ sections }: TileTrackerProps) {
  return (
    <div className="bg-white/[.04] border border-white/[.06] rounded-md p-3">
      <div className="text-sm text-white/50 font-semibold tracking-wide uppercase mb-3">记牌器</div>
      {sections.map((section) => (
        <div key={section.label} className="mb-3 last:mb-0">
          <div
            className="text-sm font-bold text-center mb-1.5 rounded py-1"
            style={{ color: section.color, backgroundColor: section.color.replace(/[\d.]+\)$/, "0.15)") }}
          >
            {section.label}
          </div>
          <div className={`grid gap-1 ${section.tiles.length <= 7 ? "grid-cols-7" : "grid-cols-9"}`}>
            {section.tiles.map((tile) => {
              const remaining = tile.remaining ?? tile.copies;
              const allGone = remaining <= 0;
              return (
                <div
                  key={tile.id}
                  className={`text-center text-sm rounded py-1 select-none transition-colors font-medium relative ${
                    allGone
                      ? "bg-red-500/20 text-red-400/70 line-through"
                      : "bg-white/[.08] text-white/50"
                  }`}
                >
                  {tile.display}
                  {remaining < tile.copies && !allGone && (
                    <span className="absolute -top-1 -right-1 bg-amber-500/80 text-[9px] text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none font-bold">
                      {remaining}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
