// Home: a link tree. One button per collection, grouped by chain (like linktr.ee/strangersolemn) or by year.
(() => {
  const W = window.WORKS || [];
  const T = window.TOTALS || {};
  const $ = (id) => document.getElementById(id);

  // links that aren't a collection page on this site, shown in their chain's group
  const EXTRA = [
    { chain: 'ordinals', title: 'Trollbox', sub: 'Live on Bitcoin', url: 'https://trollbox.strangersolemn.art/' },
    { chain: 'ethereum', title: 'SuperRare', sub: '1/1s', url: 'https://superrare.com/strangersolemn' },
    { chain: 'tezos', title: 'objkt', sub: 'Everything on Tezos', url: 'https://objkt.com/profile/tz1V3FzMekAcqftBXAxnY2P7B3LKuZJ4ueuX' },
  ];
  // Solemn's call: Tezos on the home page is just Parrot Party + objkt. The rest keep their own pages.
  const SHOWN = W.filter((w) => w.chain !== 'tezos' || w.id === 'parrot-party');
  const ORDER = ['ordinals', 'ethereum', 'tezos', 'solana'];

  $('stats').textContent = `Manchester · on-chain since 2021 · ${SHOWN.length} collections · ${num(T.collectors)} collectors`;

  function button(w) {
    const a = document.createElement('a');
    a.className = 'link';
    const external = !!w.url;
    a.href = external ? w.url : `work.html?c=${encodeURIComponent(w.id)}`;
    if (external) { a.target = '_blank'; a.rel = 'noopener'; }
    const sub = external ? w.sub
      : [w.year, w.supply ? `${num(w.supply)} ${w.supply === 1 ? 'piece' : 'pieces'}` : '', w.family ? `+${w.family} side collections` : ''].filter(Boolean).join(' · ');
    a.innerHTML = `<span class="thumb"></span><span><b>${esc(w.title)}</b><span class="label" data-sub="${esc(w.id || '')}">${esc(sub)}</span></span><span class="go" aria-hidden="true">${external ? '↗' : '→'}</span>`;
    if (external) a.querySelector('.thumb').classList.add('empty-thumb');
    else fillArt(a.querySelector('.thumb'), w.cover.still, w.cover.moving, w.title);
    return a;
  }

  function show(view) {
    document.querySelectorAll('.view .chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === view));
    const box = $('links');
    box.innerHTML = '';
    const groups = view === 'chain'
      ? ORDER.filter((c) => SHOWN.some((w) => w.chain === c)).map((c) => [CHAINS[c], SHOWN.filter((w) => w.chain === c), EXTRA.filter((e) => e.chain === c)])
      : [...new Set(SHOWN.map((w) => w.year))].sort((a, b) => b - a).map((y) => [String(y), SHOWN.filter((w) => w.year === y), []]);
    for (const [name, works, extra] of groups) {
      const sec = document.createElement('section');
      sec.className = 'tree-sec';
      sec.innerHTML = `<h2 class="label">${esc(name)}</h2>`;
      works.forEach((w) => sec.appendChild(button(w)));
      extra.forEach((e) => sec.appendChild(button(e)));
      box.appendChild(sec);
    }
    liveFrontrun();
  }
  document.querySelectorAll('.view .chip').forEach((b) => b.addEventListener('click', () => show(b.dataset.view)));

  // FRONTRUN's supply goes down as pieces are burned in The Race
  function liveFrontrun() {
    const f = W.find((w) => w.id === 'frontrun');
    if (!f) return;
    liveSupply('frontrun').then((n) => {
      const el = document.querySelector('[data-sub="frontrun"]');
      if (n && el) el.textContent = `${f.year} · ${num(n)} pieces`;
    });
  }
  show('chain');
})();
