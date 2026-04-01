import { useState } from "react";
import type { TrackerSection } from "@majiang/shared";

interface TileTrackerProps {
  sections: TrackerSection[];
}

export default function TileTracker({ sections }: TileTrackerProps) {
  const [used, setUsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setUsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
              const isUsed = used.has(tile.id);
              return (
                <button
                  key={tile.id}
                  onClick={() => toggle(tile.id)}
                  className={`text-center text-sm rounded py-1 cursor-pointer select-none transition-colors font-medium ${
                    isUsed
                      ? "bg-red-500/20 text-red-400/70 line-through"
                      : "bg-white/[.08] text-white/50 hover:bg-white/[.18] hover:text-white/70"
                  }`}
                >
                  {tile.display}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
