interface RoundInfoProps {
  roundLabel: string;
  dealerName: string;
  wallRemaining: number;
  extraInfo?: { label: string; value: string }[];
}

export default function RoundInfo({ roundLabel, dealerName, wallRemaining, extraInfo }: RoundInfoProps) {
  return (
    <div className="bg-white/[.04] border border-white/[.06] rounded-md p-3 text-sm text-white/45 leading-7">
      <div className="text-sm text-white/50 font-semibold tracking-wide uppercase mb-2">局信息</div>
      <div>{roundLabel}</div>
      <div>庄家：<span className="text-white/60">{dealerName}</span></div>
      <div className="text-amber-400/60">
        剩余牌：<span className="text-amber-300/80 font-medium">{wallRemaining}</span> 张
      </div>
      {extraInfo?.map((info, i) => (
        <div key={i} className="text-amber-400/60">{info.label}：<span className="text-white/60">{info.value}</span></div>
      ))}
    </div>
  );
}
