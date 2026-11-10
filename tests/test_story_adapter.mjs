import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createMagicCardsRequest,parseMagicCardsResponse,generateMagicCard,MAGIC_CARDS_MODEL} from '../examples/story-animator-adapter.mjs';
test('Story adapter builds caller-scoped Responses input',()=>{
 const o=createMagicCardsRequest({prompt:'animated fairy',quality:'high',complexity:'medium'});
 assert.equal(o.model,MAGIC_CARDS_MODEL);
 assert.equal(JSON.parse(o.input).prompt,'animated fairy');
 assert.equal(o.store,false);
});
test('Story adapter normalizes media asset for video timeline',()=>{
 const b={output:[{content:[{type:'output_text',text:JSON.stringify({ok:true,gif_url:'https://media.pollinations.ai/12345678-aaaa-4bbb-bbbb-abcdef123456',frames:10,fps:6,transparent:true,model:'openai/gpt-image-2.6-sunburst'})}]}]};
 const p=parseMagicCardsResponse(b);assert.equal(p.frames,10);assert.equal(p.kind,'animated_gif');assert.equal(p.transparent,true);
});
test('Story adapter rejects unknown media URL and errors',()=>{
 assert.throws(()=>parseMagicCardsResponse({output:[{content:[{type:'output_text',text:JSON.stringify({ok:true,gif_url:'https://example.org/attacker'})}]}]}),/Untrusted/);
 assert.throws(()=>parseMagicCardsResponse({output:[{content:[{type:'output_text',text:JSON.stringify({ok:false,error:'limit reached'})}]}]}),/limit reached/);
});
test('Story adapter injects key only in bearer header',async()=>{
 let req;
 const fetchImpl=async (url,options)=>{req={url,options};return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify({ok:true,gif_url:'https://media.pollinations.ai/12345678-aaaa-4bbb-bbbb-abcdef123456',frames:6,fps:6,transparent:true})}]}]})};};
 await generateMagicCard({apiKey:'test-placeholder',prompt:'sparkle',fetchImpl});
 assert.equal(req.options.headers.Authorization,'Bearer test-placeholder');
 assert.equal(JSON.stringify(req.options.body).includes('test-placeholder'),false);
});
