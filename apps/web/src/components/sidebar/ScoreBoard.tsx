interface ScoreBoardProps {
  scores: { name: string; score: number; isMe?: boolean }[];
}

export default function ScoreBoard({ scores }: ScoreBoardProps) {
  return (
    <div className="bg-white/[.04] border border-white/[.06] rounded-md p-3">
      <div className="text-sm text-white/50 font-semibold tracking-wide uppercase mb-2">得分</div>
      {scores.map((s, i) => (
        <div key={i} className="flex justify-between items-center py-1 border-b border-white/[.06] last:border-b-0">
          <span className={`text-sm ${s.isMe ? "text-amber-400/90 font-semibold" : "text-white/50"}`}>{s.name}</span>
          <span className={`text-base font-bold ${s.score >= 0 ? "text-green-400/90" : "text-red-400/90"}`}>
            {s.score >= 0 ? "+" : ""}{s.score}
          </span>
        </div>
      ))}
    </div>
  );
}
