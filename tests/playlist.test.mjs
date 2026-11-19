import test from 'node:test';
import assert from 'node:assert/strict';
import { combinePlaylist } from '../src/lib/playlist.ts';
import { canPlayScenery } from '../src/lib/daylight.ts';

const scenery = { id: 'saved', youtubeVideoId: 'abcdefghijk', title: '登録した景色', nightView: false };
const live = { id: 'live:lmnopqrstuv', youtubeVideoId: 'lmnopqrstuv', title: '配信中ライブ' };

test('チャンネルのライブは景色の末尾に追加し、所在地がなくても再生できる', () => {
  const videos = combinePlaylist([scenery], [live]);
  assert.deepEqual(videos.map(video => video.id), ['saved', 'live:lmnopqrstuv']);
  assert.equal(canPlayScenery(videos[0], {}, Date.now()), false);
  assert.equal(canPlayScenery(videos[1], {}, Date.now()), true);
});
test('同じYouTube動画は重複せず、登録済みの景色情報と夜景設定を優先する', () => {
  const videos = combinePlaylist([scenery], [{ ...live, youtubeVideoId: scenery.youtubeVideoId }, live, live]);
  assert.equal(videos.length, 2);
  assert.equal(videos[0], scenery);
  assert.equal(scenery.channelLive, undefined);
});
test('配信がなくなればチャンネルの動画だけが再生リストから外れる', () => {
  assert.deepEqual(combinePlaylist([scenery], []), [scenery]);
  assert.deepEqual(combinePlaylist([], [live]), [{ ...live, channelLive: true }]);
});
