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
    <div className="bg-black/45 rounded-md p-2 flex flex-col gap-1.5 relative">
      {/* Info strip */}
      <div className="flex gap-1.5 shrink-0 items-stretch h-14">
        {/* Name + hand count */}
        <div className="flex flex-col justify-between shrink-0 w-13">
          <span className="text-[9px] font-medium text-amber-300/90 whitespace-nowrap">{name} · {seatWind}</span>
          <span className="text-[8px] text-white/25">手牌 <span className="text-amber-400/80 font-medium">{handTiles.length + (drawnTile ? 1 : 0)}</span></span>
        </div>

        {/* Flower icon */}
        <div className="flex flex-col justify-center items-center gap-1 shrink-0 w-8">
          <span onClick={onFlowerClick} className="text-lg cursor-pointer opacity-80 hover:opacity-100 transition-opacity" title="我的花牌">
            🌸{flowerCount > 0 && <sup className="text-[7px] text-green-400">{flowerCount}</sup>}
          </span>
        </div>

        {/* Melds */}
        <div className="bg-white/[.07] border border-white/[.13] rounded-sm p-1 w-28 shrink-0 flex flex-col gap-1">
          <span className="text-[8px] text-white/35 font-medium block">碰 / 吃 / 杠</span>
          <div className="flex gap-1 flex-wrap items-end">
            {melds.flat().map((c, i) => (
              <Tile key={i} char={c} variant="face" size="sm" />
            ))}
          </div>
        </div>

        {/* Discards */}
        <div className="bg-white/[.07] border border-white/[.13] rounded-sm p-1 flex-1 min-w-0 flex flex-col gap-1 overflow-hidden">
          <span className="text-[8px] text-white/35 font-medium block">弃牌区</span>
          <div className="flex flex-wrap gap-px content-start">
            {discards.map((c, i) => (
              <Tile key={i} char={c} variant="face" size="sm" />
            ))}
          </div>
        </div>
      </div>

      {/* Action bubbles — floating above hand */}
      <div className="absolute bottom-[calc(100%+6px)] left-0 right-0 z-50 px-2">
        <ActionBubbles
          visible={actionVisible}
          actions={actions}
          discardInfo={discardInfo}
          discardHint={discardHint}
          onPass={onPass}
        />
      </div>

      {/* Hand strip */}
      <div className="flex-1 min-h-0">
        <div className="bg-white/[.07] border border-white/[.13] rounded-sm h-full flex items-center px-1.5 py-1 overflow-hidden">
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
