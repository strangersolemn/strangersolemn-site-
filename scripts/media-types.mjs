#!/usr/bin/env node
// Checks what every non-Ordinals piece really is, so the site can make it play:
//   imageType / animType: 'gif' | 'video' | 'still' | 'html' | 'missing'
// and moves Tezos media off ipfs.io (which now refuses hot-linking) onto objkt's CDN,
// falling back to the Filebase gateway. Run after adding pieces:  node scripts/media-types.mjs
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const UA = { 'User-Agent': 'Mozilla/5.0 (strangersolemn.art media check)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const kindOf = ct => !ct ? 'missing' : /gif/.test(ct) ? 'gif' : /^video\//.test(ct) ? 'video' : /^image\//.test(ct) ? 'still' : /html/.test(ct) ? 'html' : 'missing';
async function probe(url) {
  for (let i = 0; i < 3; i++) {
    try {
      let r = await fetch(url, { method: 'HEAD', headers: UA, redirect: 'follow', signal: AbortSignal.timeout(20000) });
      if (r.status === 405 || r.status === 403) r = await fetch(url, { headers: { ...UA, Range: 'bytes=0-0' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
      if (r.ok || r.status === 206) return kindOf(r.headers.get('content-type') || '');
      if (r.status === 404) return 'missing';
    } catch {}
    await sleep(800 * (i + 1));
  }
  return 'missing';
}
const cidOf = u => (String(u).match(/(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z2-7]{50,})/) || [])[1];
const ipfsPath = u => { const m = String(u).match(/(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z2-7]{50,})(\/[^?#]*)?/); return m ? m[1] + (m[2] || '') : null; };
const isIpfs = u => /ipfs|nftstorage\.link|\.ipfs\./.test(String(u)) && !!cidOf(u);
// Any IPFS link → a gateway that still serves hot-linked media. Tezos single files go to objkt's CDN first.
async function ipfsUrl(u, tez) {
  const p = ipfsPath(u); if (!p) return { url: u, kind: await probe(u) };
  const single = !p.includes('/');
  const cands = [...(tez && single ? [`https://assets.objkt.media/file/assets-003/${p}/artifact`] : []), `https://ipfs.filebase.io/ipfs/${p}`, `https://gateway.pinata.cloud/ipfs/${p}`];
  for (const cand of cands) { const kind = await probe(cand); if (kind !== 'missing') return { url: cand, kind }; }
  return { url: u, kind: 'missing' };
}
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); })); }

const only = process.argv.slice(2);
const files = fs.readdirSync(path.join(ROOT, 'collections')).filter(f => f.endsWith('.json') && f !== 'manifest.json');
for (const f of files) {
  const file = path.join(ROOT, 'collections', f);
  const col = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (col.chain === 'ordinals' || (only.length && !only.includes(col.id))) continue;
  const tez = col.chain === 'tezos';
  const tally = {};
  await pool(col.pieces, 8, async p => {
    for (const [field, typeField] of [['image', 'imageType'], ['animationUrl', 'animType'], ['thumbnail', null]]) {
      const u = p[field];
      if (!u || u.startsWith('data:') || u.startsWith('<') || /^(art|collections)\//.test(u)) { if (typeField && u && u.startsWith('data:text/html')) p[typeField] = 'html'; continue; }
      if (isIpfs(u) && !/objkt\.media|filebase\.io|pinata\.cloud/.test(u)) { const r = await ipfsUrl(u, tez); p[field] = r.url; if (typeField) p[typeField] = r.kind; }
      else if (typeField) p[typeField] = await probe(u);
      if (typeField) tally[typeField + ':' + p[typeField]] = (tally[typeField + ':' + p[typeField]] || 0) + 1;
    }
  });
  fs.writeFileSync(file, JSON.stringify(col, null, 2) + '\n');
  console.log(col.id.padEnd(22), JSON.stringify(tally));
}
