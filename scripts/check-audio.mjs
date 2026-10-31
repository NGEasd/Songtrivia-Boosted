import {prepareAudio,removeClip,run} from '../audio.mjs';
import {resolve} from 'node:path';
const id=await prepareAudio('M7lc1UVf-VE',10);
try{console.log('Audio prepared:',id);console.log(await run(resolve('tools/ffprobe.exe'),['-v','error','-show_entries','format=duration:format_tags:stream=codec_type','-of','json',resolve('data/audio',id,'clip.mp3')]));}finally{await removeClip(id);}
