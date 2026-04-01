import {
  GamePhase,
  MeldType,
  ActionType,
} from "@majiang/shared";
import type {
  RuleSet,
  AvailableActions,
  GameState,
  PlayerState,
  TileInstance,
  Tile,
  GameAction,
  Meld,
  ClientGameState,
  ClientPlayerState,
} from "@majiang/shared";
import { ActionResolver } from "./ActionResolver.js";
import { BotPlayer } from "./BotPlayer.js";

const SEAT_WINDS = ["east", "south", "west", "north"] as const;
const ACTION_TIMEOUT_MS = 15000;

export interface GameEngineCallbacks {
  onStateUpdate?: (playerIndex: number, state: ClientGameState) => void;
  onActionRequired?: (playerIndex: number, actions: AvailableActions) => void;
  onGameOver?: (result: {
    winnerId: number | null;
    winType: string;
    scores: number[];
    payments: number[];
    breakdown: string[];
  }) => void;
  /** Set to 0 for tests to skip bot delays */
  botDelayMs?: number;
}

export interface PlayerInfo {
  name: string;
  isBot: boolean;
  socketId?: string;
}

export class GameEngine {
  readonly gameState: GameState;
  private ruleSet: RuleSet;
  private players: PlayerInfo[];
  private callbacks: GameEngineCallbacks;
  private actionResolver: ActionResolver | null = null;
  private lianZhuangCount = 0;
  private scores: number[] = [0, 0, 0, 0];
  private gangDrawPending = false;
  constructor(ruleSet: RuleSet, players: PlayerInfo[], callbacks: GameEngineCallbacks = {}) {
    this.ruleSet = ruleSet;
    this.players = players;
    this.callbacks = callbacks;

    const dealerIndex = Math.floor(Math.random() * 4);
    this.gameState = {
      phase: GamePhase.Waiting,
      players: players.map((p, i) => ({
        name: p.name,
        hand: [],
        melds: [],
        discards: [],
        flowers: [],
        isDealer: i === dealerIndex,
        seatWind: SEAT_WINDS[(i - dealerIndex + 4) % 4],
      })),
      wall: [],
      wallTail: [],
      currentTurn: dealerIndex,
      dealerIndex,
      lastDiscard: null,
      ruleSetId: ruleSet.id,
    };
  }

  // --- Public API ---

  async startGame(): Promise<void> {
    this.deal();
    await this.playLoop();
  }

  /** Submit an action from a player (called by socket handler or bot) */
  submitAction(playerIndex: number, action: GameAction): void {
    if (this.actionResolver) {
      this.actionResolver.submitAction(playerIndex, action);
    }
  }

  /** Generate client-safe state for a specific player */
  toClientGameState(playerIndex: number): ClientGameState {
    const gs = this.gameState;
    return {
      phase: gs.phase,
      players: gs.players.map((p, i): ClientPlayerState => ({
        name: p.name,
        handCount: p.hand.length,
        hand: i === playerIndex ? [...p.hand] : undefined,
        melds: p.melds,
        discards: [...p.discards],
        flowers: [...p.flowers],
        isDealer: p.isDealer,
        seatWind: p.seatWind,
      })),
      currentTurn: gs.currentTurn,
      dealerIndex: gs.dealerIndex,
      wallRemaining: gs.wall.length,
      wallTailRemaining: gs.wallTail.length,
      lastDiscard: gs.lastDiscard,
      ruleSetId: gs.ruleSetId,
      myIndex: playerIndex,
      goldenTile: gs.goldenTile,
      flippedTile: gs.flippedTile,
    };
  }

  getScores(): number[] {
    return [...this.scores];
  }

  // --- Dealing Phase ---

