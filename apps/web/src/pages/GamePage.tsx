import { useState } from "react";
import { useNavigate } from "react-router";
import { Suit, type Tile } from "@majiang/shared";
import TopBar from "../components/layout/TopBar.js";
import GameTable from "../components/game/GameTable.js";
import TileTracker from "../components/sidebar/TileTracker.js";
import ScoreBoard from "../components/sidebar/ScoreBoard.js";
import RoundInfo from "../components/sidebar/RoundInfo.js";
import ChatPanel from "../components/chat/ChatPanel.js";
import RoundResultModal from "../components/game/RoundResultModal.js";
import type { ActionOption } from "../components/game/ActionBubbles.js";
import { useTileTracker } from "../hooks/useTileTracker.js";
import { useGameStore } from "../stores/gameStore.js";

const MOCK_SCORES = [
  { name: "下家", score: 32 },
  { name: "西家", score: 8 },
  { name: "自己", score: -18, isMe: true },
  { name: "对家", score: -22 },
];

const MOCK_HAND = [
  { id: 1, char: "wan1", suit: "wan" },
  { id: 2, char: "wan2", suit: "wan" },
  { id: 3, char: "wan3", suit: "wan" },
  { id: 4, char: "wan4", suit: "wan" },
  { id: 5, char: "wan5", suit: "wan" },
  { id: 6, char: "wan6", suit: "wan" },
  { id: 7, char: "bing7", suit: "bing" },
  { id: 8, char: "bing8", suit: "bing" },
  { id: 9, char: "bing9", suit: "bing" },
  { id: 10, char: "bing1", suit: "bing" },
  { id: 11, char: "tiao1", suit: "tiao" },
  { id: 12, char: "tiao3", suit: "tiao" },
  { id: 13, char: "zhong", suit: "honor" },
];

const MOCK_DRAWN = { id: 14, char: "fa", suit: "honor" };

const MOCK_FLIPPED_TILE: Tile = { kind: "suited", suit: Suit.Wan, value: 2 };
const MOCK_GOLDEN_TILE: Tile = { kind: "suited", suit: Suit.Wan, value: 3 };

const MOCK_CHAT = [
  { id: "1", sender: "下家", text: "好的！" },
  { id: "2", sender: "我", text: "谢谢", isMe: true },
  { id: "3", sender: "西家", text: "快点打" },
  { id: "4", sender: "对家", text: "..." },
];

