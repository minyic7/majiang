import { useEffect, useState } from "react";
import { useGameStore } from "../stores/gameStore.js";

/** Returns remaining seconds until the server auto-acts, or null when no action is pending. */
export function useActionTimer(): number | null {
  const actionDeadline = useGameStore((s) => s.actionDeadline);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (actionDeadline == null) {
      setRemaining(null);
      return;
    }

    const tick = () => {
      const left = Math.max(0, Math.ceil((actionDeadline - Date.now()) / 1000));
      setRemaining(left);
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [actionDeadline]);

  return remaining;
}
