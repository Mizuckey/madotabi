"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlaybackStatus } from "@/lib/youtube-player";
import { DEFAULT_ROTATION_SECONDS, ROTATION_INTERVALS, nextPlayableIndex, startRotationTimer, type RotationTimer } from "@/lib/rotation";

/** 動画の追加・削除時もIDで選択位置を追跡する。 */
export function useCameraRotation(count: number, initialIndex = 0, eligibleIndices?: number[], paused = false, orderedVideoIds?: string[]) {
  const videoIdsKey = orderedVideoIds?.join(",");
  const videoIds = useMemo(() => videoIdsKey === undefined ? undefined : videoIdsKey.split(","), [videoIdsKey]);
  const restricted = eligibleIndices !== undefined;
  const availableKey = eligibleIndices?.join(",") ?? "";
  const available = useMemo(() => restricted ? availableKey.split(",").filter(Boolean).map(Number).filter(index => Number.isInteger(index) && index >= 0 && index < count) : Array.from({ length: count }, (_, index) => index), [restricted, availableKey, count]);
  const [selection, setSelection] = useState({ index: initialIndex, id: videoIds?.[initialIndex] });
  const trackedIndex = selection.id ? videoIds?.indexOf(selection.id) ?? -1 : -1;
  if (trackedIndex >= 0 && trackedIndex !== selection.index) {
    setSelection({ index: trackedIndex, id: selection.id });
  }
  const selectedIndex = trackedIndex >= 0 ? trackedIndex : selection.index;
  const index = nextPlayableIndex(selectedIndex, count, available, 1, true);
  const [automatic, setAutomatic] = useState(true);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(DEFAULT_ROTATION_SECONDS);
  const remainingRef = useRef(DEFAULT_ROTATION_SECONDS * 1000);
  const timerRef = useRef<RotationTimer | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("loading");
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  useEffect(() => {
    const updateVisibility = () => {
      if (document.hidden && timerRef.current) {
        remainingRef.current = timerRef.current.remaining();
        timerRef.current.cancel();
        timerRef.current = null;
      }
      setVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  const enabled = automatic && available.length > 1;
  const counting = !paused && visible && enabled && selectedIndex === index && playbackStatus === "playing";

  useEffect(() => {
    if (!counting || document.hidden) return;
    const timer = startRotationTimer({
      delayMs: remainingRef.current,
      onAdvance: () => {
        timerRef.current = null;
        setPlaybackStatus("loading");
        remainingRef.current = intervalSeconds * 1000;
        const next = nextPlayableIndex(index, count, available);
        setSelection({ index: next, id: videoIds?.[next] });
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
  }, [counting, intervalSeconds, selection, count, available, index, videoIds]);

  const resetClock = useCallback((durationMs: number) => {
    timerRef.current?.cancel();
    timerRef.current = null;
    remainingRef.current = durationMs;
  }, []);

  const onPlaybackChange = useCallback((status: PlaybackStatus) => {
    if (selectedIndex !== index || selection.id !== videoIds?.[index]) { resetClock(intervalSeconds * 1000); setSelection({ index, id: videoIds?.[index] }); }
    else if (status !== "playing") resetClock(timerRef.current?.remaining() ?? remainingRef.current);
    setPlaybackStatus(status);
  }, [resetClock, selectedIndex, selection.id, index, intervalSeconds, videoIds]);

  function select(nextIndex: number) {
    if (!Number.isInteger(nextIndex) || !available.includes(nextIndex)) return;
    resetClock(intervalSeconds * 1000);
    if (nextIndex !== index) setPlaybackStatus("loading");
    setSelection({ index: nextIndex, id: videoIds?.[nextIndex] });
  }

  function move(direction: 1 | -1) {
    if (available.length < 2) return;
    resetClock(intervalSeconds * 1000);
    setPlaybackStatus("loading");
    const next = nextPlayableIndex(index, count, available, direction);
    setSelection({ index: next, id: videoIds?.[next] });
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

  return { index, visible, automatic: enabled, counting, playbackStatus, onPlaybackChange, intervalSeconds, select, move, changeInterval, toggleAutomatic };
}
