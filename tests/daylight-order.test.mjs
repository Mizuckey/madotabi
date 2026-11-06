import test from 'node:test';
import assert from 'node:assert/strict';
import { japanDate, nextJapanMidnight, parseSolarDays, solarUrl, canPlayScenery, nextSolarBoundary, loadSolarDays } from '../src/lib/daylight.ts';
import { reorderScenery } from '../src/lib/scenery-order.ts';
import { nextPlayableIndex } from '../src/lib/rotation.ts';

const now = Date.parse('2026-11-06T12:00:00+09:00');
const sunrise = Date.parse('2026-11-06T06:00:00+09:00');
const sunset = Date.parse('2026-11-06T17:00:00+09:00');
const day = {date:'2026-11-06',sunrise,sunset};
const video = {id:'a',title:'Daytime',youtubeVideoId:'abcdefghijk',location:{name:'Tokyo',latitude:35,longitude:139},nightView:false};
const readings = {'35,139':{days:[day],error:false}};

test('Japan date and midnight are independent of the browser timezone',()=>{
 assert.equal(japanDate(Date.parse('2026-11-05T15:00:00Z')),'2026-11-06');
 assert.equal(nextJapanMidnight(now),Date.parse('2026-11-07T00:00:00+09:00'));
});
test('sunrise is inclusive, sunset exclusive, stale dates and missing locations are excluded',()=>{
 assert.equal(canPlayScenery(video,readings,sunrise-1),false);
 assert.equal(canPlayScenery(video,readings,sunrise),true);
 assert.equal(canPlayScenery(video,readings,sunset-1),true);
 assert.equal(canPlayScenery(video,readings,sunset),false);
 assert.equal(canPlayScenery(video,readings,now+86400000),false);
 assert.equal(canPlayScenery({...video,location:null},readings,now),false);
 assert.equal(canPlayScenery(video,{},now),false);
 assert.equal(canPlayScenery(video,{'35,139':{days:[day],error:true}},now),false);
});
test('night ON bypasses location/solar requirements and tomorrow sunrise resumes daytime entries',()=>{
 assert.equal(canPlayScenery({...video,nightView:true,location:null},{},sunset),true);
 const tomorrow={date:'2026-11-07',sunrise:sunrise+86400000,sunset:sunset+86400000};
 const data={'35,139':{days:[day,tomorrow],error:false}};
 assert.equal(canPlayScenery(video,data,tomorrow.sunrise-1),false);
 assert.equal(canPlayScenery(video,data,tomorrow.sunrise),true);
});
test('solar response uses real unix instants and rejects null/mismatched dates',()=>{
 const body={daily:{time:[Date.parse('2026-11-06T00:00:00+09:00')/1000],sunrise:[sunrise/1000],sunset:[sunset/1000]}};
 assert.deepEqual(parseSolarDays(body),[day]);
 assert.throws(()=>parseSolarDays({daily:{...body.daily,sunset:[null]}}));
 assert.throws(()=>parseSolarDays({daily:{...body.daily,sunset:[sunrise/1000]}}));
 assert.throws(()=>parseSolarDays({daily:{...body.daily,sunrise:[(sunrise-86400000)/1000]}}));
 const url=new URL(solarUrl(35,139));assert.equal(url.searchParams.get('daily'),'sunrise,sunset');assert.equal(url.searchParams.get('timeformat'),'unixtime');assert.equal(url.searchParams.get('timezone'),'Asia/Tokyo');
 assert.throws(()=>solarUrl(91,139));
});
test('next change is scheduled at the exact sunset and never as a negative delay',()=>{
 assert.equal(nextSolarBoundary(readings,sunset-500),sunset);
 assert.equal(nextSolarBoundary(readings,sunset),sunset+60000);
});
test('sunrise/sunset requests are shared and refetched at Japanese midnight',async t=>{
 let clock=now,calls=0;
 t.mock.method(Date,'now',()=>clock);
 t.mock.method(globalThis,'fetch',async()=>{calls++;const shift=clock>=nextJapanMidnight(now)?86400000:0;return Response.json({daily:{time:[Date.parse('2026-11-06T00:00:00+09:00')/1000+shift/1000],sunrise:[(sunrise+shift)/1000],sunset:[(sunset+shift)/1000]}})});
 await Promise.all([loadSolarDays(35.00001,139),loadSolarDays(35.00001,139)]);assert.equal(calls,1);
 await loadSolarDays(35.00001,139);assert.equal(calls,1);
 clock=nextJapanMidnight(now);await loadSolarDays(35.00001,139);assert.equal(calls,2);
});
test('reorder moves upward/downward without mutating input and ignores invalid targets',()=>{
 const ids=['a','b','c'];assert.deepEqual(reorderScenery(ids,'a','c'),['b','c','a']);assert.deepEqual(reorderScenery(ids,'c','a'),['c','a','b']);assert.deepEqual(ids,['a','b','c']);assert.deepEqual(reorderScenery(ids,'a','missing'),ids);
});
test('rotation skips excluded cameras and preserves the selected eligible camera',()=>{
 assert.equal(nextPlayableIndex(0,4,[1,3]),1);
 assert.equal(nextPlayableIndex(3,4,[1,3]),1);
 assert.equal(nextPlayableIndex(1,4,[1,3],-1),3);
 assert.equal(nextPlayableIndex(1,4,[1,3],1,true),1);
 assert.equal(nextPlayableIndex(1,4,[3],1,true),3);
 assert.equal(nextPlayableIndex(3,4,[3]),3);
});

test('failed or stale solar responses do not become playable cached data',async t=>{
 let calls=0;
 t.mock.method(Date,'now',()=>now);
 t.mock.method(globalThis,'fetch',async()=>{calls++;if(calls===1)return new Response('',{status:503});return Response.json({daily:{time:[Date.parse('2026-11-05T00:00:00+09:00')/1000],sunrise:[(sunrise-86400000)/1000],sunset:[(sunset-86400000)/1000]}})});
 await assert.rejects(loadSolarDays(35.00002,139));
 await assert.rejects(loadSolarDays(35.00002,139));
 assert.equal(calls,2);
});
