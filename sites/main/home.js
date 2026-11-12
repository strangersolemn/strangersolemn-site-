// Home: every collection as one tappable row, grouped by year, newest first.
(() => {
  const W = window.WORKS || [];
  const T = window.TOTALS || {};
  const $ = (id) => document.getElementById(id);

  $('fCols').textContent = W.length;
  $('fPieces').textContent = num(T.pieces);
  $('fCollectors').textContent = num(T.collectors);

  const present = Object.keys(CHAINS).filter((c) => W.some((w) => w.chain === c));
  const chips = $('chains');
  ['all', ...present].forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.chain = c;
    b.textContent = c === 'all' ? 'All' : CHAINS[c];
    b.setAttribute('aria-pressed', c === 'all');
    b.addEventListener('click', () => show(c));
    chips.appendChild(b);
  });

  function show(chain) {
    chips.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.chain === chain));
    const list = W.filter((w) => chain === 'all' || w.chain === chain);
    const years = [...new Set(list.map((w) => w.year))].sort((a, b) => b - a);
    const tl = $('timeline');
    tl.innerHTML = '';
    for (const y of years) {
      const items = list.filter((w) => w.year === y);
      const sec = document.createElement('section');
      sec.className = 'year';
      sec.innerHTML = `<h2>${y}<span>${items.length} ${items.length === 1 ? 'collection' : 'collections'}</span></h2>`;
      for (const w of items) {
        const a = document.createElement('a');
        a.className = 'row';
        a.href = `work.html?c=${encodeURIComponent(w.id)}`;
        const bits = [CHAINS[w.chain], w.supply ? `${num(w.supply)} ${w.supply === 1 ? 'piece' : 'pieces'}` : '', w.family ? `+${w.family} side collections` : ''].filter(Boolean);
        a.innerHTML = `<div class="thumb"></div><div><h3>${esc(w.title)}</h3><span class="label">${esc(bits.join(' · '))}</span></div><span class="go" aria-hidden="true">→</span>`;
        fillArt(a.querySelector('.thumb'), w.cover.still, w.cover.moving, w.title);
        sec.appendChild(a);
      }
      tl.appendChild(sec);
    }
  }
  show('all');
})();
