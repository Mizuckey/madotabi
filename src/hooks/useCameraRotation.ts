"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_ROTATION_SECONDS, ROTATION_INTERVALS, nextVideoIndex, startRotationTimer, type RotationTimer } from "@/lib/rotation";

/** 親は動画一覧の変更時にkeyを変え、選択位置を新しい一覧へリセットする。 */
export function useCameraRotation(count: number) {
  const [selection, setSelection] = useState({ index: 0 });
  const [automatic, setAutomatic] = useState(true);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(DEFAULT_ROTATION_SECONDS);
  const [remainingMs, setRemainingMs] = useState<number>(DEFAULT_ROTATION_SECONDS * 1000);
  const remainingRef = useRef(DEFAULT_ROTATION_SECONDS * 1000);
  const timerRef = useRef<RotationTimer | null>(null);
  const enabled = automatic && count > 1;

  useEffect(() => {
    if (!enabled) return;
    const timer = startRotationTimer({
      delayMs: remainingRef.current,
      onRemaining: setRemainingMs,
      onAdvance: () => {
        remainingRef.current = intervalSeconds * 1000;
        setRemainingMs(intervalSeconds * 1000);
        setSelection(current => ({ index: nextVideoIndex(current.index, count) }));
      },
    });
    timerRef.current = timer;
    return () => {
      timer.cancel();
      if (timerRef.current === timer) timerRef.current = null;
    };
  }, [enabled, intervalSeconds, selection, count]);

  function resetClock(durationMs: number) {
    timerRef.current?.cancel();
    timerRef.current = null;
    remainingRef.current = durationMs;
    setRemainingMs(durationMs);
  }

  function select(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= count) return;
    resetClock(intervalSeconds * 1000);
    setSelection({ index });
  }

  function move(direction: 1 | -1) {
    if (count < 2) return;
    resetClock(intervalSeconds * 1000);
    setSelection(current => ({ index: nextVideoIndex(current.index, count, direction) }));
  }

  function changeInterval(seconds: number) {
    if (!ROTATION_INTERVALS.some(value => value === seconds) || seconds === intervalSeconds) return;
    resetClock(seconds * 1000);
    setIntervalSeconds(seconds);
  }

  function toggleAutomatic() {
    if (count < 2) return;
    if (automatic) {
      const remaining = timerRef.current?.remaining() ?? remainingRef.current;
      resetClock(remaining);
    }
    setAutomatic(!automatic);
  }

  return { index: selection.index, automatic: enabled, intervalSeconds, remainingSeconds: Math.ceil(remainingMs / 1000), select, move, changeInterval, toggleAutomatic };
}
