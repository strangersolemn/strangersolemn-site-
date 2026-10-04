#!/usr/bin/env node
// Small looping thumbnails for pieces that are animated GIFs or videos.
// The originals are 5–40 MB each, far too heavy for a grid, so each one gets a ~50 KB loop:
//   art/previews/<collection>/<n>.loop.mp4  (320px longest side, first 4 s, no sound)
// written to the piece as "loop". Grids and small thumbnails use the loop;
// opening a piece still plays the full-quality original.
// Usage: node scripts/make-loops.mjs [collection ...]   (no args = every non-Ordinals collection)
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const run = (args) => new Promise(res => execFile('ffmpeg', args, { timeout: 120000 }, (err) => res(!err)));
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); })); }

const only = process.argv.slice(2);
const files = fs.readdirSync(path.join(ROOT, 'collections')).filter(f => f.endsWith('.json') && f !== 'manifest.json');
for (const f of files) {
  const file = path.join(ROOT, 'collections', f);
  const col = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (col.chain === 'ordinals' || (only.length && !only.includes(col.id))) continue;
  const jobs = [];
  col.pieces.forEach((p, i) => {
    const src = (p.animType === 'video' || p.animType === 'gif') ? p.animationUrl : ((p.imageType === 'gif' || p.imageType === 'video') ? p.image : null);
    if (src && !p.preview) jobs.push({ p, src, n: i + 1 });
  });
  if (!jobs.length) continue;
  const dir = path.join(ROOT, 'art', 'previews', col.id);
  fs.mkdirSync(dir, { recursive: true });
  let made = 0, failed = 0;
  await pool(jobs, 6, async ({ p, src, n }) => {
    const rel = `art/previews/${col.id}/${n}.loop.mp4`, out = path.join(ROOT, rel);
    if (!fs.existsSync(out) || fs.statSync(out).size < 1000) {
      const ok = await run(['-v', 'error', '-y', '-user_agent', 'Mozilla/5.0 (strangersolemn.art loops)', '-rw_timeout', '30000000', '-t', '4', '-i', src, '-t', '4', '-an',
        '-vf', "fps=20,scale='if(gt(iw,ih),320,-2)':'if(gt(iw,ih),-2,320)':flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2",
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '30', '-preset', 'veryslow', '-movflags', '+faststart', out]);
      if (!ok || !fs.existsSync(out) || fs.statSync(out).size < 1000) { failed++; fs.rmSync(out, { force: true }); return; }
    }
    p.loop = rel; made++;
  });
  fs.writeFileSync(file, JSON.stringify(col, null, 2) + '\n');
  const kb = jobs.reduce((s, j) => { const o = path.join(ROOT, `art/previews/${col.id}/${j.n}.loop.mp4`); return s + (fs.existsSync(o) ? fs.statSync(o).size : 0); }, 0) / 1024;
  console.log(`${col.id.padEnd(22)} loops ${made}/${jobs.length}${failed ? `, ${failed} failed` : ''}, ${Math.round(kb)} KB`);
}
