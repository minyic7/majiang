import { describe, it, expect } from "vitest";
import { ActionType } from "@majiang/shared";
import { ActionResolver } from "../ActionResolver.js";

describe("ActionResolver", () => {
  it("should resolve with null when all players pass", async () => {
    const resolver = new ActionResolver([1, 2, 3], 0);

    resolver.submitAction(1, { type: ActionType.Pass, playerIndex: 1 });
    resolver.submitAction(2, { type: ActionType.Pass, playerIndex: 2 });
    resolver.submitAction(3, { type: ActionType.Pass, playerIndex: 3 });

    const result = await resolver.waitForResponses(5000);
    expect(result).toBeNull();
  });

  it("should resolve with highest priority action (hu > peng)", async () => {
    const resolver = new ActionResolver([1, 2, 3], 0);

    resolver.submitAction(1, { type: ActionType.Peng, playerIndex: 1, targetTile: { id: 0, tile: { kind: "suited", suit: "wan" as any, value: 1 as any } } });
    resolver.submitAction(2, { type: ActionType.Hu, playerIndex: 2 });
    resolver.submitAction(3, { type: ActionType.Pass, playerIndex: 3 });

    const result = await resolver.waitForResponses(5000);
    expect(result).not.toBeNull();
    expect(result!.action.type).toBe(ActionType.Hu);
    expect(result!.playerIndex).toBe(2);
  });

  it("should resolve peng over chi", async () => {
    const resolver = new ActionResolver([1, 2, 3], 0);

    resolver.submitAction(1, { type: ActionType.Chi, playerIndex: 1, tiles: [] as any, targetTile: { id: 0, tile: { kind: "suited", suit: "wan" as any, value: 1 as any } } });
    resolver.submitAction(2, { type: ActionType.Peng, playerIndex: 2, targetTile: { id: 0, tile: { kind: "suited", suit: "wan" as any, value: 1 as any } } });
    resolver.submitAction(3, { type: ActionType.Pass, playerIndex: 3 });

    const result = await resolver.waitForResponses(5000);
    expect(result).not.toBeNull();
    expect(result!.action.type).toBe(ActionType.Peng);
    expect(result!.playerIndex).toBe(2);
  });

  it("should break ties by distance from discarder", async () => {
    // Discarder is player 0. Players 1 and 3 both peng.
    // Player 1 is closer (distance 1 vs distance 3)
    const resolver = new ActionResolver([1, 2, 3], 0);

    resolver.submitAction(1, { type: ActionType.Peng, playerIndex: 1, targetTile: { id: 0, tile: { kind: "suited", suit: "wan" as any, value: 1 as any } } });
    resolver.submitAction(2, { type: ActionType.Pass, playerIndex: 2 });
    resolver.submitAction(3, { type: ActionType.Peng, playerIndex: 3, targetTile: { id: 0, tile: { kind: "suited", suit: "wan" as any, value: 1 as any } } });

    const result = await resolver.waitForResponses(5000);
    expect(result).not.toBeNull();
    expect(result!.playerIndex).toBe(1);
  });

  it("should auto-pass on timeout", async () => {
    const resolver = new ActionResolver([1, 2, 3], 0);

    // Only player 1 responds
    resolver.submitAction(1, { type: ActionType.Pass, playerIndex: 1 });

    // Short timeout
    const result = await resolver.waitForResponses(50);
    // All others auto-pass
    expect(result).toBeNull();
  });

  it("should handle single player response", async () => {
    const resolver = new ActionResolver([2], 0);

    resolver.submitAction(2, { type: ActionType.Peng, playerIndex: 2, targetTile: { id: 0, tile: { kind: "suited", suit: "wan" as any, value: 1 as any } } });

    const result = await resolver.waitForResponses(5000);
    expect(result).not.toBeNull();
    expect(result!.action.type).toBe(ActionType.Peng);
  });

  it("should ignore actions from unexpected players", async () => {
    const resolver = new ActionResolver([1, 2], 0);

    resolver.submitAction(1, { type: ActionType.Pass, playerIndex: 1 });
    resolver.submitAction(2, { type: ActionType.Pass, playerIndex: 2 });
    resolver.submitAction(3, { type: ActionType.Hu, playerIndex: 3 }); // Not expected

    const result = await resolver.waitForResponses(5000);
    expect(result).toBeNull(); // Only passes from expected players
  });
});
