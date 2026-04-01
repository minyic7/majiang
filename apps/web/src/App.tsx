import { Routes, Route } from "react-router";
import { useIsMobile } from "./hooks/useIsMobile.js";
import GamePage from "./pages/GamePage.js";
import MobileGamePage from "./pages/MobileGamePage.js";

function Home() {
  return (
    <div className="min-h-screen bg-[#0a1208] flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">麻将</h1>
        <p className="text-green-300">Majiang — Universal Mahjong</p>
        <a href="/majiang/game" className="block text-amber-400 hover:text-amber-300 underline text-sm">
          查看牌桌 →
        </a>
      </div>
    </div>
  );
}

function GameRouter() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileGamePage /> : <GamePage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/game" element={<GameRouter />} />
    </Routes>
  );
}
