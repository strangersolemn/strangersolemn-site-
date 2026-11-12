// Reads the mint record of every Ethereum collection off Blockscout (no key needed):
// who deployed the contract and when, plus the first and last mint of the pieces on the site.
//   node sites/main/mint-info.mjs [id ...]   → sites/main/data/mint.json (build-data.mjs merges it in)
// With ids, only those collections are re-read and the rest of mint.json is kept.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const API = 'https://eth.blockscout.com/api/v2';
const SHARED = { '0x495f947276749ce646f68ac8c248420045cb7b5e': 'OpenSea Shared Storefront' };
const ZERO = '0x0000000000000000000000000000000000000000';
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (r.ok) return r.json();
    if (r.status === 404) return null;
    await sleep(1500 * (i + 1));
  }
  throw new Error(`blockscout ${url}`);
}

// the oldest transfer of a token is its mint; transfers come newest first, so walk to the last page
async function mintOf(contract, id) {
  let url = `${API}/tokens/${contract}/instances/${id}/transfers`, last = null;
  for (let page = 0; url && page < 20; page++) {
    const j = await get(url);
    if (!j || !j.items?.length) break;
    last = j.items[j.items.length - 1];
    url = j.next_page_params ? `${API}/tokens/${contract}/instances/${id}/transfers?${new URLSearchParams(j.next_page_params)}` : null;
  }
  if (!last) return null;
  return { id: String(id), at: last.timestamp, tx: last.transaction_hash, to: last.to?.hash || '', fromZero: last.from?.hash === ZERO };
}

async function deployOf(contract) {
  if (SHARED[contract]) return { shared: SHARED[contract] };
  const a = await get(`${API}/addresses/${contract}`);
  if (!a) return {};
  const tx = a.creation_transaction_hash ? await get(`${API}/transactions/${a.creation_transaction_hash}`) : null;
  return { by: a.creator_address_hash || '', tx: a.creation_transaction_hash || '', at: tx?.timestamp || '', name: a.token?.name || a.name || '', type: a.token?.type || '' };
}

const manifest = read('collections/manifest.json');
const only = process.argv.slice(2);
const OUTFILE = path.join(ROOT, 'sites/main/data/mint.json');
const out = only.length && fs.existsSync(OUTFILE) ? JSON.parse(fs.readFileSync(OUTFILE, 'utf8')) : {};
for (const c of manifest.filter((c) => c.chain === 'ethereum' && (!only.length || only.includes(c.id)))) {
  const pieces = read(`collections/${c.id}.json`).pieces || [];
  const byContract = {};
  for (const p of pieces) {
    const k = (p.contract || c.contract || '').toLowerCase();
    if (k && p.tokenId !== undefined && p.tokenId !== '') (byContract[k] ||= []).push(String(p.tokenId));
  }
  // pieces without token ids (e.g. FRONTRUN's showcase images): use the first and last token of the supply
  if (!Object.keys(byContract).length && c.contract && c.supply) byContract[c.contract.toLowerCase()] = ['1', String(c.supply)];
  out[c.id] = [];
  for (const [contract, ids] of Object.entries(byContract)) {
    ids.sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0));
    const deploy = await deployOf(contract);
    const safe = (tid) => mintOf(contract, tid).catch(() => null);
    let first = await safe(ids[0]);
    let last = ids.length > 1 ? await safe(ids[ids.length - 1]) : first;
    // token order isn't always mint order (shared contracts), so put the two in time order
    if (first && last && first.at > last.at) [first, last] = [last, first];
    out[c.id].push({ contract, pieces: ids.length, deploy, first, last });
    console.log(c.id.padEnd(22), contract.slice(0, 10), deploy.at?.slice(0, 10) || deploy.shared || '?', first?.at?.slice(0, 16) || '?', '→', last?.at?.slice(0, 16) || '?');
  }
}
fs.writeFileSync(OUTFILE, JSON.stringify(out, null, 1));
