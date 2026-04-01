import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import TopBar from "../components/layout/TopBar.js";
import Tile from "../components/tile/Tile.js";
import TileWall from "../components/tile/TileWall.js";
import PlayerHand from "../components/game/PlayerHand.js";
import GoldenTileIndicator from "../components/game/GoldenTileIndicator.js";
import ActionBubbles from "../components/game/ActionBubbles.js";
import RoundResultModal from "../components/game/RoundResultModal.js";
import TileTracker from "../components/sidebar/TileTracker.js";
import ChatPanel from "../components/chat/ChatPanel.js";
import { useGameData } from "../hooks/useGameData.js";
import { useTileTracker } from "../hooks/useTileTracker.js";
import { useGameStore } from "../stores/gameStore.js";
import { useActionTimer } from "../hooks/useActionTimer.js";

const WALL_STACKS = 10;

function OpponentBadge({
  name,
  hand,
  flowers,
}: {
  name: string;
  hand: number;
  flowers: number;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <span className="text-[11px] text-white/60 font-medium">{name}</span>
      <span className="bg-red-700 text-white rounded-full text-[10px] font-medium px-1">
        {hand}
      </span>
      {flowers > 0 && (
        <span className="text-[11px]">
          🌸<sup className="text-[9px] text-green-400">{flowers}</sup>
        </span>
      )}
    </div>
  );
}

