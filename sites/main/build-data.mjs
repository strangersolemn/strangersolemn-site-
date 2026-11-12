// Builds the data the new site reads, from the collection JSONs + the collectors snapshot.
//   node sites/main/build-data.mjs
// Writes sites/main/data/index.js (the timeline) and sites/main/data/<id>.json (one per project page).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(ROOT, 'sites/main/data');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

// Side collections live inside their parent's page, not on the timeline.
const FAMILY = {
  strangersnft: ['strangers-pets', 'stranger-days', 'strange-occurances', 'strange-punks', 'stranger-danger'],
};
const CHILD = new Set(Object.values(FAMILY).flat());

// Dates we know; everything else shows its year until we read first/last mint off-chain.
const DATES = {
  'everyday-strange': { start: '2022-01-01', end: '2022-12-31' },
};

const manifest = read('collections/manifest.json');
const snap = read('collectors.json');
const mintFile = path.join(OUT, 'mint.json');
const mints = fs.existsSync(mintFile) ? JSON.parse(fs.readFileSync(mintFile, 'utf8')) : {};

// holders per collection: [[address, count], ...] biggest first
const holders = {};
for (const c of snap.collectors) {
  for (const [id, n] of Object.entries(c.cols || {})) (holders[id] ||= []).push([c.a, n]);
}
for (const id in holders) holders[id].sort((a, b) => b[1] - a[1]);

const moving = (p) => p.loop || p.preview || null;
const kind = (p) => p.animType || p.imageType || (p.animationUrl ? 'html' : 'still');
// Filebase refuses some of these, Pinata serves them; Pets/Punks also have small local copies
const gateway = (u) => (u || '').replace('https://ipfs.filebase.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/');
const LOCAL_THUMBS = { 'strangers-pets': 'sites/main/thumbs/strangers-pets-', 'strange-punks': 'sites/main/thumbs/strange-punks-' };
let current = '';
const thumbOf = (p) => {
  const local = LOCAL_THUMBS[current] && `${LOCAL_THUMBS[current]}${p.tokenId}.jpg`;
  return local && fs.existsSync(path.join(ROOT, local)) ? local : gateway(p.thumbnail || p.image);
};
// [tokenId, title, thumb, image, moving, kind, animationUrl, contract]
const slim = (p) => [p.tokenId ?? '', p.title || '', thumbOf(p), gateway(p.image), moving(p), kind(p), gateway(p.animationUrl), p.contract || ''];

function summary(c, j) {
  current = c.id;
  const pieces = j.pieces || [];
  const cover = pieces.find(moving) || pieces[0] || {};
  return {
    id: c.id,
    title: c.title,
    chain: c.chain,
    year: c.year,
    dates: DATES[c.id] || null,
    mint: mints[c.id] || null,
    supply: c.supply || pieces.length,
    count: pieces.length,
    contract: c.contract || j.contract || '',
    onchain: !!c.onchain,
    note: c.artistNote || j.artistNote || '',
    about: c.description || j.description || '',
    links: { ...(c.marketplaces || {}), ...(c.galleryUrl ? { site: c.galleryUrl } : {}) },
    holders: (holders[c.id] || []).length,
    cover: { still: cover.tokenId !== undefined ? thumbOf(cover) : gateway(c.heroImage), moving: moving(cover) },
  };
}

fs.mkdirSync(OUT, { recursive: true });
const timeline = [];
for (const c of manifest) {
  const j = read(`collections/${c.id}.json`);
  const s = summary(c, j);
  current = c.id;
  const page = { ...s, pieces: (j.pieces || []).map(slim), holderList: (holders[c.id] || []).slice(0, 200) };
  if (FAMILY[c.id]) {
    page.family = FAMILY[c.id].map((fid) => {
      const fc = manifest.find((m) => m.id === fid);
      const fj = read(`collections/${fid}.json`);
      const fs_ = summary(fc, fj);
      return { ...fs_, pieces: (fj.pieces || []).map(slim) };
    });
  }
  fs.writeFileSync(path.join(OUT, `${c.id}.json`), JSON.stringify(page));
  if (!CHILD.has(c.id)) timeline.push({ ...s, family: (FAMILY[c.id] || []).length });
}
timeline.sort((a, b) => b.year - a.year);
fs.writeFileSync(path.join(OUT, 'index.js'),
  `// built by build-data.mjs from collections/manifest.json — snapshot ${snap.updated}\n` +
  `window.WORKS = ${JSON.stringify(timeline)};\nwindow.TOTALS = ${JSON.stringify(snap.totals)};\n`);
console.log(`${timeline.length} on the timeline, ${manifest.length} pages → ${path.relative(ROOT, OUT)}`);
