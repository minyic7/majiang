import { useState } from "react";
import { Link, useNavigate } from "react-router";
import Tile from "../components/tile/Tile.js";
import TileWall from "../components/tile/TileWall.js";
import PlayerHand from "../components/game/PlayerHand.js";
import GoldenTileIndicator from "../components/game/GoldenTileIndicator.js";
import ActionBubbles from "../components/game/ActionBubbles.js";
import RoundResultModal from "../components/game/RoundResultModal.js";
import TileTracker from "../components/sidebar/TileTracker.js";
import { useGameData } from "../hooks/useGameData.js";
import { useTileTracker } from "../hooks/useTileTracker.js";
import { useGameStore } from "../stores/gameStore.js";

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
    handlePass,
    handleSelectTile,
    handleDiscardTile,
  } = useGameData();

  const roundResult = useGameStore((s) => s.roundResult);
  const navigate = useNavigate();
  const trackerSections = useTileTracker();

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
          <div className="flex flex-col gap-px items-center flex-1 min-h-0 overflow-hidden">
            {Array.from({ length: Math.min(west.handCount, 13) }, (_, i) => (
              <Tile key={i} variant="back" size="sm" rotate={-90} />
            ))}
          </div>
          {west.melds.map((meld, i) => (
            <div
              key={i}
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
            </div>
          ))}
        </div>

        {/* Center column: North + Center table */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* North player hand area */}
          <div className="shrink-0 bg-black/10 rounded px-2 py-1 flex items-end justify-center gap-2 overflow-hidden">
            <div className="flex gap-px items-end min-w-0 overflow-hidden flex-shrink">
              {Array.from({ length: Math.min(north.handCount, 13) }, (_, i) => (
                <Tile key={i} variant="back" size="sm" />
              ))}
            </div>
            {north.melds.map((meld, i) => (
              <div
                key={i}
                className="flex gap-px border border-white/[.12] rounded-sm px-0.5 py-0.5 shrink-0"
              >
                {meld.map((c, j) => (
                  <Tile key={j} char={c} variant="face" size="sm" />
                ))}
              </div>
            ))}
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
              {north.discards.map((c, i) => (
                <Tile key={i} char={c} variant="face" size="sm" />
              ))}
            </div>
            <div />

            {/* (1,0) West discards + wall */}
            <div className="flex items-center justify-end gap-1 overflow-hidden">
              <div className="flex flex-col flex-wrap-reverse gap-px items-end justify-center h-full overflow-hidden">
                {west.discards.map((c, i) => (
                  <Tile
                    key={i}
                    char={c}
                    variant="face"
                    size="sm"
                    rotate={-90}
                  />
                ))}
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
                {east.discards.map((c, i) => (
                  <Tile
                    key={i}
                    char={c}
                    variant="face"
                    size="sm"
                    rotate={90}
                  />
                ))}
              </div>
            </div>

            <div />
            {/* (2,1) South discards */}
            <div className="flex flex-wrap gap-px justify-center content-start self-start overflow-hidden">
              {south.discards.map((c, i) => (
                <Tile key={i} char={c} variant="face" size="sm" />
              ))}
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
          <div className="flex flex-col gap-px items-center flex-1 min-h-0 overflow-hidden">
            {Array.from({ length: Math.min(east.handCount, 13) }, (_, i) => (
              <Tile key={i} variant="back" size="sm" rotate={90} />
            ))}
          </div>
          {east.melds.map((meld, i) => (
            <div
              key={i}
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
            </div>
          ))}
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
              className="w-8 h-8 rounded-full bg-white/[.08] flex items-center justify-center cursor-pointer hover:bg-white/[.15] transition-colors shadow-sm"
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
              <div className="absolute bottom-10 left-0 bg-[#1a2e1a]/80 backdrop-blur-sm border border-white/10 rounded-lg p-2.5 shadow-lg z-50 w-[260px] max-w-[calc(100vw-1rem)]">
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
              className="w-8 h-8 rounded-full bg-white/[.08] flex items-center justify-center cursor-pointer hover:bg-white/[.15] transition-colors shadow-sm"
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
              <div className="absolute bottom-10 right-0 bg-[#1a2e1a]/80 backdrop-blur-sm border border-white/10 rounded-lg p-3 w-[260px] shadow-lg z-50">
                <div className="text-xs text-white/50 font-semibold mb-1.5">
                  聊天
                </div>
                <div className="flex flex-col gap-1 max-h-28 overflow-y-auto mb-2">
                  <div className="text-[11px] text-white/40">
                    No messages yet
                  </div>
                </div>
                <input
                  placeholder="发送消息…"
                  className="w-full bg-white/[.06] border border-white/10 rounded px-2 py-1 text-[11px] text-white/50 placeholder:text-white/20 outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Score — fixed on table, top-right of center area */}
      <div className="absolute top-12 right-14 flex flex-col gap-px z-20 max-w-[80px]">
        {data.players.map((p, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span
              className={`text-[8px] truncate ${i === 0 ? "text-amber-400/70" : "text-white/30"}`}
            >
              {p.name}
            </span>
          </div>
        ))}
      </div>

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
          onClose={() => {
            useGameStore.getState().clearRoundResult();
            navigate("/");
          }}
        />
      )}
    </div>
  );
}