  private deal(): void {
    this.gameState.phase = GamePhase.Dealing;

    // Create and shuffle tiles
    const tiles = this.ruleSet.createTilePool();
    const tileInstances: TileInstance[] = tiles.map((tile, i) => ({ id: i, tile }));
    this.shuffle(tileInstances);

    // Split wall and wall tail (tail is last 14 tiles, used for flower replacement and gang draws)
    const tailSize = Math.min(14, Math.floor(tileInstances.length / 4));
    this.gameState.wallTail = tileInstances.splice(tileInstances.length - tailSize, tailSize);
    this.gameState.wall = tileInstances;

    // Deal initial hands
    const handSize = this.ruleSet.initialHandSize;
    for (let i = 0; i < 4; i++) {
      this.gameState.players[i].hand = [];
      this.gameState.players[i].melds = [];
      this.gameState.players[i].discards = [];
      this.gameState.players[i].flowers = [];
    }

    for (let round = 0; round < handSize; round++) {
      for (let i = 0; i < 4; i++) {
        const tile = this.drawFromWall();
        if (tile) {
          this.gameState.players[i].hand.push(tile);
        }
      }
    }

    // Replace bonus tiles if applicable
    if (this.ruleSet.hasBonusTiles) {
      for (let i = 0; i < 4; i++) {
        this.replaceBonusTiles(i);
      }
    }

    // Reveal golden tile (if RuleSet supports it)
    if (this.ruleSet.determineGoldenTile) {
      let flipped = this.drawFromWall();
      // Skip bonus tiles — put them back in tail and draw again
      while (flipped && this.ruleSet.isBonusTile(flipped.tile)) {
        this.gameState.wallTail.push(flipped);
        flipped = this.drawFromWall();
      }
      if (flipped) {
        this.gameState.flippedTile = flipped.tile;
        this.gameState.goldenTile = this.ruleSet.determineGoldenTile(flipped.tile);
      }
    }

    this.gameState.phase = GamePhase.Playing;
    this.broadcastState();
  }

  // --- Playing Phase ---

  private async playLoop(): Promise<void> {
    while (this.gameState.phase === GamePhase.Playing) {
      const turn = this.gameState.currentTurn;

      // Draw a tile (from wallTail after gang, otherwise from wall)
      let drawn: TileInstance | null;
      if (this.gangDrawPending) {
        this.gangDrawPending = false;
        drawn = this.drawTileForPlayerFromTail(turn);
      } else {
        drawn = this.drawTileForPlayer(turn);
      }
      if (!drawn) {
        this.endGameDraw();
        return;
      }

      this.broadcastState();

      // Get post-draw actions from ruleset
      const postDrawActions = this.ruleSet.getPostDrawActions(
        this.gameState.players[turn],
        drawn,
        { gameState: this.gameState, playerIndex: turn }
      );

      // Wait for player action
      const postDrawAction = await this.waitForPlayerAction(turn, postDrawActions, drawn);

      if (postDrawAction.type === ActionType.Hu) {
        const won = this.handleHu(turn, drawn, true);
        if (won) return;
        // If hu check failed, force a discard
        continue;
      }

      if (postDrawAction.type === ActionType.AnGang) {
        this.executeAnGang(turn, postDrawAction.tile);
        this.gangDrawPending = true;
        continue;
      }

      if (postDrawAction.type === ActionType.BuGang) {
        this.executeBuGang(turn, postDrawAction.tile);
        this.gangDrawPending = true;
        continue;
      }

      if (postDrawAction.type === ActionType.Discard) {
        this.executeDiscard(turn, postDrawAction.tile);
        this.broadcastState();

        // Get responses from other players
        const claimResult = await this.handleDiscardResponses(turn, postDrawAction.tile);

        if (claimResult) {
          await this.handleClaimAndDiscard(claimResult, turn, postDrawAction.tile);
          if (this.gameState.phase !== GamePhase.Playing) return;
          continue;
        }

        // No one claimed, advance to next player
        this.advanceTurn(turn);
      }
    }
  }

  /**
   * Handle a claim (peng/chi/gang/hu) and the subsequent mandatory discard.
   * If the discard is itself claimed, recurse to handle the chain.
   */
  private async handleClaimAndDiscard(
    claimResult: { playerIndex: number; action: GameAction },
    sourceIndex: number,
    claimedTile: TileInstance
  ): Promise<void> {
    if (claimResult.action.type === ActionType.Hu) {
      this.handleHu(claimResult.playerIndex, claimedTile, false);
      return;
    }

    if (claimResult.action.type === ActionType.MingGang) {
      this.executeMingGang(claimResult.playerIndex, sourceIndex, claimedTile);
      this.gameState.currentTurn = claimResult.playerIndex;
      this.gangDrawPending = true;
      return;
    }

    if (claimResult.action.type === ActionType.Peng) {
      this.executePeng(claimResult.playerIndex, sourceIndex, claimedTile);
    } else if (claimResult.action.type === ActionType.Chi) {
      this.executeChi(
        claimResult.playerIndex,
        sourceIndex,
        claimedTile,
        (claimResult.action as { tiles: [TileInstance, TileInstance] }).tiles
      );
    } else {
      return;
    }

    // After peng/chi, claiming player must discard
    const discardAction = await this.waitForPengDiscard(claimResult.playerIndex);
    const discardedTile = (discardAction as { tile: TileInstance }).tile;
    this.executeDiscard(claimResult.playerIndex, discardedTile);
    this.broadcastState();

    // Check if anyone claims the new discard
    const nextClaimResult = await this.handleDiscardResponses(claimResult.playerIndex, discardedTile);
    if (nextClaimResult) {
      // Recurse to handle the chained claim
      await this.handleClaimAndDiscard(nextClaimResult, claimResult.playerIndex, discardedTile);
    } else {
      this.advanceTurn(claimResult.playerIndex);
    }
  }

