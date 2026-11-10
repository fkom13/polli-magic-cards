/**
 * Polli Magic Cards — public Pollinations Code Agent.
 *
 * Calls the caller's own Pollinations image allowance and public FFmpeg MCP.
 * No private APIs, tokens, accounts or external backend are embedded here.
 * A managed code agent is a TEXT model that returns generated media links.
 */
const AGENT_MODEL = 'fkom13/polli-magic-cards';
const DEFAULT_IMAGE_MODEL = 'openai/gpt-image-2.6-sunburst';
const SUPPORTED_IMAGE_MODELS = new Set([
    'openai/gpt-image-2.5-flare',
    'openai/gpt-image-2.5-sunburst',
    'openai/gpt-image-2.6-flare',
    'openai/gpt-image-2.6-sunburst',
]);
// Public open-licensed Noto Serif (OFL), loaded as input1 by the hosted FFmpeg worker.
const FONT_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserif/NotoSerif%5Bwdth,wght%5D.ttf';
const MAX_PROMPT = 1600;

function userText(body) {
    if (typeof body.input === 'string') return body.input;
    if (Array.isArray(body.input)) {
        return body.input.filter(x => x && x.role === 'user').map(x =>
            (x.content || []).map(c => typeof c === 'string' ? c : c?.text || '').join(' ')
        ).join('\n');
    }
    const messages = Array.isArray(body.messages) ? body.messages : [];
    return messages.filter(x => x.role === 'user').map(x =>
        typeof x.content === 'string' ? x.content : Array.isArray(x.content)
            ? x.content.map(y => y?.text || '').join(' ') : ''
    ).join('\n');
}

function parseTask(body) {
    let text = userText(body).trim();
    let data = {};
    if (text.startsWith('{')) {
        try {const item = JSON.parse(text); if (item && typeof item === 'object' && !Array.isArray(item)) data = item;} catch {}
    }
    const prompt = String(data.prompt || text || 'A sapphire blue fairy with sparkling wings and a magical halo').slice(0, MAX_PROMPT);
    const valid = s => String(s || '').normalize('NFC').replace(/[^\p{L}\p{N}\s.,!?%+\-]/gu, '').replace(/\s+/g,' ').trim();
    const title = valid(data.headline || data.title || 'Black Friday').slice(0, 42) || 'Black Friday';
    const subtitle = valid(data.subheadline || data.subtitle || 'fée à louer -50%').slice(0, 60) || 'fée à louer -50%';
    const complexity = ['low','medium','high'].includes(data.complexity) ? data.complexity : 'medium';
    // Quality is limited by Pollinations MCP, even though official OpenAI
    // supports xhigh/max. Never claim to forward an unsupported quality level.
    if (data.quality !== undefined && !['low','medium','high'].includes(data.quality)) {
        throw new Error('quality must be low, medium or high for the Pollinations MCP');
    }
    const quality = data.quality || 'high';
    // Model choice is explicit, validated and paid by the caller's Pollinations key.
    const imageModel = data.image_model || DEFAULT_IMAGE_MODEL;
    if (!SUPPORTED_IMAGE_MODELS.has(imageModel)) {
        throw new Error('Unsupported image_model; choose 2.5/2.6 Flare or Sunburst');
    }
    const modes = {low:{cols:2,rows:2},medium:{cols:2,rows:3},high:{cols:3,rows:3}};
    // Reuse an existing sheet from Pollinations to iterate on effects/typography
    // without rebilling an expensive image model. Never fetch arbitrary URLs.
    const supplied = data.spritesheet_url;
    if (supplied !== undefined && (typeof supplied !== 'string' ||
        !/^https:\/\/media\.pollinations\.ai\/[A-Za-z0-9-]{24,96}$/.test(supplied))) {
        throw new Error('spritesheet_url must be a Pollinations media URL');
    }
    return {prompt,title,subtitle,complexity,quality,imageModel,spritesheet_url:supplied||'',...modes[complexity]};
}

function mediaUrl(result) {
    const all = result?.content || result?.result?.content || [];
    for (const x of all) {
        if (x?.type === 'resource_link' && /^https:\/\/media\.pollinations\.ai\/[A-Za-z0-9-]+/.test(x.uri||'')) return x.uri;
        if (x?.type === 'text') {
            try {
                const v = JSON.parse(x.text);
                const url = v.url || v.data?.[0]?.url;
                if (/^https:\/\/media\.pollinations\.ai\/[A-Za-z0-9-]+/.test(url||'')) return url;
            } catch {}
        }
    }
    return '';
}

