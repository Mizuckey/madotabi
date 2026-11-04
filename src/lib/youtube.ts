export type YouTubeVideo = { videoId: string; canonicalUrl: string };

/** URLの形式だけを確認する。配信の実在・ライブ状態・埋め込み可否は保証しない。 */
export function parseYouTubeUrl(input: string): YouTubeVideo | null {
  const value = input.trim();
  if (!value || value.length > 2048) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;

    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);
    let id: string | null = null;

    if (host === 'youtu.be' || host === 'www.youtu.be') {
      if (parts.length === 1) id = parts[0];
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      if (url.pathname === '/watch' && url.searchParams.getAll('v').length === 1) {
        id = url.searchParams.get('v');
      } else if (parts.length === 2 && ['live', 'shorts', 'embed'].includes(parts[0])) {
        id = parts[1];
      }
    }

    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return { videoId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` };
  } catch {
    return null;
  }
}
