import { useState } from "react";
import { Suit, type Tile as TileType } from "@majiang/shared";
import Tile from "../components/tile/Tile.js";
import TileWall from "../components/tile/TileWall.js";
import PlayerHand from "../components/game/PlayerHand.js";
import GoldenTileIndicator from "../components/game/GoldenTileIndicator.js";
import ActionBubbles, { type ActionOption } from "../components/game/ActionBubbles.js";

// ─── Mock data (same as desktop) ───

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

const SOUTH = {
  name: "自己", seatWind: "南",
  discards: ["wan1","wan2","wan3","wan4","wan5","wan6","wan7","wan8"],
  melds: [["bing5", "bing5", "bing5"]],
  flowerCount: 2,
};
const WEST = {
  name: "上家", hand: 12, flowers: 3,
  discards: ["wan1","wan3","wan5","wan7","wan9","bing1","wan2","wan4","wan6","wan8"],
  melds: [["tiao2","tiao2","tiao2"]],
};
const NORTH = {
  name: "对家", hand: 13, flowers: 2,
  discards: ["wan4","wan6","wan8","tiao1","zhong","fa","bai","wan1","wan3"],
  melds: [] as string[][],
};
const EAST = {
  name: "下家", hand: 11, flowers: 0,
  discards: ["bing2","bing4","east","south","west","north","bing7","bing9"],
  melds: [["north","north","north"]],
};

const MOCK_FLIPPED_TILE: TileType = { kind: "suited", suit: Suit.Wan, value: 2 };
const MOCK_GOLDEN_TILE: TileType = { kind: "suited", suit: Suit.Wan, value: 3 };

const WALL_STACKS = 10;
const WALL_REMAINING = 120;
const perWall = Math.ceil(WALL_REMAINING / 4);
const w1 = Math.min(perWall, WALL_REMAINING);
const w2 = Math.min(perWall, Math.max(0, WALL_REMAINING - perWall));
const w3 = Math.min(perWall, Math.max(0, WALL_REMAINING - perWall * 2));
const w4 = Math.max(0, WALL_REMAINING - perWall * 3);

// ─── Compact opponent badge ───

function OpponentBadge({ name, hand, flowers }: { name: string; hand: number; flowers: number }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <span className="text-[11px] text-white/60 font-medium">{name}</span>
      <span className="bg-red-700 text-white rounded-full text-[10px] font-medium px-1">{hand}</span>
      {flowers > 0 && <span className="text-[11px]">🌸<sup className="text-[9px] text-green-400">{flowers}</sup></span>}
    </div>
  );
}

const SCORES = [
  { name: "自己", score: 18, isMe: true },
  { name: "上家", score: -8 },
  { name: "对家", score: 12 },
  { name: "下家", score: -22 },
];

