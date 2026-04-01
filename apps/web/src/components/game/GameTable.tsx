import type { TrackerSection } from "@majiang/shared";
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
  /** Players in seat order: [south (self), west, north, east] */
  players: [PlayerData, PlayerData, PlayerData, PlayerData];
  wallRemaining: number;
  roundLabel: string;
  currentTurn: number;
  /** Self (south) interaction state */
  selectedTileId: number | null;
  actions: ActionOption[];
  actionVisible: boolean;
  discardInfo?: { playerName: string; char: string } | null;
  discardHint?: boolean;
  onPass?: () => void;
  onSelectTile: (id: number) => void;
  onDiscardTile: (id: number) => void;
  onFlowerClick?: (position: "south" | "west" | "north" | "east") => void;
  /** Variant-specific center panel content */
  centerContent?: React.ReactNode;
}

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
    <div className="bg-[#1a5c2a] rounded-xl p-2.5 h-full flex flex-col">
      <div
        className="grid gap-2 flex-1 min-h-0"
        style={{
          gridTemplateColumns: "140px 1fr 140px",
          gridTemplateRows: "90px 1fr 180px",
        }}
      >
        {/* West — col1, row1-2 */}
        <div className="bg-black/20 rounded-md p-1" style={{ gridColumn: 1, gridRow: "1 / 3" }}>
          <OpponentArea
            name={west.name}
            handCount={west.handCount}
            discards={west.discards}
            melds={west.melds}
            flowerCount={west.flowerCount}
            position="west"
            isCurrentTurn={currentTurn === 1}
            onFlowerClick={() => onFlowerClick?.("west")}
          />
        </div>

        {/* North — col2, row1 */}
        <div className="bg-black/20 rounded-md p-1" style={{ gridColumn: 2, gridRow: 1 }}>
          <OpponentArea
            name={north.name}
            handCount={north.handCount}
            discards={north.discards}
            melds={north.melds}
            flowerCount={north.flowerCount}
            position="north"
            isCurrentTurn={currentTurn === 2}
            onFlowerClick={() => onFlowerClick?.("north")}
          />
        </div>

        {/* Center tile wall — col2, row2 */}
        <div className="bg-black/20 rounded-lg flex items-center justify-center" style={{ gridColumn: 2, gridRow: 2 }}>
          <div className="relative w-[300px] h-[300px] shrink-0">
            <TileWall remaining={wallRemaining} size={300} />
            <CenterInfo wallRemaining={wallRemaining} roundLabel={roundLabel}>
              {centerContent}
            </CenterInfo>
          </div>
        </div>

        {/* East — col3, row1-2 */}
        <div className="bg-black/20 rounded-md p-1" style={{ gridColumn: 3, gridRow: "1 / 3" }}>
          <OpponentArea
            name={east.name}
            handCount={east.handCount}
            discards={east.discards}
            melds={east.melds}
            flowerCount={east.flowerCount}
            position="east"
            isCurrentTurn={currentTurn === 3}
            onFlowerClick={() => onFlowerClick?.("east")}
          />
        </div>

        {/* South (self) — col1-3, row3 */}
        <div style={{ gridColumn: "1 / -1", gridRow: 3 }}>
          <SouthPlayer
            name={south.name}
            seatWind={south.seatWind}
            handTiles={south.handTiles || []}
            drawnTile={south.drawnTile}
            discards={south.discards}
            melds={south.melds}
            flowerCount={south.flowerCount}
            selectedTileId={selectedTileId}
            actions={actions}
            actionVisible={actionVisible}
            discardInfo={discardInfo}
            discardHint={discardHint}
            onPass={onPass}
            onSelectTile={onSelectTile}
            onDiscardTile={onDiscardTile}
            onFlowerClick={() => onFlowerClick?.("south")}
          />
        </div>
      </div>
    </div>
  );
}
