import {test} from 'node:test';
import assert from 'node:assert/strict';
import {locationQueryFromTitle,locationSearchTerms,parseLocations,locationFromRow,locationColumns,validCoordinates,searchLocations} from '../src/lib/location.ts';
import {weatherUrl,weatherLabel,parseWeather,loadPlaylistWeather} from '../src/lib/weather.ts';

test('タイトルの地名を残し、ライブ・解像度などを検索語から外す',()=>{
 assert.equal(locationQueryFromTitle('【LIVE・4K】札幌すすきの ライブカメラ'),'札幌すすきの');
 assert.equal(locationQueryFromTitle('【札幌】ライブカメラ'),'札幌');
 assert.equal(locationQueryFromTitle('渋谷スクランブル交差点 | Tokyo Live Camera'),'渋谷スクランブル交差点');
});
test('長い地名は段階的に検索し、都道府県指定は維持する',()=>{
 assert.deepEqual(locationSearchTerms('渋谷スクランブル交差点'),['渋谷スクランブル交差点','渋谷','渋谷市','渋谷ス']);
 assert.deepEqual(locationSearchTerms('北海道札幌市すすきの'),['札幌市, 北海道','札幌, 北海道']);
 assert.deepEqual(locationSearchTerms('京都府京都市'),['京都市, 京都府','京都, 京都府']);
 assert.deepEqual(locationSearchTerms('渋谷, 東京都'),['渋谷, 東京都','渋谷市, 東京都']);
 assert.deepEqual(locationSearchTerms('札幌'),['札幌','札幌市']);
 assert.deepEqual(locationSearchTerms('札幌, 北海道'),['札幌, 北海道','札幌市, 北海道']);
 assert.deepEqual(locationSearchTerms('北海道 / 札幌市'),['札幌市, 北海道','札幌, 北海道']);
 assert.deepEqual(locationSearchTerms('a'),[]);
});
test('2文字の地名で空の場合は市を補って検索し、候補を返す',async t=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async url=>{
  const name=new URL(url).searchParams.get('name');calls.push(name);
  return Response.json(name==='札幌市'?{results:[{country_code:'JP',name:'札幌市',admin1:'北海道',latitude:43.061,longitude:141.354}]}:{});
 });
 const result=await searchLocations('札幌',new AbortController().signal);
 assert.deepEqual(calls,['札幌','札幌市']);
 assert.equal(result[0].name,'北海道 / 札幌市');
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
const forecast = temperature => ({
 current_units: {temperature_2m: '°C'},
 current: {temperature_2m: temperature, weather_code: 0, time: '2026-11-17T14:15'},
});

test('複数地点をまとめて取得し、欠損地点だけを再取得する', async t => {
 const coordinates = [[34.1111,135.2222], [35.1111,136.2222]];
 const calls = [];
 const signal = new AbortController().signal;
 t.mock.method(globalThis, 'fetch', async url => {
  calls.push(new URL(url).searchParams.get('latitude'));
  return {ok: true, json: async () => calls.length === 1 ? [forecast(15), forecast(null)] : forecast(17)};
 });
 const first = await loadPlaylistWeather(coordinates, signal);
 assert.equal(first['34.1111,135.2222'].weather.temperature, 15);
 assert.deepEqual(first['35.1111,136.2222'], {weather: null, error: true});
 const second = await loadPlaylistWeather(coordinates, signal);
 assert.equal(second['35.1111,136.2222'].weather.temperature, 17);
 assert.deepEqual(calls, ['34.1111,35.1111', '35.1111']);
});

test('更新に失敗したときは前回値を期限付きで返す', async t => {
 let now = 1000000;
 let calls = 0;
 const coordinates = [[33.1111,134.2222]];
 const signal = new AbortController().signal;
 t.mock.method(Date, 'now', () => now);
 t.mock.method(globalThis, 'fetch', async () => {
  if (++calls === 1) return {ok: true, json: async () => forecast(18)};
  throw new Error('offline');
 });
 const first = await loadPlaylistWeather(coordinates, signal);
 now += 16 * 60_000;
 const stale = await loadPlaylistWeather(coordinates, signal);
 assert.deepEqual(stale['33.1111,134.2222'], {...first['33.1111,134.2222'], error: true});
 now += 44 * 60_000;
 const expired = await loadPlaylistWeather(coordinates, signal);
 assert.deepEqual(expired['33.1111,134.2222'], {weather: null, error: true});
});