  // --- Action Handlers ---

  private async waitForPlayerAction(
    playerIndex: number,
    actions: AvailableActions,
    drawnTile: TileInstance
  ): Promise<GameAction> {
    this.callbacks.onActionRequired?.(playerIndex, actions);

    if (this.players[playerIndex].isBot) {
      const delayMs = this.callbacks.botDelayMs ?? BotPlayer.getThinkDelay();
      if (delayMs > 0) await this.delay(delayMs);
      return BotPlayer.choosePostDrawAction(
        actions,
        this.gameState.players[playerIndex].hand,
        playerIndex
      );
    }

    // Wait for human player via ActionResolver
    const resolver = new ActionResolver([playerIndex], playerIndex);
    this.actionResolver = resolver;

    const result = await resolver.waitForResponses(ACTION_TIMEOUT_MS);
    this.actionResolver = null;

    if (result) {
      return result.action;
    }

    // Timeout: auto-discard the drawn tile
    return { type: ActionType.Discard, playerIndex, tile: drawnTile };
  }

  private async waitForPengDiscard(playerIndex: number): Promise<GameAction> {
    const player = this.gameState.players[playerIndex];
    const actions: AvailableActions = {
      canDraw: false,
      canDiscard: true,
      canHu: false,
      canPeng: false,
      canMingGang: false,
      canPass: false,
      chiOptions: [],
      anGangOptions: [],
      buGangOptions: [],
    };

    this.callbacks.onActionRequired?.(playerIndex, actions);

    if (this.players[playerIndex].isBot) {
      const delayMs = this.callbacks.botDelayMs ?? BotPlayer.getThinkDelay();
      if (delayMs > 0) await this.delay(delayMs);
      const randomIndex = Math.floor(Math.random() * player.hand.length);
      return { type: ActionType.Discard, playerIndex, tile: player.hand[randomIndex] };
    }

    const resolver = new ActionResolver([playerIndex], playerIndex);
    this.actionResolver = resolver;

    const result = await resolver.waitForResponses(ACTION_TIMEOUT_MS);
    this.actionResolver = null;

    if (result) {
      return result.action;
    }

    // Timeout: discard first tile
    return { type: ActionType.Discard, playerIndex, tile: player.hand[0] };
  }

  private async handleDiscardResponses(
    discarderIndex: number,
    discardedTile: TileInstance
  ): Promise<{ playerIndex: number; action: GameAction } | null> {
    const respondingPlayers: number[] = [];

    for (let i = 0; i < 4; i++) {
      if (i === discarderIndex) continue;
      const responseActions = this.ruleSet.getResponseActions(
        this.gameState.players[i],
        discardedTile,
        { gameState: this.gameState, playerIndex: i, discarderIndex }
      );

      // Only include players that have options beyond just pass
      if (
        responseActions.canHu ||
        responseActions.canPeng ||
        responseActions.canMingGang ||
        responseActions.chiOptions.length > 0
      ) {
        respondingPlayers.push(i);
        this.callbacks.onActionRequired?.(i, responseActions);
      }
    }

    if (respondingPlayers.length === 0) return null;

    const resolver = new ActionResolver(respondingPlayers, discarderIndex);
    this.actionResolver = resolver;

    // Bots respond automatically
    for (const p of respondingPlayers) {
      if (this.players[p].isBot) {
        const responseActions = this.ruleSet.getResponseActions(
          this.gameState.players[p],
          discardedTile,
          { gameState: this.gameState, playerIndex: p, discarderIndex }
        );
        const botDelay = this.callbacks.botDelayMs ?? BotPlayer.getThinkDelay();
        setTimeout(() => {
          const botAction = BotPlayer.chooseResponseAction(responseActions, p);
          // Fill in targetTile for peng/gang
          if (botAction.type === ActionType.Peng || botAction.type === ActionType.MingGang) {
            (botAction as { targetTile: TileInstance }).targetTile = discardedTile;
          }
          resolver.submitAction(p, botAction);
        }, botDelay);
      }
    }

    const result = await resolver.waitForResponses(ACTION_TIMEOUT_MS);
    this.actionResolver = null;

    return result;
  }

