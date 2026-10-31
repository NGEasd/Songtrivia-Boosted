import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeRoom,selection,prepare,removePlayer,rewardSelector} from '../game.mjs';

function room(){const r=makeRoom('Host',0);r.players.push(makeRoom('A',1).players[0],makeRoom('B',1).players[0]);selection(r);return r;}
function song(p){return {owner:p.id,title:'Test song',audioId:p.id,aliases:['Test song']};}
test('selector earns 200 per solver in total and round scores',()=>{
 const r=room();r.queue=[song(r.players[0])];rewardSelector(r);rewardSelector(r);
 assert.equal(r.players[0].score,400);assert.equal(r.players[0].roundScore,400);
 selection(r);assert.equal(r.players[0].roundScore,0);assert.equal(r.players[0].score,400);
});
test('removing missing submission unblocks selection, host cannot be removed',()=>{
 const r=room();for(const p of r.players.slice(0,2))r.songs[p.id]=song(p);
 assert.throws(()=>removePlayer(r,r.host));removePlayer(r,r.players[2].id);
 assert.equal(r.phase,'ready');assert.equal(r.queue.length,2);
});
test('removing current ready song advances without skipping the next song',()=>{
 const r=room();r.queue=[song(r.players[1]),song(r.players[0]),song(r.players[2])];r.phase='ready';
 const clips=removePlayer(r,r.players[1].id);assert.equal(clips.length,1);
 assert.equal(r.queue[r.index].owner,r.host);assert.equal(r.phase,'ready');
});
test('active song survives owner removal; missing solver no longer blocks reveal',()=>{
 const r=room();const [host,a,b]=r.players;r.queue=[song(a),song(b)];r.songs[a.id]=song(a);r.phase='playing';r.solved[host.id]=900;
 assert.deepEqual(removePlayer(r,a.id),[]);assert.equal(r.phase,'playing');
 r.solved[b.id]=800;rewardSelector(r);assert.equal(a.score,0);
 const other=room();other.queue=[song(other.players[0])];other.phase='playing';other.solved[other.players[1].id]=500;
 removePlayer(other,other.players[2].id);assert.equal(other.phase,'reveal');
});
test('one remaining player can finish the round',()=>{
 const r=room();removePlayer(r,r.players[2].id);removePlayer(r,r.players[1].id);assert.equal(r.phase,'round');
});
