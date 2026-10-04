/**
 * STRANGER SOLEMN - Official Site Script
 * CMS: loads collections from /collections/manifest.json + per-collection JSON
 * Features: chain filters, search, display mode
 */

const COLLECTIONS_BASE = 'collections/';
let collectionsManifest = [];
const collectionCache = {};

const views = {
  home: document.getElementById('view-home'),
  detail: document.getElementById('view-detail')
};

const menuToggle = document.getElementById('menu-toggle');
const timelinePanel = document.getElementById('timeline-panel');
const timeline = document.getElementById('timeline');
const featuredArt = document.getElementById('featured-art');
const featuredIframe = document.getElementById('featured-iframe');
const artTitle = document.getElementById('art-title');
const artChain = document.getElementById('art-chain');
const detailImage = document.getElementById('detail-image');
const detailIframe = document.getElementById('detail-iframe');
const detailVideo = document.getElementById('detail-video');
const detailTitle = document.getElementById('detail-title');
const detailChain = document.getElementById('detail-chain');
const detailMetadata = document.getElementById('detail-metadata');
const displayMode = document.getElementById('display-mode');
const displayArt = document.getElementById('display-art');
const displayIframe = document.getElementById('display-iframe');
const displayTitle = document.getElementById('display-title');
const displayCollection = document.getElementById('display-collection');

let currentCollectionId = null;
let currentCarouselCollection = null;
let currentPieceIndex = 0;
let slideshowTimer = null;
let displayModeCollection = null; // when set, display mode stays within this collection
let activeChainFilter = null;

const chainNames = {
  ordinals: 'BTC',
  ethereum: 'ETH',
  tezos: 'TEZ',
  solana: 'SOL'
};

async function loadManifest() {
  const r = await fetch(COLLECTIONS_BASE + 'manifest.json?v=' + Date.now());
  collectionsManifest = await r.json();
  return collectionsManifest;
}

async function loadCollection(id) {
  if (collectionCache[id]) return collectionCache[id];
  const r = await fetch(COLLECTIONS_BASE + id + '.json?v=' + Date.now());
  const data = await r.json();
  collectionCache[id] = data;
  return data;
}

// the playable video for a piece: its animation, or an image field that is really a video
function videoUrl(piece) {
  if (piece?.animType === 'video' || (!piece?.animType && piece?.animationUrl && !piece.animationUrl.startsWith('data:'))) return piece.animationUrl;
  if (piece?.imageType === 'video') return piece.image;
  return piece?.animationUrl || '';
}

function pieceNeedsVideo(piece) {
  if (piece?.imageType === 'video' && (!piece.animationUrl || piece.animType === 'video')) return true;
  if (piece?.animType) return piece.animType === 'video';
  const anim = piece?.animationUrl || '';
  if (!anim || anim.startsWith('data:') || anim.startsWith('<')) return false;
  if (anim.includes('ordinals.com/content/')) return false;
  const lower = anim.toLowerCase();
  if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov')) return true;
  // IPFS/Arweave URLs without image extensions are likely video
  if ((anim.includes('ipfs.io/ipfs/') || anim.includes('arweave.net/')) &&
      !lower.includes('.gif') && !lower.includes('.jpg') && !lower.includes('.jpeg') && !lower.includes('.png') && !lower.includes('.svg')) return true;
  return false;
}

/* ===== PLAYBACK: every piece moves, wherever it appears =====
   Best moving version of a piece for small/ambient spots (grid, rotations, display mode):
   1. a recorded preview loop (art/previews/…, made by scripts/render-previews.mjs) — smooth, tiny
   2. its own video or animated GIF (types checked by scripts/media-types.mjs)
   3. the live code itself, in an iframe — only while it is on screen
   4. a still, only when the piece genuinely is one */
function movingMedia(collection, piece) {
  if (piece.preview) return { type: 'video', src: piece.preview, gif: piece.previewGif };
  if (piece.loop) return { type: 'video', src: piece.loop };   // light loop of a heavy GIF/video (original plays when opened)
  if (pieceNeedsVideo(piece)) return { type: 'video', src: videoUrl(piece) };
  if (piece.animType === 'gif') return { type: 'img', src: piece.animationUrl };
  if (piece.imageType === 'gif') return { type: 'img', src: piece.image };
  if (pieceNeedsIframe(collection, piece)) return { type: 'iframe', src: getIframeUrl(piece) };
  const still = getThumbnailUrl(piece);
  if (still && still.includes('ordinals.com/content/')) return { type: 'img-or-iframe', src: still };
  return { type: 'img', src: piece.imageType === 'still' ? (piece.thumbnail || piece.image) : (piece.image || piece.thumbnail) };
}

// Plays what is on screen, stops what is not. Live iframes are capped so a big grid never chokes.
const MAX_LIVE = window.innerWidth < 768 ? 6 : 16;   // live code pieces running at once
let liveCount = 0;
const playObserver = ('IntersectionObserver' in window) ? new IntersectionObserver(entries => {
  entries.forEach(e => {
    const el = e.target;
    if (e.isIntersecting) startPlayer(el);
    else {
      if (el.tagName === 'VIDEO') el.pause();
      else if (el.tagName === 'IFRAME' && el.dataset.live) { el.removeAttribute('src'); delete el.dataset.live; liveCount = Math.max(0, liveCount - 1); }
    }
  });
}, { rootMargin: '150px' }) : null;

