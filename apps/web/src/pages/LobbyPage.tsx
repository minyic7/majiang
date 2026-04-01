import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { useGameStore } from "../stores/gameStore.js";

interface RuleSetInfo {
  id: string;
  name: string;
  description: string;
}

interface RoomListItem {
  id: string;
  ruleSetId: string;
  players: { name: string }[];
  started: boolean;
}

const API_BASE = import.meta.env.DEV
  ? "http://localhost:7702"
  : "/majiang";

export default function LobbyPage() {
  const navigate = useNavigate();
  const { roomInfo, errorMessage, setErrorMessage } = useGameStore();

  const [playerName, setPlayerName] = useState("");
  const [ruleSetId, setRuleSetId] = useState("");
  const [ruleSets, setRuleSets] = useState<RuleSetInfo[]>([]);
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const quickStartRef = useRef(false);

  // Fetch rulesets
  useEffect(() => {
    fetch(`${API_BASE}/api/rulesets`)
      .then((r) => r.json())
      .then((data: RuleSetInfo[]) => {
        setRuleSets(data);
        if (data.length > 0) setRuleSetId(data[0].id);
      })
      .catch(() => {});
  }, []);

  // Fetch rooms
  const fetchRooms = useCallback(() => {
    fetch(`${API_BASE}/api/rooms`)
      .then((r) => r.json())
      .then((data: RoomListItem[]) => setRooms(data.filter((r) => !r.started)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  // Navigate when roomInfo is set (successful create/join)
  useEffect(() => {
    if (roomInfo && !quickStartRef.current) {
      navigate(`/room/${roomInfo.id}`);
    }
  }, [roomInfo, navigate]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setErrorMessage("Please enter your name");
      return;
    }
    if (!ruleSetId) {
      setErrorMessage("Please select a ruleset");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    useGameStore.getState().createRoom(playerName.trim(), ruleSetId);
    // Loading will end when navigation happens via roomInfo effect
    setTimeout(() => setLoading(false), 3000);
  };

  const handleJoinRoom = (roomId: string) => {
    if (!playerName.trim()) {
      setErrorMessage("Please enter your name");
      return;
    }
    setErrorMessage(null);
    useGameStore.getState().joinRoom(roomId, playerName.trim());
  };

  const handleQuickStart = () => {
    const name = playerName.trim() || "玩家";
    setPlayerName(name);
    setLoading(true);
    setErrorMessage(null);
    quickStartRef.current = true;

    const store = useGameStore.getState();
    const { socket } = store;
    if (!socket) {
      setErrorMessage("Not connected to server");
      setLoading(false);
      quickStartRef.current = false;
      return;
    }

    socket.emit("createRoom", { playerName: name, ruleSetId: "fuzhou" }, (room: { id: string; players: { name: string }[] }) => {
      store.setRoomInfo(room);
      try {
        sessionStorage.setItem("majiang_roomId", room.id);
        sessionStorage.setItem("majiang_playerName", name);
      } catch { /* sessionStorage unavailable */ }

      // Add 3 bots
      socket.emit("addBot", { name: "Bot-A" });
      socket.emit("addBot", { name: "Bot-B" });
      socket.emit("addBot", { name: "Bot-C" });

      // Wait for 4 players via roomUpdate, then start
      const unsubscribe = useGameStore.subscribe((state) => {
        if (state.roomInfo && state.roomInfo.players.length >= 4) {
          unsubscribe();
          socket.emit("startGame");
          quickStartRef.current = false;
          navigate(`/room/${room.id}`);
          setLoading(false);
        }
      });

      // Timeout fallback — navigate to room even if bots didn't all join
      setTimeout(() => {
        unsubscribe();
        quickStartRef.current = false;
        setLoading(false);
        navigate(`/room/${room.id}`);
      }, 10000);
    });
  };

  return (
    <div className="min-h-screen bg-[#0a1208] text-white flex flex-col items-center p-4 sm:p-8">
      <h1 className="text-4xl font-bold mb-2">麻将</h1>
      <p className="text-green-300 mb-8">Majiang — Universal Mahjong</p>

      {errorMessage && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded mb-4 max-w-md w-full text-center">
          {errorMessage}
        </div>
      )}

      {/* Create Room Section */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-md w-full mb-8">
        <h2 className="text-lg font-semibold text-amber-400 mb-4">Create Room</h2>

        <label className="block text-sm text-neutral-400 mb-1">Player Name</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-white placeholder-neutral-500 mb-4 focus:outline-none focus:border-green-500"
          maxLength={20}
        />

        <label className="block text-sm text-neutral-400 mb-1">Rule Set</label>
        <select
          value={ruleSetId}
          onChange={(e) => setRuleSetId(e.target.value)}
          className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-white mb-4 focus:outline-none focus:border-green-500"
        >
          {ruleSets.length === 0 && <option value="">Loading...</option>}
          {ruleSets.map((rs) => (
            <option key={rs.id} value={rs.id}>
              {rs.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleCreateRoom}
          disabled={loading}
          className="w-full bg-green-700 hover:bg-green-600 disabled:bg-neutral-600 text-white font-semibold py-2 rounded transition-colors"
        >
          {loading ? "Creating..." : "Create Room"}
        </button>

        <button
          onClick={handleQuickStart}
          disabled={loading}
          className="w-full mt-3 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-600 text-white font-semibold py-2 rounded transition-colors"
        >
          {loading ? "Starting..." : "快速开始 Quick Start"}
        </button>
      </div>

      {/* Room List Section */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-amber-400">Available Rooms</h2>
          <button
            onClick={fetchRooms}
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Refresh
          </button>
        </div>

        {rooms.length === 0 ? (
          <p className="text-neutral-500 text-center py-4">No rooms available</p>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between bg-neutral-800 border border-neutral-700 rounded px-4 py-3"
              >
                <div>
                  <p className="text-sm font-mono text-neutral-300">
                    {room.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {room.ruleSetId} · {room.players.length}/4 players
                  </p>
                </div>
                <button
                  onClick={() => handleJoinRoom(room.id)}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-3 py-1 rounded transition-colors"
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
