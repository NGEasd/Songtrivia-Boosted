import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
test('two players complete a round, infinite mode continues, results persist',async()=>{
 const cwd=await mkdtemp(join(tmpdir(),'songtrivia-test-'));
 const child=spawn(process.execPath,['--experimental-loader',new URL('./fixtures/audio-loader.mjs',import.meta.url).href,fileURLToPath(new URL('../server.mjs',import.meta.url))],{cwd,env:{...process.env,PORT:'3199',YOUTUBE_API_KEY:''},stdio:['ignore','pipe','pipe']});
 try{
 await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(Error('Server exited '+code)));});
 const call=async(action,data={},expected=200)=>{const response=await fetch('http://localhost:3199/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data})});const body=await response.json();assert.equal(response.status,expected,JSON.stringify(body));return body;};
 const host=await call('create',{name:'Host',rounds:0}),guest=await call('join',{name:'Guest',room:host.room});
 const h={room:host.room,token:host.token},g={room:guest.room,token:guest.token};
 const extra=await call('join',{name:'Extra',room:host.room});
 await call('kick',{...g,playerId:extra.state.me},403);
 await call('kick',{...h,playerId:host.state.me},400);
 await call('start',g,403);await call('start',h);
 await call('kick',{...h,playerId:extra.state.me});
 await call('resume',{room:host.room,token:extra.token},404);
 for(let round=1;round<=2;round++){
 await call('submit',{...h,video:'dQw4w9WgXcQ',title:'Host song',start:30});
 const ready=await call('submit',{...g,video:'dQw4w9WgXcQ',title:'Guest song',start:20});assert.equal(ready.state.phase,'ready');assert.equal(ready.state.playback,null); assert.ok(ready.state.hint.includes(' '));
 const hostView=(await call('resume',h)).state;assert.equal(hostView.ownSong,null);assert.equal(hostView.answer,null);assert.equal(JSON.stringify(hostView).includes('dQw4w9WgXcQ'),false);assert.equal(JSON.stringify(hostView).includes('Guest song'),false);
 const clip=hostView.playback.audioId;const mediaUrl=credentials=>`http://localhost:3199/audio/${clip}?${new URLSearchParams(credentials)}`;
 assert.equal((await fetch(mediaUrl(g))).status,403);
 assert.equal((await fetch(mediaUrl({...h,token:'wrong'}))).status,404);
 const range=await fetch(mediaUrl(h),{headers:{Range:'bytes=0-9'}});assert.equal(range.status,206);assert.equal(range.headers.get('content-type'),'audio/mpeg');assert.equal((await range.arrayBuffer()).byteLength,10);
 assert.equal((await fetch(mediaUrl(h),{headers:{Range:'bytes=9000-'}})).status,416);
 for(let i=0;i<2;i++){
 const playing=await call('play',h);const own=playing.state.isOwn;await call('guess',{...(own?h:g),answer:'Host song'},400);
 const before=(await call('resume',own?h:g)).state.players.find(p=>p.id===(own?host.state.me:guest.state.me)).score;
 const correct=await call('guess',{...(own?g:h),answer:own?'Host song':'Guest song'});assert.equal(correct.correct,true);
 const after=(await call('resume',h)).state.players.find(p=>p.id===(own?host.state.me:guest.state.me)).score;assert.equal(after-before,200);
 await call('guess',{...(own?g:h),answer:own?'Host song':'Guest song'},400);
 const next=await call('next',h);assert.equal(next.state.phase,i===1?'round':'ready');
 }
 if(round===1){const next=await call('round',h);assert.equal(next.state.round,2);assert.equal(next.state.phase,'select');}
 }
 const final=await call('finish',h);assert.equal(final.state.phase,'finished');const saved=JSON.parse(await readFile(join(cwd,'data/results.json'),'utf8'));assert.equal(saved.length,1);assert.equal(saved[0].rounds,2);assert.ok(saved[0].players.every(p=>p.score>0));
 const fresh=await call('create',{name:'Race host',rounds:1});const fh={room:fresh.room,token:fresh.token};
 const second=await call('join',{name:'Second',room:fresh.room});const sh={room:fresh.room,token:second.token};
 const slow=await call('join',{name:'Slow',room:fresh.room});const sl={room:fresh.room,token:slow.token};
 await call('start',fh);await call('submit',{...fh,video:'dQw4w9WgXcQ',title:'One',start:0});await call('submit',{...sh,video:'dQw4w9WgXcQ',title:'Two',start:0});
 const pending=call('submit',{...sl,video:'aaaaaaaaaaa',title:'Removed song',start:0},422);
 for(let i=0;i<50;i++){const view=(await call('resume',fh)).state;if(view.players.find(p=>p.id===slow.state.me)?.preparing)break;await new Promise(resolve=>setTimeout(resolve,5));}
 const kicked=await call('kick',{...fh,playerId:slow.state.me});assert.equal(kicked.state.phase,'ready');
 await pending;const stable=(await call('resume',fh)).state;assert.equal(stable.total,2);assert.equal(stable.phase,'ready');
 }finally{child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));await rm(cwd,{recursive:true,force:true});}
});



