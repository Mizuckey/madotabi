/** Event scheduling only; requests and the 30-minute cooldown live in the hook/DB. */
export function startVisibleChannelChecks(check: () => void, environment: {
  page: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;
  window: Pick<Window, "addEventListener" | "removeEventListener">;
  setInterval: typeof setInterval;
  clearInterval: typeof clearInterval;
} = { page: document, window, setInterval: setInterval.bind(globalThis), clearInterval: clearInterval.bind(globalThis) }) {
  let stopped = false;
  const run = () => { if (!stopped && environment.page.visibilityState === "visible") check(); };
  run();
  environment.page.addEventListener("visibilitychange", run);
  environment.window.addEventListener("online", run);
  environment.window.addEventListener("focus", run);
  const timer = environment.setInterval(run, 60_000);
  return () => {
    stopped = true;
    environment.clearInterval(timer);
    environment.page.removeEventListener("visibilitychange", run);
    environment.window.removeEventListener("online", run);
    environment.window.removeEventListener("focus", run);
  };
}