function makeThumbMedia(media, title, onFail) {
  if (media.type === 'video') {
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.dataset.src = media.src;
    v.onerror = onFail;
    if (!playObserver) { v.src = media.src; v.autoplay = true; }
    return v;
  }
  if (media.type === 'iframe') {
    const f = document.createElement('iframe');
    f.dataset.src = media.src; f.sandbox = 'allow-scripts'; f.scrolling = 'no';
    f.className = 'piece-thumb-iframe'; f.title = title || '';
    if (!playObserver) f.src = media.src;
    return f;
  }
  const img = document.createElement('img');
  img.src = media.src; img.alt = title || ''; img.loading = 'lazy'; img.decoding = 'async';
  img.onerror = onFail;
  return img;
}

// Start watching players once they are in the page (Chrome ignores ones registered while detached)
function watchPlayers(root) {
  if (!root) return;
  const els = root.matches && root.matches('video, iframe') ? [root] : [...root.querySelectorAll('video[data-src], iframe[data-src]')];
  if (playObserver) els.forEach(el => playObserver.observe(el));
  setTimeout(kickVisiblePlayers, 50); setTimeout(kickVisiblePlayers, 600);
}
// Some browsers/tabs never deliver the first "on screen" signal, so also start anything that
// is on screen by geometry: after each page of thumbnails, on scroll, resize and tab focus.
function startPlayer(el) {
  if (el.tagName === 'VIDEO') { if (!el.getAttribute('src')) el.src = el.dataset.src; if (el.paused) el.play().catch(() => {}); }
  else if (el.tagName === 'IFRAME' && !el.dataset.live && liveCount < MAX_LIVE) { el.src = el.dataset.src; el.dataset.live = '1'; liveCount++; }
}
function kickVisiblePlayers() {
  const h = window.innerHeight + 150, w = window.innerWidth + 150;
  document.querySelectorAll('.piece-grid video[data-src], .piece-grid iframe[data-src]').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width && r.bottom > -150 && r.top < h && r.right > -150 && r.left < w) startPlayer(el);
  });
}
let kickTimer = null;
function kickSoon() { clearTimeout(kickTimer); kickTimer = setTimeout(kickVisiblePlayers, 120); }
document.addEventListener('scroll', kickSoon, true);
window.addEventListener('resize', kickSoon);
document.addEventListener('visibilitychange', () => { if (!document.hidden) kickVisiblePlayers(); });

function pieceNeedsIframe(collection, piece) {
  if (pieceNeedsVideo(piece)) return false;
  if (collection.onchain && piece.animationUrl) return true;
  if (piece.animationUrl && piece.animationUrl.startsWith('<')) return true;
  if (piece.isImage === false) return true;
  return false;
}

function getStaticImageUrl(piece) {
  return piece.image || piece.thumbnail || '';
}

function getThumbnailUrl(piece) {
  return piece.thumbnail || piece.image || '';
}

function getIframeUrl(piece) {
  if (piece.animationUrl && piece.animationUrl.startsWith('<')) {
    const blob = new Blob([piece.animationUrl], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }
  return piece.animationUrl || piece.image || '';
}

async function init() {
  menuToggle.addEventListener('click', () => timelinePanel.classList.toggle('open'));
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => showView(el.dataset.view));
  });
  await loadManifest();
  buildTimeline();
  initChainFilters();
  initSearch();
  // Preload all collections in background so slideshow can pick randomly
  collectionsManifest.forEach(c => loadCollection(c.id));
  // Deep-link on load: if the URL points at a real collection, open it instead of the slideshow.
  window.addEventListener('hashchange', handleHashRoute);
  const hm = location.hash.match(/^#c\/(.+)$/);
  const hashId = hm ? decodeURIComponent(hm[1]) : null;
  if (hashId && collectionsManifest.find(c => c.id === hashId)) {
    await showDetail(hashId);
    return;
  }
  // Start with a random piece immediately
  if (collectionsManifest.length > 0) {
    await showRandomArt();
  }
  // Start home slideshow
  startSlideshow();
}

function showView(viewName) {
  Object.entries(views).forEach(([name, el]) => {
    if (el) el.classList.toggle('active', name === viewName);
  });
  if (viewName === 'home') {
    timelinePanel.classList.remove('hidden');
    currentCollectionId = null;
    // Drop the collection hash from the URL without triggering a route change.
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    startSlideshow();
  } else {
    stopSlideshow();
  }
}

// Deep-link routing: open the collection named in #c/<id>, or fall back home.
function handleHashRoute() {
  const m = location.hash.match(/^#c\/(.+)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    if (currentCollectionId === id && views.detail?.classList.contains('active')) return;
    if (collectionsManifest.find(c => c.id === id)) { showDetail(id); return; }
  }
  if (views.detail?.classList.contains('active')) showView('home');
}

function buildTimeline() {
  timeline.innerHTML = '';
  const byYear = {};
  collectionsManifest.forEach(c => {
    const y = c.year || 'Unknown';
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(c);
  });
  Object.keys(byYear).sort((a,b) => b - a).forEach(year => {
    const yearEl = document.createElement('div');
    yearEl.className = 'timeline-year';
    yearEl.textContent = year;
    timeline.appendChild(yearEl);
    byYear[year].forEach(col => {
      const item = document.createElement('div');
      item.className = 'timeline-item';
      item.dataset.chain = col.chain;
      item.dataset.id = col.id;
      const badge = document.createElement('span');
      badge.className = 'chain-badge';
      badge.dataset.chain = col.chain;
      badge.textContent = chainNames[col.chain] || col.chain;
      const title = document.createElement('span');
      title.className = 'timeline-title';
      title.textContent = col.title;
      const count = document.createElement('span');
      count.className = 'timeline-count';
      count.textContent = col.uniquePieces || col.supply || '';
      item.appendChild(badge);
      item.appendChild(title);
      item.appendChild(count);
      item.addEventListener('click', () => showDetail(col.id));
      timeline.appendChild(item);
    });
  });
}

