interface TileProps {
  /** Display character (e.g., "一", "中", "花") */
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
        className={`shrink-0 rounded-sm border border-green-600/60 bg-green-700/70 ${className}`}
        style={style}
      />
    );
  }

  if (variant === "flower") {
    return (
      <div
        className={`shrink-0 rounded-sm border border-green-600/50 bg-green-800/60 flex items-center justify-center font-medium text-green-400 ${className}`}
        style={{ width: s.w, height: s.h, fontSize: s.font - 2 }}
      >
        {char || "花"}
      </div>
    );
  }

  // Face tile
  const baseClasses = [
    "shrink-0 rounded-sm flex items-center justify-center font-medium transition-all duration-150 relative",
    selected
      ? "bg-gradient-to-b from-yellow-50 to-amber-200 border-2 border-amber-500 shadow-[0_0_0_1.5px_#EEB018] -translate-y-2 scale-110 z-10"
      : highlight
        ? "bg-gradient-to-b from-yellow-50 to-amber-100 border border-amber-500"
        : "bg-gradient-to-b from-[#fafaf0] to-[#e8e4d4] border border-[#bbb]",
    drawn ? "ml-3" : "",
    onClick ? "cursor-pointer hover:-translate-y-1" : "",
    className,
  ].filter(Boolean).join(" ");

  const inner = rotate ? (
    <div
      className="flex items-center justify-center font-medium text-neutral-800"
      style={{
        width: s.w,
        height: s.h,
        fontSize: s.font,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      {char}
    </div>
  ) : null;

  const tileStyle = rotate
    ? { width: s.h, height: s.w }
    : { width: s.w, height: s.h, fontSize: s.font };

  return (
    <div
      className={baseClasses}
      style={tileStyle}
      onClick={onClick}
    >
      {rotate ? inner : <span className="text-neutral-800">{char}</span>}
      {drawn && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[8px] text-amber-400/80 whitespace-nowrap">
          摸
        </span>
      )}
    </div>
  );
}
