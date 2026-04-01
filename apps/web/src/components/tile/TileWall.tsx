import { useEffect, useRef } from "react";

interface TileWallProps {
  remaining: number;
  total?: number;
  size?: number;
}

const TILE_W = 14;
const TILE_H = 9;
const GAP = 1;

export default function TileWall({ remaining, total = 72, size = 260 }: TileWallProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.innerHTML = "";

    // Calculate positions around the square
    const positions: { x: number; y: number; w: number; h: number }[] = [];

    // Top: left to right
    for (let x = 0; x < size - TILE_W; x += TILE_W + GAP) {
      positions.push({ x, y: 0, w: TILE_W, h: TILE_H });
    }
    // Right: top to bottom
    for (let y = TILE_H + GAP; y < size - TILE_W; y += TILE_W + GAP) {
      positions.push({ x: size - TILE_H, y, w: TILE_H, h: TILE_W });
    }
    // Bottom: right to left
    for (let x = size - TILE_W; x >= TILE_H; x -= TILE_W + GAP) {
      positions.push({ x, y: size - TILE_H, w: TILE_W, h: TILE_H });
    }
    // Left: bottom to top
    for (let y = size - TILE_W; y > TILE_H + GAP; y -= TILE_W + GAP) {
      positions.push({ x: 0, y, w: TILE_H, h: TILE_W });
    }

    // Only render up to `remaining` tiles
    const count = Math.min(remaining, positions.length);
    for (let i = 0; i < count; i++) {
      const p = positions[i];
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(p.x));
      rect.setAttribute("y", String(p.y));
      rect.setAttribute("width", String(p.w));
      rect.setAttribute("height", String(p.h));
      rect.setAttribute("rx", "1.5");
      rect.setAttribute("fill", "#78A860");
      rect.setAttribute("stroke", "#98C87C");
      rect.setAttribute("stroke-width", "0.5");
      svg.appendChild(rect);
    }
  }, [remaining, size]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      className="block"
    />
  );
}
