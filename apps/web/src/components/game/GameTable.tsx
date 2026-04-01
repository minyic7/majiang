import Tile from "../tile/Tile.js";
import TileWall from "../tile/TileWall.js";
import OpponentArea from "./OpponentArea.js";
import SouthPlayer from "./SouthPlayer.js";
import type { ActionOption } from "./ActionBubbles.js";

interface PlayerData {
  name: string;
  seatWind: string;
  handCount: number;
  handTiles?: { id: number; char: string; suit?: string }[];
  drawnTile?: { id: number; char: string; suit?: string } | null;
  discards: string[];
  melds: string[][];
  flowerCount: number;
}

interface GameTableProps {
  players: [PlayerData, PlayerData, PlayerData, PlayerData];
  wallRemaining: number;
  roundLabel: string;
  currentTurn: number;
  selectedTileId: number | null;
  actions: ActionOption[];
  actionVisible: boolean;
  discardInfo?: { playerName: string; char: string } | null;
  discardHint?: boolean;
  onPass?: () => void;
  onSelectTile: (id: number) => void;
  onDiscardTile: (id: number) => void;
  onFlowerClick?: (position: "south" | "west" | "north" | "east") => void;
  centerContent?: React.ReactNode;
}

const SIDE_W = 120;
const WALL_STACKS = 18;

export default function GameTable({
  players, wallRemaining, roundLabel, currentTurn,
  selectedTileId, actions, actionVisible, discardInfo, discardHint,
  onPass, onSelectTile, onDiscardTile, onFlowerClick, centerContent,
}: GameTableProps) {
  const [south, west, north, east] = players;
  const perWall = Math.ceil(wallRemaining / 4);
  const w1 = Math.min(perWall, wallRemaining);
  const w2 = Math.min(perWall, Math.max(0, wallRemaining - perWall));
  const w3 = Math.min(perWall, Math.max(0, wallRemaining - perWall * 2));
  const w4 = Math.max(0, wallRemaining - perWall * 3);

  return (
    <div className="bg-gradient-to-br from-[#1a6030] to-[#145020] rounded-xl p-2 h-full flex flex-col gap-1 shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),inset_0_-2px_4px_rgba(0,0,0,0.2)]">
      {/* Row 1: West + (North + Center) + East — all extend to top */}
      <div className="flex-1 min-h-0 flex gap-1">
        {/* West player hand area — full height */}
        <div className="bg-black/10 rounded-md p-1.5 overflow-hidden" style={{ width: SIDE_W }}>
          <OpponentArea
            name={west.name} handCount={west.handCount}
            discards={[]} melds={west.melds}
            flowerCount={west.flowerCount} position="west"
            isCurrentTurn={currentTurn === 1}
            onFlowerClick={() => onFlowerClick?.("west")}
          />
        </div>

        {/* Center column: North hand + Table center */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* North player hand area */}
          <div className="shrink-0 bg-black/10 rounded-md p-1.5 overflow-hidden">
            <OpponentArea
              name={north.name} handCount={north.handCount}
              discards={[]} melds={north.melds}
              flowerCount={north.flowerCount} position="north"
              isCurrentTurn={currentTurn === 2}
              onFlowerClick={() => onFlowerClick?.("north")}
            />
          </div>

          {/* Table center: 3×3 grid */}
          <div className="flex-1 min-h-0 bg-black/[.12] rounded-lg overflow-hidden grid grid-rows-[1fr_auto_1fr] grid-cols-[1fr_auto_1fr] gap-2 p-3 border border-white/[.03]">
          {/* (0,0) empty */}
          <div />
          {/* (0,1) north: discards + wall */}
          <div className="flex flex-col items-center justify-end gap-2 overflow-hidden">
            <div className="flex flex-wrap-reverse gap-0.5 justify-center content-start overflow-hidden w-full">
              {north.discards.map((c, i) => <Tile key={i} char={c} variant="face" size="md" />)}
            </div>
            <TileWall direction="horizontal" remaining={w3} totalStacks={WALL_STACKS} consumeFrom="end" faceCenter="bottom" />
          </div>
          {/* (0,2) empty */}
          <div />

          {/* (1,0) west: discards + wall */}
          <div className="flex items-center justify-end gap-2 overflow-hidden">
            <div className="flex flex-col flex-wrap-reverse gap-0.5 items-end overflow-hidden h-full">
              {west.discards.map((c, i) => <Tile key={i} char={c} variant="face" size="md" rotate={-90} />)}
            </div>
            <TileWall direction="vertical" remaining={w4} totalStacks={WALL_STACKS} consumeFrom="end" faceCenter="right" />
          </div>
          {/* (1,1) center info — fixed 300x300 */}
          <div className="flex items-center justify-center">
            <div className="bg-gradient-to-b from-black/60 to-black/75 rounded-xl flex flex-col items-center justify-center gap-1.5 w-full h-full min-w-[160px] border border-white/[.06] shadow-lg px-4 py-3">
              <span className="text-sm font-medium text-amber-300/90 whitespace-nowrap">
                剩余 <span className="text-base">{wallRemaining}</span> 张
              </span>
              <span className="text-xs text-white/30 whitespace-nowrap">{roundLabel}</span>
              {centerContent}
            </div>
          </div>
          {/* (1,2) east: wall + discards */}
          <div className="flex items-center justify-start gap-2 overflow-hidden">
            <TileWall direction="vertical" remaining={w2} totalStacks={WALL_STACKS} consumeFrom="start" faceCenter="left" />
            <div className="flex flex-col flex-wrap gap-0.5 items-start overflow-hidden h-full">
              {east.discards.map((c, i) => <Tile key={i} char={c} variant="face" size="md" rotate={90} />)}
            </div>
          </div>

          {/* (2,0) empty */}
          <div />
          {/* (2,1) south: wall + discards */}
          <div className="flex flex-col items-center justify-start gap-2 overflow-hidden">
            <TileWall direction="horizontal" remaining={w1} totalStacks={WALL_STACKS} consumeFrom="start" faceCenter="top" />
            <div className="flex flex-wrap gap-0.5 justify-start content-start overflow-hidden w-full">
              {south.discards.map((c, i) => <Tile key={i} char={c} variant="face" size="md" />)}
            </div>
          </div>
          {/* (2,2) empty */}
          <div />
        </div>
        </div>{/* end center column */}

        {/* East player hand area */}
        <div className="bg-black/10 rounded-md p-1.5 overflow-hidden" style={{ width: SIDE_W }}>
          <OpponentArea
            name={east.name} handCount={east.handCount}
            discards={[]} melds={east.melds}
            flowerCount={east.flowerCount} position="east"
            isCurrentTurn={currentTurn === 3}
            onFlowerClick={() => onFlowerClick?.("east")}
          />
        </div>
      </div>

      {/* Row 3: South player hand area */}
      <div className="shrink-0">
        <SouthPlayer
          name={south.name} seatWind={south.seatWind}
          handTiles={south.handTiles || []} drawnTile={south.drawnTile}
          discards={[]} melds={south.melds}
          flowerCount={south.flowerCount}
          selectedTileId={selectedTileId}
          actions={actions} actionVisible={actionVisible}
          discardInfo={discardInfo} discardHint={discardHint}
          onPass={onPass} onSelectTile={onSelectTile}
          onDiscardTile={onDiscardTile}
          onFlowerClick={() => onFlowerClick?.("south")}
        />
      </div>
    </div>
  );
}
