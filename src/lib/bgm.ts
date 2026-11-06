/** External navigation only. Never load or embed the registered URL on the server. */
export function parseBgmUrl(input: string): { url: string; suggestedTitle: string } | null {
  const value = input.trim();
  if (!value || value.length > 2048 || value.startsWith('/')) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.href.length > 2048) return null;
    return { url: url.href, suggestedTitle: url.hostname.replace(/^www\./, '').slice(0, 100) };
  } catch { return null; }
}

const selectionKey = (userId: string) => `madotabi:bgm:${userId}`;
export function readBgmSelection(storage: Pick<Storage, 'getItem'>, userId: string): string | null {
  try { const id = storage.getItem(selectionKey(userId)); return id && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id) ? id : null; }
  catch { return null; }
}
export function writeBgmSelection(storage: Pick<Storage, 'setItem' | 'removeItem'>, userId: string, id: string | null): void {
  try { if (id) storage.setItem(selectionKey(userId), id); else storage.removeItem(selectionKey(userId)); }
  catch { /* The current page still works if storage is unavailable. */ }
}