function initChainFilters() {
  // Create a filter indicator bar above the timeline
  const filterBar = document.createElement('div');
  filterBar.id = 'filter-bar';
  filterBar.style.cssText = 'display:none; padding:6px 14px; background:rgba(255,255,255,0.05); border-bottom:1px solid rgba(255,255,255,0.08); font-family:Space Mono,monospace; font-size:10px; color:rgba(255,255,255,0.5); cursor:pointer;';
  filterBar.innerHTML = 'Showing: <span id="filter-label" style="color:#fff;font-weight:bold;"></span> &nbsp;<span style="opacity:0.4">— click to show all</span>';
  filterBar.addEventListener('click', () => {
    activeChainFilter = null;
    document.querySelectorAll('.legend-item').forEach(e => e.classList.remove('active'));
    document.querySelector('.chain-legend')?.classList.remove('chain-legend-active');
    filterBar.style.display = 'none';
    filterTimeline(null);
  });
  timeline.parentNode.insertBefore(filterBar, timeline);

  document.querySelectorAll('.legend-item').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      const chain = el.dataset.chain;
      if (activeChainFilter === chain) {
        activeChainFilter = null;
        document.querySelectorAll('.legend-item').forEach(e => e.classList.remove('active'));
        document.querySelector('.chain-legend')?.classList.remove('chain-legend-active');
        filterBar.style.display = 'none';
      } else {
        document.querySelectorAll('.legend-item').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
        activeChainFilter = chain;
        document.querySelector('.chain-legend')?.classList.add('chain-legend-active');
        const label = document.getElementById('filter-label');
        if (label) label.textContent = chainNames[chain] || chain;
        filterBar.style.display = 'block';
      }
      filterTimeline(activeChainFilter);
    });
  });
}

function filterTimeline(chain) {
  if (document.getElementById('search-input')?.value.trim().length > 0) return;
  document.querySelectorAll('.timeline-item').forEach(item => {
    item.style.display = (!chain || item.dataset.chain === chain) ? '' : 'none';
  });
  document.querySelectorAll('.timeline-year').forEach(yearEl => {
    let next = yearEl.nextElementSibling;
    let hasVisible = false;
    while (next && !next.classList.contains('timeline-year')) {
      if (next.style.display !== 'none' && next.classList.contains('timeline-item')) { hasVisible = true; break; }
      next = next.nextElementSibling;
    }
    yearEl.style.display = hasVisible ? '' : 'none';
  });
}

function initSearch() {
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  if (!searchInput) return;
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    searchClear.hidden = !query;
    if (!query) {
      showTimeline();
      filterTimeline(activeChainFilter);
      return;
    }
    runSearch(query);
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.hidden = true;
    showTimeline();
    filterTimeline(activeChainFilter);
  });
}

function showTimeline() {
  document.querySelectorAll('.search-results').forEach(el => el.remove());
  document.querySelectorAll('.timeline-year, .timeline-item').forEach(el => el.style.display = '');
}

function runSearch(query) {
  document.querySelectorAll('.timeline-year, .timeline-item').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.search-results').forEach(el => el.remove());
  const results = [];
  collectionsManifest.forEach(col => {
    if (col.title.toLowerCase().includes(query)) results.push({ type: 'collection', col });
    if (collectionCache[col.id]?.pieces) {
      collectionCache[col.id].pieces.forEach((piece, idx) => {
        if (piece.title && piece.title.toLowerCase().includes(query)) results.push({ type: 'piece', col, piece, idx });
      });
    }
  });
  const container = document.createElement('div');
  container.className = 'search-results';
  if (!results.length) {
    const empty = document.createElement('div');
    empty.className = 'search-empty';
    empty.textContent = 'No results for "' + query + '"';
    container.appendChild(empty);
  } else {
    results.forEach(r => {
      const el = document.createElement('div');
      el.className = 'search-result-item';
      const badge = document.createElement('span');
      badge.className = 'chain-badge';
      badge.dataset.chain = r.col.chain;
      badge.textContent = chainNames[r.col.chain] || r.col.chain;
      el.appendChild(badge);
      if (r.type === 'collection') {
        const t = document.createElement('span');
        t.textContent = r.col.title;
        el.appendChild(t);
        el.addEventListener('click', () => showDetail(r.col.id));
      } else {
        const t = document.createElement('span');
        t.textContent = r.piece.title;
        el.appendChild(t);
        const sub = document.createElement('span');
        sub.className = 'result-collection-name';
        sub.textContent = ' — ' + r.col.title;
        el.appendChild(sub);
        el.addEventListener('click', async () => {
          await showDetail(r.col.id);
          showPieceByIndex(r.idx);
        });
      }
      container.appendChild(el);
    });
  }
  timeline.appendChild(container);
}

