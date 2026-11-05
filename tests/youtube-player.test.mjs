import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildYouTubeEmbedUrl,youtubePlayerError} from '../src/lib/youtube-player.ts';

test('再生元を明示したプライバシー強化モードの埋め込みURL',()=>{
 const url=new URL(buildYouTubeEmbedUrl('abCDE12_-xy','https://madotabi.vercel.app'));
 assert.equal(url.origin,'https://www.youtube-nocookie.com');
 assert.equal(url.pathname,'/embed/abCDE12_-xy');
 assert.equal(url.searchParams.get('origin'),'https://madotabi.vercel.app');
 assert.equal(url.searchParams.get('enablejsapi'),'1');
 assert.equal(url.searchParams.get('autoplay'),'0'); // ミュートしてからAPIで再生する
 assert.equal(url.searchParams.get('controls'),'1');
 assert.equal(url.searchParams.get('playsinline'),'1');
});
test('不正ID・不正な再生元は拒否',()=>{
 for(const id of ['bad','../watch?v=x','<script>'])assert.throws(()=>buildYouTubeEmbedUrl(id,'https://madotabi.vercel.app'));
 for(const origin of ['javascript:alert(1)','https://example.com/path','https://user:pass@example.com'])assert.throws(()=>buildYouTubeEmbedUrl('abCDE12_-xy',origin));
});
test('埋め込み禁止・非公開・再生元エラーは異なる案内',()=>{
 assert.match(youtubePlayerError(100),/非公開/);
 assert.match(youtubePlayerError(101),/埋め込み/);
 assert.equal(youtubePlayerError(101),youtubePlayerError(150));
 assert.match(youtubePlayerError(153),/再生元/);
 assert.match(youtubePlayerError(999),/再生できません/);
});
