export function WeatherInfo() {
  return (
    <section className="panel-section weather" aria-labelledby="weather-title">
      <div className="section-top"><h2 id="weather-title">現地の天気</h2><span className="muted-label">未取得</span></div>
      <div className="weather-reading"><span className="weather-symbol" aria-hidden="true">—</span><span className="temperature">--<small>°C</small></span><span className="weather-note">天気情報は<br />まだありません</span></div>
      <p className="subtle-note">Open-Meteo との連携を予定しています</p>
    </section>
  );
}
