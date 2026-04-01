import PlayerHand from "./PlayerHand.js";
import ActionBubbles, { type ActionOption } from "./ActionBubbles.js";
import Tile from "../tile/Tile.js";

interface SouthPlayerProps {
  name: string;
  seatWind: string;
  handTiles: { id: number; char: string; suit?: string }[];
  drawnTile?: { id: number; char: string; suit?: string } | null;
  discards: string[];
  melds: string[][];
  flowerCount: number;
  selectedTileId: number | null;
  /** Action bubble state */
  actions: ActionOption[];
  actionVisible: boolean;
  discardInfo?: { playerName: string; char: string } | null;
  discardHint?: boolean;
  onPass?: () => void;
  onSelectTile: (id: number) => void;
  onDiscardTile: (id: number) => void;
  onFlowerClick?: () => void;
}

export default function SouthPlayer({
  name,
  seatWind,
  handTiles,
  drawnTile,
  discards,
  melds,
  flowerCount,
  selectedTileId,
  actions,
  actionVisible,
  discardInfo,
  discardHint,
  onPass,
  onSelectTile,
  onDiscardTile,
  onFlowerClick,
}: SouthPlayerProps) {
  return (
    <div className="bg-black/10 rounded-md p-2 flex flex-col gap-1.5 relative h-full">
      {/* Action modal — full screen overlay */}
      <ActionBubbles
        visible={actionVisible}
        actions={actions}
        discardInfo={discardInfo}
        discardHint={discardHint}
        onPass={onPass}
      />

      {/* Bottom: melds + hand, aligned at bottom */}
      <div className="flex-1 min-h-0 flex items-end justify-center gap-3">
        {/* Player info: name + flower count */}
        <div className="shrink-0 flex flex-col items-center gap-0.5 pb-1">
          <span onClick={onFlowerClick} className="text-lg cursor-pointer opacity-80 hover:opacity-100 transition-opacity" title="我的花牌">
            🌸{flowerCount > 0 && <sup className="text-xs text-green-400">{flowerCount}</sup>}
          </span>
          <span className="text-xs font-medium text-amber-300/90 whitespace-nowrap">{name} · {seatWind}</span>
        </div>
        {/* Melds */}
        <div className="shrink-0 border border-white/[.12] rounded-sm px-1.5 pt-4 pb-1 flex gap-2 items-end">
          <span className="text-[11px] text-white/30 font-medium">副露</span>
          {melds.map((meld, i) => (
            <div key={i} className="flex gap-px">
              {meld.map((c, j) => (
                <Tile key={j} char={c} variant="face" size="lg" />
              ))}
            </div>
          ))}
        </div>
        {/* Hand tiles */}
        <div className="shrink-0 pt-4 pb-1">
          <PlayerHand
            tiles={handTiles}
            drawnTile={drawnTile}
            selectedId={selectedTileId}
            onSelect={onSelectTile}
            onDiscard={onDiscardTile}
          />
        </div>
      </div>
    </div>
  );
}
