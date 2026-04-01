/** UI configuration per rule set — drives what the game table shows */
export interface RuleSetUIConfig {
  /** Tiles to show in the tracker (e.g., 3 suits × 9 + honors) */
  trackerLayout: TrackerSection[];

  /** Label for the center info panel (e.g., "金牌", "宝牌指示牌") */
  centerInfoLabel?: string;

  /** Wind/round display format */
  roundFormat: "wind-only" | "wind-round"; // 东风局 vs 东南战

  /** Available action types for claim bubbles */
  claimActions: string[];

  /** Whether the variant uses bonus/flower tiles */
  showFlowers: boolean;

  /** Extra center panel info keys (variant-specific) */
  extraCenterInfo?: string[];
}

export interface TrackerSection {
  label: string;
  color: string;
  tiles: TrackerTile[];
}

export interface TrackerTile {
  id: string;
  display: string;
  copies: number; // total copies in the game (typically 4)
  remaining?: number; // copies not yet visible (computed at runtime)
}