function showHeroMedia(collection, piece) {
  if (!piece) return;
  const featuredVideo = document.getElementById('featured-video');
  // Hide all hero media
  if (featuredArt) featuredArt.style.display = 'none';
  if (featuredIframe) featuredIframe.style.display = 'none';
  if (featuredVideo) { featuredVideo.style.display = 'none'; featuredVideo.pause(); featuredVideo.removeAttribute('src'); }
  if (piece.preview || pieceNeedsVideo(piece)) {
    if (featuredVideo) {
      featuredVideo.style.display = 'block';
      featuredVideo.src = piece.preview || videoUrl(piece);
      featuredVideo.load();
      featuredVideo.play().catch(() => {});
    }
  } else if (pieceNeedsIframe(collection, piece)) {
    if (featuredIframe) {
      featuredIframe.style.display = 'block';
      featuredIframe.src = getIframeUrl(piece);
    }
  } else {
    if (featuredArt) {
      featuredArt.style.display = 'block';
      featuredArt.src = getStaticImageUrl(piece);
    }
  }
}

async function showDetail(collectionId) {
  currentCollectionId = collectionId;
  const collection = await loadCollection(collectionId);
  // Merge manifest-level fields (galleryUrl, marketplaces) into collection data
  const manifestEntry = collectionsManifest.find(c => c.id === collectionId);
  if (manifestEntry) {
    if (manifestEntry.galleryUrl) collection.galleryUrl = manifestEntry.galleryUrl;
    if (manifestEntry.marketplaces) collection.marketplaces = { ...collection.marketplaces, ...manifestEntry.marketplaces };
    if (manifestEntry.xArticles) collection.xArticles = manifestEntry.xArticles;
    // Fill any scalar info fields the per-collection JSON is missing from the manifest.
    ['chain','year','supply','uniquePieces','contract','description','artistNote','minted','onchain','isCollab','isEditions'].forEach(k => {
      if (collection[k] == null && manifestEntry[k] != null) collection[k] = manifestEntry[k];
    });
  }
  currentCarouselCollection = collection;
  currentPieceIndex = 0;
  if (detailTitle) detailTitle.textContent = collection.title;
  if (detailChain) {
    detailChain.textContent = chainNames[collection.chain] || collection.chain;
    detailChain.dataset.chain = collection.chain;
    // Add meta (count · year) outside the badge
    let existingMeta = document.getElementById('chain-meta-info');
    if (!existingMeta) {
      existingMeta = document.createElement('span');
      existingMeta.id = 'chain-meta-info';
      existingMeta.className = 'chain-meta';
      detailChain.parentNode.insertBefore(existingMeta, detailChain.nextSibling);
    }
    const small = [];
    if (collection.supply) small.push(collection.supply);
    if (collection.year) small.push(collection.year);
    existingMeta.textContent = small.length ? small.join(' · ') : '';
    existingMeta.style.display = small.length ? '' : 'none';
  }
  if (detailMetadata) {
    let meta = '';
    if (collection.description) meta += '<p class="collection-desc">' + collection.description + '</p>';
    if (collection.artistNote) meta += '<p class="artist-note">' + collection.artistNote + '</p>';
    // Structured info table — reads whatever fields exist; extra fields (minted, etc.) drop in automatically.
    const rows = [];
    const chainFull = { ordinals: 'Bitcoin Ordinals', ethereum: 'Ethereum', tezos: 'Tezos', solana: 'Solana' };
    if (collection.chain) rows.push(['Chain', chainFull[collection.chain] || collection.chain]);
    if (collection.year) rows.push(['Year', collection.year]);
    if (collection.minted) rows.push(['Minted', collection.minted]);
    if (collection.supply) rows.push(['Supply', collection.supply]);
    if (collection.uniquePieces && collection.uniquePieces !== collection.supply) rows.push(['Unique pieces', collection.uniquePieces]);
    if (collection.isEditions) rows.push(['Format', 'Editions']);
    if (collection.isCollab) rows.push(['Type', 'Collaboration']);
    if (collection.onchain) rows.push(['Storage', 'Fully on-chain']);
    if (collection.contract) {
      const c = collection.contract;
      const short = c.length > 14 ? c.slice(0, 6) + '…' + c.slice(-4) : c;
      let url = null;
      if (collection.chain === 'ethereum') url = 'https://etherscan.io/address/' + c;
      rows.push(['Contract', url ? '<a href="' + url + '" target="_blank" rel="noopener" class="meta-link">' + short + '</a>' : short]);
    }
    if (rows.length) {
      meta += '<div class="collection-info">';
      rows.forEach(r => { meta += '<div class="meta-row"><span class="meta-label">' + r[0] + '</span><span class="meta-value">' + r[1] + '</span></div>'; });
      meta += '</div>';
    }
    detailMetadata.innerHTML = meta;
  }
  const mps = collection.marketplaces || {};
  const gl = document.getElementById('link-gallery');
  const or = document.getElementById('link-ordinals');
  if (gl) {
    gl.href = collection.galleryUrl || '#';
    gl.style.display = collection.galleryUrl ? '' : 'none';
    gl.classList.toggle('hidden', !collection.galleryUrl);
  }
  if (or) { or.href = mps.ordinals || '#'; or.style.display = mps.ordinals ? '' : 'none'; }
  // Single "Marketplace" link — picks the first available marketplace URL
  const marketplaceUrl = mps['ord-net'] || mps.opensea || mps.objkt || mps.superrare || mps['exchange-art'] || null;
  let mp = document.getElementById('link-marketplace');
  if (!mp) {
    mp = document.createElement('a');
    mp.id = 'link-marketplace';
    mp.className = 'detail-link';
    mp.target = '_blank';
    mp.rel = 'noopener';
    mp.textContent = 'Marketplace';
    document.querySelector('.marketplace-links')?.appendChild(mp);
  }
  if (marketplaceUrl) {
    mp.href = marketplaceUrl;
    mp.style.display = '';
  } else {
    mp.style.display = 'none';
  }
  // X Articles links
  const prevXLinks = document.querySelectorAll('.x-article-detail-link');
  prevXLinks.forEach(el => el.remove());
  if (collection.xArticles && collection.xArticles.length > 0) {
    const container = document.querySelector('.marketplace-links');
    collection.xArticles.forEach((xa, i) => {
      const a = document.createElement('a');
      a.className = 'detail-link x-article-detail-link';
      a.target = '_blank';
      a.rel = 'noopener';
      a.href = xa.url;
      a.textContent = '𝕏 ' + xa.title;
      container?.appendChild(a);
    });
  }
  if (collection.pieces && collection.pieces.length > 0) {
    showPiece(collection, 0);
    buildPieceGrid(collection);
    staggerPieceGrid();
    applyDetailReveals();
  } else {
    // Clear stale piece grid and artwork from previous collection
    const grid = document.querySelector('.piece-grid') || document.getElementById('art-collection');
    if (grid) grid.innerHTML = '';
    const detImg = document.getElementById('detail-image');
    const detIframe = document.getElementById('detail-iframe');
    const detVideo = document.getElementById('detail-video');
    if (detImg) { detImg.src = ''; detImg.style.display = 'none'; }
    if (detIframe) { detIframe.src = ''; detIframe.style.display = 'none'; }
    if (detVideo) { detVideo.src = ''; detVideo.classList.add('hidden'); }
  }
  showView('detail');
  timelinePanel.classList.remove('open');
  // Deep-link: reflect the open collection in the URL so it can be shared / bookmarked.
  const targetHash = '#c/' + collectionId;
  if (location.hash !== targetHash) location.hash = targetHash;
}

