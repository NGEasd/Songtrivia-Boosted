import {spawn} from 'node:child_process';
import {mkdir, readdir, stat, rm, access} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {resolve, join, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {classifyAudioError,safeAudioDiagnostic} from './audio-errors.mjs';

const root=resolve('data/audio'), tools=fileURLToPath(new URL('./tools/',import.meta.url));
const executable=name=>process.env[name==='yt-dlp'?'YTDLP_PATH':name==='ffmpeg'?'FFMPEG_PATH':'FFPROBE_PATH']||join(tools,name+(process.platform==='win32'?'.exe':''));
export async function audioAvailable(){try{await Promise.all(['yt-dlp','ffmpeg','ffprobe'].map(name=>access(executable(name))));return true;}catch{return false;}}
export function run(file,args,timeout=180000){return new Promise((resolve,reject)=>{
 const child=spawn(file,args,{windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});let stdout='',stderr='',timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;child.kill();},timeout);
 child.stdout.on('data',data=>{stdout=(stdout+data).slice(-16000);});child.stderr.on('data',data=>{stderr=(stderr+data).slice(-16000);});
 child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);code===0&&!timedOut?resolve(stdout):reject(Error(timedOut?'A hang előkészítése túllépte az időkeretet.':stderr||`A hangfeldolgozó leállt (${code}).`));});
});}
let active=0;const waiting=[];
async function slot(){if(active>=2)await new Promise(resolve=>waiting.push(resolve));else active++;return ()=>{const next=waiting.shift();if(next)next();else active--;};}
export async function removeClip(id){if(!/^[a-f0-9-]{36}$/.test(id))return;const target=resolve(root,id);if(!target.startsWith(root+sep))throw Error('Invalid audio path');await rm(target,{recursive:true,force:true});}
export async function clearAudio(){await mkdir(root,{recursive:true});for(const entry of await readdir(root,{withFileTypes:true}))if(entry.isDirectory())await removeClip(entry.name);}
export async function prepareAudio(video,start){
 if(!/^[\w-]{11}$/.test(video)||!Number.isFinite(start)||start<0)throw Error('Érvénytelen zeneforrás.');
 if(!await audioAvailable())throw Error('A hangeszközök hiányoznak. Futtasd a scripts/setup-audio.ps1 telepítőt a gépen.');
 const release=await slot(),id=randomUUID(),dir=join(root,id);let stage='download';
 try{
 await mkdir(dir,{recursive:true});
 await run(executable('yt-dlp'),['--ignore-config','--no-plugin-dirs','--no-playlist','--no-progress','--socket-timeout','20','--retries','1','--max-filesize','60M','--match-filters','!is_live & duration <= 1800','--js-runtimes',`node:${process.execPath}`,'--ffmpeg-location',executable('ffmpeg'),'-f','bestaudio[ext=m4a]/bestaudio','-o',join(dir,'source.%(ext)s'),'--',`https://www.youtube.com/watch?v=${video}`]);
 const source=(await readdir(dir)).find(name=>/^source\.[a-z0-9]+$/.test(name)&&!name.endsWith('.part'));
 if(!source)throw Object.assign(Error('Nem érhető el hangsáv. Legfeljebb 30 perces, nem élő videót válassz.'),{publicMessage:true});
 stage='probe';
 const input=join(dir,source);const duration=Number((await run(executable('ffprobe'),['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',input],15000)).trim());
 if(!Number.isFinite(duration)||duration-start<45)throw Object.assign(Error('A kezdőpont után legalább 45 másodpercnek kell maradnia. Válassz korábbi kezdést.'),{publicMessage:true});
 stage='encode';
 await run(executable('ffmpeg'),['-nostdin','-v','error','-y','-ss',String(start),'-i',input,'-t','45','-map','0:a:0','-vn','-map_metadata','-1','-map_chapters','-1','-c:a','libmp3lame','-b:a','160k','-write_id3v1','0','-id3v2_version','0',join(dir,'clip.mp3')],60000);
 await rm(input,{force:true});return id;
 }catch(error){
 const failure=classifyAudioError(error.message);
 const secrets=Object.entries(process.env).filter(([key])=>/key|token|secret|password|cookie/i.test(key)).map(([,value])=>value);
 console.error('[audio]',JSON.stringify({id,stage,code:failure.code,detail:safeAudioDiagnostic(error.message,secrets)}));
 await removeClip(id);
 if(error.publicMessage)throw error;
 throw Error(`${failure.message} Hibakód: ${failure.code}; azonosító: ${id.slice(0,8)}.`);
 }finally{release();}
}
export async function serveAudio(req,res,id){
 const path=join(root,id,'clip.mp3');const {size}=await stat(path);let start=0,end=size-1,status=200;
 if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
 if(!match[1])start=Math.max(0,size-Number(match[2]));else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
 if(start>=size||end<start){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}status=206;}
 res.writeHead(status,{'Content-Type':'audio/mpeg','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'no-store','Content-Disposition':'inline; filename="clip.mp3"',...(status===206?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
 if(req.method==='HEAD'){res.end();return;}const stream=createReadStream(path,{start,end});res.on('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res);
}
