import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import TopBar from "../components/layout/TopBar.js";
import GameTable from "../components/game/GameTable.js";
import RoundResultModal from "../components/game/RoundResultModal.js";
import GameInfoModal from "../components/game/GameInfoModal.js";
import TileTracker from "../components/sidebar/TileTracker.js";
import ScoreBoard from "../components/sidebar/ScoreBoard.js";
import RoundInfo from "../components/sidebar/RoundInfo.js";
import ChatPanel from "../components/chat/ChatPanel.js";
import { useGameData } from "../hooks/useGameData.js";
import { useTileTracker } from "../hooks/useTileTracker.js";
import { useGameStore } from "../stores/gameStore.js";

export default function GamePage() {
  const {
    gameState,
    data,
    actions,
    showActions,
    selectedTileId,
    availableActions,
    roomId,
    handlePass,
    handleSelectTile,
    handleDiscardTile,
  } = useGameData();

  const roundResult = useGameStore((s) => s.roundResult);
  const chatMessages = useGameStore((s) => s.chatMessages);
  const connected = useGameStore((s) => s.connected);
  const errorMessage = useGameStore((s) => s.errorMessage);
  const navigate = useNavigate();
  const [showGameInfo, setShowGameInfo] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (errorMessage) {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        useGameStore.getState().setErrorMessage(null);
      }, 5000);
    }
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [errorMessage]);
  const trackerSections = useTileTracker();

  if (!gameState || !data) {
    return (
      <div className="h-screen bg-[#0a1208] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-lg mb-4">No game in progress</p>
          <Link
            to="/"
            className="text-amber-400 hover:text-amber-300 underline"
          >
            Back to lobby
          </Link>
        </div>
      </div>
    );
  }

  const discardHint =
    selectedTileId !== null &&
    !showActions &&
    !!availableActions?.canDiscard;

  return (
    <div className="h-screen bg-[#0a1208] flex flex-col overflow-hidden">
      <TopBar
        roomId={roomId ?? ""}
        roundLabel={data.roundLabel}
        playerCount={data.players.length}
        onLeave={() => {
          const socket = useGameStore.getState().socket;
          if (socket) socket.disconnect();
          useGameStore.getState().reset();
          navigate("/");
        }}
        onSettings={() => setShowGameInfo(true)}
      />

      <div className="flex-1 flex gap-2.5 p-2.5 items-stretch min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-52 shrink-0 flex flex-col gap-1.5 bg-white/[.02] border border-white/[.07] rounded-xl p-2 overflow-y-auto">
          {trackerSections && <TileTracker sections={trackerSections} />}
          <ScoreBoard scores={data.scores} />
          <RoundInfo
            roundLabel={data.roundLabel}
            dealerName={data.dealerName}
            wallRemaining={data.wallRemaining}
          />
        </div>

        {/* Game table */}
        <div className="flex-1 min-w-0 min-h-0">
          <GameTable
            players={data.players}
            wallRemaining={data.wallRemaining}
            roundLabel={data.roundLabel}
            currentTurn={data.currentTurn}
            selectedTileId={selectedTileId}
            actions={actions}
            actionVisible={showActions}
            discardInfo={showActions ? data.discardInfo : null}
            discardHint={discardHint}
            goldenTile={data.goldenTile}
            flippedTile={data.flippedTile}
            onPass={handlePass}
            onSelectTile={handleSelectTile}
            onDiscardTile={handleDiscardTile}
          />
        </div>

        {/* Right sidebar */}
        <div className="w-52 shrink-0 flex flex-col gap-1.5 bg-white/[.02] border border-white/[.07] rounded-xl p-2 overflow-y-auto">
          <ChatPanel
            messages={chatMessages}
            onSend={(text) => {
              const socket = useGameStore.getState().socket;
              if (socket) socket.emit("chatMessage", { text });
            }}
            onEmoji={(emoji) => {
              const socket = useGameStore.getState().socket;
              if (socket) socket.emit("chatMessage", { text: emoji });
            }}
          />
        </div>
      </div>

      {roundResult && gameState && (
        <RoundResultModal
          result={roundResult}
          players={gameState.players}
          currentRound={gameState.currentRound}
          onNextRound={() => {
            useGameStore.getState().clearRoundResult();
            const socket = useGameStore.getState().socket;
            if (socket) socket.emit("nextRound");
          }}
          onClose={() => {
            useGameStore.getState().clearRoundResult();
            navigate("/");
          }}
        />
      )}

      {showGameInfo && gameState && (
        <GameInfoModal
          roomId={roomId ?? ""}
          ruleSetId={gameState.ruleSetId}
          goldenTile={gameState.goldenTile}
          players={gameState.players.map((p) => ({
            name: p.name,
            seatWind: p.seatWind,
            connected: true,
          }))}
          onClose={() => setShowGameInfo(false)}
        />
      )}

      {!connected && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center">
          <span className="text-white text-lg font-medium">连接中断，重连中...</span>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] bg-red-900/90 border border-red-500 text-red-200 px-4 py-2 rounded shadow-lg flex items-center gap-2">
          <span>{errorMessage}</span>
          <button
            onClick={() => useGameStore.getState().setErrorMessage(null)}
            className="text-red-300 hover:text-white ml-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
