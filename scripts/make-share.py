#!/usr/bin/env python3
"""Share files for collectors: for every piece with a recorded preview (art/previews/<col>/<n>.mp4)
   <n>.gif        square GIF, 480px, loops forever — for X, Discord, feeds
   <n>.story.mp4  9:16 phone video (720x1280): the piece centred, title + collection + site under it,
                  played twice (8s) — for Instagram / TikTok stories
and writes previewGif / story onto the piece in collections/<col>.json.
Usage: python3 scripts/make-share.py btc-editions [--force]"""
import json, os, subprocess, sys, textwrap
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FONTS = os.path.join(ROOT, 'scripts', 'fonts')
col_id = sys.argv[1]; force = '--force' in sys.argv
path = os.path.join(ROOT, 'collections', col_id + '.json')
col = json.load(open(path))
W, H, ART, TOP = 720, 1280, 640, 250
bold = lambda s: ImageFont.truetype(os.path.join(FONTS, 'SpaceMono-Bold.ttf'), s)
reg = lambda s: ImageFont.truetype(os.path.join(FONTS, 'SpaceMono-Regular.ttf'), s)
SUB = (col.get('title') or col_id).upper() + ' · ' + {'ordinals': 'BITCOIN ORDINALS', 'ethereum': 'ETHEREUM', 'tezos': 'TEZOS', 'solana': 'SOLANA'}.get(col.get('chain'), '')

def ff(*a):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)

def caption_png(title, out):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 255)); d = ImageDraw.Draw(im)
    d.rectangle((40, TOP, 40 + ART, TOP + ART), fill=(0, 0, 0, 0))          # hole for the art
    d.text((W / 2, 150), 'STRANGERSOLEMN', font=bold(30), fill=(255, 255, 255, 255), anchor='mm')
    y = TOP + ART + 70
    for line in textwrap.wrap(title.upper(), 26)[:2]:
        d.text((W / 2, y), line, font=bold(40), fill=(255, 255, 255, 255), anchor='mm'); y += 54
    d.text((W / 2, y + 14), SUB, font=reg(22), fill=(170, 170, 170, 255), anchor='mm')
    d.text((W / 2, H - 90), 'strangersolemn.art', font=reg(26), fill=(200, 200, 200, 255), anchor='mm')
    im.save(out)

made = 0
for i, p in enumerate(col['pieces']):
    n = i + 1; src = os.path.join(ROOT, f'art/previews/{col_id}/{n}.mp4')
    if not os.path.exists(src): continue
    gif = f'art/previews/{col_id}/{n}.gif'; story = f'art/previews/{col_id}/{n}.story.mp4'
    title = (p.get('title') or f'#{n}').strip()
    if force or not os.path.exists(os.path.join(ROOT, gif)):
        ff('-i', src, '-vf', 'fps=15,scale=480:480:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle', '-loop', '0', os.path.join(ROOT, gif))
    if force or not os.path.exists(os.path.join(ROOT, story)):
        cap = os.path.join(ROOT, f'art/previews/{col_id}/.cap{n}.png'); caption_png(title, cap)
        ff('-stream_loop', '1', '-i', src, '-loop', '1', '-i', cap,
           '-filter_complex', f'color=c=black:s={W}x{H}:r=30[bg];[0:v]scale={ART}:{ART}:flags=lanczos[art];[bg][art]overlay=40:{TOP}:shortest=1[v1];[v1][1:v]overlay=0:0:shortest=1,format=yuv420p[v]',
           '-map', '[v]', '-t', '8', '-c:v', 'libx264', '-crf', '23', '-preset', 'slow', '-movflags', '+faststart', '-an', os.path.join(ROOT, story))
        os.remove(cap)
    p['previewGif'] = gif; p['story'] = story; made += 1
    print(f"#{n} {title}: gif {os.path.getsize(os.path.join(ROOT, gif)) // 1024}KB · story {os.path.getsize(os.path.join(ROOT, story)) // 1024}KB", flush=True)
json.dump(col, open(path, 'w'), indent=2); open(path, 'a').write('\n')
print(f'{col_id}: {made} pieces have share files')