function buildPieceGrid(collection) {
  const grid = document.querySelector('.piece-grid') || document.getElementById('art-collection');
  if (!grid) return;
  grid.querySelectorAll('video, iframe').forEach(el => { if (playObserver) playObserver.unobserve(el); });
  liveCount = 0;
  grid.innerHTML = '';
  // Deduplicate editions: if uniquePieces < total, only show first occurrence of each image
  let piecesToShow = collection.pieces;
  if (collection.uniquePieces && collection.uniquePieces < collection.pieces.length) {
    const seen = new Set();
    piecesToShow = collection.pieces.filter(p => {
      const key = p.image || p.thumbnail || p.animationUrl || '';
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  const PAGE = 48;
  let shown = 0;
  function makeThumb(piece) {
    const btn = document.createElement('button');
    btn.className = 'piece-thumb';
    btn.setAttribute('aria-label', 'Display this piece');
    const media = movingMedia(collection, piece);
    const placeholder = () => btn.classList.add('piece-thumb-placeholder');
    if (media.type === 'img-or-iframe') {
      // Ordinals content of unknown type: an <img> works for image inscriptions, else run it live
      const img = makeThumbMedia({ type: 'img', src: media.src }, piece.title, function () {
        this.remove();
        const live = makeThumbMedia({ type: 'iframe', src: piece.animationUrl || media.src }, piece.title);
        btn.insertBefore(live, btn.firstChild); watchPlayers(live);
      });
      btn.appendChild(img);
    } else {
      btn.appendChild(makeThumbMedia(media, piece.title, function () {
        // a broken video/gif falls back to the still, then to a labelled placeholder
        const still = piece.thumbnail || piece.image;
        if (this.tagName !== 'IMG' && still && !still.includes('ordinals.com/content/')) {
          const img = makeThumbMedia({ type: 'img', src: still }, piece.title, function () { this.remove(); placeholder(); });
          this.replaceWith(img);
        } else { this.remove(); placeholder(); }
      }));
    }
    if (piece.title) {
      const label = document.createElement('span');
      label.className = 'piece-thumb-label';
      label.textContent = piece.title;
      btn.appendChild(label);
    }
    const originalIdx = collection.pieces.indexOf(piece);
    btn.addEventListener('click', () => {
      currentPieceIndex = originalIdx;
      showPiece(collection, originalIdx);
    });
    return btn;
  }
  // Big collections (Fiat Mafia has 2,693) load a page at a time as you scroll
  const sentinel = document.createElement('div');
  sentinel.className = 'piece-grid-more';
  function addPage() {
    const frag = document.createDocumentFragment();
    const made = piecesToShow.slice(shown, shown + PAGE).map(makeThumb);
    made.forEach(b => frag.appendChild(b));
    shown = Math.min(piecesToShow.length, shown + PAGE);
    grid.insertBefore(frag, sentinel);
    made.forEach(watchPlayers);
    sentinel.textContent = shown < piecesToShow.length ? `${shown} / ${piecesToShow.length}` : '';
    if (shown >= piecesToShow.length && moreObserver) moreObserver.disconnect();
  }
  grid.appendChild(sentinel);
  const moreObserver = ('IntersectionObserver' in window) ? new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) addPage(); }, { root: null, rootMargin: '400px' }) : null;
  addPage();
  if (moreObserver) moreObserver.observe(sentinel);
  else while (shown < piecesToShow.length) addPage();
}

function hideDetailMedia() {
  if (detailImage) detailImage.style.display = 'none';
  if (detailIframe) detailIframe.style.display = 'none';
  if (detailVideo) { detailVideo.style.display = 'none'; detailVideo.pause(); detailVideo.removeAttribute('src'); }
}

/* ===== SHARE: collectors can save the piece as a GIF or a 9:16 story, no screen recording =====
   Files come from scripts/make-share.py (previewGif = square GIF, story = 720x1280 mp4).
   On phones the share sheet opens (Save to Photos, post to X / Instagram); on laptops it downloads. */
