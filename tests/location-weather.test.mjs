import {test} from 'node:test';
import assert from 'node:assert/strict';
import {locationQueryFromTitle,locationSearchTerms,parseLocations,locationFromRow,locationColumns,validCoordinates} from '../src/lib/location.ts';
import {weatherUrl,weatherLabel,parseWeather,loadWeather} from '../src/lib/weather.ts';

test('タイトルの地名を残し、ライブ・解像度などを検索語から外す',()=>{
 assert.equal(locationQueryFromTitle('【LIVE・4K】札幌すすきの ライブカメラ'),'札幌すすきの');
 assert.equal(locationQueryFromTitle('【札幌】ライブカメラ'),'札幌');
 assert.equal(locationQueryFromTitle('渋谷スクランブル交差点 | Tokyo Live Camera'),'渋谷スクランブル交差点');
});
test('長い地名は段階的に検索し、都道府県指定は維持する',()=>{
 assert.deepEqual(locationSearchTerms('渋谷スクランブル交差点'),['渋谷スクランブル交差点','渋谷']);
 assert.deepEqual(locationSearchTerms('北海道札幌市すすきの'),['札幌市, 北海道','札幌, 北海道']);
 assert.deepEqual(locationSearchTerms('京都府京都市'),['京都市, 京都府','京都, 京都府']);
 assert.deepEqual(locationSearchTerms('渋谷, 東京都'),['渋谷, 東京都']);
 assert.deepEqual(locationSearchTerms('a'),[]);
});
test('地点検索は日本の有効な候補だけを重複なく返す',()=>{
 const candidate={country_code:'JP',name:'渋谷',admin1:'東京都',latitude:35.6589,longitude:139.70665};
 assert.deepEqual(parseLocations({results:[candidate,candidate,{...candidate,country_code:'US'},{...candidate,latitude:NaN},{...candidate,longitude:181}]}),[{name:'東京都 / 渋谷',latitude:35.6589,longitude:139.70665}]);
 assert.deepEqual(parseLocations({}),[]);
 assert.throws(()=>parseLocations({results:'bad'}));
});
test('座標なし・不完全な位置を実在地点として扱わず、解除は3列をnullにする',()=>{
 assert.equal(locationFromRow({location_name:'場所',latitude:35,longitude:null}),null);
 assert.equal(locationFromRow({}),null);
 assert.equal(validCoordinates(Infinity,139),false);
 assert.deepEqual(locationColumns(null),{location_name:null,latitude:null,longitude:null});
 assert.deepEqual(locationFromRow({location_name:'東京都 / 渋谷',latitude:35,longitude:139}),{name:'東京都 / 渋谷',latitude:35,longitude:139});
});
test('天気取得は選択した座標・摂氏・日本時間を指定する',()=>{
 const url=new URL(weatherUrl(35.6589,139.70665));
 assert.equal(url.origin,'https://api.open-meteo.com');
 assert.equal(url.searchParams.get('latitude'),'35.6589');
 assert.equal(url.searchParams.get('current'),'temperature_2m,weather_code');
 assert.equal(url.searchParams.get('timezone'),'Asia/Tokyo');
 assert.throws(()=>weatherUrl(91,139));
});
test('気温nullや不正単位を0度と誤表示せず、未知の天気コードを区別する',()=>{
 const body={current_units:{temperature_2m:'°C'},current:{temperature_2m:12.3,weather_code:61,time:'2026-11-05T14:15'}};
 assert.equal(parseWeather(body).temperature,12.3);
 assert.throws(()=>parseWeather({...body,current:{...body.current,temperature_2m:null}}));
 assert.throws(()=>parseWeather({...body,current_units:{temperature_2m:'°F'}}));
 assert.equal(weatherLabel(61),'雨');assert.equal(weatherLabel(97),'雷雨');assert.equal(weatherLabel(999),'天気不明');
});
test('同じ地点の並行取得を共有し、動画切替で再訪してもキャッシュを使う',async t=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;await Promise.resolve();return {ok:true,json:async()=>({current_units:{temperature_2m:'°C'},current:{temperature_2m:15,weather_code:0,time:'2026-11-05T14:15'}})}});
 const [first,second]=await Promise.all([loadWeather(34.1111,135.2222),loadWeather(34.1111,135.2222)]);
 assert.equal(calls,1);assert.equal(first,second);
 assert.equal(await loadWeather(34.1111,135.2222),first);assert.equal(calls,1);
 await loadWeather(34.1111,135.2222,true);assert.equal(calls,2);
});

test('期限切れの天気は再取得し、取得失敗をキャッシュしない',async t=>{
 let now=1000000,calls=0;
 t.mock.method(Date,'now',()=>now);
 t.mock.method(globalThis,'fetch',async()=>{calls++;if(calls===1)throw new Error('offline');return {ok:true,json:async()=>({current_units:{temperature_2m:'°C'},current:{temperature_2m:18,weather_code:3,time:'2026-11-05T15:00'}})}});
 await assert.rejects(loadWeather(33.1111,134.2222));
 await loadWeather(33.1111,134.2222);assert.equal(calls,2);
 now+=16*60*1000;
 await loadWeather(33.1111,134.2222);assert.equal(calls,3);
});
