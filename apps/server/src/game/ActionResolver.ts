import { ActionType } from "@majiang/shared";
import type { GameAction } from "@majiang/shared";

const ACTION_PRIORITY: Record<string, number> = {
  [ActionType.Hu]: 4,
  [ActionType.Peng]: 3,
  [ActionType.MingGang]: 3,
  [ActionType.Chi]: 2,
  [ActionType.Pass]: 0,
};

function getActionPriority(action: GameAction): number {
  return ACTION_PRIORITY[action.type] ?? 0;
}

export class ActionResolver {
  private pendingResponses = new Map<number, GameAction | null>();
  private expectedPlayers: number[];
  private discarderIndex: number;
  private resolvePromise: ((result: { playerIndex: number; action: GameAction } | null) => void) | null = null;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  constructor(expectedPlayers: number[], discarderIndex: number) {
    this.expectedPlayers = expectedPlayers;
    this.discarderIndex = discarderIndex;
    for (const p of expectedPlayers) {
      this.pendingResponses.set(p, null);
    }
  }

  submitAction(playerIndex: number, action: GameAction): void {
    if (!this.expectedPlayers.includes(playerIndex)) return;
    this.pendingResponses.set(playerIndex, action);
    this.tryResolve();
  }

  waitForResponses(timeout: number): Promise<{ playerIndex: number; action: GameAction } | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;

      this.timeoutHandle = setTimeout(() => {
        // Auto-pass for anyone who hasn't responded
        for (const p of this.expectedPlayers) {
          if (this.pendingResponses.get(p) === null) {
            this.pendingResponses.set(p, { type: ActionType.Pass, playerIndex: p });
          }
        }
        this.tryResolve();
      }, timeout);

      // Check if already all resolved
      this.tryResolve();
    });
  }

  private tryResolve(): void {
    if (!this.resolvePromise) return;

    // Check if all players have responded
    for (const p of this.expectedPlayers) {
      if (this.pendingResponses.get(p) === null) return;
    }

    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }

    // Find highest priority action
    let bestAction: GameAction | null = null;
    let bestPlayer = -1;
    let bestPriority = -1;
    let bestDistance = Infinity;

    for (const p of this.expectedPlayers) {
      const action = this.pendingResponses.get(p)!;
      const priority = getActionPriority(action);

      if (priority > bestPriority) {
        bestPriority = priority;
        bestAction = action;
        bestPlayer = p;
        bestDistance = this.distanceFromDiscarder(p);
      } else if (priority === bestPriority && priority > 0) {
        // Tie-break: closest to discarder (in turn order) wins
        const dist = this.distanceFromDiscarder(p);
        if (dist < bestDistance) {
          bestAction = action;
          bestPlayer = p;
          bestDistance = dist;
        }
      }
    }

    const resolve = this.resolvePromise;
    this.resolvePromise = null;

    if (bestAction && bestPriority > 0) {
      resolve({ playerIndex: bestPlayer, action: bestAction });
    } else {
      resolve(null); // All passed
    }
  }

  private distanceFromDiscarder(playerIndex: number): number {
    return (playerIndex - this.discarderIndex + 4) % 4;
  }

  dispose(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    this.resolvePromise = null;
  }
}