  // --- Execute Actions ---

  private executeDiscard(playerIndex: number, tile: TileInstance): void {
    const player = this.gameState.players[playerIndex];
    const idx = player.hand.findIndex((t) => t.id === tile.id);
    if (idx === -1) return;
    player.hand.splice(idx, 1);
    player.discards.push(tile);
    this.gameState.lastDiscard = { tile, playerIndex };
  }

  private executePeng(claimingPlayer: number, sourcePlayer: number, tile: TileInstance): void {
    const player = this.gameState.players[claimingPlayer];
    const matching = player.hand.filter((t) => tilesMatch(t.tile, tile.tile));
    const meldTiles = matching.slice(0, 2);

    // Remove from hand
    for (const mt of meldTiles) {
      const idx = player.hand.findIndex((t) => t.id === mt.id);
      if (idx !== -1) player.hand.splice(idx, 1);
    }

    // Remove from discarder's discards
    const discarder = this.gameState.players[sourcePlayer];
    const discardIdx = discarder.discards.findIndex((t) => t.id === tile.id);
    if (discardIdx !== -1) discarder.discards.splice(discardIdx, 1);

    const meld: Meld = {
      type: MeldType.Peng,
      tiles: [...meldTiles, tile],
      sourceTile: tile,
      sourcePlayer,
    };
    player.melds.push(meld);
    this.gameState.currentTurn = claimingPlayer;
    this.gameState.lastDiscard = null;
  }

  private executeMingGang(claimingPlayer: number, sourcePlayer: number, tile: TileInstance): void {
    const player = this.gameState.players[claimingPlayer];
    const matching = player.hand.filter((t) => tilesMatch(t.tile, tile.tile));
    const meldTiles = matching.slice(0, 3);

    for (const mt of meldTiles) {
      const idx = player.hand.findIndex((t) => t.id === mt.id);
      if (idx !== -1) player.hand.splice(idx, 1);
    }

    const discarder = this.gameState.players[sourcePlayer];
    const discardIdx = discarder.discards.findIndex((t) => t.id === tile.id);
    if (discardIdx !== -1) discarder.discards.splice(discardIdx, 1);

    const meld: Meld = {
      type: MeldType.MingGang,
      tiles: [...meldTiles, tile],
      sourceTile: tile,
      sourcePlayer,
    };
    player.melds.push(meld);
    this.gameState.lastDiscard = null;
  }

  private executeAnGang(playerIndex: number, tile: TileInstance): void {
    const player = this.gameState.players[playerIndex];
    const matching = player.hand.filter((t) => tilesMatch(t.tile, tile.tile));
    const meldTiles = matching.slice(0, 4);

    for (const mt of meldTiles) {
      const idx = player.hand.findIndex((t) => t.id === mt.id);
      if (idx !== -1) player.hand.splice(idx, 1);
    }

    const meld: Meld = {
      type: MeldType.AnGang,
      tiles: meldTiles,
    };
    player.melds.push(meld);
  }

  private executeBuGang(playerIndex: number, tile: TileInstance): void {
    const player = this.gameState.players[playerIndex];
    // Find the peng meld to upgrade
    const meldIndex = player.melds.findIndex(
      (m) => m.type === MeldType.Peng && tilesMatch(m.tiles[0].tile, tile.tile)
    );
    if (meldIndex === -1) return;

    const idx = player.hand.findIndex((t) => t.id === tile.id);
    if (idx !== -1) player.hand.splice(idx, 1);

    player.melds[meldIndex].type = MeldType.BuGang;
    player.melds[meldIndex].tiles.push(tile);
  }

  private executeChi(
    claimingPlayer: number,
    sourcePlayer: number,
    targetTile: TileInstance,
    chiTiles: [TileInstance, TileInstance]
  ): void {
    const player = this.gameState.players[claimingPlayer];

    for (const ct of chiTiles) {
      const idx = player.hand.findIndex((t) => t.id === ct.id);
      if (idx !== -1) player.hand.splice(idx, 1);
    }

    const discarder = this.gameState.players[sourcePlayer];
    const discardIdx = discarder.discards.findIndex((t) => t.id === targetTile.id);
    if (discardIdx !== -1) discarder.discards.splice(discardIdx, 1);

    const meld: Meld = {
      type: MeldType.Chi,
      tiles: [...chiTiles, targetTile],
      sourceTile: targetTile,
      sourcePlayer,
    };
    player.melds.push(meld);
    this.gameState.currentTurn = claimingPlayer;
    this.gameState.lastDiscard = null;
  }

