#!/usr/bin/env node
// Snapshots who holds what across every collection into collectors.json.
// Usage: ALCHEMY_API_KEY=xxx node scripts/snapshot-collectors.mjs
// Optional: OPENSEA_API_KEY for OpenSea usernames. No dependencies (Node 18+).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/collectors-config.json'), 'utf8'));
const ALCHEMY = process.env.ALCHEMY_API_KEY;
const OPENSEA = process.env.OPENSEA_API_KEY;
const EXCLUDE = new Set(cfg.exclude.map(a => a.toLowerCase()));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJSON(url, opts = {}, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(25000) });
      if (r.ok) return await r.json();
      if (r.status === 404) return null;
    } catch {}
    await sleep(600 * (i + 1) ** 2);
  }
  return null;
}
async function pool(items, n, fn) {
  let i = 0, done = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; await fn(items[k], k); if (++done % 250 === 0) console.log(`   ${done}/${items.length}`); }
  }));
}

// holdings: address -> { chain, name, src, cols: {colId: count}, refs: [[colId, pieceIdx]] }
const H = new Map();
const failed = {};
function add(chain, addr, colId, count, ref, name, src) {
  if (!addr || !count) return;
  const key = chain === 'ethereum' ? addr.toLowerCase() : addr;
  if (EXCLUDE.has(key.toLowerCase())) return;
  if (chain === 'tezos' && key.startsWith('KT1')) return; // Tezos contracts = marketplace escrow, not collectors
  let h = H.get(key);
  if (!h) H.set(key, h = { a: key, chain, cols: {}, refs: [] });
  h.cols[colId] = (h.cols[colId] || 0) + count;
  if (ref && h.refs.length < 6) h.refs.push(ref);
  if (name && !h.name) { h.name = name; h.src = src; }
}
const miss = (id) => { failed[id] = (failed[id] || 0) + 1; };

const cols = fs.readdirSync(path.join(ROOT, 'collections'))
  .filter(f => f.endsWith('.json') && f !== 'manifest.json')
  .map(f => JSON.parse(fs.readFileSync(path.join(ROOT, 'collections', f), 'utf8')));
const HEAVY = new Set(['renascent']); // base64 art: don't use as thumbnails

async function ethereum() {
  if (!ALCHEMY) { console.error('ALCHEMY_API_KEY not set: refusing to publish a board without Ethereum collectors'); process.exit(1); }
  const base = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY}`;
  // FRONTRUN: whole contract, 666 sequential tokens.
  let pageKey = '';
  do {
    const d = await getJSON(`${base}/getOwnersForContract?contractAddress=${cfg.frontrunContract}&withTokenBalances=true${pageKey ? '&pageKey=' + pageKey : ''}`);
    if (!d) { miss('frontrun'); break; }
    for (const o of d.owners) add('ethereum', o.ownerAddress, 'frontrun', o.tokenBalances.reduce((s, t) => s + Number(t.balance), 0));
    pageKey = d.pageKey || '';
  } while (pageKey);
  // Everything else: per listed token (works for shared contracts and ERC1155).
  const jobs = []; const seen = new Set();
  for (const c of cols) if (c.chain === 'ethereum' && c.id !== 'frontrun')
    c.pieces.forEach((p, idx) => {
      const contract = p.contract || c.contract, k = `${contract}:${p.tokenId}`;
      if (!contract || p.tokenId == null || seen.has(k)) return;
      seen.add(k); jobs.push({ c, idx, contract, tokenId: p.tokenId });
    });
  console.log(`ETH: ${jobs.length} tokens`);
  await pool(jobs, 6, async j => {
    const d = await getJSON(`${base}/getOwnersForNFT?contractAddress=${j.contract}&tokenId=${j.tokenId}`);
    if (!d || !d.owners) return miss(j.c.id);
    for (const o of d.owners) add('ethereum', o, j.c.id, 1, HEAVY.has(j.c.id) ? null : [j.c.id, j.idx]);
  });
}

async function ordinals() {
  const jobs = [];
  for (const c of cols) if (c.chain === 'ordinals')
    c.pieces.forEach((p, idx) => { if (/^[0-9a-f]{64}i\d+$/.test(p.tokenId || '')) jobs.push({ c, idx, id: p.tokenId }); });
  console.log(`BTC: ${jobs.length} inscriptions`);
  await pool(jobs, 8, async j => {
    const d = await getJSON(`https://ordinals.com/r/inscription/${j.id}`);
    if (!d || !d.address) return miss(j.c.id);
    add('ordinals', d.address, j.c.id, 1, [j.c.id, j.idx]);
  });
}

