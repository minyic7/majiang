import { useMemo } from "react";
import { useGameStore } from "../stores/gameStore.js";
import type { Tile, TileInstance } from "@majiang/shared";
import { ActionType } from "@majiang/shared";
import type { ActionOption } from "../components/game/ActionBubbles.js";

/** Convert a Tile to the char code expected by the Tile component */
const DRAGON_MAP: Record<string, string> = {
  red: "zhong",
  green: "fa",
  white: "bai",
};

export function tileToCode(tile: Tile): string {
  switch (tile.kind) {
    case "suited":
      return `${tile.suit}${tile.value}`;
    case "wind":
      return tile.windType;
    case "dragon":
      return DRAGON_MAP[tile.dragonType];
    case "season":
      return tile.seasonType;
    case "plant":
      return tile.plantType;
    default:
      return "";
  }
}

/** Get a suit category string for hand tile objects */
function tileSuit(tile: Tile): string {
  switch (tile.kind) {
    case "suited":
      return tile.suit;
    case "wind":
    case "dragon":
      return "honor";
    case "season":
    case "plant":
      return "bonus";
    default:
      return "";
  }
}

/** Convert TileInstance to the hand tile format expected by GameTable */
function toHandTile(ti: TileInstance) {
  return { id: ti.id, char: tileToCode(ti.tile), suit: tileSuit(ti.tile) };
}

/** Convert TileInstance[] discards to char string[] */
function discardsToChars(discards: TileInstance[]): string[] {
  return discards.map((d) => tileToCode(d.tile));
}

/** Convert Meld[] to string[][] (each meld is array of tile codes) */
function meldsToChars(
  melds: { tiles: TileInstance[] }[],
): string[][] {
  return melds.map((m) => m.tiles.map((t) => tileToCode(t.tile)));
}

const WIND_LABELS: Record<string, string> = {
  east: "东",
  south: "南",
  west: "西",
  north: "北",
};

