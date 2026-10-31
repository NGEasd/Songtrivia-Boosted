import { randomUUID, randomInt } from 'node:crypto';
export const normalize = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function matches(answer, aliases) {
 const a=normalize(answer); if(!a)return false;
 return aliases.some(raw=>{const b=normalize(raw);if(a===b)return true;if(b.length<6||Math.abs(a.length-b.length)>1)return false;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=row;}return prev[b.length]<=1;});
}
export function videoId(value){try{const u=new URL(value);if(u.protocol!=='https:'&&u.protocol!=='http:')return null;const h=u.hostname.replace(/^www\./,'');const id=h==='youtu.be'?u.pathname.slice(1).split('/')[0]:['youtube.com','m.youtube.com','music.youtube.com'].includes(h)?(u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1]):null;return /^[\w-]{11}$/.test(id||'')?id:null;}catch{return /^[\w-]{11}$/.test(value)?value:null;}}
export const points = elapsed => Math.round(100+900*Math.max(0,Math.min(1,1-elapsed/45000)));
export function makeRoom(name, rounds){const p={id:randomUUID(),token:randomUUID(),name,score:0,roundScore:0};return {code:String(randomInt(100000,1000000)),host:p.id,players:[p],rounds,round:0,phase:'lobby',songs:{},queue:[],index:0,solved:{},revision:0};}
export function selection(r){r.round++;r.phase='select';r.songs={};r.queue=[];r.solved={};for(const p of r.players)p.roundScore=0;}
export function prepare(r){r.queue=Object.values(r.songs).map(song=>{const order=Array.from(song.title.normalize('NFC')).flatMap((c,i)=>/[\p{L}\p{N}]/u.test(c)?[i]:[]);for(let i=order.length-1;i>0;i--){const j=randomInt(i+1);[order[i],order[j]]=[order[j],order[i]];}return {...song,hintOrder:order};});for(let i=r.queue.length-1;i>0;i--){const j=randomInt(i+1);[r.queue[i],r.queue[j]]=[r.queue[j],r.queue[i]];}r.index=0;r.solved={};r.phase='ready';}
export function titleHint(r,now=Date.now()){const song=r.queue[r.index];if(!song||!['ready','playing','reveal'].includes(r.phase))return null;const count=r.phase==='playing'?Math.min(4,Math.floor(Math.max(0,now-r.started)/10000)):0;const revealed=new Set((song.hintOrder||[]).slice(0,count));return Array.from(song.title.normalize('NFC')).map((c,i)=>r.phase==='reveal'||!/[\p{L}\p{N}]/u.test(c)||revealed.has(i)?c:'_').join('');}
export function snapshot(r,p){const song=r.queue[r.index];return {code:r.code,host:r.host,me:p.id,phase:r.phase,round:r.round,rounds:r.rounds,index:r.index,total:r.queue.length,started:r.started,now:Date.now(),hint:titleHint(r),players:r.players.map(x=>({id:x.id,name:x.name,score:x.score,roundScore:x.roundScore,submitted:!!r.songs[x.id],preparing:!!x.preparing,solved:!!r.solved[x.id]})),ownSong:r.phase==='select'&&r.songs[p.id]?{title:r.songs[p.id].title}:null,isOwn:song?.owner===p.id,answer:r.phase==='reveal'?song?.title:null,owner:r.phase==='reveal'?r.players.find(x=>x.id===song?.owner)?.name:null,playback:song&&['ready','playing'].includes(r.phase)&&(p.id===r.host||r.phase==='playing')?{audioId:song.audioId}:null};}


// Each successful guess rewards the selector once, regardless of guess speed.
export const SELECTOR_POINTS = 200;
export function rewardSelector(r) {
 const owner=r.players.find(p=>p.id===r.queue[r.index].owner);
 if(owner){owner.score+=SELECTOR_POINTS;owner.roundScore+=SELECTOR_POINTS;}
}
export function removePlayer(r,id) {
 const removed=r.players.find(p=>p.id===id);
 if(!removed||id===r.host)throw Error('Ez a játékos nem távolítható el.');
 r.players=r.players.filter(p=>p.id!==id);
 const clips=new Set();
 if(r.songs[id])clips.add(r.songs[id].audioId);
 delete r.songs[id];
 const current=r.queue[r.index];
 const keepCurrent=['playing','reveal'].includes(r.phase);
 r.queue=r.queue.filter((song,i)=>{
  if(i<r.index||song.owner!==id||(i===r.index&&keepCurrent))return true;
  clips.add(song.audioId);return false;
 });
 if(current&&keepCurrent)clips.delete(current.audioId);
 if(r.players.length<2&&!['lobby','finished'].includes(r.phase))r.phase='round';
 else if(r.phase==='select'&&r.players.every(p=>r.songs[p.id]))prepare(r);
 else if(r.phase==='ready'&&r.index>=r.queue.length)r.phase='round';
 else if(r.phase==='playing'&&r.players.every(p=>p.id===current.owner||r.solved[p.id]))r.phase='reveal';
 return [...clips].filter(Boolean);
}
