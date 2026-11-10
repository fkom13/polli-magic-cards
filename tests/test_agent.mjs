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
