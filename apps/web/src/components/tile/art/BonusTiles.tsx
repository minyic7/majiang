const SEASONS: Record<string, { char: string; color: string }> = {
  spring: { char: "春", color: "#2e7d32" },
  summer: { char: "夏", color: "#c62828" },
  autumn: { char: "秋", color: "#e65100" },
  winter: { char: "冬", color: "#1565c0" },
};

const PLANTS: Record<string, { char: string; color: string }> = {
  plum: { char: "梅", color: "#c62828" },
  orchid: { char: "蘭", color: "#7b1fa2" },
  bamboo: { char: "竹", color: "#2e7d32" },
  chrysanthemum: { char: "菊", color: "#e65100" },
};

export function SeasonArt({ type }: { type: string }) {
  const s = SEASONS[type];
  if (!s) return null;
  return (
    <svg viewBox="0 0 60 80" className="w-full h-full">
      <text
        x="30" y="44" textAnchor="middle" dominantBaseline="middle"
        fontSize="36" fontWeight="bold" fill={s.color} fontFamily="serif"
      >
        {s.char}
      </text>
    </svg>
  );
}

export function PlantArt({ type }: { type: string }) {
  const p = PLANTS[type];
  if (!p) return null;
  return (
    <svg viewBox="0 0 60 80" className="w-full h-full">
      <text
        x="30" y="44" textAnchor="middle" dominantBaseline="middle"
        fontSize="36" fontWeight="bold" fill={p.color} fontFamily="serif"
      >
        {p.char}
      </text>
    </svg>
  );
}
