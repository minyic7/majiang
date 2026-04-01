import { useState } from "react";
import { Link } from "react-router";
import TopBar from "../components/layout/TopBar.js";
import GameTable from "../components/game/GameTable.js";
import TileTracker from "../components/sidebar/TileTracker.js";
import ScoreBoard from "../components/sidebar/ScoreBoard.js";
import RoundInfo from "../components/sidebar/RoundInfo.js";
import ChatPanel from "../components/chat/ChatPanel.js";
import { useGameData } from "../hooks/useGameData.js";
import { useTileTracker } from "../hooks/useTileTracker.js";

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

  const trackerSections = useTileTracker();

  const [chatMessages, setChatMessages] = useState<
    { id: string; sender: string; text: string; isMe?: boolean }[]
  >([]);

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
        playerCount={4}
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
              setChatMessages((prev) => [
                ...prev,
                { id: String(Date.now()), sender: "我", text, isMe: true },
              ]);
            }}
            onEmoji={(emoji) => {
              setChatMessages((prev) => [
                ...prev,
                { id: String(Date.now()), sender: "我", text: emoji, isMe: true },
              ]);
            }}
          />
        </div>
      </div>
    </div>
  );
}
