import { Routes, Route } from "react-router";
import { useIsMobile } from "./hooks/useIsMobile.js";
import { useSocket } from "./hooks/useSocket.js";
import LobbyPage from "./pages/LobbyPage.js";
import RoomPage from "./pages/RoomPage.js";
import GamePage from "./pages/GamePage.js";
import MobileGamePage from "./pages/MobileGamePage.js";

function GameRouter() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileGamePage /> : <GamePage />;
}

export default function App() {
  useSocket();

  return (
    <Routes>
      <Route path="/" element={<LobbyPage />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
      <Route path="/game" element={<GameRouter />} />
    </Routes>
  );
}