export function useGameData() {
  const gameState = useGameStore((s) => s.gameState);
  const availableActions = useGameStore((s) => s.availableActions);
  const submitAction = useGameStore((s) => s.submitAction);
  const myIndex = useGameStore((s) => s.myIndex);
  const roomId = useGameStore((s) => s.roomId);
  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const selectTile = useGameStore((s) => s.selectTile);

  const data = useMemo(() => {
    if (!gameState) return null;

    const myPlayer = gameState.players[gameState.myIndex];
    const hand = myPlayer.hand ?? [];

    // Separate drawn tile: if canDiscard is true, the last tile is the drawn tile
    const hasDrawnTile = availableActions?.canDiscard && hand.length > 0;
    const mainHand = hasDrawnTile ? hand.slice(0, -1) : hand;
    const drawnTile = hasDrawnTile ? hand[hand.length - 1] : null;

    // Get player at relative offset from my seat
    const getPlayer = (offset: number) =>
      gameState.players[(gameState.myIndex + offset) % 4];

    // Map relative seat positions: 0=me(south), 1=right(west), 2=across(north), 3=left(east)
    const mapPlayer = (offset: number) => {
      const p = getPlayer(offset);
      return {
        name: p.name,
        seatWind: WIND_LABELS[p.seatWind] ?? p.seatWind,
        handCount: p.handCount,
        handTiles: offset === 0 ? mainHand.map(toHandTile) : undefined,
        drawnTile: offset === 0 && drawnTile ? toHandTile(drawnTile) : undefined,
        discards: discardsToChars(p.discards),
        melds: meldsToChars(p.melds),
        flowerCount: p.flowers.length,
      };
    };

    const south = mapPlayer(0);
    const west = mapPlayer(1);
    const north = mapPlayer(2);
    const east = mapPlayer(3);

    // Round label
    const dealerWind = WIND_LABELS[gameState.players[gameState.dealerIndex].seatWind] ?? "东";
    const roundLabel = `${dealerWind}风 · 第一局`;

    // Current turn as relative index (0=south, 1=west, 2=north, 3=east)
    const currentTurn = (gameState.currentTurn - gameState.myIndex + 4) % 4;

    // Discard info (last discard from another player)
    const lastDiscard = gameState.lastDiscard;
    const discardInfo =
      lastDiscard && lastDiscard.playerIndex !== gameState.myIndex
        ? {
            playerName:
              gameState.players[lastDiscard.playerIndex].name,
            char: tileToCode(lastDiscard.tile.tile),
          }
        : null;

    // Score data (placeholder — no score tracking in ClientGameState yet)
    const scores = gameState.players.map((p, i) => ({
      name: p.name,
      score: 0,
      isMe: i === gameState.myIndex,
    }));

    const dealerName = gameState.players[gameState.dealerIndex].name;

    return {
      south,
      west,
      north,
      east,
      players: [south, west, north, east] as [
        typeof south,
        typeof west,
        typeof north,
        typeof east,
      ],
      wallRemaining: gameState.wallRemaining,
      roundLabel,
      currentTurn,
      discardInfo,
      hand,
      drawnTile,
      scores,
      dealerName,
      goldenTile: gameState.goldenTile,
      flippedTile: gameState.flippedTile,
    };
  }, [gameState, availableActions]);

  // Build action options from availableActions
  const actions = useMemo((): ActionOption[] => {
    if (!availableActions || !gameState) return [];
    const opts: ActionOption[] = [];
    const lastDiscard = gameState.lastDiscard;
    const targetChar = lastDiscard
      ? tileToCode(lastDiscard.tile.tile)
      : "";

    if (availableActions.canHu) {
      opts.push({
        id: "hu",
        label: "胡",
        color: "rgba(255,80,80,1)",
        tiles: targetChar
          ? [{ char: targetChar, highlight: true }]
          : [],
        onClick: () =>
          submitAction({
            type: ActionType.Hu,
            playerIndex: gameState.myIndex,
          }),
      });
    }

    if (availableActions.canMingGang && lastDiscard) {
      opts.push({
        id: "gang",
        label: "杠",
        color: "rgba(230,185,80,1)",
        tiles: [
          { char: targetChar },
          { char: targetChar },
          { char: targetChar },
          { char: targetChar, highlight: true },
        ],
        onClick: () =>
          submitAction({
            type: ActionType.MingGang,
            playerIndex: gameState.myIndex,
            targetTile: lastDiscard.tile,
          }),
      });
    }

    if (availableActions.canPeng && lastDiscard) {
      opts.push({
        id: "peng",
        label: "碰",
        color: "rgba(140,185,255,1)",
        tiles: [
          { char: targetChar },
          { char: targetChar },
          { char: targetChar, highlight: true },
        ],
        onClick: () =>
          submitAction({
            type: ActionType.Peng,
            playerIndex: gameState.myIndex,
            targetTile: lastDiscard.tile,
          }),
      });
    }

    availableActions.chiOptions.forEach((pair, i) => {
      const tiles = [...pair.map((t) => ({ char: tileToCode(t.tile) }))];
      // Insert the target tile (highlighted) in sorted position
      if (lastDiscard) {
        tiles.push({ char: targetChar, highlight: true } as { char: string; highlight?: boolean });
        tiles.sort((a, b) => a.char.localeCompare(b.char));
      }
      opts.push({
        id: `chi-${i}`,
        label: "吃",
        color: "rgba(100,220,180,1)",
        tiles,
        onClick: () =>
          submitAction({
            type: ActionType.Chi,
            playerIndex: gameState.myIndex,
            tiles: pair as [TileInstance, TileInstance],
            targetTile: lastDiscard!.tile,
          }),
      });
    });

    availableActions.anGangOptions.forEach((group, i) => {
      opts.push({
        id: `angang-${i}`,
        label: "暗杠",
        color: "rgba(230,185,80,1)",
        tiles: group.map(() => ({ char: "", back: true })),
        onClick: () =>
          submitAction({
            type: ActionType.AnGang,
            playerIndex: gameState.myIndex,
            tile: group[0],
          }),
      });
    });

    availableActions.buGangOptions.forEach((opt, i) => {
      const code = tileToCode(opt.tile.tile);
      opts.push({
        id: `bugang-${i}`,
        label: "补杠",
        color: "rgba(230,185,80,1)",
        tiles: [
          { char: code },
          { char: code },
          { char: code },
          { char: code, highlight: true },
        ],
        onClick: () =>
          submitAction({
            type: ActionType.BuGang,
            playerIndex: gameState.myIndex,
            tile: opt.tile,
          }),
      });
    });

    return opts;
  }, [availableActions, gameState, submitAction]);

  const hasActions = actions.length > 0;
  const showActions = hasActions;

  const handlePass = () => {
    if (!gameState) return;
    submitAction({
      type: ActionType.Pass,
      playerIndex: gameState.myIndex,
    });
  };

  const handleSelectTile = (id: number) => {
    if (selectedTileId === id && availableActions?.canDiscard) {
      // Second click on same tile = discard
      const hand = gameState?.players[gameState.myIndex].hand ?? [];
      const tile = hand.find((t) => t.id === id);
      if (tile && gameState) {
        submitAction({
          type: ActionType.Discard,
          playerIndex: gameState.myIndex,
          tile,
        });
        selectTile(null);
        return;
      }
    }
    selectTile(id);
  };

  const handleDiscardTile = (id: number) => {
    if (!availableActions?.canDiscard || !gameState) return;
    const hand = gameState.players[gameState.myIndex].hand ?? [];
    const tile = hand.find((t) => t.id === id);
    if (tile) {
      submitAction({
        type: ActionType.Discard,
        playerIndex: gameState.myIndex,
        tile,
      });
      selectTile(null);
    }
  };

  return {
    gameState,
    data,
    actions,
    showActions,
    selectedTileId,
    availableActions,
    roomId,
    handlePass,
    handleSelectTile,
    handleDiscardTile,
  };
}
