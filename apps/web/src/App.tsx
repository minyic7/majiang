import { Routes, Route } from "react-router";
import GamePage from "./pages/GamePage.js";

function Home() {
  return (
    <div className="min-h-screen bg-[#0e1a0e] flex items-center justify-center">
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/game" element={<GamePage />} />
    </Routes>
  );
}