function ffmpegCaption(text) {
    // Strict allowlist (parseTask) and escaping for FFmpeg filtergraph.
    return text.replace(/\\/g,'\\\\').replace(/:/g,'\\:').replace(/'/g,"\\'").replace(/%/g,'\\%').replace(/,/g,'\\,');
}

function argsForGif(task) {
    const poses=task.cols*task.rows;
    const count=poses*2-2;
    const fps=6;
    const idx=`if(lt(mod(n,${count}),${poses}),mod(n,${count}),${count}-mod(n,${count}))`;
    const x=`mod(${idx},${task.cols})*(iw/${task.cols})`;
    const y=`floor((${idx})/${task.cols})*(ih/${task.rows})`;
    const title=ffmpegCaption(task.title);
    const subtitle=ffmpegCaption(task.subtitle);
    const vf=`[0:v]crop=w=iw/${task.cols}:h=ih/${task.rows}:x='${x}':y='${y}':exact=1,format=rgba,pad=iw:ih+120:0:0:color=black@0,drawbox=x=12:y=ih-118:w=iw-24:h=113:color=0x061735@0.97:t=fill:replace=1,drawtext=fontfile=input1:text='${title}':fontsize=35:fontcolor=0xffd88b:x=(w-text_w)/2:y=h-107:expansion=none,drawtext=fontfile=input1:text='${subtitle}':fontsize=27:fontcolor=white:x=(w-text_w)/2:y=h-58:expansion=none,split[a][b];[a]palettegen=reserve_transparent=1:stats_mode=full[p];[b][p]paletteuse=alpha_threshold=128[v]`;
    return {args:['-f','image2','-loop','1','-framerate',String(fps),'-t',String(count/fps),'-i','input0','-filter_complex',vf,'-map','[v]','-frames:v',String(count),'-loop','0'],count,fps};
}

function response(text, details={}) {
    const item={id:`msg_${crypto.randomUUID()}`,type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text,annotations:[]}]};
    return Response.json({id:`resp_${crypto.randomUUID()}`,object:'response',created_at:Math.floor(Date.now()/1000),model:AGENT_MODEL,status:'completed',error:null,incomplete_details:null,output:[item],usage:{input_tokens:0,output_tokens:0,total_tokens:0},...details});
}

export default async function agent({request,mcp}) {
    let task;
    try {task=parseTask(await request.json());}
    catch (e) {return response(JSON.stringify({ok:false,error:String(e?.message||e).slice(0,150)}));}
    const poses=task.cols*task.rows;
    const sheetPrompt=`Create a premium transparent animation sprite sheet from scratch. ${task.prompt}. Exactly ${task.cols} columns and ${task.rows} rows, ${poses} equal squares, edge-to-edge, no gutters or borders. Each square contains the SAME character, same camera, pose and costume, full figure visible inside the cell. Consistent composition, sequential very subtle motions: blink, head tilt, wings flutter and soft halo twinkles, then return towards first pose. NO TEXT, NO LABELS, NO LOGOS, no scenery, transparent alpha outside the subject. Do not let any figure cross a cell boundary. Highest possible identity continuity. Render the sheet as one image.`;
    let sheet=task.spritesheet_url;
    try {
        if (!sheet) {
            const imageResult=await mcp('pollinations','generateImage',{prompt:sheetPrompt,model:task.imageModel,size:`${task.cols*512}x${task.rows*512}`,quality:task.quality,transparent:true,n:1});
            sheet=mediaUrl(imageResult);
            if(!sheet) throw new Error('The image model did not return a public media URL');
        }
        const {args,count,fps}=argsForGif(task);
        const gifResult=await mcp('ffmpeg','runFfmpeg',{sources:[sheet,FONT_URL],args,outputExtension:'gif'});
        const gif=mediaUrl(gifResult);
        if(!gif) {
            const diagnostic=(gifResult?.content||gifResult?.result?.content||[]).filter(c=>c?.type==='text').map(c=>c.text).join(' | ').slice(0,600);
            throw new Error('FFmpeg did not return a GIF media URL: '+diagnostic);
        }
        return response(JSON.stringify({ok:true,kind:'animated_promo_card',gif_url:gif,spritesheet_url:sheet,frames:count,fps,transparent:true,image_reused:Boolean(task.spritesheet_url),model:task.imageModel,quality_requested:task.quality,complexity_workflow:task.complexity,producer:'Pollinations image model + Pollinations FFmpeg MCP',billing:task.spritesheet_url?'caller own Pollen for FFmpeg tool only':'caller own Pollen for image and FFmpeg tool',private_backend_used:false,no_openai_api_key_required:true}));
    } catch (e) {
        return response(JSON.stringify({ok:false,error:String(e?.message||e).slice(0,240),spritesheet_url:sheet||undefined,model:task.imageModel,no_retry:true,private_backend_used:false}));
    }
}
