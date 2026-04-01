interface RoundInfoProps {
  roundLabel: string;
  dealerName: string;
  wallRemaining: number;
  /** Variant-specific info lines */
  extraInfo?: { label: string; value: string }[];
}

export default function RoundInfo({ roundLabel, dealerName, wallRemaining, extraInfo }: RoundInfoProps) {
  return (
    <div className="bg-white/[.04] border border-white/[.06] rounded-sm p-2 text-[8px] text-white/25 leading-7">
      <div className="text-[9px] text-white/28 font-medium tracking-wide uppercase mb-1.5">局信息</div>
      <div>{roundLabel}</div>
      <div>庄家：{dealerName}</div>
      <div className="text-amber-400/45">
        剩余牌：<span className="text-white/40">{wallRemaining}</span> 张
      </div>
      {extraInfo?.map((info, i) => (
        <div key={i} className="text-amber-400/45">{info.label}：<span className="text-white/40">{info.value}</span></div>
      ))}
    </div>
  );
}
