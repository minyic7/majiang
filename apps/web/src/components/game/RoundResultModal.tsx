import type { RoundResult } from "../../stores/gameStore.js";

interface Player {
  name: string;
}

interface RoundResultModalProps {
  result: RoundResult;
  players: Player[];
  currentRound: number;
  onNextRound: () => void;
  onClose: () => void;
}

export default function RoundResultModal({
  result,
  players,
  currentRound,
  onNextRound,
  onClose,
}: RoundResultModalProps) {
  const isSessionEnd = currentRound >= 16;
  const isWin = result.winnerId !== null;
  const winnerName =
    isWin && result.winnerId !== null ? players[result.winnerId]?.name : null;

  // Build ranked standings for session-end view
  const standings = players
    .map((p, i) => ({ name: p.name, score: result.scores[i] ?? 0, index: i }))
    .sort((a, b) => b.score - a.score);

  if (isSessionEnd) {
    const topScore = standings[0]?.score ?? 0;

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-md mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* Session-end header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-amber-400">
              游戏结束
            </h2>
            <p className="text-sm text-white/50 mt-1">16局全部完成</p>
          </div>

          {/* Final standings */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              最终排名
            </h3>
            <div className="space-y-2">
              {standings.map((entry, rank) => {
                const isWinner = entry.score === topScore;
                return (
                  <div
                    key={entry.index}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                      isWinner
                        ? "bg-amber-400/10 border border-amber-400/30"
                        : "bg-white/[.03]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold w-5 ${
                          isWinner ? "text-amber-400" : "text-white/40"
                        }`}
                      >
                        {rank + 1}
                      </span>
                      <span
                        className={`text-sm ${
                          isWinner
                            ? "text-amber-400 font-semibold"
                            : "text-white/80"
                        }`}
                      >
                        {entry.name}
                        {isWinner && rank === 0 && " 👑"}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        entry.score > 0
                          ? "text-green-400"
                          : entry.score < 0
                            ? "text-red-400"
                            : "text-white/50"
                      }`}
                    >
                      {entry.score > 0 ? "+" : ""}
                      {entry.score}
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

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onNextRound}
            className="flex-1 py-2.5 min-h-[44px] rounded-lg bg-green-700 hover:bg-green-600 text-white font-medium transition-colors cursor-pointer"
          >
            下一局
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 min-h-[44px] rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white font-medium transition-colors cursor-pointer"
          >
            返回大厅
          </button>
        </div>
      </div>
    </div>
  );
}
