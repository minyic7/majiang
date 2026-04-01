import { useState } from "react";
import Tile from "../components/tile/Tile.js";
import TileWall from "../components/tile/TileWall.js";
import PlayerHand from "../components/game/PlayerHand.js";
import ActionBubbles, { type ActionOption } from "../components/game/ActionBubbles.js";

// ─── Mock data ───

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

const OPP = {
  west:  { name: "上家", hand: 12, flowers: 3, discards: ["一","三","五","七","九","筒"], melds: [["二","二","二"]] },
  north: { name: "对家", hand: 13, flowers: 2, discards: ["四","六","八","条","中","發","白"], melds: [] as string[][] },
  east:  { name: "下家", hand: 11, flowers: 0, discards: ["二","四","东","南","西"], melds: [["北","北","北"]] },
};
const MY_DISCARDS = ["一","二","三","四","五","六","七","八"];

/** Vertical opponent badge for left/right side panels */
function SideBadge({ name, hand, flowers, discards, melds, side }: {
  name: string; hand: number; flowers: number;
  discards: string[]; melds: string[][];
  side: "left" | "right";
}) {
  const rotate = side === "left" ? -90 : 90;
  return (
    <div className="flex flex-col items-center gap-1 py-0.5">
      {/* Name — vertical writing */}
      <span
        className="text-[10px] text-white/60 font-medium tracking-widest"
        style={{ writingMode: "vertical-rl" }}
      >
        {name}
      </span>
      {/* Hand count */}
      <span className="bg-red-700 text-white rounded-full text-[9px] font-medium w-4 h-4 flex items-center justify-center leading-none">{hand}</span>
      {/* Flowers */}
      {flowers > 0 && (
        <span className="text-[10px] leading-none">🌸<sup className="text-[8px] text-green-400">{flowers}</sup></span>
      )}
      {/* Melds */}
      {melds.map((meld, i) => (
        <div key={i} className="flex flex-col gap-px">
          {meld.map((c, j) => <Tile key={j} char={c} variant="face" size="sm" rotate={rotate} />)}
        </div>
      ))}
      {/* Recent discards (stacked vertically) */}
      <div className="flex flex-col gap-px mt-0.5">
        {discards.slice(-3).map((c, i) => <Tile key={i} char={c} variant="face" size="sm" rotate={rotate} />)}
        {discards.length > 3 && (
          <span className="text-[8px] text-white/25 text-center">+{discards.length - 3}</span>
        )}
      </div>
    </div>
  );
}

