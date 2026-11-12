// A collection's own page: facts, mint record (Ethereum), what's for sale, every piece, holders.
// Data: data/<id>.json from build-data.mjs. Pieces: [tokenId, title, thumb, image, moving, kind, animationUrl, contract]
(async () => {
  const $ = (id) => document.getElementById(id);
  const id = new URLSearchParams(location.search).get('c') || 'everyday-strange';
  const W = window.WORKS || [];
  let C;
  try { C = await (await fetch(`data/${encodeURIComponent(id)}.json`)).json(); }
  catch { $('page').innerHTML = '<p class="back">That collection isn\'t here. <a href="./">See all work</a>.</p>'; return; }

  const PAGE = 48;
  const chain = CHAINS[C.chain] || C.chain;
  const contractOf = (p) => p[7] || C.contract;

  // ---------- links for a piece / the collection ----------
  const pieceLink = (p) => pieceUrl(C.chain, contractOf(p), p[0]);
  const addrLink = (a) => C.chain === 'ethereum' ? `https://etherscan.io/address/${a}`
    : C.chain === 'tezos' ? `https://objkt.com/profile/${a}`
    : C.chain === 'ordinals' ? `https://ordiscan.com/address/${a}` : '#';
  // links are named by where they go, not by the key they were saved under
  const MARKETS = [['opensea.io', 'OpenSea'], ['objkt.com', 'objkt'], ['magiceden', 'Magic Eden'], ['superrare.com', 'SuperRare'], ['exchange.art', 'Exchange Art'], ['foundation.app', 'Foundation'], ['ord.net', 'ord.net'], ['gamma.io', 'Gamma'], ['teia.art', 'Teia']];
  const market = (u) => (MARKETS.find(([h]) => u.includes(h)) || [])[1];
  const links = Object.values(C.links || {}).filter(Boolean);
  if (!links.some(market) && C.contract) {
    if (C.chain === 'ethereum') links.push(`https://opensea.io/assets/ethereum/${C.contract}`);
    if (C.chain === 'tezos') links.push(`https://objkt.com/collection/${C.contract}`);
  }
  const linkName = (u) => market(u) || (u.includes('strangersolemn.art') ? 'Collection site' : new URL(u).hostname.replace(/^www\./, ''));

  // ---------- head ----------
  document.title = `${C.title} — Solemn`;
  const m = (C.mint || []);
  const firstMint = m.map((x) => x.first?.at).filter(Boolean).sort()[0];
  const lastMint = m.map((x) => x.last?.at).filter(Boolean).sort().pop();
  const start = C.dates?.start || firstMint || String(C.year);
  const end = C.dates?.end || (C.dates?.start ? '' : lastMint) || '';

  $('kicker').textContent = [chain, C.year, C.onchain ? 'On-chain' : ''].filter(Boolean).join(' · ');
  $('title').textContent = C.title;
  $('note').textContent = C.note ? `“${C.note}”` : '';
  $('about').textContent = C.about || '';
  if (!C.note) $('note').hidden = true;

  const actions = $('actions');
  // the 3D room needs a recorded loop or a real still to hang (same rule as gallery.js)
  const canWalk = C.pieces.some((p) => p[4] || (p[2] && !/html/.test(p[5])));
  actions.innerHTML = `<a class="btn buy" href="#buy">Collect</a>` +
    (canWalk ? `<a class="btn solid" href="gallery.html?c=${encodeURIComponent(C.id)}">Walk in · 3D</a>` : '') +
    links.map((u) => `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener">${esc(linkName(u))} ↗</a>`).join('');

  const cover = C.pieces.find((p) => p[4]) || C.pieces[0];
  if (cover) {
    fillArt($('hero'), cover[2], cover[4], cover[1]);
    $('heroCap').textContent = cover[1];
    $('hero').style.cursor = 'zoom-in';
    $('hero').addEventListener('click', () => openViewer(C.pieces, C.pieces.indexOf(cover)));
  }

  const facts = [
    ['Started', fmtDate(start)],
    ['Finished', end ? fmtDate(end) : (C.year >= new Date().getFullYear() ? 'Ongoing' : fmtDate(String(C.year)))],
    ['Chain', chain],
    ['Supply', num(C.supply)],
    ['Holders', C.holders ? num(C.holders) : '—'],
    ['For sale', '<span id="saleCount">…</span>'],
  ];
  $('facts').innerHTML = facts.map(([k, v]) => `<div><span class="label">${k}</span><b>${v}</b></div>`).join('');

  // ---------- mint record (Ethereum only) ----------
  if (C.chain === 'ethereum' && m.length) {
    $('mintSec').hidden = false;
    const tx = (h) => h ? ` · <a href="https://etherscan.io/tx/${h}" target="_blank" rel="noopener">tx</a>` : '';
    const who = (a) => a ? `<a href="https://etherscan.io/address/${a}" target="_blank" rel="noopener">${short(a)}</a>` : '—';
    const rows = [];
    for (const r of m) {
      const d = r.deploy || {};
      rows.push(['Contract', `<a href="https://etherscan.io/address/${r.contract}" target="_blank" rel="noopener">${short(r.contract)}</a>` +
        (d.shared ? ` <small>· ${esc(d.shared)} (shared contract)</small>` : d.type ? ` <small>· ${esc(d.type)}${d.name ? ' · ' + esc(d.name) : ''}</small>` : '')]);
      if (d.by) rows.push(['Deployed by', who(d.by)]);
      if (d.at) rows.push(['Deployed', fmtDate(d.at, true) + tx(d.tx)]);
      if (r.first) rows.push([r.pieces > 1 ? 'First mint' : 'Minted', `${fmtDate(r.first.at, true)} <small>· #${esc(short(r.first.id))} to ${who(r.first.to)}</small>${tx(r.first.tx)}`]);
      if (r.last && r.pieces > 1 && r.last.tx !== r.first?.tx) rows.push(['Last mint', `${fmtDate(r.last.at, true)} <small>· #${esc(short(r.last.id))} to ${who(r.last.to)}</small>${tx(r.last.tx)}`]);
    }
    $('record').innerHTML = rows.map(([k, v]) => `<div><dt class="label">${k}</dt><dd>${v}</dd></div>`).join('');
  }

  // ---------- grid of pieces ----------
  function tile(list, i, price) {
    const p = list[i];
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile';
    b.innerHTML = `<div class="pic"></div><div class="cap"><span>${esc(p[1] || '#' + p[0])}</span>${price ? `<span class="price">${price}</span>` : ''}</div>`;
    const pic = b.querySelector('.pic');
    if (p[4] || !/html/.test(p[5])) fillArt(pic, p[2], p[4], p[1]);
    else liveFrame(pic, p[6] || p[3]);
    b.addEventListener('click', () => openViewer(list, i));
    return b;
  }
  // live code pieces with no recorded loop: an iframe, only loaded near the screen
  function liveFrame(box, src) {
    const f = document.createElement('iframe');
    f.loading = 'lazy'; f.src = src; f.title = ''; f.tabIndex = -1;
    f.setAttribute('sandbox', 'allow-scripts');
    f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none';
    box.appendChild(f);
  }
  function paged(list, grid, moreBtn, size = PAGE) {
    let shown = 0;
    const step = () => {
      const end = Math.min(list.length, shown + size);
      for (let i = shown; i < end; i++) grid.appendChild(tile(list, i));
      shown = end;
      moreBtn.hidden = shown >= list.length;
      moreBtn.textContent = `Show more · ${num(list.length - shown)} left`;
    };
    moreBtn.addEventListener('click', step);
    step();
  }
  $('workNote').textContent = `${num(C.pieces.length)} ${C.pieces.length === 1 ? 'piece' : 'pieces'}`;
  paged(C.pieces, $('grid'), $('more'));

  // ---------- side collections ----------
  if (C.family?.length) {
    $('familySec').hidden = false;
    for (const f of C.family) {
      const box = document.createElement('div');
      box.innerHTML = `<h3>${esc(f.title)}</h3><span class="label">${esc([CHAINS[f.chain], f.year, `${num(f.pieces.length)} pieces`, f.holders ? `${num(f.holders)} holders` : ''].filter(Boolean).join(' · '))}</span><div class="grid"></div><button class="btn more" type="button" hidden></button>`;
      $('family').appendChild(box);
      paged(f.pieces, box.querySelector('.grid'), box.querySelector('.more'), 8);
    }
  }

  // ---------- holders ----------
  const H = C.holderList || [];
  $('holdNote').textContent = C.holders ? `${num(C.holders)} wallets` : 'snapshot coming';
  const hl = $('holders');
  const showHolders = (n) => {
    hl.innerHTML = H.slice(0, n).map(([a, k], i) => `<li><span class="n">${i + 1}</span><a href="${addrLink(a)}" target="_blank" rel="noopener">${short(a)}</a><b>${num(k)}</b></li>`).join('');
  };
  showHolders(20);
  if (H.length > 20) {
    const b = document.createElement('button');
    b.className = 'btn more'; b.type = 'button'; b.textContent = `Show top ${Math.min(H.length, 200)}`;
    b.addEventListener('click', () => { showHolders(200); b.remove(); });
    hl.after(b);
  }
  if (!H.length) $('holdSec').hidden = true;

  // ---------- for sale ----------
  const listings = $('listings');
  const linksBox = (why) => `<div class="empty"><p>${why}</p><div class="actions" style="margin:0">` +
    links.filter(market).map((u) => `<a class="btn buy" href="${esc(u)}" target="_blank" rel="noopener">Collect on ${esc(market(u))} ↗</a>`).join('') + '</div></div>';

  if (C.chain === 'tezos') {
    try {
      const contracts = [...new Set(C.pieces.map(contractOf).filter(Boolean))];
      const ids = C.pieces.map((p) => String(p[0]));
      const q = `{ listing_active(where:{fa_contract:{_in:${JSON.stringify(contracts)}}, token:{token_id:{_in:${JSON.stringify(ids)}}}}, order_by:{price_xtz:asc}, limit:500){ price_xtz amount_left token{ token_id fa_contract } } }`;
      const r = await (await fetch('https://data.objkt.com/v3/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q }) })).json();
      const best = new Map();
      for (const l of r.data?.listing_active || []) {
        const k = `${l.token.fa_contract}:${l.token.token_id}`;
        if (!best.has(k)) best.set(k, l.price_xtz / 1e6);
      }
      const forSale = C.pieces.map((p, i) => [i, best.get(`${contractOf(p)}:${p[0]}`)]).filter(([, v]) => v !== undefined).sort((a, b) => a[1] - b[1]);
      $('saleCount').textContent = forSale.length;
      $('buyNote').textContent = forSale.length ? `live from objkt · cheapest first` : 'live from objkt';
      if (forSale.length) {
        const g = document.createElement('div'); g.className = 'grid';
        forSale.forEach(([i, price]) => g.appendChild(tile(C.pieces, i, `${price} ꜩ`)));
        listings.appendChild(g);
      } else listings.innerHTML = linksBox('Nothing listed right now. Every piece is held.');
    } catch { listings.innerHTML = linksBox('Couldn\'t reach objkt just now.'); $('saleCount').textContent = '—'; }
  } else {
    $('saleCount').textContent = '—';
    listings.innerHTML = linksBox(`Live ${chain} listings, with buying right on this page, are being connected next. For now, collect here:`);
  }

  // ---------- pager: previous / next on the timeline ----------
  const at = W.findIndex((w) => w.id === C.id);
  const newer = at > 0 ? W[at - 1] : null, older = at >= 0 && at < W.length - 1 ? W[at + 1] : null;
  $('pager').innerHTML = (newer ? `<a href="work.html?c=${newer.id}"><span class="label">← Newer</span><b>${esc(newer.title)}</b></a>` : '<span></span>') +
    (older ? `<a href="work.html?c=${older.id}"><span class="label">Older →</span><b>${esc(older.title)}</b></a>` : '<span></span>');

  // ---------- viewer: full quality, any list ----------
  const dlg = $('viewer');
  let vList = C.pieces, vAt = 0;
  function openViewer(list, i) {
    vList = list; vAt = (i + list.length) % list.length;
    const p = list[vAt];
    const art = $('vArt'); art.innerHTML = '';
    const kind = p[5] || '', anim = p[6];
    if (anim && /video/.test(kind)) {
      const v = document.createElement('video');
      Object.assign(v, { muted: true, loop: true, playsInline: true, autoplay: true, controls: false, poster: media(p[2]) });
      v.setAttribute('playsinline', ''); v.src = anim; art.appendChild(v); v.play().catch(() => {});
    } else if (anim && /html/.test(kind)) {
      const f = document.createElement('iframe');
      f.src = anim; f.setAttribute('sandbox', 'allow-scripts'); f.title = p[1];
      art.appendChild(f);
    } else {
      const img = document.createElement('img');
      img.alt = p[1]; img.src = media(p[2]);
      const full = new Image(); full.onload = () => { if (vList[vAt] === p) img.src = full.src; }; full.src = media(p[3] || p[2]);
      art.appendChild(img);
    }
    $('vKicker').textContent = `${C.title} · ${vAt + 1} of ${list.length}`;
    $('vTitle').textContent = p[1] || `#${p[0]}`;
    $('vBuy').href = pieceLink(p);
    $('vMint').textContent = '';
    if (C.chain === 'ethereum') pieceMint(p);
    if (!dlg.open) dlg.showModal();
  }
  // who minted this piece and when, read live (Blockscout, no key)
  async function pieceMint(p) {
    const ct = contractOf(p), base = `https://eth.blockscout.com/api/v2/tokens/${ct}/instances/${p[0]}/transfers`;
    try {
      let url = base, last = null;
      for (let n = 0; url && n < 6; n++) {
        const j = await (await fetch(url)).json();
        if (!j.items?.length) break;
        last = j.items[j.items.length - 1];
        url = j.next_page_params ? `${base}?${new URLSearchParams(j.next_page_params)}` : null;
      }
      if (last && vList[vAt] === p) {
        $('vMint').innerHTML = `Minted ${fmtDate(last.timestamp, true)} to <a href="https://etherscan.io/address/${last.to.hash}" target="_blank" rel="noopener">${short(last.to.hash)}</a> · <a href="https://etherscan.io/tx/${last.transaction_hash}" target="_blank" rel="noopener">tx</a>`;
      }
    } catch {}
  }
  $('vClose').addEventListener('click', () => dlg.close());
  $('vPrev').addEventListener('click', () => openViewer(vList, vAt - 1));
  $('vNext').addEventListener('click', () => openViewer(vList, vAt + 1));
  dlg.addEventListener('close', () => { $('vArt').innerHTML = ''; });
  addEventListener('keydown', (e) => {
    if (!dlg.open) return;
    if (e.key === 'ArrowLeft') openViewer(vList, vAt - 1);
    if (e.key === 'ArrowRight') openViewer(vList, vAt + 1);
  });
  // swipe between pieces on a phone
  let sx = null;
  $('vArt').addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  $('vArt').addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 50) openViewer(vList, vAt + (dx < 0 ? 1 : -1));
  });
})();
