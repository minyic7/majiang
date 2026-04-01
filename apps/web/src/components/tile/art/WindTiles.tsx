const CHARS: Record<string, string> = {
  east: "東",
  south: "南",
  west: "西",
  north: "北",
};

export function WindArt({ type }: { type: string }) {
  return (
    <svg viewBox="0 0 60 80" className="w-full h-full">
      <text
        x="30" y="44" textAnchor="middle" dominantBaseline="middle"
        fontSize="40" fontWeight="bold" fill="#1a1a1a" fontFamily="serif"
      >
        {CHARS[type] || "?"}
      </text>
    </svg>
  );
}
