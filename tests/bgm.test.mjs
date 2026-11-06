import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBgmUrl,readBgmSelection,writeBgmSelection} from '../src/lib/bgm.ts';

test('BGM links allow HTTPS services and normalize scheme/host without changing playback parameters',()=>{
 assert.equal(parseBgmUrl(' www.youtube.com/watch?v=abcdefghijk&list=PLtest ').url,'https://www.youtube.com/watch?v=abcdefghijk&list=PLtest');
 assert.equal(parseBgmUrl('https://radiko.jp/#!/live/TEST').url,'https://radiko.jp/#!/live/TEST');
 assert.equal(parseBgmUrl('HTTPS://EXAMPLE.COM/music').suggestedTitle,'example.com');
});
test('unsafe navigation schemes, credentials, relative paths and oversized URLs are rejected',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,test','file:///etc/passwd','ftp://example.com/music','http://example.com/music','https://user:password@example.com/music','//example.com/music','/music','','https://example.com/'+ 'a'.repeat(2050)])assert.equal(parseBgmUrl(url),null,url);
});
test('selection is scoped to the logged-in user, can be cleared and ignores malformed stored IDs',()=>{
 const data=new Map();const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
 const id='11111111-1111-4111-8111-111111111111';
 writeBgmSelection(storage,'user-one',id);assert.equal(readBgmSelection(storage,'user-one'),id);assert.equal(readBgmSelection(storage,'user-two'),null);
 writeBgmSelection(storage,'user-one',null);assert.equal(readBgmSelection(storage,'user-one'),null);
 writeBgmSelection(storage,'user-one','javascript:alert(1)');assert.equal(readBgmSelection(storage,'user-one'),null);
});
test('unavailable session storage does not break link selection',()=>{
 const storage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
 assert.equal(readBgmSelection(storage,'viewer'),null);assert.doesNotThrow(()=>writeBgmSelection(storage,'viewer','id'));assert.doesNotThrow(()=>writeBgmSelection(storage,'viewer',null));
});
