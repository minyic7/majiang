import TileWall from "../tile/TileWall.js";
import CenterInfo from "./CenterInfo.js";
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

/** Side panel width = North panel height. Keeps proportions symmetric. */
const PANEL_SIZE = 120;

export default function GameTable({
  players,
  wallRemaining,
  roundLabel,
  currentTurn,
  selectedTileId,
  actions,
  actionVisible,
  discardInfo,
  discardHint,
  onPass,
  onSelectTile,
  onDiscardTile,
  onFlowerClick,
  centerContent,
}: GameTableProps) {
  const [south, west, north, east] = players;

  return (
    <div className="bg-[#1a5c2a] rounded-xl p-2 h-full flex flex-col gap-2">
      {/* Top row: west + north + east */}
      <div className="flex gap-2 flex-1 min-h-0">
        {/* West */}
        <div className="bg-black/20 rounded-md p-1 overflow-hidden" style={{ width: PANEL_SIZE }}>
          <OpponentArea
            name={west.name} handCount={west.handCount}
            discards={west.discards} melds={west.melds}
            flowerCount={west.flowerCount} position="west"
            isCurrentTurn={currentTurn === 1}
            onFlowerClick={() => onFlowerClick?.("west")}
          />
        </div>

        {/* Center column: north + tile wall */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* North */}
          <div className="bg-black/20 rounded-md p-1 overflow-hidden" style={{ height: PANEL_SIZE }}>
            <OpponentArea
              name={north.name} handCount={north.handCount}
              discards={north.discards} melds={north.melds}
              flowerCount={north.flowerCount} position="north"
              isCurrentTurn={currentTurn === 2}
              onFlowerClick={() => onFlowerClick?.("north")}
            />
          </div>

          {/* Tile wall */}
          <div className="flex-1 min-h-0 bg-black/15 rounded-lg flex items-center justify-center">
            <div className="relative w-[280px] h-[280px] shrink-0">
              <TileWall remaining={wallRemaining} size={280} />
              <CenterInfo wallRemaining={wallRemaining} roundLabel={roundLabel}>
                {centerContent}
              </CenterInfo>
            </div>
          </div>
        </div>

        {/* East */}
        <div className="bg-black/20 rounded-md p-1 overflow-hidden" style={{ width: PANEL_SIZE }}>
          <OpponentArea
            name={east.name} handCount={east.handCount}
            discards={east.discards} melds={east.melds}
            flowerCount={east.flowerCount} position="east"
            isCurrentTurn={currentTurn === 3}
            onFlowerClick={() => onFlowerClick?.("east")}
          />
        </div>
      </div>

      {/* South — full width, fixed height */}
      <div className="shrink-0">
        <SouthPlayer
          name={south.name} seatWind={south.seatWind}
          handTiles={south.handTiles || []} drawnTile={south.drawnTile}
          discards={south.discards} melds={south.melds}
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
