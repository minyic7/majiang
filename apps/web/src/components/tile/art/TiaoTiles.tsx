function Stick({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 3} y={y} width={6} height={18} rx={2} fill="#2e7d32" />
      <rect x={x - 3.5} y={y + 5} width={7} height={2.5} rx={1} fill="#1b5e20" />
      <rect x={x - 3.5} y={y + 11} width={7} height={2.5} rx={1} fill="#1b5e20" />
    </g>
  );
}

const ROW_CONFIGS: Record<number, number[]> = {
  2: [2],
  3: [3],
  4: [2, 2],
  5: [3, 2],
  6: [3, 3],
  7: [3, 1, 3],
  8: [3, 2, 3],
  9: [3, 3, 3],
};

const ROW_Y: Record<number, number[]> = {
  1: [31],
  2: [14, 48],
  3: [4, 31, 58],
};

const COL_X: Record<number, number[]> = {
  1: [30],
  2: [21, 39],
  3: [14, 30, 46],
};

export function TiaoArt({ value }: { value: number }) {
  if (value === 1) {
    return (
      <svg viewBox="0 0 60 80" className="w-full h-full">
        {/* Stylized bird for 1-tiao */}
        <ellipse cx="30" cy="44" rx="12" ry="16" fill="#2e7d32" />
        <circle cx="30" cy="22" r="8" fill="#c62828" />
        <polygon points="30,12 26,18 34,18" fill="#ff8f00" />
        <circle cx="33" cy="20" r="1.5" fill="white" />
        <circle cx="33" cy="20" r="0.7" fill="#1a1a1a" />
        <path d="M22,58 Q18,70 14,72" fill="none" stroke="#1b5e20" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M38,58 Q42,70 46,72" fill="none" stroke="#1b5e20" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  const rows = ROW_CONFIGS[value] || [value];
  const ys = ROW_Y[rows.length] || [31];

  return (
    <svg viewBox="0 0 60 80" className="w-full h-full">
      {rows.map((count, ri) =>
        (COL_X[count] || [30]).map((x, ci) => (
          <Stick key={`${ri}-${ci}`} x={x} y={ys[ri]} />
        )),
      )}
    </svg>
  );
}
