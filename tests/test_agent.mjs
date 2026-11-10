import assert from 'node:assert/strict';
import {test} from 'node:test';
import agent from '../agent.ts';

function fakeTool() {
 const calls=[];
 const mcp=async(s,t,a)=>{
  calls.push({server:s,name:t,args:a});
  if(s==='pollinations'&&t==='generateImage')return {content:[{type:'resource_link',uri:'https://media.pollinations.ai/12345678-aaaa-bbbb-cccc-123456789abc'}]};
  if(s==='ffmpeg'&&t==='runFfmpeg')return {content:[{type:'resource_link',uri:'https://media.pollinations.ai/87654321-aaaa-bbbb-cccc-123456789abc'}]};
  throw Error('unexpected tool');
 };
 return {mcp,calls};
}

test('generates real media tool calls without private services',async()=>{
 const {mcp,calls}=fakeTool();
 const request=new Request('https://example.invalid/v1/responses',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({input:JSON.stringify({prompt:'A luminous fairy, sapphire halo',headline:'Black Friday',subheadline:'fée à louer -50%',quality:'high',complexity:'medium'})})});
 const result=await agent({request,mcp});
 assert.equal(result.status,200);
 const envelope=await result.json();
 const parsed=JSON.parse(envelope.output[0].content[0].text);
 assert.equal(parsed.ok,true);
 assert.equal(parsed.frames,10);
 assert.equal(parsed.private_backend_used,false);
 assert.equal(calls.length,2);
 assert.equal(calls[0].server,'pollinations');
 assert.equal(calls[0].args.quality,'high');
 assert.equal(calls[0].args.transparent,true);
 assert.equal(calls[1].server,'ffmpeg');
 assert.equal(calls[1].args.outputExtension,'gif');
 assert.equal(calls[1].args.sources.length,2);
 assert.match(calls[1].args.sources[1], /NotoSerif/);
 assert.match(calls[1].args.args.join(' '),/drawtext=fontfile=input1/);
 assert.match(calls[1].args.args.join(' '),/palettegen/);
});

test('high complexity requests 9 poses',async()=>{
 const {mcp,calls}=fakeTool();
 const request=new Request('https://example.invalid',{method:'POST',body:JSON.stringify({input:JSON.stringify({prompt:'A magical fox',complexity:'high'})})});
 const response=await agent({request,mcp});
 const body=await response.json();
 const r=JSON.parse(body.output[0].content[0].text);
 assert.equal(r.frames,16);
 assert.equal(calls[0].args.size,'1536x1536');
});


test('reuses an existing trusted sheet for font/animation fixes without new image cost',async()=>{
 const {mcp,calls}=fakeTool();
 const spritesheet_url='https://media.pollinations.ai/18ca4970d690fac22c4b81998265455a919d0b796a85838fbc0d78b3c9116647';
 const request=new Request('https://example.invalid/v1/responses',{method:'POST',body:JSON.stringify({input:JSON.stringify({prompt:'An adult fantasy fairy',headline:'Black Friday',subheadline:'fée à louer -50%',quality:'high',complexity:'high',spritesheet_url})})});
 const response=await agent({request,mcp});
 const result=JSON.parse((await response.json()).output[0].content[0].text);
 assert.equal(result.ok,true);
 assert.equal(result.image_reused,true);
 assert.equal(result.spritesheet_url,spritesheet_url);
 assert.equal(result.frames,16);
 assert.equal(calls.length,1);
 assert.equal(calls[0].server,'ffmpeg');
 assert.equal(calls[0].args.sources[0],spritesheet_url);
 assert.match(calls[0].args.args.join(' '),/replace=1/);
});

test('refuses untrusted sprite sheet URLs',async()=>{
 const {mcp,calls}=fakeTool();
 const request=new Request('https://example.invalid/v1/responses',{method:'POST',body:JSON.stringify({input:JSON.stringify({prompt:'test',spritesheet_url:'https://bad.example.com/poison.png'})})});
 const response=await agent({request,mcp});
 const result=JSON.parse((await response.json()).output[0].content[0].text);
 assert.equal(result.ok,false);
 assert.match(result.error,/spritesheet_url/);
 assert.equal(calls.length,0);
});


test('accepts and passes through all four supported GPT Image Flare/Sunburst models', async () => {
 for (const image_model of ['openai/gpt-image-2.5-flare','openai/gpt-image-2.5-sunburst','openai/gpt-image-2.6-flare','openai/gpt-image-2.6-sunburst']) {
  const {mcp,calls}=fakeTool();
  const request=new Request('https://example.invalid/v1/responses',{method:'POST',body:JSON.stringify({input:JSON.stringify({prompt:'A blue fairy',image_model,quality:'medium',complexity:'low'})})});
  const res=await agent({request,mcp});
  const data=JSON.parse((await res.json()).output[0].content[0].text);
  assert.equal(data.ok,true);
  assert.equal(data.model,image_model);
  assert.equal(calls[0].args.model,image_model);
  assert.equal(calls[0].args.quality,'medium');
  assert.equal(calls[0].args.transparent,true);
 }
});

test('rejects unknown models and unsupported quality settings before paid calls',async()=>{
 for (const options of [{image_model:'unknown/model'},{image_model:'openai/gpt-image-2.6-flare',quality:'max'}]) {
  const {mcp,calls}=fakeTool();
  const request=new Request('https://example.invalid/v1/responses',{method:'POST',body:JSON.stringify({input:JSON.stringify({prompt:'test',...options})})});
  const res=await agent({request,mcp});
  const data=JSON.parse((await res.json()).output[0].content[0].text);
  assert.equal(data.ok,false);
  assert.equal(calls.length,0);
 }
});