export default function MobileGamePage() {
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [showActions, setShowActions] = useState(true);
  const [showTracker, setShowTracker] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const mockActions: ActionOption[] = [
    { id: "hu", label: "胡", color: "rgba(255,80,80,1)", tiles: [{ char: "wan3", highlight: true }], onClick: () => setShowActions(false) },
    { id: "peng", label: "碰", color: "rgba(140,185,255,1)", tiles: [{ char: "wan3" }, { char: "wan3" }, { char: "wan3", highlight: true }], onClick: () => setShowActions(false) },
    { id: "chi1", label: "吃", color: "rgba(100,220,180,1)", tiles: [{ char: "wan1" }, { char: "wan2" }, { char: "wan3", highlight: true }], onClick: () => setShowActions(false) },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-[#1a6030] to-[#145020] flex flex-col overflow-hidden p-1 gap-1 relative">

      {/* Main row: West + (North + Center) + East — all extend to top */}
      <div className="flex-1 min-h-0 flex gap-1">

        {/* West player hand area — full height */}
        <div className="shrink-0 bg-black/10 rounded px-1 py-1 flex flex-col items-center justify-center gap-1 overflow-hidden">
          <span className="text-[11px] text-white/60 font-medium" style={{ writingMode: "vertical-rl" }}>{WEST.name}</span>
          <span className="bg-red-700 text-white rounded-full text-[10px] font-medium px-1">{WEST.hand}</span>
          {WEST.flowers > 0 && <span className="text-[11px]" style={{ transform: "rotate(90deg)" }}>🌸<sup className="text-[9px] text-green-400">{WEST.flowers}</sup></span>}
          <div className="flex flex-col gap-px items-center">
            {Array.from({ length: WEST.hand }, (_, i) => (
              <Tile key={i} variant="back" size="sm" rotate={-90} />
            ))}
          </div>
          {WEST.melds.map((meld, i) => (
            <div key={i} className="flex flex-col gap-px border border-white/[.12] rounded-sm p-0.5">
              {meld.map((c, j) => <Tile key={j} char={c} variant="face" size="sm" rotate={-90} />)}
            </div>
          ))}
        </div>

        {/* Center column: North + Center table */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* North player hand area */}
          <div className="shrink-0 bg-black/10 rounded px-2 py-1 flex items-end justify-center gap-2">
            <div className="shrink-0 flex gap-px items-end">
              {Array.from({ length: NORTH.hand }, (_, i) => (
                <Tile key={i} variant="back" size="sm" />
              ))}
            </div>
            {NORTH.melds.map((meld, i) => (
              <div key={i} className="flex gap-px border border-white/[.12] rounded-sm px-0.5 py-0.5">
                {meld.map((c, j) => <Tile key={j} char={c} variant="face" size="sm" />)}
              </div>
            ))}
            <OpponentBadge name={NORTH.name} hand={NORTH.hand} flowers={NORTH.flowers} />
          </div>

          {/* Center table: 3×3 grid */}
          <div className="flex-1 min-h-0 bg-black/[.08] rounded overflow-hidden grid grid-rows-[1fr_auto_1fr] grid-cols-[1fr_auto_1fr] gap-1 p-1">
          {/* (0,0) */}
          <div />
          {/* (0,1) North discards */}
          <div className="flex flex-wrap-reverse gap-px justify-center content-start self-end overflow-hidden">
            {NORTH.discards.map((c, i) => <Tile key={i} char={c} variant="face" size="sm" />)}
          </div>
          <div />

          {/* (1,0) West discards + wall */}
          <div className="flex items-center justify-end gap-1 overflow-hidden">
            <div className="flex flex-col flex-wrap-reverse gap-px items-end justify-center h-full overflow-hidden">
              {WEST.discards.map((c, i) => <Tile key={i} char={c} variant="face" size="sm" rotate={-90} />)}
            </div>
            <TileWall direction="vertical" remaining={w4} totalStacks={WALL_STACKS} tileSize="sm" consumeFrom="end" faceCenter="right" />
          </div>
          {/* (1,1) Center: walls top/bottom + info */}
          <div className="flex flex-col items-center justify-center">
            <TileWall direction="horizontal" remaining={w3} totalStacks={WALL_STACKS} tileSize="sm" consumeFrom="end" faceCenter="bottom" />
            <div className="bg-black/50 rounded flex flex-col items-center justify-center aspect-square w-full gap-0.5">
              <span className="text-xs font-medium text-amber-300/90 whitespace-nowrap">剩余 {WALL_REMAINING} 张</span>
              <span className="text-[9px] text-white/30 whitespace-nowrap">东风 · 第一局</span>
              {MOCK_GOLDEN_TILE && <GoldenTileIndicator goldenTile={MOCK_GOLDEN_TILE} flippedTile={MOCK_FLIPPED_TILE} compact />}
            </div>
            <TileWall direction="horizontal" remaining={w1} totalStacks={WALL_STACKS} tileSize="sm" consumeFrom="start" faceCenter="top" />
          </div>
          {/* (1,2) East wall + discards */}
          <div className="flex items-center justify-start gap-1 overflow-hidden">
            <TileWall direction="vertical" remaining={w2} totalStacks={WALL_STACKS} tileSize="sm" consumeFrom="start" faceCenter="left" />
            <div className="flex flex-col flex-wrap gap-px items-start justify-center h-full overflow-hidden">
              {EAST.discards.map((c, i) => <Tile key={i} char={c} variant="face" size="sm" rotate={90} />)}
            </div>
          </div>

          <div />
          {/* (2,1) South discards */}
          <div className="flex flex-wrap gap-px justify-center content-start self-start overflow-hidden">
            {SOUTH.discards.map((c, i) => <Tile key={i} char={c} variant="face" size="sm" />)}
          </div>
          <div />
        </div>
        </div>{/* end center column */}

        {/* East player hand area */}
        <div className="shrink-0 bg-black/10 rounded px-1 py-1 flex flex-col items-center justify-center gap-1 overflow-hidden">
          <span className="text-[11px] text-white/60 font-medium" style={{ writingMode: "vertical-rl" }}>{EAST.name}</span>
          <span className="bg-red-700 text-white rounded-full text-[10px] font-medium px-1">{EAST.hand}</span>
          {EAST.flowers > 0 && <span className="text-[11px]" style={{ transform: "rotate(90deg)" }}>🌸<sup className="text-[9px] text-green-400">{EAST.flowers}</sup></span>}
          <div className="flex flex-col gap-px items-center">
            {Array.from({ length: EAST.hand }, (_, i) => (
              <Tile key={i} variant="back" size="sm" rotate={90} />
            ))}
          </div>
          {EAST.melds.map((meld, i) => (
            <div key={i} className="flex flex-col gap-px border border-white/[.12] rounded-sm p-0.5">
              {meld.map((c, j) => <Tile key={j} char={c} variant="face" size="sm" rotate={90} />)}
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: South player — melds + hand + icons */}
      <div className="shrink-0 bg-black/10 rounded px-1 py-1">
        <div className="flex items-end justify-center gap-2">
          {/* Tracker icon — bottom left with bubble */}
          <div className="relative shrink-0 mr-auto">
            <button onClick={() => { setShowTracker(v => !v); setShowChat(false); }} className="w-8 h-8 rounded-full bg-white/[.08] flex items-center justify-center cursor-pointer hover:bg-white/[.15] transition-colors shadow-sm" title="记牌器">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </button>
            {showTracker && (
              <div className="absolute bottom-10 left-0 bg-[#1a2e1a]/80 backdrop-blur-sm border border-white/10 rounded-lg p-2.5 shadow-lg z-50 w-[260px]">
                <div className="text-[11px] text-white/50 font-semibold mb-1.5">记牌器</div>
                {[
                  { label: "万", color: "rgba(255,90,90,.85)", tiles: ["1","2","3","4","5","6","7","8","9"] },
                  { label: "筒", color: "rgba(60,200,60,.85)", tiles: ["1","2","3","4","5","6","7","8","9"] },
                  { label: "条", color: "rgba(70,140,255,.85)", tiles: ["1","2","3","4","5","6","7","8","9"] },
                  { label: "字", color: "rgba(255,185,25,.85)", tiles: ["东","南","西","北","中","發","白"] },
                  { label: "花", color: "rgba(200,100,200,.85)", tiles: ["春","夏","秋","冬","梅","兰","竹","菊"] },
                ].map((sec) => (
                  <div key={sec.label} className="mb-1.5 last:mb-0">
                    <div className="text-[10px] font-bold text-center mb-0.5 rounded py-px" style={{ color: sec.color, backgroundColor: sec.color.replace(/[\d.]+\)$/, "0.12)") }}>
                      {sec.label}
                    </div>
                    <div className={`grid gap-px ${sec.tiles.length <= 7 ? "grid-cols-7" : "grid-cols-9"}`}>
                      {sec.tiles.map((t) => (
                        <button key={t} className="text-center text-[10px] rounded py-0.5 cursor-pointer select-none bg-white/[.06] text-white/45 hover:bg-white/[.15] active:bg-red-500/20 active:text-red-400/60 transition-colors">
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Flower */}
          <span className="text-sm shrink-0">🌸<sup className="text-[9px] text-green-400">{SOUTH.flowerCount}</sup></span>
          {/* Melds */}
          {SOUTH.melds.map((meld, i) => (
            <div key={i} className="flex gap-px border border-white/[.12] rounded-sm px-0.5 py-0.5 shrink-0">
              {meld.map((c, j) => <Tile key={j} char={c} variant="face" size="md" />)}
            </div>
          ))}
          {/* Hand */}
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
          {/* Chat icon — bottom right with bubble */}
          <div className="relative shrink-0 ml-auto">
            <button onClick={() => { setShowChat(v => !v); setShowTracker(false); }} className="w-8 h-8 rounded-full bg-white/[.08] flex items-center justify-center cursor-pointer hover:bg-white/[.15] transition-colors shadow-sm" title="聊天">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            {showChat && (
              <div className="absolute bottom-10 right-0 bg-[#1a2e1a]/80 backdrop-blur-sm border border-white/10 rounded-lg p-3 w-[260px] shadow-lg z-50">
                <div className="text-xs text-white/50 font-semibold mb-1.5">聊天</div>
                <div className="flex flex-col gap-1 max-h-28 overflow-y-auto mb-2">
                  <div className="text-[11px] text-white/40">下家：好的！</div>
                  <div className="text-[11px] text-amber-400/60">我：谢谢</div>
                  <div className="text-[11px] text-white/40">上家：快点打</div>
                </div>
                <input placeholder="发送消息…" className="w-full bg-white/[.06] border border-white/10 rounded px-2 py-1 text-[11px] text-white/50 placeholder:text-white/20 outline-none" />
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Score — fixed on table, top-right of center area */}
      <div className="absolute top-12 right-14 flex flex-col gap-px z-20">
        {SCORES.map((s, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span className={`text-[8px] ${s.isMe ? "text-amber-400/70" : "text-white/30"}`}>{s.name}</span>
            <span className={`text-[9px] font-medium ${s.score >= 0 ? "text-green-400/70" : "text-red-400/70"}`}>
              {s.score >= 0 ? "+" : ""}{s.score}
            </span>
          </div>
        ))}
      </div>

      {/* Action modal */}
      <ActionBubbles
        visible={showActions}
        actions={mockActions}
        discardInfo={showActions ? { playerName: "上家", char: "wan3" } : null}
        discardHint={selectedTile !== null && !showActions}
        onPass={() => setShowActions(false)}
      />
    </div>
  );
}
