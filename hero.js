// About page hero: a framed slideshow of the work with prev / play / shuffle / next.
// The frame takes the shape of each piece: wide video gets a wide frame, live code stays square.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var frame = $('heroFrame'), img = $('heroImg'), video = $('heroVideo'), iframe = $('heroIframe');
  if (!frame) return;
  var DELAY = 10000, SKIP = { 'fiat-mafia': 1, 'glitch-pack': 1 }, FIRST = ['btc-editions', 'frontrun', 'the-masters', 'renascent'];
  var pool = [], past = [], cur = -1, playing = true, shuffle = true, timer = null, token = 0;

  function isVideo(p) {
    var a = p.animationUrl || '';
    if (!a || a.indexOf('data:') === 0 || a.charAt(0) === '<' || a.indexOf('ordinals.com/content/') > -1) return false;
    var l = a.toLowerCase();
    if (/\.(mp4|webm|mov)/.test(l)) return true;
    return (a.indexOf('ipfs.io/ipfs/') > -1 || a.indexOf('arweave.net/') > -1) && !/\.(gif|jpe?g|png|svg)/.test(l);
  }
  function toItem(col, p) {
    var base = { t: (p.title || '').trim() || 'Untitled', c: col.title || '', id: col.id };
    if (isVideo(p)) return Object.assign(base, { k: 'video', u: p.animationUrl });
    var a = p.animationUrl || '';
    if (a.charAt(0) === '<') return Object.assign(base, { k: 'iframe', html: a });
    if ((col.onchain && a) || p.isImage === false || col.id === 'btc-editions' || col.id === 'renascent')
      return (a || p.image) ? Object.assign(base, { k: 'iframe', u: a || p.image }) : null;
    var u = p.image || p.thumbnail;
    return u && u.indexOf('data:') !== 0 ? Object.assign(base, { k: 'img', u: u }) : null;
  }
  function addCollection(id) {
    return fetch('collections/' + id + '.json').then(function (r) { return r.json(); }).then(function (col) {
      (col.pieces || []).forEach(function (p) { var it = toItem(col, p); if (it) pool.push(it); });
      if (cur < 0 && pool.length) go(pick(1), true);
    }).catch(function () {});
  }

  function pick(dir) {
    if (!pool.length) return -1;
    if (shuffle) { var n; do { n = Math.floor(Math.random() * pool.length); } while (pool.length > 1 && n === cur); return n; }
    return (cur + dir + pool.length) % pool.length;
  }
  function schedule() { clearTimeout(timer); if (playing) timer = setTimeout(function () { go(pick(1), true); }, DELAY); }
  function go(n, remember) {
    if (n < 0 || !pool[n]) return;
    if (remember && cur >= 0) { past.push(cur); if (past.length > 60) past.shift(); }
    cur = n; var it = pool[n], my = ++token;
    frame.classList.add('is-loading');
    setTimeout(function () {
      if (my !== token) return;
      img.hidden = video.hidden = iframe.hidden = true;
      video.pause(); video.removeAttribute('src'); iframe.removeAttribute('src');
      var done = function () { if (my === token) frame.classList.remove('is-loading'); };
      var fail = function () { if (my === token) go(pick(1), false); };
      if (it.k === 'img') { img.onload = done; img.onerror = fail; img.alt = it.t; img.src = it.u; img.hidden = false; }
      else if (it.k === 'video') { video.onloadeddata = done; video.onerror = fail; video.src = it.u; video.hidden = false; video.play().catch(function () {}); }
      else { iframe.onload = done; iframe.src = it.html ? URL.createObjectURL(new Blob([it.html], { type: 'text/html' })) : it.u; iframe.hidden = false; }
      setTimeout(done, 5000);
      $('heroTitle').textContent = it.t;
      var c = $('heroColl'); c.textContent = it.c; c.href = 'collections.html#c/' + it.id;
    }, 300);
    schedule();
  }
  function setPlaying(on) {
    playing = on; $('heroPlay').classList.toggle('is-on', on);
    $('heroPlay').setAttribute('aria-label', on ? 'Pause slideshow' : 'Play slideshow');
    $('heroPlay').innerHTML = on
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="7,4 20,12 7,20"/></svg>';
    schedule();
  }
  function prev() { if (past.length) go(past.pop(), false); else go(pick(-1), false); }

  $('heroNext').onclick = function () { go(pick(1), true); };
  $('heroPrev').onclick = prev;
  $('heroPlay').onclick = function () { setPlaying(!playing); };
  $('heroShuffle').onclick = function () { shuffle = !shuffle; this.classList.toggle('is-on', shuffle); if (shuffle) go(pick(1), true); };
  document.addEventListener('keydown', function (e) {
    if (/input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') go(pick(1), true);
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) clearTimeout(timer); else schedule(); });

  setPlaying(true); $('heroShuffle').classList.add('is-on');
  // Featured collections first so art shows fast, then everything else quietly in the background.
  FIRST.reduce(function (p, id) { return p.then(function () { return addCollection(id); }); }, Promise.resolve())
    .then(function () { return fetch('collections/manifest.json').then(function (r) { return r.json(); }); })
    .then(function (m) {
      return m.map(function (c) { return c.id; }).filter(function (id) { return !SKIP[id] && FIRST.indexOf(id) < 0; })
        .reduce(function (p, id) { return p.then(function () { return addCollection(id); }); }, Promise.resolve());
    }).catch(function () {});
})();
