import { describe, it, expect, beforeEach } from "vitest";
import { registerRuleSet } from "@majiang/shared";
import { Room, RoomManager, roomManager } from "../Room.js";
import { StubRuleSet } from "./StubRuleSet.js";

// Register stub ruleset for tests
registerRuleSet(StubRuleSet);

describe("Room", () => {
  let room: Room;

  beforeEach(() => {
    room = new Room("stub");
  });

  it("should create a room with an id and ruleSetId", () => {
    expect(room.id).toBeTruthy();
    expect(room.ruleSetId).toBe("stub");
    expect(room.state).toBe("waiting");
    expect(room.players).toHaveLength(0);
  });

  it("should add a player", () => {
    const added = room.addPlayer("Alice", "socket-1");
    expect(added).toBe(true);
    expect(room.players).toHaveLength(1);
    expect(room.players[0].name).toBe("Alice");
    expect(room.players[0].isBot).toBe(false);
    expect(room.players[0].socketId).toBe("socket-1");
  });

  it("should not add more than 4 players", () => {
    room.addPlayer("A", "s1");
    room.addPlayer("B", "s2");
    room.addPlayer("C", "s3");
    room.addPlayer("D", "s4");
    const added = room.addPlayer("E", "s5");
    expect(added).toBe(false);
    expect(room.players).toHaveLength(4);
  });

  it("should remove a player by socketId", () => {
    room.addPlayer("Alice", "socket-1");
    room.addPlayer("Bob", "socket-2");
    const removed = room.removePlayer("socket-1");
    expect(removed).toBe(true);
    expect(room.players).toHaveLength(1);
    expect(room.players[0].name).toBe("Bob");
  });

  it("should not remove a player that doesn't exist", () => {
    room.addPlayer("Alice", "socket-1");
    const removed = room.removePlayer("nonexistent");
    expect(removed).toBe(false);
    expect(room.players).toHaveLength(1);
  });

  it("should add a bot", () => {
    const added = room.addBot("Bot-1");
    expect(added).toBe(true);
    expect(room.players[0].isBot).toBe(true);
    expect(room.players[0].name).toBe("Bot-1");
  });

  it("should know when it can start", () => {
    expect(room.canStart()).toBe(false);
    room.addPlayer("A", "s1");
    room.addPlayer("B", "s2");
    room.addPlayer("C", "s3");
    expect(room.canStart()).toBe(false);
    room.addBot("Bot-1");
    expect(room.canStart()).toBe(true);
  });

  it("should start a game and return an engine", () => {
    room.addPlayer("A", "s1");
    room.addPlayer("B", "s2");
    room.addPlayer("C", "s3");
    room.addBot("Bot-1");

    const engine = room.start();
    expect(engine).toBeTruthy();
    expect(room.state).toBe("playing");
    expect(room.engine).toBe(engine);
  });

  it("should throw when starting without 4 players", () => {
    room.addPlayer("A", "s1");
    expect(() => room.start()).toThrow("Cannot start game");
  });

  it("should not allow adding players when game is playing", () => {
    room.addPlayer("A", "s1");
    room.addPlayer("B", "s2");
    room.addPlayer("C", "s3");
    room.addBot("Bot-1");
    room.start();

    const added = room.addPlayer("E", "s5");
    expect(added).toBe(false);
  });

  it("should convert to RoomInfo", () => {
    room.addPlayer("Alice", "s1");
    room.addBot("Bot-1");

    const info = room.toRoomInfo();
    expect(info.id).toBe(room.id);
    expect(info.ruleSetId).toBe("stub");
    expect(info.started).toBe(false);
    expect(info.players).toHaveLength(2);
    expect(info.players[0].name).toBe("Alice");
    expect(info.players[0].isBot).toBe(false);
    expect(info.players[1].name).toBe("Bot-1");
    expect(info.players[1].isBot).toBe(true);
  });
});

describe("RoomManager", () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  it("should create and retrieve a room", () => {
    const room = manager.createRoom("stub");
    expect(room).toBeTruthy();
    expect(manager.getRoom(room.id)).toBe(room);
  });

  it("should list all rooms", () => {
    manager.createRoom("stub");
    manager.createRoom("stub");
    expect(manager.listRooms()).toHaveLength(2);
  });

  it("should remove a room", () => {
    const room = manager.createRoom("stub");
    expect(manager.removeRoom(room.id)).toBe(true);
    expect(manager.getRoom(room.id)).toBeUndefined();
  });

  it("should return undefined for nonexistent room", () => {
    expect(manager.getRoom("nonexistent")).toBeUndefined();
  });
});
