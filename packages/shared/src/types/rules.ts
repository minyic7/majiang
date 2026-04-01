import type { Tile, TileInstance } from "./tile.js";
import type { GameState, PlayerState, Meld } from "./game.js";

/** Rule set definition — each mahjong variant implements this interface */
export interface RuleSet {
  /** Unique identifier (e.g., "fuzhou", "guangdong", "riichi") */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;

  /** Generate the full tile pool for this variant */
  createTilePool(): Tile[];

  /** Number of tiles dealt to each player initially */
  initialHandSize: number;

  /** Whether this variant uses bonus tiles (flowers/seasons) */
  hasBonusTiles: boolean;

  /** Check if a tile is a bonus tile that should be replaced */
  isBonusTile(tile: Tile): boolean;

  /** Check if a player's hand is a winning hand */
  checkWin(player: PlayerState, winningTile: TileInstance, context: WinContext): WinResult;

  /** Calculate score/payments for a win */
  calculateScore(winner: PlayerState, winnerIndex: number, winResult: WinResult, context: ScoreContext): ScoreResult;

  /** Get available response actions when another player discards */
  getResponseActions(player: PlayerState, discardTile: TileInstance, context: ActionContext): AvailableActions;

  /** Get available actions after drawing a tile */
  getPostDrawActions(player: PlayerState, drawnTile: TileInstance, context: ActionContext): AvailableActions;

  /** Determine the golden (wildcard) tile from the flipped indicator tile. Only needed for variants that use golden tiles. */
  determineGoldenTile?(flippedTile: Tile): Tile;

  /** Determine next dealer after a round */
  getNextDealer(currentDealer: number, winnerIndex: number | null, context: DealerContext): DealerResult;
}

export interface WinContext {
  isSelfDraw: boolean;
  isFirstAction: boolean;
  isDealer: boolean;
  isRobbingKong: boolean;
  /** Variant-specific extra context */
  extra?: Record<string, unknown>;
}

export interface WinResult {
  isWin: boolean;
  winType?: string;
  multiplier?: number;
  description?: string;
}

export interface ScoreContext {
  isSelfDraw: boolean;
  discarderIndex: number | null;
  /** Variant-specific (e.g., lianZhuangCount for Fuzhou) */
  extra?: Record<string, unknown>;
}

export interface ScoreResult {
  /** Net payment for each player (positive = receives, negative = pays) */
  payments: number[];
  breakdown?: string[];
}

export interface ActionContext {
  gameState: GameState;
  playerIndex: number;
  discarderIndex?: number;
}

export interface AvailableActions {
  canDraw: boolean;
  canDiscard: boolean;
  canHu: boolean;
  canPeng: boolean;
  canMingGang: boolean;
  canPass: boolean;
  chiOptions: TileInstance[][];
  anGangOptions: TileInstance[][];
  buGangOptions: { tile: TileInstance; meldIndex: number }[];
}

export interface DealerContext {
  lianZhuangCount: number;
}

export interface DealerResult {
  nextDealer: number;
  nextLianZhuang: number;
}
