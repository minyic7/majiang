interface ScoreBoardProps {
  scores: { name: string; score: number; isMe?: boolean }[];
}

export default function ScoreBoard({ scores }: ScoreBoardProps) {
  return (
    <div className="bg-white/[.04] border border-white/[.06] rounded-sm p-2">
      <div className="text-[9px] text-white/28 font-medium tracking-wide uppercase mb-1.5">得分</div>
      {scores.map((s, i) => (
        <div key={i} className="flex justify-between items-center py-0.5 border-b border-white/[.05] last:border-b-0">
          <span className={`text-[8px] ${s.isMe ? "text-amber-400/70" : "text-white/30"}`}>{s.name}</span>
          <span className={`text-xs font-medium ${s.score >= 0 ? "text-green-400/80" : "text-red-400/80"}`}>
            {s.score >= 0 ? "+" : ""}{s.score}
          </span>
        </div>
      ))}
    </div>
  );
}