function shareName(piece, ext) {
  const t = (piece.title || 'strangersolemn').trim().toLowerCase().replace(/[^a-z0-9#]+/g, '-').replace(/#/g, '').replace(/^-+|-+$/g, '');
  return `${t || 'piece'}-strangersolemn.${ext}`;
}
async function shareFile(btn, url, name, type, piece) {
  const label = btn.textContent;
  btn.textContent = 'Preparing…'; btn.disabled = true;
  try {
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], name, { type });
    const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: `${(piece.title || '').trim()} by @strangersolemn · strangersolemn.art` }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  } catch (e) {
    window.open(url, '_blank', 'noopener');   // last resort: open it, the browser can save it
  } finally { btn.textContent = label; btn.disabled = false; }
}
function updateShareButtons(piece) {
  const box = document.querySelector('.marketplace-links');
  if (!box) return;
  let wrap = document.getElementById('share-links');
  if (!wrap) {
    wrap = document.createElement('span');
    wrap.id = 'share-links'; wrap.className = 'share-links';
    wrap.innerHTML = '<button class="detail-link share-btn" id="share-gif" title="Save as a square GIF">&darr; GIF</button>' +
      '<button class="detail-link share-btn" id="share-story" title="Save as a 9:16 video for stories">&darr; Story 9:16</button>' +
      '<button class="detail-link" id="share-live" title="Run the real on-chain code" hidden>&#9654; Live</button>';
    box.insertBefore(wrap, box.firstChild);
  }
  const g = document.getElementById('share-gif'), st = document.getElementById('share-story');
  g.hidden = !piece.previewGif; st.hidden = !piece.story;
  wrap.hidden = !piece.previewGif && !piece.story && !piece.preview;
  g.onclick = () => shareFile(g, piece.previewGif, shareName(piece, 'gif'), 'image/gif', piece);
  st.onclick = () => shareFile(st, piece.story, shareName(piece, 'mp4'), 'video/mp4', piece);
}

function showPiece(collection, index) {
  const piece = collection.pieces[index];
  if (!piece) return;
  currentPieceIndex = index;
  updateShareButtons(piece);
  hideDetailMedia();
  const liveBtn = document.getElementById('share-live');
  if (piece.preview && !piece._showLive) {
    // recorded loop plays instantly and smoothly; the "Live" button runs the real on-chain code
    if (detailVideo) {
      detailVideo.classList.remove('hidden'); detailVideo.controls = false;
      detailVideo.style.display = 'block'; detailVideo.muted = true; detailVideo.loop = true;
      detailVideo.src = piece.preview; detailVideo.load(); detailVideo.play().catch(() => {});
    }
    if (liveBtn) { liveBtn.hidden = !pieceNeedsIframe(collection, piece); liveBtn.textContent = '▶ Live'; liveBtn.onclick = () => { piece._showLive = true; showPiece(collection, index); }; }
    return;
  }
  if (liveBtn) {
    liveBtn.hidden = !piece.preview;
    liveBtn.textContent = '◼ Loop';
    liveBtn.onclick = () => { piece._showLive = false; showPiece(collection, index); };
  }
  if (pieceNeedsVideo(piece)) {
    if (detailVideo) {
      detailVideo.classList.remove('hidden'); detailVideo.controls = true;
      detailVideo.style.display = 'block';
      detailVideo.src = videoUrl(piece);
      detailVideo.load();
      detailVideo.play().catch(() => {});
    }
  } else if (pieceNeedsIframe(collection, piece)) {
    if (detailIframe) {
      detailIframe.style.display = 'block';
      detailIframe.src = getIframeUrl(piece);
    }
  } else {
    if (detailImage) {
      detailImage.style.display = 'block';
      detailImage.src = piece.animType === 'gif' ? piece.animationUrl : getStaticImageUrl(piece);
    }
  }
}

function showPieceByIndex(idx) {
  if (currentCarouselCollection?.pieces[idx]) showPiece(currentCarouselCollection, idx);
}

