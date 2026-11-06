"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlaybackStatus } from "@/lib/youtube-player";
import { DEFAULT_ROTATION_SECONDS, ROTATION_INTERVALS, nextPlayableIndex, startRotationTimer, type RotationTimer } from "@/lib/rotation";

/** 親は動画一覧の変更時にkeyを変え、選択位置を新しい一覧へリセットする。 */
export function useCameraRotation(count: number, initialIndex = 0, eligibleIndices?: number[]) {
  const restricted = eligibleIndices !== undefined;
  const availableKey = eligibleIndices?.join(",") ?? "";
  const available = useMemo(() => restricted ? availableKey.split(",").filter(Boolean).map(Number).filter(index => Number.isInteger(index) && index >= 0 && index < count) : Array.from({ length: count }, (_, index) => index), [restricted, availableKey, count]);
  const [selection, setSelection] = useState({ index: initialIndex });
  const index = nextPlayableIndex(selection.index, count, available, 1, true);
  const [automatic, setAutomatic] = useState(true);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(DEFAULT_ROTATION_SECONDS);
  const remainingRef = useRef(DEFAULT_ROTATION_SECONDS * 1000);
  const timerRef = useRef<RotationTimer | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("loading");
  const enabled = automatic && available.length > 1;
  const counting = enabled && selection.index === index && playbackStatus === "playing";

  useEffect(() => {
    if (!counting) return;
    const timer = startRotationTimer({
      delayMs: remainingRef.current,
      onAdvance: () => {
        timerRef.current = null;
        setPlaybackStatus("loading");
        remainingRef.current = intervalSeconds * 1000;
        setSelection(current => ({ index: nextPlayableIndex(current.index, count, available) }));
      },
    });
    timerRef.current = timer;
    return () => {
      timer.cancel();
      if (timerRef.current === timer) {
        remainingRef.current = timer.remaining();
        timerRef.current = null;
      }
    };
  }, [counting, intervalSeconds, selection, count, available]);

  const resetClock = useCallback((durationMs: number) => {
    timerRef.current?.cancel();
    timerRef.current = null;
    remainingRef.current = durationMs;
  }, []);

  const onPlaybackChange = useCallback((status: PlaybackStatus) => {
    if (selection.index !== index) { resetClock(intervalSeconds * 1000); setSelection({ index }); }
    else if (status !== "playing") resetClock(timerRef.current?.remaining() ?? remainingRef.current);
    setPlaybackStatus(status);
  }, [resetClock, selection.index, index, intervalSeconds]);

  function select(index: number) {
    if (!Number.isInteger(index) || !available.includes(index)) return;
    resetClock(intervalSeconds * 1000);
    if (index !== selection.index) setPlaybackStatus("loading");
    setSelection({ index });
  }

  function move(direction: 1 | -1) {
    if (available.length < 2) return;
    resetClock(intervalSeconds * 1000);
    setPlaybackStatus("loading");
    setSelection({ index: nextPlayableIndex(index, count, available, direction) });
  }

  function changeInterval(seconds: number) {
    if (!ROTATION_INTERVALS.some(value => value === seconds) || seconds === intervalSeconds) return;
    resetClock(seconds * 1000);
    setIntervalSeconds(seconds);
  }

  function toggleAutomatic() {
    if (available.length < 2) return;
    if (automatic) {
      const remaining = timerRef.current?.remaining() ?? remainingRef.current;
      resetClock(remaining);
    }
    setAutomatic(!automatic);
  }

  return { index, automatic: enabled, counting, playbackStatus, onPlaybackChange, intervalSeconds, select, move, changeInterval, toggleAutomatic };
}
