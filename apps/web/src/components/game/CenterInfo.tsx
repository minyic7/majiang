/** Center info panel — content is variant-specific via slot pattern */

interface CenterInfoProps {
  wallRemaining: number;
  roundLabel: string;
  /** Variant-specific content rendered as children */
  children?: React.ReactNode;
}

export default function CenterInfo({ wallRemaining, roundLabel, children }: CenterInfoProps) {
  return (
    <div className="absolute inset-[54px] bg-black/65 rounded-lg border border-white/[.07] flex flex-col items-center justify-center gap-1">
      <span className="text-sm font-medium text-amber-300/90">
        剩余 <span className="text-base">{wallRemaining}</span> 张
      </span>
      <span className="text-[8px] text-white/30">{roundLabel}</span>
      {/* Variant-specific content (e.g., gold indicator, dora tiles) */}
      {children}
    </div>
  );
}
