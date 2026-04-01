interface TopBarProps {
  roomId: string;
  roundLabel: string;
  playerCount: number;
  onSettings?: () => void;
  onLeave?: () => void;
}

export default function TopBar({ roomId, roundLabel, playerCount, onSettings, onLeave }: TopBarProps) {
  return (
    <div className="h-11 bg-black/50 border-b border-white/[.08] flex items-center px-4 gap-4 shrink-0">
      <span className="text-[13px] font-medium text-amber-300/90 tracking-wide">🀄 麻将桌</span>
      <Pill active>房间 #{roomId}</Pill>
      <Pill>{roundLabel}</Pill>
      <Pill>{playerCount}人</Pill>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={onSettings} className="text-[10px] px-2.5 py-0.5 rounded bg-white/[.06] border border-white/[.12] text-white/40 cursor-pointer hover:text-white/60 transition-colors">设置</button>
        <button onClick={onLeave} className="text-[10px] px-2.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400/60 cursor-pointer hover:text-red-400 transition-colors">离开</button>
      </div>
    </div>
  );
}

function Pill({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
      active
        ? "bg-green-500/15 text-green-400/80 border-green-500/30"
        : "bg-white/[.08] text-white/40 border-white/10"
    }`}>
      {children}
    </span>
  );
}
