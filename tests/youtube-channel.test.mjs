import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChannelUrl, parseLiveVideos, resolveChannel, findChannelLives, verifyLiveVideo, channelNotifications, CHANNEL_CHECK_MS } from '../src/lib/youtube-channel.ts';
import { startVisibleChannelChecks } from '../src/lib/channel-monitor.ts';

const channelId = 'UC' + 'a'.repeat(22);
const id = 'abcdefghijk';
const live = (overrides = {}) => ({ id, snippet: { title: '検証ライブ', channelId, liveBroadcastContent: 'live' }, status: { embeddable: true, privacyStatus: 'public' }, liveStreamingDetails: { actualStartTime: '2026-11-06T00:00:00Z' }, ...overrides });

test('channel URLs normalize supported forms, tabs and handle case', () => {
  assert.equal(parseChannelUrl('https://www.youtube.com/@Example/streams?foo=bar').ref, '@example');
  assert.equal(parseChannelUrl('youtube.com/@札幌カメラ/live').ref, '@札幌カメラ');
  assert.equal(parseChannelUrl('youtube.com/@旅').ref, '@旅');
  assert.equal(parseChannelUrl(`https://m.youtube.com/channel/${channelId}`).ref, channelId);
  assert.equal(parseChannelUrl('https://youtube.com/user/Example').ref, 'user:example');
  assert.equal(parseChannelUrl('youtube.com/@example').url, 'https://www.youtube.com/@example');
});

test('rejects arbitrary hosts, credentials, ports, video URLs and unsupported channel paths', () => {
  for (const url of ['https://youtube.com.evil.test/@example', 'https://user:pass@youtube.com/@example', 'http://127.0.0.1/@example', 'https://youtube.com:444/@example', 'javascript:alert(1)', 'https://youtu.be/abcdefghijk', 'https://youtube.com/watch?v=abcdefghijk', 'https://youtube.com/c/Example', 'https://youtube.com/channel/notvalid', 'https://youtube.com/@example/extra/streams', 'https://youtube.com/@ex%2Fample']) assert.equal(parseChannelUrl(url), null, url);
});

test('only actual public embeddable lives from the selected channel are returned', () => {
  assert.equal(parseLiveVideos([live(), live()], channelId).length, 1);
  assert.deepEqual(parseLiveVideos([
    live({ snippet: { title: '予定', channelId, liveBroadcastContent: 'upcoming' } }),
    live({ liveStreamingDetails: { actualStartTime: '2026-11-06T00:00:00Z', actualEndTime: '2026-11-06T01:00:00Z' } }),
    live({ status: { embeddable: false, privacyStatus: 'public' } }),
    live({ status: { embeddable: true, privacyStatus: 'private' } }),
    live({ liveStreamingDetails: {} }),
    live({ id: '../../bad' }), null,
  ], channelId), []);
  assert.deepEqual(parseLiveVideos([live()], 'UC' + 'b'.repeat(22)), []);
});

test('notifications exclude stale, failed, disabled, dismissed and duplicate lives', () => {
  const now = Date.parse('2026-11-06T02:00:00Z');
  const row = { id: 'one', enabled: true, last_error: false, last_checked_at: new Date(now - 1000).toISOString(), live_videos: parseLiveVideos([live()], channelId), channel_title: 'チャンネル' };
  assert.equal(channelNotifications([row, { ...row, id: 'two' }], new Set(), now).length, 1);
  assert.deepEqual(channelNotifications([row], new Set([id]), now), []);
  assert.deepEqual(channelNotifications([{ ...row, live_videos: [null, { youtubeVideoId: id }] }], new Set(), now), []);
  for (const changes of [{ enabled: false }, { last_error: true }, { last_checked_at: null }, { last_checked_at: 'invalid' }, { last_checked_at: new Date(now - CHANNEL_CHECK_MS).toISOString() }]) assert.deepEqual(channelNotifications([{ ...row, ...changes }], new Set(), now), []);
});

test('official API requests use fixed hosts, live filters, key header, and revalidate playback', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const u = new URL(url); calls.push({ u, options });
    if (u.pathname.endsWith('/channels')) return Response.json({ items: [{ id: channelId, snippet: { title: 'チャンネル' } }] });
    if (u.pathname.endsWith('/search')) return Response.json({ items: [{ id: { videoId: id } }] });
    return Response.json({ items: [live()] });
  };
  try {
    assert.equal((await resolveChannel('@example', 'test-key')).id, channelId);
    assert.equal((await findChannelLives(channelId, 'test-key'))[0].youtubeVideoId, id);
    assert.equal((await verifyLiveVideo(id, channelId, 'test-key')).youtubeVideoId, id);
    assert.equal(calls[1].u.searchParams.get('eventType'), 'live');
    assert.equal(calls[1].u.searchParams.get('channelId'), channelId);
    assert.equal(calls[1].u.searchParams.get('videoEmbeddable'), 'true');
    for (const { u, options } of calls) { assert.equal(u.origin, 'https://www.googleapis.com'); assert.equal(u.searchParams.has('key'), false); assert.equal(options.headers['X-Goog-Api-Key'], 'test-key'); assert.equal(options.cache, 'no-store'); }
    globalThis.fetch = async () => Response.json({ items: [] });
    assert.equal(await verifyLiveVideo(id, channelId, 'test-key'), null);
    assert.deepEqual(await findChannelLives(channelId, 'test-key'), []);
  } finally { globalThis.fetch = original; }
});

test('upstream failures and malformed results are errors, not proof of no live', async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [new Response('', { status: 403 }), Response.json({ error: 'quota' }), Response.json({ items: 'invalid' })]) {
      globalThis.fetch = async () => response;
      await assert.rejects(findChannelLives(channelId, 'test-key'));
    }
  } finally { globalThis.fetch = original; }
});

test('checks only when visible and removes timers/listeners when leaving the workspace', () => {
  const page = new EventTarget(); page.visibilityState = 'hidden';
  const window = new EventTarget();
  let tick, checks = 0, cleared = false;
  const stop = startVisibleChannelChecks(() => checks++, { page, window, setInterval(fn, delay) { assert.equal(delay, 60_000); tick=fn; return 1; }, clearInterval(id) { assert.equal(id, 1); cleared=true; } });
  tick(); window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('online'));
  assert.equal(checks, 0);
  page.visibilityState = 'visible'; page.dispatchEvent(new Event('visibilitychange')); assert.equal(checks, 1);
  window.dispatchEvent(new Event('focus')); tick(); assert.equal(checks, 3);
  page.visibilityState = 'hidden'; page.dispatchEvent(new Event('visibilitychange')); tick(); assert.equal(checks, 3);
  stop(); assert.equal(cleared, true);
  page.visibilityState = 'visible'; page.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); tick(); assert.equal(checks, 3);
});
