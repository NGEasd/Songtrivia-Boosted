export async function resolve(specifier,context,next){
 if(specifier==='./audio.mjs'&&context.parentURL?.endsWith('/server.mjs'))return {url:new URL('./audio-fixture.mjs',import.meta.url).href,shortCircuit:true};
 return next(specifier,context);
}
