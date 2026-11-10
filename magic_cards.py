#!/usr/bin/env python3
"""Polli Magic Cards — portable transparent animated card compositor.

Public pipeline, no private infrastructure and no embedded provider credentials.
Python Pillow is intentionally the only runtime dependency for compositing.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageSequence
import numpy as np

ALLOWED_GRIDS = {(2,2): 4, (2,3): 6, (3,3): 9}


def _font(size: int, bold: bool = True):
    candidates = (
        ['/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
         '/usr/share/fonts/truetype/liberation2/LiberationSerif-Bold.ttf'] if bold else
        ['/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
         '/usr/share/fonts/truetype/liberation2/LiberationSerif-Regular.ttf']
    )
    for path in candidates:
        if Path(path).is_file():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _text_fit(draw, text, max_width, desired, min_size=12, bold=True):
    for size in range(desired, min_size - 1, -1):
        font = _font(size, bold)
        x0,y0,x1,y1 = draw.textbbox((0,0),text,font=font,stroke_width=0)
        if x1-x0 <= max_width:
            return font
    return _font(min_size, bold)


def _banner(width, height, title, subtitle):
    canvas=Image.new('RGBA',(width,height),(0,0,0,0))
    draw=ImageDraw.Draw(canvas)
    margin=max(7,round(width*.025))
    draw.rounded_rectangle((margin,3,width-margin,height-5),radius=max(12,int(height*.17)),fill=(5,17,49,246),outline=(211,171,79,255),width=max(2,round(width*.006)))
    inset=max(4,round(width*.012))
    draw.rounded_rectangle((margin+inset,3+inset,width-margin-inset,height-5-inset),radius=max(9,int(height*.12)),outline=(85,138,222,230),width=1)
    top=_text_fit(draw,title,width-2*margin-30,max(17,int(height*.38)))
    bottom=_text_fit(draw,subtitle,width-2*margin-30,max(15,int(height*.29)),bold=False)
    for line,font,cy,color in ((title,top,height*.30,(255,222,146,255)),(subtitle,bottom,height*.72,(244,250,255,255))):
        box=draw.textbbox((0,0),line,font=font)
        tx=(width-(box[2]-box[0]))//2
        ty=round(cy-(box[3]-box[1])/2-box[1])
        draw.text((tx+1,ty+2),line,font=font,fill=(0,0,0,220))
        draw.text((tx,ty),line,font=font,fill=color)
    return canvas


def _sparkles(width,height, t, count=16):
    layer=Image.new('RGBA',(width,height),(0,0,0,0))
    d=ImageDraw.Draw(layer)
    for j in range(count):
        angle=2*math.pi*j/count
        radius=.34*min(width,height) + (.04*min(width,height))*math.sin(j*.9+t)
        cx=width*.5 + radius*math.cos(angle)
        cy=height*.46 + radius*math.sin(angle)
        r=(1+math.sin(t*2.2+j*2.19))/2
        if r<.30: continue
        tip=2+round(4*r)
        a=round(80+145*r)
        col=(95,212,255,a)
        d.line((cx-tip,cy,cx+tip,cy),fill=col,width=2)
        d.line((cx,cy-tip,cx,cy+tip),fill=col,width=2)
    return layer


def _threshold_alpha(pix, cutoff=116):
    # GIF: one transparent palette index; APNG and WebP keep smooth alpha.
    alpha=np.asarray(pix.getchannel('A'),dtype=np.uint8)
    background=Image.new('RGB',pix.size,(5,12,30))
    background.paste(pix,mask=pix.getchannel('A'))
    indexed=background.quantize(colors=255,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
    src=np.asarray(indexed,dtype=np.uint16)+1
    src[alpha<cutoff]=0
    out=Image.fromarray(src.astype('uint8'),'P')
    palette=[0,0,0]+indexed.getpalette()[:765]
    out.putpalette(palette+[0]*(768-len(palette)))
    return out


def render_sprite_sheet(src, out_dir, columns=2, rows=3, title='Black Friday', subtitle='fée à louer -50%', frame_duration_ms=180, loop_style='pingpong', sparkle=True):
    if (columns,rows) not in ALLOWED_GRIDS:
        raise ValueError('Only 2x2, 2x3, and 3x3 sprite sheets are supported')
    if not 100 <= frame_duration_ms <= 2000:
        raise ValueError('Frame duration must be between 100 and 2000ms')
    if not title or not subtitle or len(title)>80 or len(subtitle)>100:
        raise ValueError('Both title and subtitle are required with max 80 and 100 characters')
    src=Path(src).resolve();out_dir=Path(out_dir).resolve()
    if not src.is_file():raise FileNotFoundError(src)
    image=Image.open(src).convert('RGBA')
    w,h=image.size
    if w % columns or h % rows:
        raise ValueError(f'Image size {w}x{h} must divide into {columns}x{rows}')
    tw,th=w//columns,h//rows
    if min(tw,th)<128 or max(tw,th)>2048:
        raise ValueError('Sprite cell outside valid 128-2048 range')
    if w*h>15_000_000:
        raise ValueError('Sprite sheet too large')
    cells=[image.crop((x*tw,y*th,(x+1)*tw,(y+1)*th)) for y in range(rows) for x in range(columns)]
    if loop_style not in ('pingpong','forward'):
        raise ValueError('Unknown loop style')
    inds=list(range(len(cells)))
    if loop_style=='pingpong' and len(inds)>2:
        inds += list(range(len(cells)-2,0,-1))
    banner_height=max(72,round(th*.24))
    canvas_height=th+banner_height
    label=_banner(tw,banner_height,title,subtitle)
    rendered=[]
    for i,idx in enumerate(inds):
        base=Image.new('RGBA',(tw,canvas_height),(0,0,0,0))
        # Explicitly preserve full alpha from the provider, no black matte.
        base.alpha_composite(cells[idx],(0,0))
        if sparkle:
            base.alpha_composite(_sparkles(tw,th,2*math.pi*i/max(1,len(inds))))
        base.alpha_composite(label,(0,th))
        rendered.append(base)
    out_dir.mkdir(parents=True,exist_ok=True)
    apng=out_dir/'card.apng';webp=out_dir/'card.webp';gif=out_dir/'card.gif'
    rendered[0].save(apng,format='PNG',save_all=True,append_images=rendered[1:],duration=frame_duration_ms,loop=0,disposal=2,blend=0,optimize=True)
    rendered[0].save(webp,format='WEBP',save_all=True,append_images=rendered[1:],duration=frame_duration_ms,loop=0,lossless=True,method=2)
    indexed=[_threshold_alpha(im) for im in rendered]
    indexed[0].save(gif,format='GIF',save_all=True,append_images=indexed[1:],duration=frame_duration_ms,loop=0,transparency=0,disposal=2,optimize=False)
    details={}
    for fmt,path in [('gif',gif),('webp',webp),('apng',apng)]:
        result=Image.open(path)
        alpha=np.asarray(result.convert('RGBA').getchannel('A'))
        details[fmt]={'path':str(path),'bytes':path.stat().st_size,'frames':result.n_frames,'width':result.width,'height':result.height,'transparent_pct':round(float(np.mean(alpha==0))*100,2),'alpha_partial_pct':round(float(np.mean((alpha>0)&(alpha<255)))*100,2)}
    report={'source':str(src),'sheet_size':[w,h],'grid':[columns,rows],'frame_duration_ms':frame_duration_ms,'loop':loop_style,'title':title,'subtitle':subtitle,'outputs':details,'pipeline':'public-pillow-1.0','used_private_services':False}
    (out_dir/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    return report


def main():
    p=argparse.ArgumentParser(description='Build transparent animated cards from Pollinations sprite sheets')
    p.add_argument('input',help='Transparent RGBA spritesheet PNG (2x2, 2x3 or 3x3)')
    p.add_argument('--out',required=True,help='Output folder')
    p.add_argument('--columns',type=int,default=2)
    p.add_argument('--rows',type=int,default=3)
    p.add_argument('--title',default='Black Friday')
    p.add_argument('--subtitle',default='fée à louer -50%')
    p.add_argument('--frame-ms',type=int,default=180)
    p.add_argument('--loop',choices=['pingpong','forward'],default='pingpong')
    p.add_argument('--no-sparkles',action='store_true')
    a=p.parse_args()
    print(json.dumps(render_sprite_sheet(a.input,a.out,a.columns,a.rows,a.title,a.subtitle,a.frame_ms,a.loop,not a.no_sparkles),ensure_ascii=False,indent=2))
if __name__=='__main__':main()
