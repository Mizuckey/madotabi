import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYouTubeUrl } from '../src/lib/youtube.ts';

// 架空IDはパーサーの形式検証専用。配信データとして登録しない。
const id = 'abCDE12_-xy';
for (const url of [
  `https://www.youtube.com/watch?v=${id}&t=20&list=ignored`,
  `https://youtu.be/${id}?si=tracking`,
  `https://youtube.com/live/${id}?feature=share`,
  `https://m.youtube.com/watch?v=${id}`,
  `https://youtube.com/shorts/${id}`,
  `https://youtube.com/embed/${id}`,
  `  youtu.be/${id}  `,
]) {
  test(`対応URLを正規化: ${url}`, () => {
    assert.deepEqual(parseYouTubeUrl(url), {videoId:id,canonicalUrl:`https://www.youtube.com/watch?v=${id}`});
  });
}
for (const url of [
  '', 'not a url', 'javascript:alert(1)',
  `https://youtube.com.evil.example/watch?v=${id}`,
  `https://www.youtube.com@evil.example/watch?v=${id}`,
  `https://user:pass@youtube.com/watch?v=${id}`,
  `https://youtube.com:8080/watch?v=${id}`,
  `https://youtube.com/watch?v=${id}&v=other-id`,
  'https://youtube.com/playlist?list=test',
  'https://youtube.com/watch?v=short',
  `https://youtu.be/${id}/extra`,
  `https://youtube.com/watch?v=${id}X`,
  'x'.repeat(2049),
]) {
  test(`不正URLを拒否: ${url.slice(0,90)}`, () => assert.equal(parseYouTubeUrl(url), null));
}
