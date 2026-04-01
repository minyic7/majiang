import type { GameOverResult, ClientPlayerState } from "@majiang/shared";

interface RoundResultModalProps {
  result: GameOverResult;
  players: ClientPlayerState[];
  onClose: () => void;
}

export default function RoundResultModal({ result, players, onClose }: RoundResultModalProps) {
  const isDraw = result.winnerId === null;
  const winnerName = isDraw ? null : players[result.winnerId]?.name ?? "???";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="text-center">
          {isDraw ? (
            <h2 className="text-2xl font-bold text-neutral-300">流局</h2>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-amber-400">{winnerName} 胡牌!</h2>
              <p className="text-sm text-amber-300/70 mt-1">{result.winType}</p>
            </>
          )}
        </div>

        {/* Breakdown */}
        {result.breakdown && result.breakdown.length > 0 && (
          <div className="bg-neutral-800/60 rounded-lg px-4 py-3">
            <h3 className="text-xs font-semibold text-neutral-400 mb-2">计分明细</h3>
            {result.breakdown.map((line, i) => (
              <p key={i} className="text-sm text-neutral-300">{line}</p>
            ))}
          </div>
        )}

        {/* Payments */}
        {result.payments && result.payments.length > 0 && (
          <div className="bg-neutral-800/60 rounded-lg px-4 py-3">
            <h3 className="text-xs font-semibold text-neutral-400 mb-2">本局收支</h3>
            <div className="flex flex-col gap-1">
              {players.map((player, i) => {
                const payment = result.payments![i] ?? 0;
                return (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm text-neutral-300">{player.name}</span>
                    <span
                      className={`text-sm font-medium ${
                        payment > 0
                          ? "text-green-400"
                          : payment < 0
                            ? "text-red-400"
                            : "text-neutral-400"
                      }`}
                    >
                      {payment > 0 ? "+" : ""}{payment}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Total scores */}
        <div className="bg-neutral-800/60 rounded-lg px-4 py-3">
          <h3 className="text-xs font-semibold text-neutral-400 mb-2">累计积分</h3>
          <div className="flex flex-col gap-1">
            {players.map((player, i) => {
              const score = result.scores[i] ?? 0;
              return (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm text-neutral-300">{player.name}</span>
                  <span
                    className={`text-sm font-medium ${
                      score > 0
                        ? "text-green-400"
                        : score < 0
                          ? "text-red-400"
                          : "text-neutral-400"
                    }`}
                  >
                    {score > 0 ? "+" : ""}{score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Back to lobby */}
        <button
          onClick={onClose}
          className="mt-2 w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition-colors cursor-pointer"
        >
          返回大厅
        </button>
      </div>
    </div>
  );
}
