// Collectors board. Reads collectors.json (built nightly by scripts/snapshot-collectors.mjs).
// Mount: <div id="board" data-collection="frontrun" data-limit="25" data-cotd="0"></div>
(function () {
  var mount = document.getElementById('board');
  if (!mount) return;
  var CHAINS = [['all', 'All'], ['ethereum', 'ETH'], ['ordinals', 'BTC'], ['tezos', 'TEZ'], ['solana', 'SOL']];
  var SHORT = { ethereum: 'ETH', ordinals: 'BTC', tezos: 'TEZ', solana: 'SOL' };
  var EXPLORER = { ethereum: 'https://opensea.io/', ordinals: 'https://ord.net/address/', tezos: 'https://objkt.com/users/', solana: 'https://solscan.io/account/' };
  var params = new URLSearchParams(location.search);
  var fixed = mount.dataset.collection || '';
  var state = { chain: params.get('chain') || 'all', col: fixed || params.get('c') || '', q: '', shown: +mount.dataset.limit || 100 };
  var step = state.shown, data = null, colCache = {};

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function shortAddr(a) { return a.length > 16 ? a.slice(0, 6) + '…' + a.slice(-5) : a; }
  function label(c) { return c.name || shortAddr(c.a); }
  function count(c) { return state.col ? (c.cols[state.col] || 0) : c.total; }
  function colList(c) {
    return Object.keys(c.cols).sort(function (x, y) { return c.cols[y] - c.cols[x]; })
      .map(function (id) { return { id: id, title: data.titles[id] || id, n: c.cols[id] }; });
  }
  function loadCol(id) {
    return colCache[id] || (colCache[id] = fetch('collections/' + id + '.json').then(function (r) { return r.json(); }).catch(function () { return { pieces: [] }; }));
  }
  function thumbs(c, el) {
    (c.refs || []).forEach(function (ref) {
      loadCol(ref[0]).then(function (col) {
        var p = col.pieces[ref[1]]; if (!p) return;
        var src = p.thumbnail || p.image; if (!src || src.indexOf('data:') === 0) return;
        var img = new Image(); img.loading = 'lazy'; img.alt = p.title || ''; img.title = (p.title || '') + ' · ' + (col.title || '');
        img.onerror = function () { img.remove(); }; img.src = src; el.appendChild(img);
      });
    });
  }
  function filtered() {
    var q = state.q.toLowerCase();
    return data.collectors.filter(function (c) {
      if (state.chain !== 'all' && c.chain !== state.chain) return false;
      if (state.col && !c.cols[state.col]) return false;
      return !q || c.a.toLowerCase().indexOf(q) > -1 || (c.name || '').toLowerCase().indexOf(q) > -1;
    }).sort(function (x, y) { return count(y) - count(x); });
  }

  // Collector of the day: same pick for everyone on a given date; reroll is local only.
  function pickOfDay(offset) {
    var poolC = data.collectors.filter(function (c) { return c.total >= 5 || Object.keys(c.cols).length >= 2; });
    if (!poolC.length) poolC = data.collectors;
    var d = new Date(), seed = d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate() + offset * 7919;
    seed = (seed * 2654435761) % 4294967296;
    return poolC[seed % poolC.length];
  }
  function postText(c) {
    var cl = colList(c), top = cl.slice(0, 3).map(function (x) { return x.title; }).join(', ');
    return 'Collector of the day: ' + label(c) + '\n\n' + c.total + ' piece' + (c.total > 1 ? 's' : '') + ' across ' + cl.length +
      ' collection' + (cl.length > 1 ? 's' : '') + ' (' + top + ').\n\nThank you for holding the work.\nhttps://strangersolemn.art/collectors.html';
  }
  function renderCotd(offset) {
    var box = document.getElementById('cotd'); if (!box || !data.collectors.length) return;
    var c = pickOfDay(offset), cl = colList(c);
    box.innerHTML = '<div class="cotd-label">Collector of the day</div><div class="cotd-name">' + esc(label(c)) + '</div>' +
      '<div class="cotd-meta">' + c.total + ' pieces · ' + cl.length + ' collections · ' + SHORT[c.chain] + '<br>' +
      esc(cl.slice(0, 5).map(function (x) { return x.title + ' ×' + x.n; }).join(' · ')) + '</div><div class="cotd-thumbs"></div>' +
      '<div class="cotd-actions"><button class="board-btn" id="cotd-copy">Copy post</button><button class="board-btn" id="cotd-roll">Reroll</button></div>';
    thumbs(c, box.querySelector('.cotd-thumbs'));
    document.getElementById('cotd-copy').onclick = function () { var b = this; navigator.clipboard.writeText(postText(c)).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy post'; }, 1500); }); };
    document.getElementById('cotd-roll').onclick = function () { renderCotd(offset + 1); };
  }

  function renderList() {
    var rows = filtered(), list = document.getElementById('board-list'), more = document.getElementById('board-more');
    document.getElementById('board-count').textContent = rows.length + ' collector' + (rows.length === 1 ? '' : 's') +
      ' · snapshot ' + new Date(data.updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!rows.length) { list.innerHTML = '<div class="board-empty">Nobody here yet.</div>'; more.hidden = true; return; }
    list.innerHTML = rows.slice(0, state.shown).map(function (c, i) {
      var n = Object.keys(c.cols).length;
      return '<div class="board-row" data-a="' + esc(c.a) + '"><div class="board-row-head"><span class="board-rank">' + (i + 1) + '</span>' +
        '<span class="board-name">' + esc(label(c)) + (c.name ? '<small>' + esc(shortAddr(c.a)) + '</small>' : '') + '</span>' +
        '<span class="chain-badge" data-chain="' + c.chain + '">' + SHORT[c.chain] + '</span>' +
        '<span class="board-total">' + count(c) + '<small>' + (state.col ? 'held' : n + ' coll.') + '</small></span></div></div>';
    }).join('');
    more.hidden = rows.length <= state.shown;
  }
  function toggleRow(row) {
    var open = row.querySelector('.board-detail'); if (open) { open.remove(); return; }
    var c = data.collectors.find(function (x) { return x.a === row.dataset.a; }); if (!c) return;
    var d = document.createElement('div'); d.className = 'board-detail';
    d.innerHTML = colList(c).map(function (x) { return '<a href="collections.html#c/' + esc(x.id) + '">' + esc(x.title) + '</a> ×' + x.n; }).join(' · ') +
      '<br><a href="' + EXPLORER[c.chain] + esc(c.a) + '" target="_blank" rel="noopener">' + esc(c.a) + ' ↗</a><div class="row-thumbs"></div>';
    row.appendChild(d); thumbs(c, d.querySelector('.row-thumbs'));
  }

  function build() {
    var html = '';
    if (mount.dataset.cotd !== '0') html += '<div class="cotd" id="cotd"></div>';
    html += '<div class="board-controls">';
    if (!fixed) html += CHAINS.map(function (c) { return '<button class="board-btn' + (state.chain === c[0] ? ' is-on' : '') + '" data-chain="' + c[0] + '">' + c[1] + '</button>'; }).join('');
    html += '<input class="board-search" id="board-search" type="search" placeholder="Search name, ENS or address…" autocomplete="off" spellcheck="false">';
    if (!fixed) html += '<select class="board-select" id="board-col"><option value="">All collections</option>' +
      Object.keys(data.titles).sort(function (a, b) { return data.titles[a].localeCompare(data.titles[b]); })
        .map(function (id) { return '<option value="' + esc(id) + '"' + (state.col === id ? ' selected' : '') + '>' + esc(data.titles[id]) + '</option>'; }).join('') + '</select>';
    html += '</div><div class="board-count" id="board-count"></div><div class="board-list" id="board-list"></div>' +
      '<button class="board-btn board-more" id="board-more" hidden>Show more</button>';
    mount.innerHTML = html;
    mount.addEventListener('click', function (e) {
      var chip = e.target.closest('.board-controls .board-btn[data-chain]');
      if (chip) { state.chain = chip.dataset.chain; state.shown = step; mount.querySelectorAll('.board-controls .board-btn').forEach(function (b) { b.classList.toggle('is-on', b === chip); }); return renderList(); }
      var head = e.target.closest('.board-row-head'); if (head) toggleRow(head.parentNode);
    });
    document.getElementById('board-search').addEventListener('input', function () { state.q = this.value.trim(); state.shown = step; renderList(); });
    var sel = document.getElementById('board-col'); if (sel) sel.addEventListener('change', function () { state.col = this.value; state.shown = step; renderList(); });
    document.getElementById('board-more').onclick = function () { state.shown += step; renderList(); };
    renderCotd(0); renderList();
    document.dispatchEvent(new CustomEvent('collectors:ready', { detail: data }));
  }

  fetch('collectors.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (d) { data = d; build(); })
    .catch(function () { mount.innerHTML = '<div class="board-empty">Collector data is not available right now.</div>'; });
})();