  private handleHu(playerIndex: number, winningTile: TileInstance, isSelfDraw: boolean): boolean {
    const player = this.gameState.players[playerIndex];
    const winResult = this.ruleSet.checkWin(player, winningTile, {
      isSelfDraw,
      isFirstAction: player.discards.length === 0 && player.melds.length === 0,
      isDealer: player.isDealer,
      isRobbingKong: false,
      extra: { goldenTile: this.gameState.goldenTile },
    });

    if (!winResult.isWin) return false;

    const scoreResult = this.ruleSet.calculateScore(
      player,
      playerIndex,
      winResult,
      {
        isSelfDraw,
        discarderIndex: isSelfDraw ? null : this.gameState.lastDiscard?.playerIndex ?? null,
        extra: { goldenTile: this.gameState.goldenTile, dealerIndex: this.gameState.dealerIndex },
      }
    );

    for (let i = 0; i < 4; i++) {
      this.scores[i] += scoreResult.payments[i];
    }

    this.gameState.phase = GamePhase.Finished;
    this.broadcastState();

    this.callbacks.onGameOver?.({
      winnerId: playerIndex,
      winType: winResult.winType ?? "hu",
      scores: [...this.scores],
      payments: scoreResult.payments,
      breakdown: scoreResult.breakdown ?? [],
    });

    return true;
  }

  // --- Tile Management ---

  private drawFromWall(): TileInstance | null {
    return this.gameState.wall.shift() ?? null;
  }

  private drawFromWallTail(): TileInstance | null {
    return this.gameState.wallTail.shift() ?? null;
  }

  private drawTileForPlayer(playerIndex: number): TileInstance | null {
    let tile = this.drawFromWall();
    if (!tile) return null;

    // Handle bonus tiles
    if (this.ruleSet.hasBonusTiles) {
      while (tile && this.ruleSet.isBonusTile(tile.tile)) {
        this.gameState.players[playerIndex].flowers.push(tile);
        this.broadcastState();
        tile = this.drawFromWallTail();
      }
    }

    if (tile) {
      this.gameState.players[playerIndex].hand.push(tile);
    }
    return tile;
  }

  private drawTileForPlayerFromTail(playerIndex: number): TileInstance | null {
    let tile = this.drawFromWallTail();
    if (!tile) return null;

    if (this.ruleSet.hasBonusTiles) {
      while (tile && this.ruleSet.isBonusTile(tile.tile)) {
        this.gameState.players[playerIndex].flowers.push(tile);
        this.broadcastState();
        tile = this.drawFromWallTail();
      }
    }

    if (tile) {
      this.gameState.players[playerIndex].hand.push(tile);
    }
    return tile;
  }

  private replaceBonusTiles(playerIndex: number): void {
    const player = this.gameState.players[playerIndex];
    let replaced = true;
    while (replaced) {
      replaced = false;
      for (let i = player.hand.length - 1; i >= 0; i--) {
        if (this.ruleSet.isBonusTile(player.hand[i].tile)) {
          const bonusTile = player.hand.splice(i, 1)[0];
          player.flowers.push(bonusTile);
          const replacement = this.drawFromWallTail();
          if (replacement) {
            player.hand.push(replacement);
            replaced = true;
          }
        }
      }
    }
  }

  // --- Turn Management ---

  private advanceTurn(currentPlayer: number): void {
    this.gameState.currentTurn = (currentPlayer + 1) % 4;
  }

  private endGameDraw(): void {
    this.gameState.phase = GamePhase.Draw;
    this.broadcastState();
    this.callbacks.onGameOver?.({
      winnerId: null,
      winType: "draw",
      scores: [...this.scores],
      payments: [],
      breakdown: [],
    });
  }

  // --- Helpers ---

  private broadcastState(): void {
    for (let i = 0; i < 4; i++) {
      this.callbacks.onStateUpdate?.(i, this.toClientGameState(i));
    }
  }

  private shuffle(arr: TileInstance[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function tilesMatch(a: Tile, b: Tile): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "suited" && b.kind === "suited") {
    return a.suit === b.suit && a.value === b.value;
  }
  if (a.kind === "wind" && b.kind === "wind") return a.windType === b.windType;
  if (a.kind === "dragon" && b.kind === "dragon") return a.dragonType === b.dragonType;
  if (a.kind === "season" && b.kind === "season") return a.seasonType === b.seasonType;
  if (a.kind === "plant" && b.kind === "plant") return a.plantType === b.plantType;
  return false;
}
