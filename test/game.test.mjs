import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matches,points,videoId,makeRoom,selection,prepare,snapshot,titleHint} from '../game.mjs';
test('hints preserve spaces and reveal one distinct random position each ten seconds',()=>{
 const r=makeRoom('Host',1);r.songs[r.host]={owner:r.host,title:'Álom  éj!',video:'dQw4w9WgXcQ',start:0};prepare(r);r.phase='playing';r.started=1000;
 assert.equal(titleHint(r,10999),'____  __!');
 for(let step=1;step<=4;step++){const hint=titleHint(r,1000+step*10000);assert.equal(Array.from(hint).filter(c=>/\p{L}/u.test(c)).length,step);assert.equal(hint.slice(4,6),'  ');assert.equal(hint.at(-1),'!');assert.equal(titleHint(r,1000+step*10000),hint);}
 assert.equal(new Set(r.queue[0].hintOrder).size,6);r.phase='reveal';assert.equal(titleHint(r),'Álom  éj!');
 selection(r);assert.equal(titleHint(r),null);
});
test('answers tolerate accents and one typo, but reject short near matches',()=>{assert.ok(matches('Álom!',['alom']));assert.ok(matches('Bohemain Rhapsody',['Bohemain Rhapsody']));assert.ok(matches('Wonderwal',['Wonderwall']));assert.equal(matches('Hey',['Help']),false);assert.equal(matches('',['Hello']),false);});
test('scoring is bounded and decreases with time',()=>{assert.equal(points(0),1000);assert.equal(points(45000),100);assert.equal(points(22500),550);assert.equal(points(-1000),1000);});
test('video parser restricts hosts',()=>{assert.equal(videoId('https://youtu.be/dQw4w9WgXcQ?t=10'),'dQw4w9WgXcQ');assert.equal(videoId('https://youtube.com/watch?v=dQw4w9WgXcQ'),'dQw4w9WgXcQ');assert.equal(videoId('https://evil.test/watch?v=dQw4w9WgXcQ'),null);});
test('round state supports infinity and hides secrets from other players',()=>{const r=makeRoom('Host',0),guest=makeRoom('Guest',0).players[0];r.players.push(guest);selection(r);assert.equal(r.round,1);r.songs[r.host]={owner:r.host,video:'dQw4w9WgXcQ',title:'Secret',aliases:['Secret'],start:45};prepare(r);const view=snapshot(r,guest);assert.equal(view.rounds,0);assert.equal(view.playback,null); assert.equal(view.hint,'______');assert.equal(view.answer,null);assert.equal(JSON.stringify(view).includes('Secret'),false);assert.equal(JSON.stringify(view).includes(r.players[0].token),false);selection(r);assert.equal(r.round,2);});


