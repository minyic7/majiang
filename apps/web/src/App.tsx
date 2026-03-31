import { Routes, Route } from "react-router";

function Home() {
  return (
    <div className="min-h-screen bg-green-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">麻将</h1>
        <p className="text-green-300">Majiang — Universal Mahjong</p>
        <p className="text-green-400/60 text-sm">Coming soon...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
