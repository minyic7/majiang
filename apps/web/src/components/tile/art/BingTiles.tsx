const POSITIONS: Record<number, [number, number][]> = {
  1: [[30, 40]],
  2: [[30, 26], [30, 54]],
  3: [[30, 16], [30, 40], [30, 64]],
  4: [[20, 26], [40, 26], [20, 54], [40, 54]],
  5: [[20, 20], [40, 20], [30, 40], [20, 60], [40, 60]],
  6: [[20, 16], [40, 16], [20, 40], [40, 40], [20, 64], [40, 64]],
  7: [[16, 14], [30, 14], [44, 14], [30, 40], [16, 66], [30, 66], [44, 66]],
  8: [[20, 12], [40, 12], [20, 30], [40, 30], [20, 50], [40, 50], [20, 68], [40, 68]],
  9: [[16, 14], [30, 14], [44, 14], [16, 40], [30, 40], [44, 40], [16, 66], [30, 66], [44, 66]],
};

const RADII: Record<number, number> = {
  1: 16, 2: 12, 3: 10, 4: 10, 5: 9, 6: 8, 7: 7, 8: 7, 9: 7,
};

export function BingArt({ value }: { value: number }) {
  const positions = POSITIONS[value] || [];
  const r = RADII[value] || 8;
  return (
    <svg viewBox="0 0 60 80" className="w-full h-full">
      {positions.map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={r} fill="#1565c0" />
          <circle cx={cx} cy={cy} r={r * 0.55} fill="#e3f2fd" />
          <circle cx={cx} cy={cy} r={r * 0.2} fill="#1565c0" />
        </g>
      ))}
    </svg>
  );
}
