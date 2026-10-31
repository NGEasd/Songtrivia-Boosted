import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyAudioError,safeAudioDiagnostic} from '../audio-errors.mjs';
test('download failures retain distinct actionable categories',()=>{
 for(const [message,code] of [
  ["Sign in to confirm you’re not a bot",'YOUTUBE_BOT_CHECK'],
  ['HTTP Error 429: Too Many Requests','YOUTUBE_RATE_LIMIT'],
  ['HTTP Error 403: Forbidden','YOUTUBE_FORBIDDEN'],
  ['Private video. Sign in','YOUTUBE_RESTRICTED'],
  ['Video unavailable','YOUTUBE_UNAVAILABLE'],
  ['Sign in to continue','YOUTUBE_LOGIN'],
  ['JavaScript runtime not found','YOUTUBE_RUNTIME'],
  ['ffmpeg exited 1','AUDIO_PREPARATION_FAILED']
 ])assert.equal(classifyAudioError(message).code,code);
});
test('diagnostic output removes signed URLs and configured secrets and is bounded',()=>{
 const log=safeAudioDiagnostic('403 https://media.example/song?token=private my-secret-value',['my-secret-value']);
 assert.equal(log,'403 [URL] [REDACTED]');
 assert.equal(safeAudioDiagnostic('x'.repeat(10000)).length,6000);
});
