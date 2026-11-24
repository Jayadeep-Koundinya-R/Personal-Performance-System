import React from "react";
import { useFocusTimerTick } from "@/hooks/use-focus-timer";

interface LiveCountdownProps {
  className?: string;
  /** Render the countdown using the hook's zero-padded formatter (MM:SS). */
  padded?: boolean;
}

/**
 * Memoized leaf that renders the live focus countdown.
 *
 * It is the ONLY component that subscribes to the per-second tick context, so
 * the surrounding dashboard tree no longer re-renders every second — only this
 * small node does.
 */
export const LiveCountdown = React.memo(function LiveCountdown({ className, padded = false }: LiveCountdownProps) {
  const { remainingSec } = useFocusTimerTick();
  const mins = Math.floor(remainingSec / 60);
  const secs = (remainingSec % 60).toString().padStart(2, "0");
  const text = padded ? `${mins.toString().padStart(2, "0")}:${secs}` : `${mins}:${secs}`;
  return <span className={className}>{text}</span>;
});