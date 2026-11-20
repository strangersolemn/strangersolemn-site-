#!/usr/bin/env python3
"""Builds the picture layers and sound for the Strange Labs intro (sites/strange-labs/intro/assets).

  python3 scripts/labs-intro-assets.py

Sources:
- The Ord Lot characters: ~/Projects/art/solemn/the ord lot/ord lot raw /  (4000px PNGs with see-through backgrounds)
- Every other collection: art/previews/<collection>/N.mp4 (the 360px loops the site already has)
- Logo: ~/Projects/art/strangersolemn/strange-labs-graphics/strange-labs-logo-cutout.png
- Sound: none here. The intro plays the music of Blockrunner with the artwork's own code (see intro.js).
Needs ffmpeg and cwebp. Recordings that came out with a grey margin, or blank, are skipped.
"""
import json, os, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'sites/strange-labs/intro/assets')
PREV = os.path.join(ROOT, 'art/previews')
ORDLOT = os.path.expanduser('~/Projects/art/solemn/the ord lot/ord lot raw ')
LOGO = os.path.expanduser('~/Projects/art/strangersolemn/strange-labs-graphics/strange-labs-logo-cutout.png')
TMP = tempfile.mkdtemp(prefix='labs-intro-')
os.makedirs(OUT, exist_ok=True)

def run(*a):
    subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def webp(png, name, q=80):
    run('cwebp', '-quiet', '-q', str(q), '-alpha_q', '90', png, '-o', os.path.join(OUT, name))

def frame_raw(mp4, t, n=36):
    """One frame as n*n RGB bytes, or None."""
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(t), '-i', mp4, '-frames:v', '1', '-vf', f'scale={n}:{n}',
                        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
    return p.stdout if len(p.stdout) == n * n * 3 else None

def duration(mp4):
    p = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], capture_output=True, text=True)
    try: return float(p.stdout.strip())
    except ValueError: return 0.0

def good(mp4):
    """Skip bad recordings: grey margin bottom-right, or a nearly blank frame."""
    d = duration(mp4)
    raw = frame_raw(mp4, min(2.0, d * 0.5))
    if not raw: return False
    n = 36
    px = lambda x, y: raw[(y * n + x) * 3:(y * n + x) * 3 + 3]
    corner = [px(x, y) for x in range(n - 5, n) for y in range(n - 5, n)]
    if all(abs(c[0] - 128) < 14 and abs(c[1] - 128) < 14 and abs(c[2] - 128) < 14 for c in corner): return False
    lum = [(raw[i] + raw[i + 1] + raw[i + 2]) / 3 for i in range(0, len(raw), 3)]
    mean = sum(lum) / len(lum)
    var = sum((v - mean) ** 2 for v in lum) / len(lum)
    return not (mean > 240 or var < 12)

def still(mp4, t, size, name, q=80, neighbor=True):
    png = os.path.join(TMP, 'f.png')
    flags = ':flags=neighbor' if neighbor else ''
    run('ffmpeg', '-loglevel', 'error', '-y', '-ss', str(t), '-i', mp4, '-frames:v', '1', '-vf', f'scale={size}:{size}{flags}', '-update', '1', png)
    webp(png, name, q)

def flipbook(mp4, size, name, q=72):
    """Four moments of a loop in a 2x2 grid, so a wall can flicker."""
    d = duration(mp4); pngs = []
    for i in range(4):
        p = os.path.join(TMP, f'fb{i}.png'); pngs.append(p)
        run('ffmpeg', '-loglevel', 'error', '-y', '-ss', str(d * (0.1 + 0.22 * i)), '-i', mp4, '-frames:v', '1', '-vf', f'scale={size}:{size}:flags=neighbor', '-update', '1', p)
    out = os.path.join(TMP, 'fb.png')
    run('ffmpeg', '-loglevel', 'error', '-y', '-i', pngs[0], '-i', pngs[1], '-i', pngs[2], '-i', pngs[3], '-filter_complex', 'xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0', '-update', '1', out)
    webp(out, name, q)

manifest = {}

# 1. The Ord Lot: the crowd. The last one (holding the sign) is the gate out of the white world.
CROWD = ['Barry Bone.PNG', 'BooBoo.png', 'Chad-O.PNG', 'Dimen.PNG', 'Dimitri.PNG', 'Dimo.PNG', 'Garland Grift.PNG', 'Hack-0.PNG', 'Julian.PNG',
         'Lolita.PNG', 'Magik.PNG', 'Meefo.PNG', 'Mfer.png', 'Natty.png', 'Netty.PNG', 'PeeWee.PNG', 'Rufus.png', 'Swagalot.PNG', 'noddy.png',
         'showbiz.png', 'Dunc.PNG', 'Janet.PNG', 'Venard.PNG', 'Pebblles.PNG', 'PNG_0001.png']