export default function MobileGamePage() {
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
  const actionRemaining = useActionTimer();

  const prefersReduced = useReducedMotion();
  const dur = prefersReduced ? 0 : 0.15;
  const meldDur = prefersReduced ? 0 : 0.2;

  const [showTracker, setShowTracker] = useState(false);
  const [showChat, setShowChat] = useState(false);

  if (!gameState || !data) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#1a6030] to-[#145020] flex items-center justify-center">
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

  const { south, west, north, east, wallRemaining } = data;

  const perWall = Math.ceil(wallRemaining / 4);
  const w1 = Math.min(perWall, wallRemaining);
  const w2 = Math.min(perWall, Math.max(0, wallRemaining - perWall));
  const w3 = Math.min(perWall, Math.max(0, wallRemaining - perWall * 2));
  const w4 = Math.max(0, wallRemaining - perWall * 3);

  const discardHint =
    selectedTileId !== null &&
    !showActions &&
    !!availableActions?.canDiscard;

  return (
    <div className="h-screen bg-gradient-to-br from-[#1a6030] to-[#145020] flex flex-col overflow-hidden p-1 gap-1 relative">
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
        onSettings={() => {
          alert(
            `Room: ${roomId ?? "—"}\nRound: ${data.roundLabel}\nPlayers: ${data.players.length}`,
          );
        }}
      />
      {/* Main row: West + (North + Center) + East */}
      <div className="flex-1 min-h-0 flex gap-1">
        {/* West player hand area */}
        <div className="shrink-0 bg-black/10 rounded px-1 py-1 flex flex-col items-center justify-center gap-1 overflow-hidden max-h-full">
          <span
            className="text-[11px] text-white/60 font-medium truncate max-w-[1.2em]"
            style={{ writingMode: "vertical-rl" }}
          >
            {west.name}
          </span>
          <span className="bg-red-700 text-white rounded-full text-[10px] font-medium px-1">
            {west.handCount}
          </span>
          {west.flowerCount > 0 && (
            <span
              className="text-[11px]"
              style={{ transform: "rotate(90deg)" }}
            >
              🌸
              <sup className="text-[9px] text-green-400">
                {west.flowerCount}
              </sup>
            </span>
          )}
          <motion.div layout transition={{ duration: dur }} className="flex flex-col gap-px items-center flex-1 min-h-0 overflow-hidden">
            {Array.from({ length: Math.min(west.handCount, 13) }, (_, i) => (
              <Tile key={i} variant="back" size="sm" rotate={-90} />
            ))}
          </motion.div>
          <AnimatePresence>
            {west.melds.map((meld, i) => (
              <motion.div
                key={`meld-${i}-${meld.join(",")}`}
                initial={{ opacity: 0, scale: 0.8, y: -15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: meldDur }}
                className="flex flex-col gap-px border border-white/[.12] rounded-sm p-0.5 shrink-0"
              >
                {meld.map((c, j) => (
                  <Tile
                    key={j}
                    char={c}
                    variant="face"
                    size="sm"
                    rotate={-90}
                  />
                ))}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Center column: North + Center table */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* North player hand area */}
          <div className="shrink-0 bg-black/10 rounded px-2 py-1 flex items-end justify-center gap-2 overflow-hidden">
            <motion.div layout transition={{ duration: dur }} className="flex gap-px items-end min-w-0 overflow-hidden flex-shrink">
              {Array.from({ length: Math.min(north.handCount, 13) }, (_, i) => (
                <Tile key={i} variant="back" size="sm" />
              ))}
            </motion.div>
            <AnimatePresence>
              {north.melds.map((meld, i) => (
                <motion.div
                  key={`meld-${i}-${meld.join(",")}`}
                  initial={{ opacity: 0, scale: 0.8, x: -15 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: meldDur }}
                  className="flex gap-px border border-white/[.12] rounded-sm px-0.5 py-0.5 shrink-0"
                >
                  {meld.map((c, j) => (
                    <Tile key={j} char={c} variant="face" size="sm" />
                  ))}
                </motion.div>
              ))}
            </AnimatePresence>
            <OpponentBadge
              name={north.name}
              hand={north.handCount}
              flowers={north.flowerCount}
            />
          </div>

          {/* Center table: 3x3 grid */}
          <div className="flex-1 min-h-0 bg-black/[.08] rounded overflow-hidden grid grid-rows-[1fr_auto_1fr] grid-cols-[1fr_auto_1fr] gap-1 p-1">
            {/* (0,0) */}
            <div />
            {/* (0,1) North discards */}
            <div className="flex flex-wrap-reverse gap-px justify-center content-start self-end overflow-hidden">
              <AnimatePresence>
                {north.discards.map((c, i) => (
                  <motion.div
                    key={`${c}-${i}`}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: dur }}
                  >
                    <Tile char={c} variant="face" size="sm" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div />

            {/* (1,0) West discards + wall */}
            <div className="flex items-center justify-end gap-1 overflow-hidden">
              <div className="flex flex-col flex-wrap-reverse gap-px items-end justify-center h-full overflow-hidden">
                <AnimatePresence>
                  {west.discards.map((c, i) => (
                    <motion.div
                      key={`${c}-${i}`}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: dur }}
                    >
                      <Tile char={c} variant="face" size="sm" rotate={-90} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <TileWall
                direction="vertical"
                remaining={w4}
                totalStacks={WALL_STACKS}
                tileSize="sm"
                consumeFrom="end"
                faceCenter="right"
              />
            </div>
            {/* (1,1) Center: walls + info */}
            <div className="flex flex-col items-center justify-center">
              <TileWall
                direction="horizontal"
                remaining={w3}
                totalStacks={WALL_STACKS}
                tileSize="sm"
                consumeFrom="end"
                faceCenter="bottom"
              />
              <div className="bg-black/50 rounded flex flex-col items-center justify-center aspect-square w-full gap-0.5">
                <span className="text-xs font-medium text-amber-300/90 whitespace-nowrap">
                  剩余 {wallRemaining} 张
                </span>
                <span className="text-[9px] text-white/30 whitespace-nowrap">
                  {data.roundLabel}
                </span>
                {data.goldenTile && (
                  <GoldenTileIndicator
                    goldenTile={data.goldenTile}
                    flippedTile={data.flippedTile}
                    compact
                  />
                )}
              </div>
              <TileWall
                direction="horizontal"
                remaining={w1}
                totalStacks={WALL_STACKS}
                tileSize="sm"
                consumeFrom="start"
                faceCenter="top"
              />
            </div>
            {/* (1,2) East wall + discards */}
            <div className="flex items-center justify-start gap-1 overflow-hidden">
              <TileWall
                direction="vertical"
                remaining={w2}
                totalStacks={WALL_STACKS}
                tileSize="sm"
                consumeFrom="start"
                faceCenter="left"
              />
              <div className="flex flex-col flex-wrap gap-px items-start justify-center h-full overflow-hidden">
                <AnimatePresence>
                  {east.discards.map((c, i) => (
                    <motion.div
                      key={`${c}-${i}`}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: dur }}
                    >
                      <Tile char={c} variant="face" size="sm" rotate={90} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div />
            {/* (2,1) South discards */}
            <div className="flex flex-wrap gap-px justify-center content-start self-start overflow-hidden">
              <AnimatePresence>
                {south.discards.map((c, i) => (
                  <motion.div
                    key={`${c}-${i}`}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: dur }}
                  >
                    <Tile char={c} variant="face" size="sm" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div />
          </div>
        </div>
        {/* end center column */}

        {/* East player hand area */}
        <div className="shrink-0 bg-black/10 rounded px-1 py-1 flex flex-col items-center justify-center gap-1 overflow-hidden max-h-full">
          <span
            className="text-[11px] text-white/60 font-medium truncate max-w-[1.2em]"
            style={{ writingMode: "vertical-rl" }}
          >
            {east.name}
          </span>
          <span className="bg-red-700 text-white rounded-full text-[10px] font-medium px-1">
            {east.handCount}
          </span>
          {east.flowerCount > 0 && (
            <span
              className="text-[11px]"
              style={{ transform: "rotate(90deg)" }}
            >
              🌸
              <sup className="text-[9px] text-green-400">
                {east.flowerCount}
              </sup>
            </span>
          )}
          <motion.div layout transition={{ duration: dur }} className="flex flex-col gap-px items-center flex-1 min-h-0 overflow-hidden">
            {Array.from({ length: Math.min(east.handCount, 13) }, (_, i) => (
              <Tile key={i} variant="back" size="sm" rotate={90} />
            ))}
          </motion.div>
          <AnimatePresence>
            {east.melds.map((meld, i) => (
              <motion.div
                key={`meld-${i}-${meld.join(",")}`}
                initial={{ opacity: 0, scale: 0.8, y: -15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: meldDur }}
                className="flex flex-col gap-px border border-white/[.12] rounded-sm p-0.5 shrink-0"
              >
                {meld.map((c, j) => (
                  <Tile
                    key={j}
                    char={c}
                    variant="face"
                    size="sm"
                    rotate={90}
                  />
                ))}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Row 2: South player — melds + hand + icons */}
      <div className="shrink-0 bg-black/10 rounded px-1 py-1">
        <div className="flex items-end justify-center gap-2 min-w-0 overflow-hidden">
          {/* Tracker icon */}
          <div className="relative shrink-0 mr-auto">
            <button
              onClick={() => {
                setShowTracker((v) => !v);
                setShowChat(false);
              }}
              className="w-11 h-11 rounded-full bg-white/[.08] flex items-center justify-center cursor-pointer hover:bg-white/[.15] transition-colors shadow-sm"
              title="记牌器"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </button>
            {showTracker && trackerSections && (
              <div className="absolute bottom-12 left-0 bg-[#1a2e1a]/80 backdrop-blur-sm border border-white/10 rounded-lg p-2.5 shadow-lg z-50 w-[260px] max-w-[calc(100vw-1rem)]">
                <TileTracker sections={trackerSections} />
              </div>
            )}
          </div>
          {/* Flower */}
          <span className="text-sm shrink-0">
            🌸
            <sup className="text-[9px] text-green-400">
              {south.flowerCount}
            </sup>
          </span>
          {/* Melds */}
          {south.melds.map((meld, i) => (
            <div
              key={i}
              className="flex gap-px border border-white/[.12] rounded-sm px-0.5 py-0.5"
            >
              {meld.map((c, j) => (
                <Tile key={j} char={c} variant="face" size="md" />
              ))}
            </div>
          ))}
          {/* Hand */}
          <div className="min-w-0 flex-1">
            <PlayerHand
              tiles={south.handTiles ?? []}
              drawnTile={south.drawnTile ?? null}
              selectedId={selectedTileId}
              size="md"
              onSelect={handleSelectTile}
              onDiscard={handleDiscardTile}
            />
          </div>
          {/* Chat icon */}
          <div className="relative shrink-0 ml-auto">
            <button
              onClick={() => {
                setShowChat((v) => !v);
                setShowTracker(false);
              }}
              className="w-11 h-11 rounded-full bg-white/[.08] flex items-center justify-center cursor-pointer hover:bg-white/[.15] transition-colors shadow-sm"
              title="聊天"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            {showChat && (
              <div className="absolute bottom-12 right-0 w-[260px] max-w-[calc(100vw-1rem)] z-50">
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
            )}
          </div>
        </div>
      </div>

      {/* Score overlay — top-right corner */}
      <div className="absolute top-2 right-2 flex flex-col gap-px z-20 bg-black/30 backdrop-blur-sm rounded px-1.5 py-1 max-w-[100px]">
        {data.scores.map((s, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span
              className={`text-[8px] truncate ${s.isMe ? "text-amber-400/70" : "text-white/30"}`}
            >
              {s.name}
            </span>
            <span
              className={`text-[8px] tabular-nums ${s.isMe ? "text-amber-400/70" : "text-white/40"}`}
            >
              {s.score}
            </span>
          </div>
        ))}
      </div>

      {/* Action timeout — floating indicator when ActionBubbles not shown */}
      {actionRemaining != null && actionRemaining > 0 && !showActions && (
        <div className="absolute top-2 left-2 z-20">
          <div className={`flex items-center justify-center rounded-full w-8 h-8 text-sm font-bold backdrop-blur-sm ${actionRemaining <= 5 ? "bg-red-600/80 text-white animate-pulse" : "bg-white/20 text-white/80"}`}>
            {actionRemaining}
          </div>
        </div>
      )}

      {/* Action modal */}
      <ActionBubbles
        visible={showActions}
        actions={actions}
        discardInfo={showActions ? data.discardInfo : null}
        discardHint={discardHint}
        onPass={handlePass}
      />

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