export default function MobileGamePage() {
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const mockActions: ActionOption[] = [
    { id: "hu", label: "胡", color: "rgba(255,80,80,1)", tiles: [{ char: "三", highlight: true }], onClick: () => setShowActions(false) },
    { id: "peng", label: "碰", color: "rgba(140,185,255,1)", tiles: [{ char: "三" }, { char: "三" }, { char: "三", highlight: true }], onClick: () => setShowActions(false) },
    { id: "chi1", label: "吃", color: "rgba(100,220,180,1)", tiles: [{ char: "一" }, { char: "二" }, { char: "三", highlight: true }], onClick: () => setShowActions(false) },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-[#1a6030] to-[#145020] flex flex-col overflow-hidden">

      {/* Row 1: 对家 (top) — badge + melds + recent discards */}
      <div className="shrink-0 bg-black/15 px-1 py-0.5 flex items-center justify-center gap-1.5">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-white/60 font-medium">{OPP.north.name}</span>
          <span className="bg-red-700 text-white rounded-full text-[9px] font-medium px-1 leading-tight">{OPP.north.hand}</span>
          {OPP.north.flowers > 0 && <span className="text-[10px]">🌸<sup className="text-[8px] text-green-400">{OPP.north.flowers}</sup></span>}
        </div>
        {OPP.north.melds.map((meld, i) => (
          <div key={i} className="flex gap-px">
            {meld.map((c, j) => <Tile key={j} char={c} variant="face" size="sm" />)}
          </div>
        ))}
        <div className="flex gap-px">
          {OPP.north.discards.slice(-5).map((c, i) => <Tile key={i} char={c} variant="face" size="sm" />)}
          {OPP.north.discards.length > 5 && <span className="text-[8px] text-white/25 self-end ml-0.5">+{OPP.north.discards.length - 5}</span>}
        </div>
      </div>

      {/* Row 2: 上家 + 牌桌 + 下家 */}
      <div className="flex-1 min-h-0 flex">
        {/* Left: 上家 — vertical panel */}
        <div className="shrink-0 w-16 bg-black/15 flex flex-col items-center justify-center">
          <SideBadge {...OPP.west} side="left" />
        </div>

        {/* Center: tile walls + center info + south discards */}
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 px-0.5 relative">
          {/* Tile walls + center info */}
          <div className="flex flex-col items-center gap-0">
            <TileWall direction="horizontal" remaining={30} totalStacks={8} consumeFrom="end" faceCenter="bottom" />
            <div className="flex items-center gap-0">
              <TileWall direction="vertical" remaining={30} totalStacks={8} consumeFrom="end" faceCenter="right" />
              <div className="bg-black/50 rounded px-1.5 py-0.5 flex flex-col items-center leading-tight">
                <span className="text-[10px] font-medium text-amber-300/90 whitespace-nowrap">余120</span>
                <span className="text-[8px] text-white/30 whitespace-nowrap">东风一局</span>
              </div>
              <TileWall direction="vertical" remaining={30} totalStacks={8} consumeFrom="start" faceCenter="left" />
            </div>
            <TileWall direction="horizontal" remaining={30} totalStacks={8} consumeFrom="start" faceCenter="top" />
          </div>

          {/* South (my) discards — below walls */}
          <div className="flex flex-wrap gap-px justify-center">
            {MY_DISCARDS.map((c, i) => <Tile key={i} char={c} variant="face" size="sm" />)}
          </div>

          {/* Info overlay */}
          {showInfo && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40" onClick={() => setShowInfo(false)}>
              <div className="bg-[#1a2e1a] rounded-xl p-3 space-y-1.5 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
                <div className="text-xs text-white/60">东风 · 第一局</div>
                <div className="text-xs text-white/60">庄家：下家</div>
                <div className="text-xs text-amber-400/70">剩余：120 张</div>
                <div className="border-t border-white/10 pt-1.5">
                  <div className="text-xs text-green-400/80">自己: +18</div>
                  <div className="text-xs text-red-400/80">上家: -8</div>
                  <div className="text-xs text-green-400/80">对家: +12</div>
                  <div className="text-xs text-red-400/80">下家: -22</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: 下家 — vertical panel */}
        <div className="shrink-0 w-16 bg-black/15 flex flex-col items-center justify-center">
          <SideBadge {...OPP.east} side="right" />
        </div>
      </div>

      {/* Row 3: 自己 (bottom) — melds + hand */}
      <div className="shrink-0 bg-black/20 px-1 py-1">
        <div className="flex items-end justify-center gap-1">
          <span className="text-xs shrink-0">🌸<sup className="text-[9px] text-green-400">2</sup></span>
          <div className="flex gap-px border border-white/[.12] rounded-sm px-0.5 py-0.5 shrink-0">
            {["", "", ""].map((c, i) => <Tile key={i} char={c} variant="face" size="sm" />)}
          </div>
          <PlayerHand
            tiles={MOCK_HAND}
            drawnTile={MOCK_DRAWN}
            selectedId={selectedTile}
            size="md"
            onSelect={(id) => {
              setSelectedTile(id);
              if (id === MOCK_DRAWN.id) setShowActions(true);
              else setShowActions(false);
            }}
            onDiscard={() => { setSelectedTile(null); setShowActions(false); }}
          />
          <button onClick={() => setShowInfo((v) => !v)} className="text-[10px] text-white/40 px-1 py-0.5 rounded bg-white/[.06] cursor-pointer shrink-0">ℹ️</button>
        </div>
      </div>

      {/* Action modal */}
      <ActionBubbles
        visible={showActions}
        actions={mockActions}
        discardInfo={showActions ? { playerName: "上家", char: "三" } : null}
        discardHint={selectedTile !== null && !showActions}
        onPass={() => setShowActions(false)}
      />
    </div>
  );
}
