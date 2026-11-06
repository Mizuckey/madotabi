export const ROTATION_INTERVALS = [10, 20, 30, 40, 50, 60] as const;
export const DEFAULT_ROTATION_SECONDS = 20;

export function nextPlayableIndex(index: number, count: number, available: readonly number[], direction: 1 | -1 = 1, includeCurrent = false): number {
  if (count <= 0 || !available.length) return 0;
  const allowed = new Set(available);
  for (let step = includeCurrent ? 0 : 1; step < count + (includeCurrent ? 0 : 1); step++) {
    const candidate = ((index + step * direction) % count + count) % count;
    if (allowed.has(candidate)) return candidate;
  }
  return 0;
}

export function nextVideoIndex(index: number, count: number, direction: 1 | -1 = 1): number {
  if (count <= 0) return 0;
  return ((index + direction) % count + count) % count;
}

export type RotationTimer = { remaining(): number; cancel(): void };

/** 単発の切替予約。遅延時もまとめて複数本進めず、1本だけ切り替える。 */
export function startRotationTimer({ delayMs, onRemaining, onAdvance, now = () => performance.now() }: {
  delayMs: number;
  onRemaining?(remainingMs: number): void;
  onAdvance(): void;
  now?: () => number;
}): RotationTimer {
  if (!Number.isFinite(delayMs) || delayMs < 0) throw new Error("Invalid rotation delay");
  const deadline = now() + delayMs;
  let cancelled = false;
  const remaining = () => Math.max(0, deadline - now());
  const cancel = () => {
    cancelled = true;
    clearTimeout(timeout);
    clearInterval(heartbeat);
  };
  const timeout = setTimeout(() => {
    if (cancelled) return;
    cancel();
    onRemaining?.(0);
    onAdvance();
  }, delayMs);
  const heartbeat = onRemaining ? setInterval(() => { if (!cancelled) onRemaining(remaining()); }, 1000) : undefined;
  return { remaining, cancel };
}