async function tezos() {
  for (const c of cols) if (c.chain === 'tezos') {
    const byContract = {};
    c.pieces.forEach((p, idx) => { const k = p.contract || c.contract; if (k && p.tokenId != null) (byContract[k] ||= {})[p.tokenId] = idx; });
    for (const [contract, ids] of Object.entries(byContract)) {
      const list = Object.keys(ids);
      for (let i = 0; i < list.length; i += 50) {
        let offset = 0, rows;
        do {
          rows = await getJSON(`https://api.tzkt.io/v1/tokens/balances?token.contract=${contract}&token.tokenId.in=${list.slice(i, i + 50).join(',')}&balance.gt=0&limit=1000&offset=${offset}&select=account,balance,token.tokenId`);
          if (!rows) { miss(c.id); break; }
          for (const r of rows) add('tezos', r.account.address, c.id, Number(r.balance), [c.id, ids[r['token.tokenId']]], r.account.alias, 'tzkt');
          offset += rows.length;
        } while (rows.length === 1000);
      }
    }
  }
}

async function solana() {
  const rpc = (method, params) => getJSON('https://api.mainnet-beta.solana.com', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  for (const c of cols) if (c.chain === 'solana')
    for (const [idx, p] of c.pieces.entries()) {
      const big = await rpc('getTokenLargestAccounts', [p.tokenId]);
      const acct = big?.result?.value?.find(v => v.uiAmount > 0)?.address;
      const info = acct && await rpc('getAccountInfo', [acct, { encoding: 'jsonParsed' }]);
      const owner = info?.result?.value?.data?.parsed?.info?.owner;
      owner ? add('solana', owner, c.id, 1, [c.id, idx]) : miss(c.id);
    }
}

async function names() {
  const eth = [...H.values()].filter(h => h.chain === 'ethereum');
  console.log(`Names: ${eth.length} ETH wallets`);
  await pool(eth, 5, async h => {
    const d = await getJSON(`https://api.ensideas.com/ens/resolve/${h.a}`, {}, 2);
    if (d?.name) { h.name = d.name; h.src = 'ens'; return; }
    if (!OPENSEA) return;
    const o = await getJSON(`https://api.opensea.io/api/v2/accounts/${h.a}`, { headers: { 'x-api-key': OPENSEA } }, 2);
    if (o?.username) { h.name = o.username; h.src = 'opensea'; }
  });
}

console.log(`Collections: ${cols.length}`);
await ethereum(); await ordinals(); await tezos(); await solana(); await names();

const collectors = [...H.values()].map(h => ({
  a: h.a, chain: h.chain, ...(h.name ? { name: h.name, src: h.src } : {}),
  total: Object.values(h.cols).reduce((s, n) => s + n, 0), cols: h.cols, refs: h.refs,
})).sort((x, y) => y.total - x.total || Object.keys(y.cols).length - Object.keys(x.cols).length);

const byChain = {};
for (const c of collectors) byChain[c.chain] = (byChain[c.chain] || 0) + 1;
const out = {
  updated: new Date().toISOString(),
  totals: { collectors: collectors.length, pieces: collectors.reduce((s, c) => s + c.total, 0), byChain },
  titles: Object.fromEntries(cols.map(c => [c.id, c.title])),
  failed, collectors,
};
// Safety: never publish a board that suddenly lost a big share of collectors (an API outage looks like that)
try {
  const prev = JSON.parse(fs.readFileSync(path.join(ROOT, 'collectors.json'), 'utf8'));
  for (const [chain, n] of Object.entries(prev.totals?.byChain || {})) {
    const now = byChain[chain] || 0;
    if (n >= 50 && now < n * 0.75 && !process.env.FORCE_SNAPSHOT) {
      console.error(`Refusing to publish: ${chain} collectors fell from ${n} to ${now}. Set FORCE_SNAPSHOT=1 if that is real.`);
      process.exit(1);
    }
  }
} catch (e) { if (e && e.code !== 'ENOENT' && !(e instanceof SyntaxError)) throw e; }
fs.writeFileSync(path.join(ROOT, 'collectors.json'), JSON.stringify(out));
// Every Ordinals inscription id we own → collection id. Read by the Discord bot's /api/ord-verify.
const ordIds = {};
for (const c of cols) if (c.chain === 'ordinals')
  for (const p of c.pieces) if (/^[0-9a-f]{64}i\d+$/.test(p.tokenId || '')) ordIds[p.tokenId] = c.id;
fs.writeFileSync(path.join(ROOT, 'ordinals-ids.json'), JSON.stringify({ updated: out.updated, titles: Object.fromEntries(cols.filter(c => c.chain === 'ordinals').map(c => [c.id, c.title])), ids: ordIds }));
console.log(`Done: ${collectors.length} collectors, ${out.totals.pieces} pieces`, byChain, 'failed lookups:', failed);
