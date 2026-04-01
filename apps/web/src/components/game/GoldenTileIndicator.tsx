import type { Tile } from "@majiang/shared";
import { getTileArt } from "../tile/art/index.js";
import { tileToCode } from "../tile/tileToCode.js";

interface GoldenTileIndicatorProps {
  goldenTile: Tile;
  flippedTile?: Tile;
  /** Compact mode for mobile */
  compact?: boolean;
}

export default function GoldenTileIndicator({ goldenTile, flippedTile, compact }: GoldenTileIndicatorProps) {
  const goldenCode = tileToCode(goldenTile);
  const goldenArt = getTileArt(goldenCode);
  const flippedCode = flippedTile ? tileToCode(flippedTile) : null;
  const flippedArt = flippedCode ? getTileArt(flippedCode) : null;

  const tileBase = "shrink-0 rounded-sm flex items-center justify-center bg-gradient-to-b from-[#fcfaf2] to-[#e8e0c8] border shadow-[0_2px_3px_rgba(0,0,0,0.15)]";

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-amber-400/80 font-medium">金牌</span>
        <div
          className={`${tileBase} border-amber-400 shadow-[0_0_6px_rgba(245,180,30,0.4)]`}
          style={{ width: 20, height: 30 }}
        >
          {goldenArt}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-amber-400/80 font-medium">金牌</span>
      {flippedArt && (
        <>
          <div
            className={`${tileBase} border-[#c8b890] opacity-50`}
            style={{ width: 22, height: 34 }}
          >
            {flippedArt}
          </div>
          <span className="text-[10px] text-white/30">→</span>
        </>
      )}
      <div
        className={`${tileBase} border-amber-400 shadow-[0_0_8px_rgba(245,180,30,0.35)]`}
        style={{ width: 26, height: 40 }}
      >
        {goldenArt}
      </div>
    </div>
  );
}