export default function GamePage() {
  const navigate = useNavigate();
  const trackerSections = useTileTracker();
  const gameState = useGameStore((s) => s.gameState);
  const gameOverResult = useGameStore((s) => s.gameOverResult);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [showActions, setShowActions] = useState(true);
  const [chatMessages, setChatMessages] = useState(MOCK_CHAT);

  const mockActions: ActionOption[] = [
    {
      id: "hu",
      label: "胡",
      color: "rgba(255,80,80,1)",
      tiles: [{ char: "wan3", highlight: true }],
      onClick: () => setShowActions(false),
    },
    {
      id: "gang",
      label: "杠",
      color: "rgba(230,185,80,1)",
      tiles: [{ char: "wan3" }, { char: "wan3" }, { char: "wan3" }, { char: "wan3", highlight: true }],
      onClick: () => setShowActions(false),
    },
    {
      id: "peng",
      label: "碰",
      color: "rgba(140,185,255,1)",
      tiles: [{ char: "wan3" }, { char: "wan3" }, { char: "wan3", highlight: true }],
      onClick: () => setShowActions(false),
    },
    {
      id: "chi1",
      label: "吃 一二三",
      color: "rgba(100,220,180,1)",
      tiles: [{ char: "wan1" }, { char: "wan2" }, { char: "wan3", highlight: true }],
      onClick: () => setShowActions(false),
    },
    {
      id: "chi2",
      label: "吃 二三四",
      color: "rgba(100,220,180,1)",
      tiles: [{ char: "wan2" }, { char: "wan3", highlight: true }, { char: "wan4" }],
      onClick: () => setShowActions(false),
    },
    {
      id: "chi3",
      label: "吃 三四五",
      color: "rgba(100,220,180,1)",
      tiles: [{ char: "wan3", highlight: true }, { char: "wan4" }, { char: "wan5" }],
      onClick: () => setShowActions(false),
    },
  ];

  return (
    <div className="h-screen bg-[#0a1208] flex flex-col overflow-hidden">
      <TopBar roomId="2048" roundLabel="东风局" playerCount={4} />

      <div className="flex-1 flex gap-2.5 p-2.5 items-stretch min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-52 shrink-0 flex flex-col gap-1.5 bg-white/[.02] border border-white/[.07] rounded-xl p-2 overflow-y-auto">
          {trackerSections && <TileTracker sections={trackerSections} />}
          <ScoreBoard
            scores={
              gameState
                ? gameState.players.map((p, i) => ({
                    name: p.name,
                    score: 0,
                    isMe: i === gameState.myIndex,
                  }))
                : MOCK_SCORES
            }
          />
          <RoundInfo
            roundLabel="东风 · 第一局"
            dealerName={gameState ? gameState.players[gameState.dealerIndex].name : "下家"}
            wallRemaining={gameState ? gameState.wallRemaining : 120}
          />
        </div>

        {/* Game table */}
        <div className="flex-1 min-w-0 min-h-0">
          <GameTable
            players={[
              {
                name: "自己", seatWind: "南",
                handCount: 14, handTiles: MOCK_HAND, drawnTile: MOCK_DRAWN,
                discards: ["wan1","wan2","wan3","wan4","wan5","wan6","wan7","wan8","wan9","bing1","tiao1","zhong","fa","bai","east","south","west","north"],
                melds: [["bing5", "bing5", "bing5"]],
                flowerCount: 2,
              },
              {
                name: "西家", seatWind: "西",
                handCount: 12,
                discards: Array(16).fill("tiao2"),
                melds: [["bing3", "bing3", "bing3"]],
                flowerCount: 3,
              },
              {
                name: "对家", seatWind: "北",
                handCount: 13,
                discards: Array(18).fill("wan5"),
                melds: [["tiao7", "tiao7", "tiao7"]],
                flowerCount: 2,
              },
              {
                name: "下家", seatWind: "东",
                handCount: 11,
                discards: Array(14).fill("bing4"),
                melds: [["north", "north", "north"]],
                flowerCount: 0,
              },
            ]}
            wallRemaining={120}
            roundLabel="东风 · 第一局"
            currentTurn={0}
            selectedTileId={selectedTile}
            actions={mockActions}
            actionVisible={showActions}
            discardInfo={showActions ? { playerName: "上家", char: "wan3" } : null}
            discardHint={selectedTile !== null && !showActions}
            goldenTile={MOCK_GOLDEN_TILE}
            flippedTile={MOCK_FLIPPED_TILE}
            onSelectTile={(id) => {
              setSelectedTile(id);
              // Show draw actions if selecting the drawn tile
              if (id === MOCK_DRAWN.id) setShowActions(true);
              else setShowActions(false);
            }}
            onDiscardTile={(id) => {
              setSelectedTile(null);
              setShowActions(false);
            }}
            centerContent={
              <span className="text-[7px] bg-amber-500/10 border border-amber-500/28 text-amber-500/78 rounded px-1 py-0.5">
                组件占位设计
              </span>
            }
          />
        </div>

        {/* Right sidebar */}
        <div className="w-52 shrink-0 flex flex-col gap-1.5 bg-white/[.02] border border-white/[.07] rounded-xl p-2 overflow-y-auto">
          <ChatPanel
            messages={chatMessages}
            onSend={(text) => {
              setChatMessages((prev) => [...prev, { id: String(Date.now()), sender: "我", text, isMe: true }]);
            }}
            onEmoji={(emoji) => {
              setChatMessages((prev) => [...prev, { id: String(Date.now()), sender: "我", text: emoji, isMe: true }]);
            }}
          />
        </div>
      </div>

      {gameOverResult && gameState && (
        <RoundResultModal
          result={gameOverResult}
          players={gameState.players}
          onClose={() => {
            useGameStore.getState().reset();
            navigate("/");
          }}
        />
      )}
    </div>
  );
}
