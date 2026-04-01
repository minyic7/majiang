import type { RoundResult } from "../../stores/gameStore.js";

interface Player {
  name: string;
}

interface RoundResultModalProps {
  result: RoundResult;
  players: Player[];
  onClose: () => void;
}

export default function RoundResultModal({
  result,
  players,
  onClose,
}: RoundResultModalProps) {
  const isWin = result.winnerId !== null;
  const winnerName =
    isWin && result.winnerId !== null ? players[result.winnerId]?.name : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-md mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        {isWin ? (
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-amber-400">
              {winnerName} 胡牌!
            </h2>
            {result.winType && (
              <p className="text-sm text-amber-300/70 mt-1">
                {result.winType}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-neutral-300">流局</h2>
          </div>
        )}

        {/* Breakdown */}
        {result.breakdown.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
              计分明细
            </h3>
            <div className="space-y-1">
              {result.breakdown.map((line, i) => (
                <p key={i} className="text-sm text-white/70">
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Payments */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
            收支
          </h3>
          <div className="space-y-1">
            {players.map((p, i) => {
              const payment = result.payments[i] ?? 0;
              return (
                <div
                  key={i}
                  className="flex justify-between text-sm"
                >
                  <span className="text-white/80">{p.name}</span>
                  <span
                    className={
                      payment > 0
                        ? "text-green-400"
                        : payment < 0
                          ? "text-red-400"
                          : "text-white/50"
                    }
                  >
                    {payment > 0 ? "+" : ""}
                    {payment}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total scores */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
            总分
          </h3>
          <div className="space-y-1">
            {players.map((p, i) => {
              const score = result.scores[i] ?? 0;
              return (
                <div
                  key={i}
                  className="flex justify-between text-sm"
                >
                  <span className="text-white/80">{p.name}</span>
                  <span
                    className={
                      score > 0
                        ? "text-green-400"
                        : score < 0
                          ? "text-red-400"
                          : "text-white/50"
                    }
                  >
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Back to lobby button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 min-h-[44px] rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors cursor-pointer"
        >
          返回大厅
        </button>
      </div>
    </div>
  );
}
