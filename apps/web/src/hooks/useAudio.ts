import { useCallback } from "react";
import { useGameStore } from "../stores/gameStore.js";

type SoundType = "discard" | "claim" | "hu";

/** Lazily-created shared AudioContext */
let ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playDiscard() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.value = 800;
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.08);
}

function playClaim() {
  const c = getCtx();
  const now = c.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = now + i * 0.08;
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}

function playHu() {
  const c = getCtx();
  const now = c.currentTime;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const t = now + i * 0.12;
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  });
}

const players: Record<SoundType, () => void> = {
  discard: playDiscard,
  claim: playClaim,
  hu: playHu,
};

export function useAudio() {
  const isMuted = useGameStore((s) => s.isMuted);

  const play = useCallback(
    (sound: SoundType) => {
      if (isMuted) return;
      try {
        players[sound]();
      } catch {
        // Web Audio not available
      }
    },
    [isMuted],
  );

  return { play };
}
