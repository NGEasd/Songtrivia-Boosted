export function classifyAudioError(message) {
 const text=String(message);
 if(/confirm.{0,30}(not a bot|not.*robot)|bot verification/i.test(text))return {code:'YOUTUBE_BOT_CHECK',message:'A YouTube botellenőrzést kér a szervertől. A hang nem tölthető le erről a kapcsolatról.'};
 if(/429|too many requests/i.test(text))return {code:'YOUTUBE_RATE_LIMIT',message:'A YouTube túl sok kérést érzékelt. Várj, majd próbáld újra.'};
 if(/private video|video is private|age.restricted|confirm your age|not available in your country|geo.restricted/i.test(text))return {code:'YOUTUBE_RESTRICTED',message:'A videó privát, korhatáros vagy területileg korlátozott. Válassz másik videót.'};
 if(/403|forbidden/i.test(text))return {code:'YOUTUBE_FORBIDDEN',message:'A YouTube megtagadta a szerver letöltési kérését (403). A pontos okot a szerver naplója tartalmazza.'};
 if(/javascript runtime|challenge solving failed|signature extraction failed|n challenge|nsig extraction/i.test(text))return {code:'YOUTUBE_RUNTIME',message:'A YouTube feldolgozójának vagy JavaScript-környezetének frissítése szükséges a szerveren.'};
 if(/unavailable|removed|not available/i.test(text))return {code:'YOUTUBE_UNAVAILABLE',message:'Ez a videó jelenleg nem elérhető a szerverről. Próbálj másik videót.'};
 if(/sign in|login required/i.test(text))return {code:'YOUTUBE_LOGIN',message:'A YouTube bejelentkezést kér a letöltéshez. Ez a szerver bejelentkezés nélkül működik.'};
 return {code:'AUDIO_PREPARATION_FAILED',message:'A hang előkészítése sikertelen. A házigazda a szerver naplójában ellenőrizheti az okot.'};
}

// Signed media URLs and local secrets must not end up in hosting logs.
export function safeAudioDiagnostic(message,secrets=[]) {
 let text=String(message);
 for(const secret of secrets)if(secret&&secret.length>=8)text=text.split(secret).join('[REDACTED]');
 return text.replace(/https?:\/\/[^\s<>"']+/gi,'[URL]').replace(/\x1b\[[0-9;]*m/g,'').slice(-6000);
}
