export function DragonArt({ type }: { type: string }) {
  if (type === "white") {
    return (
      <svg viewBox="0 0 60 80" className="w-full h-full">
        <rect
          x="10" y="14" width="40" height="52" rx="4"
          fill="none" stroke="#1565c0" strokeWidth="3"
        />
      </svg>
    );
  }

  const char = type === "red" ? "中" : "發";
  const color = type === "red" ? "#c62828" : "#2e7d32";

  return (
    <svg viewBox="0 0 60 80" className="w-full h-full">
      <text
        x="30" y="44" textAnchor="middle" dominantBaseline="middle"
        fontSize="42" fontWeight="bold" fill={color} fontFamily="serif"
      >
        {char}
      </text>
    </svg>
  );
}
