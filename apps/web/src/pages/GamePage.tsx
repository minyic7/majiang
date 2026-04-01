import { useState } from "react";
import type { TrackerSection } from "@majiang/shared";
import TopBar from "../components/layout/TopBar.js";
import GameTable from "../components/game/GameTable.js";
import TileTracker from "../components/sidebar/TileTracker.js";
import ScoreBoard from "../components/sidebar/ScoreBoard.js";
import RoundInfo from "../components/sidebar/RoundInfo.js";
import ChatPanel from "../components/chat/ChatPanel.js";
import type { ActionOption } from "../components/game/ActionBubbles.js";

// ─── Mock data for layout preview ───

const MOCK_TRACKER: TrackerSection[] = [
  {
    label: "万", color: "rgba(255,100,100,.6)",
    tiles: [1,2,3,4,5,6,7,8,9].map((v) => ({ id: `wan-${v}`, display: String(v), copies: 4 })),
  },
  {
    label: "筒", color: "rgba(80,180,80,.6)",
    tiles: [1,2,3,4,5,6,7,8,9].map((v) => ({ id: `bing-${v}`, display: String(v), copies: 4 })),
  },
  {
    label: "条", color: "rgba(80,140,255,.6)",
    tiles: [1,2,3,4,5,6,7,8,9].map((v) => ({ id: `tiao-${v}`, display: String(v), copies: 4 })),
  },
  {
    label: "字牌", color: "rgba(255,185,25,.5)",
    tiles: ["东","南","西","北","中","發","白"].map((c) => ({ id: `honor-${c}`, display: c, copies: 4 })),
  },
];

const MOCK_SCORES = [
  { name: "下家", score: 32 },
  { name: "西家", score: 8 },
  { name: "自己", score: -18, isMe: true },
  { name: "对家", score: -22 },
];

const MOCK_HAND = [
  { id: 1, char: "一", suit: "wan" },
  { id: 2, char: "二", suit: "wan" },
  { id: 3, char: "三", suit: "wan" },
  { id: 4, char: "四", suit: "wan" },
  { id: 5, char: "五", suit: "wan" },
  { id: 6, char: "六", suit: "wan" },
  { id: 7, char: "七", suit: "bing" },
  { id: 8, char: "八", suit: "bing" },
  { id: 9, char: "九", suit: "bing" },
  { id: 10, char: "筒", suit: "bing" },
  { id: 11, char: "条", suit: "tiao" },
  { id: 12, char: "三", suit: "tiao" },
  { id: 13, char: "中", suit: "honor" },
];

const MOCK_DRAWN = { id: 14, char: "發", suit: "honor" };

const MOCK_CHAT = [
  { id: "1", sender: "下家", text: "好的！" },
  { id: "2", sender: "我", text: "谢谢", isMe: true },
  { id: "3", sender: "西家", text: "快点打" },
  { id: "4", sender: "对家", text: "..." },
];

export default function GamePage() {
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [chatMessages, setChatMessages] = useState(MOCK_CHAT);

  const mockActions: ActionOption[] = [
    {
      id: "hu",
      label: "自摸",
      color: "rgba(120,230,120,1)",
      tiles: [{ char: "發", highlight: true }],
      onClick: () => setShowActions(false),
    },
    {
      id: "angang",
      label: "暗杠",
      color: "rgba(230,185,80,1)",
      tiles: [{ char: "發" }, { char: "發" }, { char: "發" }, { char: "發", highlight: true }],
      onClick: () => setShowActions(false),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0e1a0e] flex flex-col">
      <TopBar roomId="2048" roundLabel="东风局" playerCount={4} />

      <div className="flex-1 flex gap-2.5 p-2.5 items-start min-h-0 overflow-x-hidden">
        {/* Left sidebar */}
        <div className="w-40 shrink-0 flex flex-col gap-1.5 bg-white/[.02] border border-white/[.07] rounded-xl p-2 sticky top-2.5">
          <TileTracker sections={MOCK_TRACKER} />
          <ScoreBoard scores={MOCK_SCORES} />
          <RoundInfo
            roundLabel="东风 · 第一局"
            dealerName="下家"
            wallRemaining={56}
          />
        </div>

        {/* Game table */}
        <div className="flex-1 min-w-0">
          <GameTable
            players={[
              {
                name: "自己", seatWind: "南",
                handCount: 14, handTiles: MOCK_HAND, drawnTile: MOCK_DRAWN,
                discards: Array(12).fill(""),
                melds: [["", "", ""]],
                flowerCount: 2,
              },
              {
                name: "西家", seatWind: "西",
                handCount: 12,
                discards: Array(10).fill(""),
                melds: [["", "", ""]],
                flowerCount: 3,
              },
              {
                name: "对家", seatWind: "北",
                handCount: 13,
                discards: Array(9).fill(""),
                melds: [["", "", ""]],
                flowerCount: 2,
              },
              {
                name: "下家", seatWind: "东",
                handCount: 11,
                discards: Array(8).fill(""),
                melds: [["", "", ""]],
                flowerCount: 0,
              },
            ]}
            wallRemaining={56}
            roundLabel="东风 · 第一局"
            currentTurn={0}
            selectedTileId={selectedTile}
            actions={mockActions}
            actionVisible={showActions}
            discardHint={selectedTile !== null && !showActions}
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
        <div className="w-40 shrink-0 flex flex-col gap-1.5 bg-white/[.02] border border-white/[.07] rounded-xl p-2 sticky top-2.5">
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
    </div>
  );
}
