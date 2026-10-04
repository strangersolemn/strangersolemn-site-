#!/usr/bin/env node
// Records live-code artworks (Ordinals HTML inscriptions, on-chain pages) into looping previews:
//   art/previews/<collection>/<n>.gif   — shareable GIF, as asked
//   art/previews/<collection>/<n>.mp4   — small looping video the site uses in grids (10x lighter)
// and writes "preview" / "previewGif" into collections/<collection>.json for each piece.
//
// Usage: node scripts/render-previews.mjs <collection-id> [--size 480] [--secs 4] [--only 0,3,7] [--force]
// Needs Playwright (borrowed from ~/Projects/solemns-studio) and ffmpeg.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const req = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', path.join(process.env.HOME, 'Projects/solemns-studio/node_modules/playwright')]) {
  try { ({ chromium } = req(p)); break; } catch {}
}
if (!chromium) { console.error('Playwright not found'); process.exit(1); }

const args = process.argv.slice(2);
const id = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : d; };
const SIZE = +opt('size', 480), SECS = +opt('secs', 4), FORCE = args.includes('--force');
const ONLY = opt('only', '') ? opt('only', '').split(',').map(Number) : null;
const SETTLE = +opt('settle', 2500);      // ms after load before recording starts (lets recursion finish)
const CONC = +opt('conc', 3);
const NOGIF = args.includes('--no-gif');   // site video only (keeps the repo small); GIFs on request
const CLICK = opt('click', '');          // text of a button to press first (e.g. "Play"), or "center"

const file = path.join(ROOT, 'collections', id + '.json');
const col = JSON.parse(fs.readFileSync(file, 'utf8'));
const outDir = path.join(ROOT, 'art', 'previews', id);
const tmp = path.join(outDir, '.tmp');
fs.mkdirSync(tmp, { recursive: true });

const ff = (a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: ['ignore', 'ignore', 'pipe'] });

async function record(browser, piece, n) {
  const url = piece.animationUrl || piece.image;
  const gif = path.join(outDir, `${n}.gif`), mp4 = path.join(outDir, `${n}.mp4`);
  if (!FORCE && fs.existsSync(mp4) && (NOGIF || fs.existsSync(gif))) return { n, skipped: true };
  const ctx = await browser.newContext({ viewport: { width: SIZE, height: SIZE }, recordVideo: { dir: tmp, size: { width: SIZE, height: SIZE } } });
  const t0 = Date.now();
  const page = await ctx.newPage();
  let ok = true;
  try { await page.goto(url, { waitUntil: 'load', timeout: 45000 }); }
  catch { ok = false; }
  try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {}
  if (CLICK) {
    await page.waitForTimeout(+opt('clickafter', 800));
    try {
      if (CLICK === 'center') await page.mouse.click(SIZE / 2, SIZE / 2);
      else if (CLICK.startsWith('xy:')) { const [x, y] = CLICK.slice(3).split(',').map(Number); await page.mouse.click(x, y); }
      else await page.getByText(CLICK, { exact: false }).first().click({ timeout: 30000 });
    } catch { await page.mouse.click(SIZE / 2, SIZE / 2); }
  }
  await page.waitForTimeout(SETTLE);
  const start = (Date.now() - t0) / 1000;
  await page.waitForTimeout(SECS * 1000 + 1500);
  const vid = await page.video().path();
  await ctx.close();
  // trim to the steady part, then: mp4 for the site, gif for sharing
  // take the LAST SECS seconds of the recording: always the settled part, even when a busy machine
  // makes the screencast lag behind wall-clock time
  ff(['-sseof', '-' + SECS, '-i', vid, '-an', '-vf', `fps=24,scale=${SIZE}:${SIZE}:flags=lanczos`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-preset', 'slow', '-movflags', '+faststart', mp4]);
  if (!NOGIF) ff(['-i', mp4, '-vf', `fps=15,scale=${Math.min(SIZE, 400)}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`, '-loop', '0', gif]);
  fs.rmSync(vid, { force: true });
  const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).toString().trim() || 0;
  if (dur < SECS * 0.75) throw new Error(`clip too short (${dur}s)`);
  return { n, ok, start: +start.toFixed(1), gifKB: fs.existsSync(gif) ? Math.round(fs.statSync(gif).size / 1024) : 0, mp4KB: Math.round(fs.statSync(mp4).size / 1024) };
}

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] });
const idx = col.pieces.map((p, i) => i).filter(i => !ONLY || ONLY.includes(i)).filter(i => {
  const p = col.pieces[i]; return !!p.animationUrl && !/\.(png|jpe?g|webp|avif|gif)(\?|$)/i.test(p.animationUrl);
});
console.log(`${id}: ${idx.length} pieces → ${path.relative(ROOT, outDir)} (${SIZE}px, ${SECS}s)`);
const results = []; let next = 0;
await Promise.all(Array.from({ length: CONC }, async () => {
  while (next < idx.length) {
    const i = idx[next++];
    let r; try { r = await record(browser, col.pieces[i], i + 1); } catch { try { r = await record(browser, col.pieces[i], i + 1); } catch (e) { console.log(` #${i + 1} FAILED twice`, String(e).slice(0, 160)); continue; } }
    try { results.push(r); console.log(` #${i + 1} ${col.pieces[i].title}`, r.skipped ? 'skip' : `${r.gifKB}KB gif · ${r.mp4KB}KB mp4 · settled ${r.start}s${r.ok ? '' : ' (load timeout)'}`); }
    catch (e) { console.log(` #${i + 1} FAILED`, String(e).slice(0, 160)); }
  }
}));
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });

// write preview paths back into the collection file (only for files that exist)
let wrote = 0;
col.pieces.forEach((p, i) => {
  const gif = `art/previews/${id}/${i + 1}.gif`, mp4 = `art/previews/${id}/${i + 1}.mp4`;
  if (fs.existsSync(path.join(ROOT, mp4))) { p.preview = mp4; if (fs.existsSync(path.join(ROOT, gif))) p.previewGif = gif; wrote++; }
});
fs.writeFileSync(file, JSON.stringify(col, null, 2) + '\n');
console.log(`done: ${wrote}/${col.pieces.length} pieces have previews`);
