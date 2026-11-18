// The Lab: the Gl1tch CC0mposer card and the 21 GL1TCH C0DE5 (CC0).
// Pieces come from data/gl1tch-c0des.json: [inscriptionId, title, thumb, image, moving, kind, ...]
(() => {
  const $ = (id) => document.getElementById(id);
  const toast = (msg) => {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1800);
  };

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }

  // three gl1tch loops stacked with blend modes on the CC0mposer card, like a composition
  function mix(pieces) {
    const box = $('mix');
    [16, 2, 11].map((n) => pieces[n]).filter((p) => p && p[4]).forEach((p) => {
      const v = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, autoplay: true, src: media(p[4]) });
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      box.appendChild(v);
    });
  }

  function tile(p) {
    const [id, title, , , moving] = p;
    const el = document.createElement('article');
    el.className = 'code';
    el.innerHTML = `<div class="art"></div>
      <div class="info"><b>${esc(title.replace('GL1TCH C0DE ', ''))}</b><span class="label id" title="${esc(id)}">${esc(short(id))}</span></div>
      <div class="row2"><button type="button" data-copy>Copy id</button><a href="https://ordinals.com/content/${esc(id)}" target="_blank" rel="noopener">Live ↗</a></div>`;
    fillArt(el.querySelector('.art'), null, moving, title);
    const btn = el.querySelector('[data-copy]');
    btn.addEventListener('click', async () => {
      if (await copy(id)) {
        toast(`${title} id copied`);
        btn.textContent = 'Copied'; btn.classList.add('done');
        setTimeout(() => { btn.textContent = 'Copy id'; btn.classList.remove('done'); }, 1600);
      } else toast('Copy failed. Long-press the id instead.');
    });
    return el;
  }

  fetch('data/gl1tch-c0des.json').then((r) => r.json()).then((C) => {
    const pieces = C.pieces || [];
    const grid = $('grid');
    pieces.forEach((p) => grid.appendChild(tile(p)));
    if (pieces[0]) $('exId').textContent = pieces[0][0];
    mix(pieces);
  }).catch(() => {
    $('grid').innerHTML = '<p class="label">Couldn\'t load the gl1tches. Try again in a moment.</p>';
  });
})();
