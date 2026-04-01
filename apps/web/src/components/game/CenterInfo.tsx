/** Center info panel — content is variant-specific via slot pattern */

interface CenterInfoProps {
  wallRemaining: number;
  roundLabel: string;
  /** Variant-specific content rendered as children */
  children?: React.ReactNode;
}

export default function CenterInfo({ wallRemaining, roundLabel, children }: CenterInfoProps) {
  return (
    <div className="absolute inset-11 bg-black/65 rounded-lg border border-white/[.07] flex flex-col items-center justify-center gap-1.5">
      <span className="text-[8px] text-white/20">信息面板</span>
      {/* Variant-specific content (e.g., gold indicator, dora tiles) */}
      {children}
      <span className="text-lg font-medium text-amber-300/90">
        剩余 <span className="text-xl">{wallRemaining}</span> 张
      </span>
      <span className="text-[8px] text-white/20">{roundLabel}</span>
    </div>
  );
}
