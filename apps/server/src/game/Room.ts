import type { RuleSet, RoomInfo } from "@majiang/shared";
import { getRuleSet } from "@majiang/shared";
import { GameEngine } from "./GameEngine.js";
import type { GameEngineCallbacks, PlayerInfo } from "./GameEngine.js";

const MAX_PLAYERS = 4;

let roomCounter = 0;
function generateRoomId(): string {
  roomCounter++;
  return `room-${Date.now().toString(36)}-${roomCounter}`;
}

export interface RoomPlayer {
  name: string;
  isBot: boolean;
  socketId?: string;
  ready: boolean;
}

export class Room {
  readonly id: string;
  readonly ruleSetId: string;
  players: RoomPlayer[] = [];
  state: "waiting" | "playing" | "finished" = "waiting";
  engine: GameEngine | null = null;

  constructor(ruleSetId: string) {
    this.id = generateRoomId();
    this.ruleSetId = ruleSetId;
  }

  addPlayer(name: string, socketId?: string, isBot = false): boolean {
    if (this.players.length >= MAX_PLAYERS) return false;
    if (this.state !== "waiting") return false;

    this.players.push({ name, isBot, socketId, ready: true });
    return true;
  }

  removePlayer(socketId: string): boolean {
    if (this.state !== "waiting") return false;

    const idx = this.players.findIndex((p) => p.socketId === socketId);
    if (idx === -1) return false;

    this.players.splice(idx, 1);
    return true;
  }

  addBot(name: string): boolean {
    return this.addPlayer(name, undefined, true);
  }

  canStart(): boolean {
    return this.players.length === MAX_PLAYERS && this.state === "waiting";
  }

  start(callbacks: GameEngineCallbacks = {}): GameEngine {
    if (!this.canStart()) {
      throw new Error("Cannot start game: need exactly 4 players in waiting state");
    }

    const ruleSet = getRuleSet(this.ruleSetId);
    if (!ruleSet) {
      throw new Error(`RuleSet "${this.ruleSetId}" not found in registry`);
    }

    // Pass player references directly so GameEngine sees live socketId updates
    // (e.g. when a player disconnects and socketId is cleared)
    const playerInfos: PlayerInfo[] = this.players;

    this.engine = new GameEngine(ruleSet, playerInfos, callbacks);
    this.state = "playing";
    return this.engine;
  }

  toRoomInfo(): RoomInfo {
    return {
      id: this.id,
      players: this.players.map((p) => ({
        name: p.name,
        isBot: p.isBot,
        ready: p.ready,
        connected: p.isBot || !!p.socketId,
      })),
      ruleSetId: this.ruleSetId,
      started: this.state !== "waiting",
    };
  }
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(ruleSetId: string): Room {
    const room = new Room(ruleSetId);
    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  listRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  removeRoom(id: string): boolean {
    return this.rooms.delete(id);
  }
}

// Singleton instance
export const roomManager = new RoomManager();
