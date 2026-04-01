import { getTileArt } from "./art/index.js";

interface TileProps {
  /** Tile code (e.g., "wan1", "bing5", "zhong") or display character */
  char?: string;
  /** Tile variant */
  variant: "face" | "back" | "flower";
  /** Size preset */
  size?: "sm" | "md" | "lg";
  /** Visual states */
  selected?: boolean;
  drawn?: boolean;
  highlight?: boolean;
  /** Rotation for side players */
  rotate?: 90 | -90;
  /** Interaction */
  onClick?: () => void;
  className?: string;
}

const sizes = {
  sm: { w: 13, h: 19, font: 9 },
  md: { w: 26, h: 40, font: 13 },
  lg: { w: 32, h: 48, font: 16 },
};

export default function Tile({
  char,
  variant,
  size = "md",
  selected,
  drawn,
  highlight,
  rotate,
  onClick,
  className = "",
}: TileProps) {
  const s = sizes[size];

  if (variant === "back") {
    const style = rotate
      ? { width: s.h, height: s.w }
      : { width: s.w, height: s.h };
    return (
      <div
        className={`shrink-0 rounded-sm bg-gradient-to-b from-[#4a8838] to-[#2d5c20] border border-[#5a9848] shadow-[0_2px_3px_rgba(0,0,0,0.2)] ${className}`}
        style={style}
      />
    );
  }

  if (variant === "flower") {
    const art = char ? getTileArt(char) : null;
    return (
      <div
        className={`shrink-0 rounded-sm border border-green-600/50 bg-green-800/60 flex items-center justify-center font-medium text-green-400 ${className}`}
        style={{ width: s.w, height: s.h, fontSize: s.font - 2 }}
      >
        {art || char || "花"}
      </div>
    );
  }

  // Face tile
  const art = char ? getTileArt(char) : null;

  const baseClasses = [
    "shrink-0 rounded-sm flex items-center justify-center font-medium transition-all duration-150 relative overflow-hidden",
    selected
      ? "bg-gradient-to-b from-[#fffde8] to-[#f5d060] border-2 border-amber-400 shadow-[0_0_8px_rgba(238,176,24,0.4)] -translate-y-2 scale-110 z-10"
      : highlight
        ? "bg-gradient-to-b from-[#fffce0] to-[#f0d870] border border-amber-400 shadow-sm"
        : "bg-gradient-to-b from-[#fcfaf2] to-[#e8e0c8] border border-[#c8b890] shadow-[0_2px_3px_rgba(0,0,0,0.15)]",
    drawn ? "ml-3" : "",
    onClick ? "cursor-pointer hover:-translate-y-1" : "",
    className,
  ].filter(Boolean).join(" ");

  const faceContent = art || <span className="text-neutral-800" style={{ fontSize: s.font }}>{char}</span>;

  const inner = rotate ? (
    <div
      className="flex items-center justify-center"
      style={{
        width: s.w,
        height: s.h,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      {faceContent}
    </div>
  ) : null;

  const tileStyle = rotate
    ? { width: s.h, height: s.w }
    : { width: s.w, height: s.h };

  return (
    <div
      className={baseClasses}
      style={tileStyle}
      onClick={onClick}
    >
      {rotate ? inner : faceContent}
      {drawn && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[11px] text-amber-400/80 whitespace-nowrap">
          摸
        </span>
      )}
    </div>
  );
}
