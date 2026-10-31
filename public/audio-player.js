// The guessing player receives anonymous local audio only. YouTube is selection-only.
export function createAudioController({getState,getSession,now,api,notify}){
 const audio=new Audio();audio.preload='auto';let clip=null,attempted=null,enabled=false,generation=0,message='';
 const current=()=>getState()?.playback?.audioId;
 function status(text){message=text;const el=document.querySelector('#audio-status');if(el)el.textContent=text;}
 function seek(){const s=getState();if(s?.phase==='playing'&&audio.readyState>=1){const target=Math.min(44.9,Math.max(0,(now()-s.started)/1000));if(Math.abs(audio.currentTime-target)>1.5)audio.currentTime=target;}}
 audio.addEventListener('loadedmetadata',seek);
 audio.addEventListener('error',()=>status('A hang nem tölthető be. Nyomd meg a Hang újraindítása gombot, vagy kérd a házigazdát a dal átugrására.'));
 function load(force=false){const id=current();if(!id)return false;if(id!==clip||force){generation++;audio.pause();clip=id;const credentials=new URLSearchParams(getSession());audio.src=`/audio/${id}?${credentials}`;audio.load();}return true;}
 function stop(){generation++;audio.pause();audio.removeAttribute('src');audio.load();clip=null;attempted=null;message='';}
 async function play({launch=false,retry=false}={}){
 const s=getState();if(!s||!['ready','playing'].includes(s.phase)||(!launch&&s.phase!=='playing'))return;
 enabled=true;if(!load(retry))return;const id=clip,version=generation;attempted=id;audio.muted=false;seek();status('Hang indítása…');
 try{await audio.play();if(version!==generation||current()!==id){return;}if(launch){await api('play');}seek();status('♫ Csak hang · kép és cím nélkül');}
 catch(error){if(version!==generation)return;audio.pause();status(error.name==='NotAllowedError'?'A hang indításához érintsd meg a Hang ezen az eszközön gombot.':'Nem indult el a hang. Próbáld újra, vagy ugord át a dalt.');notify(message);}
 }
 function sync(){const s=getState();if(!s||!['ready','playing'].includes(s.phase)){stop();return;}
 if(s.playback)load();else if(clip)stop();
 let container=document.querySelector('#audio-controls');if(!container){container=document.createElement('div');container.id='audio-controls';container.className='audio-controls';const btn=document.createElement('button');btn.id='audio-enable';btn.className='secondary';btn.onclick=()=>play({retry:true});const mute=document.createElement('button');mute.id='audio-mute';mute.className='text-button';mute.onclick=()=>{enabled=false;audio.pause();status('Hang kikapcsolva ezen az eszközön.');};const label=document.createElement('p');label.id='audio-status';label.className='hint';label.setAttribute('role','status');container.append(btn,mute,label);document.querySelector('.stage').append(container);}
 const btn=document.querySelector('#audio-enable');btn.disabled=s.phase!=='playing';btn.textContent=enabled?'♫ Hang újraindítása':'♫ Hang ezen az eszközön';document.querySelector('#audio-mute').hidden=s.phase!=='playing';status(message||'A házigazda indítja a zenét. Közös hangszóró mellett a telefonos hang kikapcsolva maradhat.');
 if(s.phase==='playing'&&(enabled||s.me===s.host)&&attempted!==clip)void play();
 if(s.phase==='playing'&&!audio.paused)seek();
 }
 return {sync,stop,launch:()=>play({launch:true})};
}
