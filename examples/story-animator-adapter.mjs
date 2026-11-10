/**
 * Polli Magic Cards adapter for Story Animator or any JS workflow.
 * No credentials are committed: caller supplies a scoped Pollinations key.
 * The public catalog registration is pending publisher approval; owner may
 * call the privately deployed model with an owner key meanwhile.
 */
export const MAGIC_CARDS_MODEL = 'community/fkom13/polli-magic-cards';
export function createMagicCardsRequest({prompt,headline='Black Friday',subheadline='fée à louer -50%',quality='high',complexity='medium'}={}) {
  if (!prompt || typeof prompt!=='string') throw new Error('prompt is required');
  return {model:MAGIC_CARDS_MODEL, input:JSON.stringify({prompt,headline,subheadline,quality,complexity}),store:false};
}
export function parseMagicCardsResponse(body) {
  const text=body?.output?.flatMap(x=>x.content||[]).find(x=>x?.type==='output_text')?.text;
  if (!text) throw new Error('Polli Magic Cards did not return an output_text payload');
  let result;
  try {result=JSON.parse(text);}catch {throw new Error('Magic Cards result is not valid JSON');}
  if(!result.ok)throw new Error(`Magic Cards: ${result.error||'unknown error'}`);
  if (!/^https:\/\/media\.pollinations\.ai\/[A-Za-z0-9-]+$/.test(result.gif_url||'')) throw new Error('Untrusted or missing GIF URL');
  return {asset_url:result.gif_url,kind:'animated_gif',frames:result.frames,fps:result.fps,transparent:result.transparent,provider_model:result.model,source:'pollinations-magic-cards',spritesheet_url:result.spritesheet_url};
}
export async function generateMagicCard({apiKey,fetchImpl=fetch,...options}){
 if(!apiKey)throw new Error('Pollinations API key must be supplied by the caller');
 const response=await fetchImpl('https://gen.pollinations.ai/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(createMagicCardsRequest(options))});
 if(!response.ok)throw new Error(`Pollinations API ${response.status}`);
 return parseMagicCardsResponse(await response.json());
}