function downloadCurrentPiece() {
  if (!currentCarouselCollection || currentPieceIndex == null) return;
  const piece = currentCarouselCollection.pieces[currentPieceIndex];
  if (!piece) return;
  if (piece.previewGif) { const b = document.querySelector('.download-btn'); if (b) return shareFile(b, piece.previewGif, shareName(piece, 'gif'), 'image/gif', piece); }
  const imageUrl = piece.image || piece.thumbnail || piece.animationUrl || '';
  if (!imageUrl) return;
  // Open image in new tab — user can save from there
  const a = document.createElement('a');
  a.href = imageUrl;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

let lastSlideshowColId = null;
// Collections excluded from main slideshow (iframe-based, render left-aligned)
// (the others used to be here too; they now have recorded previews that play cleanly)
const slideshowExclude = new Set(['glitch-pack']);

const slideshowWeights = {
  'everyday-strange': 40,
  'stranger-days': 40,
  'the-ord-lot': 4,
  'one-of-one-originals': 3,
  'boutique': 3,
  'btc-editions': 3,
  'strange-punks': 2,
  'strangers-pets': 2,
  'hic-et-nunc': 2,
  'parrot-party': 2,
  'cc0-party': 2,
  'editions-by-solemn': 2,
  'safari': 2,
  'reflections': 2,
  'glitch-bomb': 2,
  'fck-knows': 2,
  'strange-occurances': 2,
  'the-creeps': 1,
  'tez-misc': 1,
  'ether-creeps': 1,
  'stranger-danger': 1,
  'fiat-mafia': 1,
  'strangersnft': 1
};
function weightedRandomCollection(exclude) {
  let candidates = collectionsManifest.filter(c => c.id !== exclude && !slideshowExclude.has(c.id));
  if (candidates.length === 0) candidates = collectionsManifest.filter(c => !slideshowExclude.has(c.id));
  if (candidates.length === 0) candidates = collectionsManifest;
  const weights = candidates.map(c => slideshowWeights[c.id] || 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}
let nextSlide = null; // preloaded next slide

function preloadNextSlide() {
  const randomManifest = weightedRandomCollection(lastSlideshowColId);
  loadCollection(randomManifest.id).then(col => {
    if (!col.pieces || col.pieces.length === 0) return;
    const piece = col.pieces[Math.floor(Math.random() * col.pieces.length)];
    const imgUrl = getStaticImageUrl(piece);
    if (imgUrl && !imgUrl.includes('ordinals.com/content/') && !imgUrl.startsWith('data:')) {
      const img = new Image();
      img.src = imgUrl;
    }
    nextSlide = { manifest: randomManifest, col, piece };
  });
}

async function showRandomArt() {
  let randomManifest, col, piece;
  if (nextSlide) {
    randomManifest = nextSlide.manifest;
    col = nextSlide.col;
    piece = nextSlide.piece;
    nextSlide = null;
  } else {
    randomManifest = weightedRandomCollection(lastSlideshowColId);
    col = await loadCollection(randomManifest.id);
    if (!col.pieces || col.pieces.length === 0) return;
    piece = col.pieces[Math.floor(Math.random() * col.pieces.length)];
  }
  lastSlideshowColId = randomManifest.id;
  const updateSlide = () => {
    showHeroMedia(col, piece);
    if (artTitle) artTitle.textContent = piece.title || '';
    const artCollection = document.getElementById('art-collection');
    if (artCollection) {
      artCollection.textContent = col.title;
      artCollection.href = '#';
      artCollection.onclick = (e) => { e.preventDefault(); e.stopPropagation(); showDetail(col.id); };
    }
    if (artChain) {
      artChain.textContent = chainNames[col.chain] || col.chain;
      artChain.dataset.chain = col.chain;
    }
    currentCollectionId = col.id;
    currentCarouselCollection = col;
    currentPieceIndex = col.pieces.indexOf(piece);
  };
  // Crossfade transition between slides
  crossfadeHero(updateSlide);
  // Preload the next slide while this one is showing
  preloadNextSlide();
}

function startSlideshow() {
  stopSlideshow();
  slideshowTimer = setInterval(showRandomArt, 10000);
}

function stopSlideshow() {
  if (slideshowTimer) { clearInterval(slideshowTimer); slideshowTimer = null; }
}

function openLightbox(src, title, isVideo) {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  const lbImg = lb.querySelector('#lightbox-img');
  const lbVideo = lb.querySelector('#lightbox-video');
  if (lbImg) lbImg.style.display = isVideo ? 'none' : 'block';
  if (lbVideo) {
    lbVideo.style.display = isVideo ? 'block' : 'none';
    if (isVideo) { lbVideo.src = src; lbVideo.load(); lbVideo.play().catch(() => {}); }
    else { lbVideo.pause(); lbVideo.removeAttribute('src'); }
  }
  if (!isVideo && lbImg) lbImg.src = src;
  lb.querySelector('#lightbox-title').textContent = title || '';
  lb.classList.add('active');
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.classList.remove('active');
  const lbVideo = lb.querySelector('#lightbox-video');
  if (lbVideo) { lbVideo.pause(); lbVideo.removeAttribute('src'); }
}

function enterDisplayMode(collection, pieceIndex, lockToCollection) {
  if (!collection?.pieces) return;
  displayModeCollection = lockToCollection ? collection : null;
  displayMode?.classList.add('active');
  loadDisplayPiece();
}

let displayPlayTimer = null;
const PLAY_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="7,4 20,12 7,20"/></svg>';
const PAUSE_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';
function setDisplayPlaying(on) {
  clearInterval(displayPlayTimer);
  displayPlayTimer = on ? setInterval(displayModeNext, 10000) : null;
  const btn = document.querySelector('.display-play');
  if (!btn) return;
  btn.classList.toggle('is-on', on);
  btn.innerHTML = on ? PAUSE_ICON : PLAY_ICON;
  btn.setAttribute('aria-label', on ? 'Pause slideshow' : 'Play slideshow');
}

function exitDisplayMode() {
  setDisplayPlaying(false);
  displayMode?.classList.remove('active');
  displayModeCollection = null;
  if (displayIframe) displayIframe.src = '';
  stopSlideshow();
}

function loadDisplayPiece() {
  if (!currentCarouselCollection) return;
  const piece = currentCarouselCollection.pieces[currentPieceIndex];
  if (!piece) return;
  if (displayTitle) displayTitle.textContent = piece.title || '';
  if (displayCollection) displayCollection.textContent = currentCarouselCollection.title || '';
  const displayVideo = document.getElementById('display-video');
  // Hide all display media
  if (displayArt) displayArt.style.display = 'none';
  if (displayIframe) displayIframe.style.display = 'none';
  if (displayVideo) { displayVideo.style.display = 'none'; displayVideo.pause(); displayVideo.removeAttribute('src'); }
  if (piece.preview || pieceNeedsVideo(piece)) {
    if (displayVideo) {
      displayVideo.style.display = 'block';
      displayVideo.src = piece.preview || videoUrl(piece);
      displayVideo.load();
      displayVideo.play().catch(() => {});
    }
  } else if (pieceNeedsIframe(currentCarouselCollection, piece)) {
    if (displayIframe) {
      displayIframe.style.display = 'block';
      displayIframe.src = getIframeUrl(piece);
    }
  } else {
    if (displayArt) {
      displayArt.style.display = 'block';
      displayArt.src = getStaticImageUrl(piece);
    }
  }
}

async function displayModeRandomArt() {
  const randomManifest = weightedRandomCollection(lastSlideshowColId);
  lastSlideshowColId = randomManifest.id;
  const col = await loadCollection(randomManifest.id);
  if (!col.pieces || col.pieces.length === 0) return;
  const piece = col.pieces[Math.floor(Math.random() * col.pieces.length)];
  currentCarouselCollection = col;
  currentPieceIndex = col.pieces.indexOf(piece);
  loadDisplayPiece();
}

function displayModePrev() {
  if (displayModeCollection) {
    const pieces = displayModeCollection.pieces;
    if (!pieces || pieces.length === 0) return;
    currentCarouselCollection = displayModeCollection;
    currentPieceIndex = (currentPieceIndex - 1 + pieces.length) % pieces.length;
    loadDisplayPiece();
  } else {
    displayModeRandomArt();
  }
}

function displayModeNext() {
  if (displayModeCollection) {
    const pieces = displayModeCollection.pieces;
    if (!pieces || pieces.length === 0) return;
    currentCarouselCollection = displayModeCollection;
    currentPieceIndex = (currentPieceIndex + 1) % pieces.length;
    loadDisplayPiece();
  } else {
    displayModeRandomArt();
  }
}

function displayModeShuffle() {
  if (displayModeCollection) {
    const pieces = displayModeCollection.pieces;
    if (!pieces || pieces.length === 0) return;
    currentCarouselCollection = displayModeCollection;
    currentPieceIndex = Math.floor(Math.random() * pieces.length);
    loadDisplayPiece();
  } else {
    displayModeRandomArt();
  }
}

function initDisplayMode() {
  document.getElementById('display-mode-btn')?.addEventListener('click', () => enterDisplayMode(currentCarouselCollection, currentPieceIndex, false));
  document.getElementById('collection-display-btn')?.addEventListener('click', () => enterDisplayMode(currentCarouselCollection, currentPieceIndex, true));
  document.querySelector('.display-close')?.addEventListener('click', exitDisplayMode);
  document.querySelector('.display-prev')?.addEventListener('click', displayModePrev);
  document.querySelector('.display-next')?.addEventListener('click', displayModeNext);
  document.querySelector('.display-shuffle')?.addEventListener('click', displayModeShuffle);
  document.querySelector('.display-play')?.addEventListener('click', () => setDisplayPlaying(!displayPlayTimer));
}

function initPanelCollapse() {
  const btn = document.getElementById('panel-collapse');
  const container = document.querySelector('.container');
  if (!btn || !container) return;
  const KEY = 'ss-panel-collapsed';
  const apply = (on) => {
    container.classList.toggle('panel-collapsed', on);
    btn.setAttribute('aria-expanded', String(!on));
    btn.title = on ? 'Show collections panel' : 'Hide collections panel';
  };
  let saved = false;
  try { saved = localStorage.getItem(KEY) === '1'; } catch (e) {}
  apply(saved);
  btn.addEventListener('click', () => {
    const on = !container.classList.contains('panel-collapsed');
    apply(on);
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
  });
}

/* ===== MOTION / ANIMATION HELPERS ===== */

// Stagger animation delays on child elements
function staggerChildren(parent, selector, baseDelay, increment) {
  if (!parent) return;
  const items = parent.querySelectorAll(selector);
  items.forEach((el, i) => {
    el.style.animationDelay = (baseDelay + i * increment) + 's';
  });
}

// IntersectionObserver for scroll-triggered reveals
function initScrollReveals() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Apply reveal class to detail view elements
function applyDetailReveals() {
  const revealTargets = [
    '.detail-metadata',
    '.marketplace-links',
    '.piece-grid'
  ];
  revealTargets.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) {
      el.classList.remove('visible');
      el.classList.add('reveal');
    }
  });
  // Re-init observer for new elements
  setTimeout(initScrollReveals, 50);
}

// Crossfade transition for slideshow
function crossfadeHero(callback) {
  const container = document.querySelector('.art-container');
  if (!container) { callback(); return; }
  container.style.transition = 'opacity 0.4s ease-out';
  container.style.opacity = '0';
  setTimeout(() => {
    callback();
    container.style.opacity = '1';
  }, 400);
}

// Stagger piece grid thumbnails on build
function staggerPieceGrid() {
  const grid = document.querySelector('.piece-grid') || document.getElementById('art-collection');
  if (grid) staggerChildren(grid, '.piece-thumb', 0, 0.04);
}

// Stagger timeline items
function staggerTimeline() {
  staggerChildren(timeline, '.timeline-item', 0.05, 0.03);
  staggerChildren(timeline, '.timeline-year', 0, 0.05);
}

document.addEventListener('DOMContentLoaded', async () => {
  await init();
  initDisplayMode();
  initPanelCollapse();
  staggerTimeline();
  document.querySelector('.download-btn')?.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); downloadCurrentPiece(); });
  document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
  document.querySelectorAll('[data-view="home"]').forEach(el => el.addEventListener('click', () => showView('home')));
  document.querySelector('.back-btn')?.addEventListener('click', () => showView('home'));
});
