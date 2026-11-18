export function WindowLoading({ message = "景色を読み込んでいます…" }: { message?: string }) {
  return (
    <div className="window-loading" role="status">
      <div className="loading-window" aria-hidden="true">
        <div className="loading-window-sky" />
        <div className="loading-window-pane loading-window-left" />
        <div className="loading-window-pane loading-window-right" />
      </div>
      <span>{message}</span>
    </div>
  );
}