manifest['crowd'] = []
for i, f in enumerate(CROWD):
    png = os.path.join(TMP, 'c.png')
    run('ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(ORDLOT, f), '-frames:v', '1', '-vf', 'scale=768:768:flags=lanczos', '-update', '1', png)
    webp(png, f'c{i}.webp', 82); manifest['crowd'].append(f'c{i}.webp')

# 1b. Trolls: put together from their trait layers (body, eyes, mouth, headwear), so they are cut-outs too
TROLLZ = os.path.expanduser('~/Projects/art/solemn/trollz/traits-src')
TROLLS = [('cafe-uniform', 'eye-02', 'mouth-04', 'baghead'), ('fur-coat', 'eye-bored', 'mouth-09', 'bucket-bitcoin-og'), ('pimp', 'eye-square', 'mouth-11', 'crown'),
          ('robe-red-cape', 'shades-b', 'mouth-13', 'halo'), ('smart-shirt', 'shades', 'mouth-cig', 'punk'), ('sweat-shopper', 'eye-03', 'mouth-03', 'backfro'),
          ('chef-whites', 'eye-stare', 'mouth-10b', 'coconut'), ('puffer', 'eye-01', 'mouth-07', 'beanie-rasta'), ('police', 'glasses', 'mouth-pout', 'bobby'),
          ('clown', 'eye-red', 'mouth-12', 'afro'), ('leather', 'shades-black', 'mouth-sleazy-cig', 'fedora'), ('devil', 'eye-04', 'mouth-14', 'horns')]
manifest['trolls'] = []
for i, (b_, e_, m_, h_) in enumerate(TROLLS):
    parts = [os.path.join(TROLLZ, d, n + '.png') for d, n in (('bodies', b_), ('eyes', e_), ('mouths', m_), ('headwear', h_))]
    if not all(os.path.exists(x) for x in parts): print('troll skipped, missing a layer:', b_, e_, m_, h_); continue
    png = os.path.join(TMP, 't.png')
    run('ffmpeg', '-loglevel', 'error', '-y', '-i', parts[0], '-i', parts[1], '-i', parts[2], '-i', parts[3], '-filter_complex',
        '[0][1]overlay[a];[a][2]overlay[b];[b][3]overlay,scale=768:768:flags=lanczos', '-frames:v', '1', '-update', '1', png)
    webp(png, f't{i}.webp', 82); manifest['trolls'].append(f't{i}.webp')

# 2. Everything recorded as a loop
def goods(coll):
    d = os.path.join(PREV, coll)
    files = sorted((f for f in os.listdir(d) if f.endswith('.mp4') and f[:-4].isdigit()), key=lambda f: int(f[:-4]))
    return [os.path.join(d, f) for f in files if good(os.path.join(d, f))]

pools = {c: goods(c) for c in ['block-clocks', 'doom', 'deliverance', 'dronebtc', 'gl1tch-c0des', 'a-solemn-rose', 'block-party', 'the-ord-lot', 'btc-editions',
                                'gamma-prints', 'the-masters', 'blockclock-originals']}
print({c: len(v) for c, v in pools.items()})

def spread(lst, n):   # n items spread evenly through a list
    if len(lst) <= n: return lst
    return [lst[int(i * len(lst) / n)] for i in range(n)]

manifest['clocks'] = []
for i, f in enumerate(spread(pools['block-clocks'], 8)):
    still(f, 2.0, 512, f'k{i}.webp'); manifest['clocks'].append(f'k{i}.webp')
manifest['skulls'] = []
for i, f in enumerate(spread(pools['doom'], 14)):
    still(f, 2.0, 512, f's{i}.webp', 78); manifest['skulls'].append(f's{i}.webp')
manifest['walls'] = []
for i, f in enumerate(spread(pools['gl1tch-c0des'], 6)):
    flipbook(f, 256, f'g{i}.webp'); manifest['walls'].append(f'g{i}.webp')
manifest['editions'] = []
for i, f in enumerate(spread(pools['btc-editions'], 10)):
    still(f, 2.0, 512, f'e{i}.webp', 80, neighbor=False); manifest['editions'].append(f'e{i}.webp')
manifest['party'] = []
for i, f in enumerate(spread(pools['block-party'], 14)):
    still(f, min(2.0, duration(f) * 0.5), 384, f'p{i}.webp', 80); manifest['party'].append(f'p{i}.webp')
manifest['cards'] = []
n = 0
for coll, k in [('deliverance', 6), ('dronebtc', 3), ('a-solemn-rose', 5)]:
    for f in spread(pools[coll], k):
        still(f, min(2.0, duration(f) * 0.5), 384, f'd{n}.webp', 78); manifest['cards'].append({'src': f'd{n}.webp', 'from': coll}); n += 1

# 2b. The later laps of the tune: one more collection on every bass note
for key, pre, coll, k in [('gamma', 'gp', 'gamma-prints', 12), ('masters', 'ms', 'the-masters', 12), ('originals', 'bo', 'blockclock-originals', 12),
                          ('rose', 'ro', 'a-solemn-rose', 12), ('deliverance', 'dv', 'deliverance', 12)]:
    manifest[key] = []
    for i, f in enumerate(spread(pools[coll], k)):
        still(f, min(2.0, duration(f) * 0.5), 512, f'{pre}{i}.webp', 78, neighbor=False); manifest[key].append(f'{pre}{i}.webp')

# 2c. Trollbox: the flipbook video cuts to another troll in its box every 7 frames (0.233 s). Each piece in the intro
#     is four of those trolls in a 2x2 grid, flicked through like the video. And the real Trollbox logo for the title.
TBVID = os.path.expanduser('~/Projects/art/solemn/trollz/kit/files/trollbox-flipbook.mp4')
TBLOGO = os.path.expanduser('~/Projects/art/solemn/trollz/kit/files/trollbox-logo.png')
manifest['trollbox'] = []
for i in range(12):
    pngs = []
    for k in range(4):
        n_ = (i * 4 + k) * 3 + 1          # every third troll, so the 48 are spread through the first 34 s (the logo card comes after)
        pth = os.path.join(TMP, f'tb{k}.png'); pngs.append(pth)
        run('ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{0.15 + n_ * 7 / 30:.3f}', '-i', TBVID, '-frames:v', '1', '-vf', 'scale=384:384', '-update', '1', pth)
    out = os.path.join(TMP, 'tb.png')
    run('ffmpeg', '-loglevel', 'error', '-y', '-i', pngs[0], '-i', pngs[1], '-i', pngs[2], '-i', pngs[3], '-filter_complex', 'xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0', '-update', '1', out)
    webp(out, f'tb{i}.webp', 76); manifest['trollbox'].append(f'tb{i}.webp')
run('cwebp', '-quiet', '-q', '88', '-alpha_q', '95', '-resize', '1024', '0', TBLOGO, '-o', os.path.join(OUT, 'tblogo.webp')); manifest['tblogo'] = 'tblogo.webp'

# 3. The wall: 128 pieces in one picture, 16 across and 8 down
allp = []
order = ['block-party', 'doom', 'btc-editions', 'block-clocks', 'gl1tch-c0des', 'a-solemn-rose', 'deliverance', 'the-ord-lot', 'dronebtc']
quota = {'block-party': 32, 'doom': 20, 'btc-editions': 22, 'block-clocks': 12, 'gl1tch-c0des': 10, 'a-solemn-rose': 10, 'deliverance': 8, 'the-ord-lot': 12, 'dronebtc': 2}
for c in order: allp += spread(pools[c], quota[c])
allp = allp[:128]
# shuffle in a fixed way so the collections mix
allp = [allp[(i * 37) % len(allp)] for i in range(len(allp))] if len(allp) == 128 else allp
for i, f in enumerate(allp):
    run('ffmpeg', '-loglevel', 'error', '-y', '-ss', str(min(2.0, duration(f) * 0.5)), '-i', f, '-frames:v', '1', '-vf', 'scale=128:128:flags=neighbor', '-update', '1', os.path.join(TMP, f'w{i:03d}.png'))
for i in range(len(allp), 128):   # pad by repeating
    run('cp', os.path.join(TMP, f'w{i % max(1, len(allp)):03d}.png'), os.path.join(TMP, f'w{i:03d}.png'))
wall = os.path.join(TMP, 'wall.png')
run('ffmpeg', '-loglevel', 'error', '-y', '-framerate', '1', '-i', os.path.join(TMP, 'w%03d.png'), '-vf', 'tile=16x8', '-frames:v', '1', '-update', '1', wall)
webp(wall, 'wall.webp', 78); manifest['wall'] = 'wall.webp'

# 4. The Strange Labs logo, as Solemn made it
run('cwebp', '-quiet', '-q', '92', '-alpha_q', '95', LOGO, '-o', os.path.join(OUT, 'logo.webp')); manifest['logo'] = 'logo.webp'

json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print('files', len(os.listdir(OUT)), 'total KB', round(total / 1024))
