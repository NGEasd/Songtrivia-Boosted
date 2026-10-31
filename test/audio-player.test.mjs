import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAudioController} from '../public/audio-player.js';
test('blocked audio never starts the game clock; successful launch does',async()=>{
 let element;globalThis.Audio=class{constructor(){element=this;this.readyState=1;this.currentTime=0;this.fail=true;}addEventListener(){}load(){}pause(){this.paused=true;}removeAttribute(){}async play(){if(this.fail)throw Object.assign(Error('blocked'),{name:'NotAllowedError'});this.paused=false;}};
 globalThis.document={querySelector:()=>null};
 const state={phase:'ready',me:'host',host:'host',playback:{audioId:'anonymous'}};let starts=0,notice='';
 const controller=createAudioController({getState:()=>state,getSession:()=>({room:'123',token:'secret'}),now:()=>1000,api:async()=>{starts++;state.phase='playing';state.started=1000;},notify:text=>notice=text});
 await controller.launch();assert.equal(starts,0);assert.match(notice,/érintsd/);assert.ok(element.src.startsWith('/audio/anonymous?'));assert.ok(!element.src.includes('youtube'));
 element.fail=false;await controller.launch();assert.equal(starts,1);controller.stop();assert.equal(element.paused,true);
 delete globalThis.Audio;delete globalThis.document;
});
