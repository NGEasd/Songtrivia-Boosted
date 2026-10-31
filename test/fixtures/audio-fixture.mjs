import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
export {clearAudio,removeClip,serveAudio} from '../../audio.mjs';
export async function audioAvailable(){return true;}
export async function prepareAudio(video){if(video==='aaaaaaaaaaa')await new Promise(resolve=>setTimeout(resolve,300));const id=randomUUID();await mkdir(`data/audio/${id}`,{recursive:true});await writeFile(`data/audio/${id}/clip.mp3`,Buffer.alloc(1000,7));return id;}
