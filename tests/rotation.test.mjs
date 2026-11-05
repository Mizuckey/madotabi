import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextVideoIndex, startRotationTimer } from '../src/lib/rotation.ts';

function clock(t) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  let elapsed = 0;
  return { now: () => elapsed, advance(ms) { elapsed += ms; t.mock.timers.tick(ms); } };
}

test('最後から先頭・先頭から最後へ循環する。0件/1件でも壊れない', () => {
  assert.equal(nextVideoIndex(4,5),0);
  assert.equal(nextVideoIndex(0,5,-1),4);
  assert.equal(nextVideoIndex(2,5),3);
  assert.equal(nextVideoIndex(0,1),0);
  assert.equal(nextVideoIndex(0,0),0);
});

test('指定時間より早く進まず、期限で一度だけ進む', t => {
  const c=clock(t); let advanced=0; const remaining=[];
  startRotationTimer({delayMs:30000, now:c.now, onRemaining:n=>remaining.push(n),onAdvance:()=>advanced++});
  c.advance(1000); assert.equal(remaining.at(-1),29000);
  c.advance(28999); assert.equal(advanced,0);
  c.advance(1); assert.equal(advanced,1); assert.equal(remaining.at(-1),0);
  c.advance(90000); assert.equal(advanced,1);
});

test('停止中は進まず、残り時間から再開できる',t=>{
  const c=clock(t);let advanced=0;
  const options={now:c.now,onRemaining:()=>{},onAdvance:()=>advanced++};
  const first=startRotationTimer({...options,delayMs:30000});
  c.advance(11000);const remaining=first.remaining();first.cancel();
  assert.equal(remaining,19000);
  c.advance(120000);assert.equal(advanced,0);
  startRotationTimer({...options,delayMs:remaining});
  c.advance(18999);assert.equal(advanced,0);
  c.advance(1);assert.equal(advanced,1);
});

test('手動切替/間隔変更時に古い予約を解除し、新しい時間を使う',t=>{
  const c=clock(t);let oldAdvance=0;let newAdvance=0;
  const first=startRotationTimer({delayMs:30000,now:c.now,onRemaining:()=>{},onAdvance:()=>oldAdvance++});
  c.advance(29000);first.cancel();
  startRotationTimer({delayMs:60000,now:c.now,onRemaining:()=>{},onAdvance:()=>newAdvance++});
  c.advance(1000);assert.equal(oldAdvance,0);assert.equal(newAdvance,0);
  c.advance(58999);assert.equal(newAdvance,0);
  c.advance(1);assert.equal(newAdvance,1);
});

test('画面離脱/Strict Modeの再マウントで古いタイマーを残さない',t=>{
  const c=clock(t);let tick=0;let advanced=0;
  const options={delayMs:30000,now:c.now,onRemaining:()=>tick++,onAdvance:()=>advanced++};
  const disposed=startRotationTimer(options);disposed.cancel();disposed.cancel();
  const active=startRotationTimer(options);
  c.advance(30000);assert.equal(advanced,1);
  active.cancel();const ticks=tick;c.advance(120000);assert.equal(tick,ticks);assert.equal(advanced,1);
});

test('残り時間は負にならず、遅延で複数動画を飛ばさない',t=>{
  const c=clock(t);let advanced=0;
  const timer=startRotationTimer({delayMs:30000,now:c.now,onRemaining:()=>{},onAdvance:()=>advanced++});
  c.advance(120000);assert.equal(timer.remaining(),0);assert.equal(advanced,1);
});

test('不正な時間は予約しない',()=>{
  for(const delayMs of [-1,NaN,Infinity])assert.throws(()=>startRotationTimer({delayMs,onRemaining:()=>{},onAdvance:()=>{}}));
});
