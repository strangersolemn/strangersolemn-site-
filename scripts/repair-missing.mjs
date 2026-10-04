#!/usr/bin/env node
// Re-fetches media for Ethereum pieces whose image/animation link is dead (truncated ids, unpinned IPFS),
// using Alchemy's cached copy (contract + token id). Usage: ALCHEMY_API_KEY=… node scripts/repair-missing.mjs
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const KEY = process.env.ALCHEMY_API_KEY; if (!KEY) { console.error('ALCHEMY_API_KEY not set'); process.exit(1); }
const base = `https://eth-mainnet.g.alchemy.com/nft/v3/${KEY}`;
for (const f of fs.readdirSync(path.join(ROOT, 'collections')).filter(f => f.endsWith('.json') && f !== 'manifest.json')) {
  const file = path.join(ROOT, 'collections', f);
  const col = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (col.chain !== 'ethereum') continue;
  const broken = col.pieces.filter(p => (p.imageType === 'missing' || p.animType === 'missing') && p.tokenId != null && (p.contract || col.contract));
  if (!broken.length) continue;
  let fixed = 0;
  for (let i = 0; i < broken.length; i += 100) {
    const chunk = broken.slice(i, i + 100);
    const r = await fetch(`${base}/getNFTMetadataBatch`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tokens: chunk.map(p => ({ contractAddress: p.contract || col.contract, tokenId: String(p.tokenId) })) }) });
    if (!r.ok) { console.log(col.id, 'alchemy', r.status); continue; }
    const { nfts = [] } = await r.json();
    nfts.forEach((n, k) => {
      const p = chunk[k]; if (!n) return;
      const img = n.image?.cachedUrl || n.image?.pngUrl || n.image?.originalUrl;
      const anim = n.animation?.cachedUrl || n.animation?.originalUrl;
      const ct = (n.image?.contentType || '').toLowerCase(), act = (n.animation?.contentType || '').toLowerCase();
      if (p.imageType === 'missing' && img) { p.image = img; if (!p.thumbnail || p.thumbnail.includes('ipfs.io') || p.thumbnail.includes('arweave.net')) p.thumbnail = n.image?.thumbnailUrl || img; p.imageType = /gif/.test(ct) ? 'gif' : /video/.test(ct) ? 'video' : 'still'; fixed++; }
      if (p.animType === 'missing') { if (anim) { p.animationUrl = anim; p.animType = /video/.test(act) ? 'video' : /gif/.test(act) ? 'gif' : /html/.test(act) ? 'html' : 'video'; } else { delete p.animationUrl; delete p.animType; } }
    });
  }
  fs.writeFileSync(file, JSON.stringify(col, null, 2) + '\n');
  console.log(`${col.id.padEnd(22)} repaired ${fixed}/${broken.length}`);
}
