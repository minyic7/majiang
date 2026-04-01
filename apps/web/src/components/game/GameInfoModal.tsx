import { useState } from "react";
import { getRuleSet } from "@majiang/shared";
import type { Tile } from "@majiang/shared";
import Tile_ from "../tile/Tile.js";
import { tileToCode } from "../../hooks/useGameData.js";

interface GameInfoPlayer {
  name: string;
  seatWind: string;
  connected: boolean;
}

interface GameInfoModalProps {
  roomId: string;
  ruleSetId: string;
  goldenTile?: Tile;
  players: GameInfoPlayer[];
  onClose: () => void;
}

export default function GameInfoModal({
  roomId,
  ruleSetId,
  goldenTile,
  players,
  onClose,
}: GameInfoModalProps) {
  const [copied, setCopied] = useState(false);
  const ruleSet = getRuleSet(ruleSetId);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-sm mx-4 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2 className="text-xl font-bold text-amber-400 text-center mb-5">
          房间信息
        </h2>

        {/* Room ID */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
            房间号
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/90 font-mono">{roomId}</span>
            <button
              onClick={handleCopy}
              className="px-2 py-0.5 text-xs rounded bg-white/[.08] hover:bg-white/[.15] text-white/60 hover:text-white/90 transition-colors cursor-pointer"
            >
              {copied ? "已复制" : "复制"}
            </button>
          </div>
        </div>

        {/* Ruleset */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
            规则
          </h3>
          <span className="text-sm text-white/90">
            {ruleSet?.name ?? ruleSetId}
          </span>
        </div>

        {/* Golden tile */}
        {goldenTile && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              金牌
            </h3>
            <div className="inline-block">
              <Tile_ char={tileToCode(goldenTile)} variant="face" size="md" />
            </div>
          </div>
        )}

        {/* Players */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
            玩家
          </h3>
          <div className="space-y-1.5">
            {players.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[.03]"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    p.connected ? "bg-green-400" : "bg-red-400"
                  }`}
                />
                <span className="text-sm text-white/80 flex-1 truncate">
                  {p.name}
                </span>
                <span className="text-xs text-white/40">{p.seatWind}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 min-h-[44px] rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white font-medium transition-colors cursor-pointer"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
