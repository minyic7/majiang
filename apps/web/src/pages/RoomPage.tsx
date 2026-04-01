import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { GamePhase } from "@majiang/shared";
import { useGameStore } from "../stores/gameStore.js";

export default function RoomPage() {
  const navigate = useNavigate();
  const roomInfo = useGameStore((s) => s.roomInfo);
  const gameState = useGameStore((s) => s.gameState);
  const errorMessage = useGameStore((s) => s.errorMessage);
  const socket = useGameStore((s) => s.socket);

  // If no roomInfo, redirect to lobby
  useEffect(() => {
    if (!roomInfo) {
      navigate("/");
    }
  }, [roomInfo, navigate]);

  // When game starts, navigate to /game
  useEffect(() => {
    if (gameState && gameState.phase === GamePhase.Playing) {
      navigate("/game");
    }
  }, [gameState, navigate]);

  const handleAddBot = useCallback(() => {
    if (!roomInfo) return;
    const existingBots = roomInfo.players.filter((p: { isBot: boolean }) => p.isBot).length;
    const botName = `Bot-${existingBots + 1}`;
    useGameStore.getState().addBot(botName);
  }, [roomInfo]);

  const handleStartGame = useCallback(() => {
    useGameStore.getState().startGame();
  }, []);

  const handleLeaveRoom = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
    useGameStore.getState().reset();
    navigate("/");
  }, [socket, navigate]);

  const handleCopyRoomId = useCallback(() => {
    if (roomInfo) {
      navigator.clipboard.writeText(roomInfo.id).catch(() => {});
    }
  }, [roomInfo]);

  if (!roomInfo) return null;

  const playerCount = roomInfo.players.length;
  const seats = Array.from({ length: 4 }, (_, i) =>
    i < roomInfo.players.length ? roomInfo.players[i] : null
  );

  return (
    <div className="min-h-screen bg-[#0a1208] text-white flex flex-col items-center p-4 sm:p-8">
      <h1 className="text-4xl font-bold mb-2">麻将</h1>
      <p className="text-green-300 mb-8">Waiting Room</p>

      {errorMessage && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded mb-4 max-w-md w-full text-center">
          {errorMessage}
        </div>
      )}

      {/* Room ID */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-md w-full mb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-neutral-400">Room ID</span>
          <button
            onClick={handleCopyRoomId}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            Copy
          </button>
        </div>
        <p className="font-mono text-lg text-white break-all">{roomInfo.id}</p>
        <p className="text-xs text-neutral-500 mt-1">Rule Set: {roomInfo.ruleSetId}</p>
      </div>

      {/* Player Seats */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-md w-full mb-6">
        <h2 className="text-lg font-semibold text-amber-400 mb-4">Players</h2>
        <div className="space-y-2">
          {seats.map((player, i) => (
            <div
              key={i}
              className={`flex items-center justify-between rounded px-4 py-3 border ${
                player
                  ? "bg-neutral-800 border-neutral-600"
                  : "bg-neutral-800/30 border-neutral-700/50 border-dashed"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-neutral-500 w-6">
                  {i + 1}
                </span>
                {player ? (
                  <>
                    <span className="text-white">{player.name}</span>
                    {player.isBot && (
                      <span className="text-xs bg-neutral-700 text-neutral-400 px-1.5 py-0.5 rounded">
                        BOT
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-neutral-600 italic">Empty seat</span>
                )}
              </div>
              {player && (
                <span
                  className={`text-xs font-semibold ${
                    player.ready ? "text-green-400" : "text-neutral-500"
                  }`}
                >
                  {player.ready ? "Ready" : "Waiting"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 max-w-md w-full">
        <button
          onClick={handleLeaveRoom}
          className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold py-2 rounded transition-colors"
        >
          Leave
        </button>
        <button
          onClick={handleAddBot}
          disabled={playerCount >= 4}
          title={playerCount >= 4 ? "房间已满" : undefined}
          className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-600 disabled:text-neutral-400 text-white font-semibold py-2 rounded transition-colors"
        >
          Add Bot
        </button>
        <button
          onClick={handleStartGame}
          disabled={playerCount < 4}
          title={playerCount < 4 ? "需要4位玩家" : undefined}
          className="flex-1 bg-green-700 hover:bg-green-600 disabled:bg-neutral-600 disabled:text-neutral-400 text-white font-semibold py-2 rounded transition-colors"
        >
          Start Game
        </button>
      </div>
    </div>
  );
}
