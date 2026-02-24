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
  const r = await fetch(COLLECTIONS_BASE + id + '.json');
  const data = await r.json();
  collectionCache[id] = data;
  return data;
}

function pieceNeedsIframe(collection, piece) {
  if (collection.chain === 'ethereum' && collection.onchain) return true;
  if (piece.animationUrl && piece.animationUrl.startsWith('<')) return true;
  if (piece.isImage === false) return true;
  return false;
}

function getStaticImageUrl(piece) {
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
  if (collectionsManifest.length > 0) {
    const first = await loadCollection(collectionsManifest[0].id);
    showHeroMedia(first, first.pieces[0]);
    if (artTitle) artTitle.textContent = first.pieces[0].title || '';
    if (document.getElementById('art-collection')) document.getElementById('art-collection').textContent = first.title;
    if (artChain) {
      artChain.textContent = chainNames[first.chain] || first.chain;
      artChain.dataset.chain = first.chain;
    }
    currentCarouselCollection = first;
    currentPieceIndex = 0;
  }
}

function showView(viewName) {
  Object.entries(views).forEach(([name, el]) => {
    if (el) el.classList.toggle('active', name === viewName);
  });
  if (viewName === 'home') {
    timelinePanel.classList.remove('hidden');
    currentCollectionId = null;
  }
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
  if (pieceNeedsIframe(collection, piece)) {
    if (featuredArt) featuredArt.style.display = 'none';
    if (featuredIframe) {
      featuredIframe.style.display = 'block';
      featuredIframe.src = getIframeUrl(piece);
    }
  } else {
    if (featuredIframe) featuredIframe.style.display = 'none';
    if (featuredArt) {
      featuredArt.style.display = 'block';
      featuredArt.src = getStaticImageUrl(piece);
    }
  }
}

async function showDetail(collectionId) {
  currentCollectionId = collectionId;
  const collection = await loadCollection(collectionId);
  currentCarouselCollection = collection;
  currentPieceIndex = 0;
  if (detailTitle) detailTitle.textContent = collection.title;
  if (detailChain) {
    detailChain.textContent = chainNames[collection.chain] || collection.chain;
    detailChain.dataset.chain = collection.chain;
  }
  if (detailMetadata) {
    let meta = '';
    if (collection.supply) meta += '<span>' + collection.supply + ' pieces</span> ';
    if (collection.year) meta += '<span>' + collection.year + '</span>';
    if (collection.description) meta += '<p>' + collection.description + '</p>';
    if (collection.artistNote) meta += '<p class="artist-note">' + collection.artistNote + '</p>';
    detailMetadata.innerHTML = meta;
  }
  const mps = collection.marketplaces || {};
  const me = document.getElementById('link-magiceden');
  const gm = document.getElementById('link-gamma');
  const or = document.getElementById('link-ordinals');
  if (me) { me.href = mps.magiceden || '#'; me.style.display = mps.magiceden ? '' : 'none'; }
  if (gm) { gm.href = mps.gamma || '#'; gm.style.display = mps.gamma ? '' : 'none'; }
  if (or) { or.href = mps.ordinals || '#'; or.style.display = mps.ordinals ? '' : 'none'; }
  if (mps.opensea) {
    let os = document.getElementById('link-opensea');
    if (!os) {
      os = document.createElement('a');
      os.id = 'link-opensea';
      os.className = 'detail-link';
      os.target = '_blank';
      os.rel = 'noopener';
      os.textContent = 'OpenSea';
      document.querySelector('.marketplace-links')?.appendChild(os);
    }
    os.href = mps.opensea;
    os.style.display = '';
  }
  if (mps.objkt) {
    let ob = document.getElementById('link-objkt');
    if (!ob) {
      ob = document.createElement('a');
      ob.id = 'link-objkt';
      ob.className = 'detail-link';
      ob.target = '_blank';
      ob.rel = 'noopener';
      ob.textContent = 'objkt';
      document.querySelector('.marketplace-links')?.appendChild(ob);
    }
    ob.href = mps.objkt;
    ob.style.display = '';
  }
  if (collection.pieces && collection.pieces.length > 0) {
    showPiece(collection, 0);
    buildPieceGrid(collection);
  }
  showView('detail');
  timelinePanel.classList.remove('open');
}

function buildPieceGrid(collection) {
  const grid = document.querySelector('.piece-grid') || document.getElementById('art-collection');
  if (!grid) return;
  grid.innerHTML = '';
  collection.pieces.forEach((piece, idx) => {
    const btn = document.createElement('button');
    btn.className = 'piece-thumb';
    btn.setAttribute('aria-label', 'Display this piece');
    const img = document.createElement('img');
    img.src = getStaticImageUrl(piece);
    img.alt = piece.title || '';
    img.loading = 'lazy';
    btn.appendChild(img);
    btn.addEventListener('click', () => {
      currentPieceIndex = idx;
      showPiece(collection, idx);
    });
    grid.appendChild(btn);
  });
}

function showPiece(collection, index) {
  const piece = collection.pieces[index];
  if (!piece) return;
  currentPieceIndex = index;
  if (pieceNeedsIframe(collection, piece)) {
    if (detailImage) detailImage.style.display = 'none';
    if (detailVideo) detailVideo.style.display = 'none';
    if (detailIframe) {
      detailIframe.style.display = 'block';
      detailIframe.src = getIframeUrl(piece);
    }
  } else {
    if (detailIframe) detailIframe.style.display = 'none';
    if (detailVideo) detailVideo.style.display = 'none';
    if (detailImage) {
      detailImage.style.display = 'block';
      detailImage.src = getStaticImageUrl(piece);
    }
  }
}

function showPieceByIndex(idx) {
  if (currentCarouselCollection?.pieces[idx]) showPiece(currentCarouselCollection, idx);
}

async function showRandomArt() {
  const randomManifest = collectionsManifest[Math.floor(Math.random() * collectionsManifest.length)];
  const col = await loadCollection(randomManifest.id);
  const piece = col.pieces[Math.floor(Math.random() * col.pieces.length)];
  showHeroMedia(col, piece);
  if (artTitle) artTitle.textContent = piece.title || '';
  if (artChain) {
    artChain.textContent = chainNames[col.chain] || col.chain;
    artChain.dataset.chain = col.chain;
  }
  currentCarouselCollection = col;
  currentPieceIndex = col.pieces.indexOf(piece);
}

function startSlideshow() {
  stopSlideshow();
  slideshowTimer = setInterval(showRandomArt, 5000);
}

function stopSlideshow() {
  if (slideshowTimer) { clearInterval(slideshowTimer); slideshowTimer = null; }
}

function openLightbox(src, title) {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.querySelector('#lightbox-img').src = src;
  lb.querySelector('#lightbox-title').textContent = title || '';
  lb.classList.add('active');
}

function closeLightbox() {
  document.getElementById('lightbox')?.classList.remove('active');
}

function enterDisplayMode(collection, pieceIndex) {
  if (!collection?.pieces) return;
  displayMode?.classList.add('active');
  loadDisplayPiece();
}

function exitDisplayMode() {
  displayMode?.classList.remove('active');
  if (displayIframe) displayIframe.src = '';
  stopSlideshow();
}

function loadDisplayPiece() {
  if (!currentCarouselCollection) return;
  const piece = currentCarouselCollection.pieces[currentPieceIndex];
  if (!piece) return;
  if (displayTitle) displayTitle.textContent = piece.title || '';
  if (displayCollection) displayCollection.textContent = currentCarouselCollection.title || '';
  if (pieceNeedsIframe(currentCarouselCollection, piece)) {
    if (displayArt) displayArt.style.display = 'none';
    if (displayIframe) {
      displayIframe.style.display = 'block';
      displayIframe.src = getIframeUrl(piece);
    }
  } else {
    if (displayIframe) displayIframe.style.display = 'none';
    if (displayArt) {
      displayArt.style.display = 'block';
      displayArt.src = getStaticImageUrl(piece);
    }
  }
}

function initDisplayMode() {
  document.getElementById('display-mode-btn')?.addEventListener('click', () => enterDisplayMode(currentCarouselCollection, currentPieceIndex));
  document.getElementById('collection-display-btn')?.addEventListener('click', () => enterDisplayMode(currentCarouselCollection, currentPieceIndex));
  document.querySelector('.display-close')?.addEventListener('click', exitDisplayMode);
  document.querySelector('.display-prev')?.addEventListener('click', () => {
    if (!currentCarouselCollection) return;
    currentPieceIndex = (currentPieceIndex - 1 + currentCarouselCollection.pieces.length) % currentCarouselCollection.pieces.length;
    loadDisplayPiece();
  });
  document.querySelector('.display-next')?.addEventListener('click', () => {
    if (!currentCarouselCollection) return;
    currentPieceIndex = (currentPieceIndex + 1) % currentCarouselCollection.pieces.length;
    loadDisplayPiece();
  });
  document.querySelector('.display-shuffle')?.addEventListener('click', () => {
    if (!currentCarouselCollection) return;
    currentPieceIndex = Math.floor(Math.random() * currentCarouselCollection.pieces.length);
    loadDisplayPiece();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await init();
  initDisplayMode();
  document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
  document.querySelectorAll('[data-view="home"]').forEach(el => el.addEventListener('click', () => showView('home')));
  document.querySelector('.back-btn')?.addEventListener('click', () => showView('home'));
});/**
 * STRANGER SOLEMN - Official Site Script  
 * CMS: loads collections from /collections/manifest.json + per-collection JSON
 * Features: chain filters, search, display mode
 */

const COLLECTIONS_BASE = 'collections/';
let collectionsManifest = [];
const collectionCache = {};

const views = { home: document.getElementById('view-home'), detail: document.getElementById('view-detail') };
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
let activeChainFilter = null;

const chainNames = { ordinals: 'BTC', ethereum: 'ETH', tezos: 'TEZ', solana: 'SOL' };

async function loadManifest() {
  const r = await fetch(COLLECTIONS_BASE + 'manifest.json?v=' + Date.now());
  collectionsManifest = await r.json();
  return collectionsManifest;
}

async function loadCollection(id) {
  if (collectionCache[id]) return collectionCache[id];
  const r = await fetch(COLLECTIONS_BASE + id + '.json');
  const data = await r.json();
  collectionCache[id] = data;
  return data;
}

function pieceNeedsIframe(collection, piece) {
  if (collection.chain === 'ethereum' && collection.onchain) return true;
  if (piece.animationUrl && piece.animationUrl.startsWith('<')) return true;
  if (piece.isImage === false) return true;
  return false;
}

function getStaticImageUrl(piece) {
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
  if (collectionsManifest.length > 0) {
    const first = await loadCollection(collectionsManifest[0].id);
    showHeroMedia(first, first.pieces[0]);
    if (artTitle) artTitle.textContent = first.pieces[0].title || '';
    if (document.getElementById('art-collection')) document.getElementById('art-collection').textContent = first.title;
    if (artChain) { artChain.textContent = chainNames[first.chain] || first.chain; artChain.dataset.chain = first.chain; }
    currentCarouselCollection = first;
    currentPieceIndex = 0;
  }
}

function showView(viewName) {
  Object.entries(views).forEach(([name, el]) => {
    if (el) el.classList.toggle('active', name === viewName);
  });
  if (viewName === 'home') {
    timelinePanel.classList.remove('hidden');
    currentCollectionId = null;
  }
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
  document.querySelectorAll('.legend-item').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      const chain = el.dataset.chain;
      if (activeChainFilter === chain) {
        activeChainFilter = null;
        document.querySelectorAll('.legend-item').forEach(e => e.classList.remove('active'));
        document.querySelector('.chain-legend')?.classList.remove('chain-legend-active');
      } else {
        document.querySelectorAll('.legend-item').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
        activeChainFilter = chain;
        document.querySelector('.chain-legend')?.classList.add('chain-legend-active');
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
      if (next.style.display !== 'none') { hasVisible = true; break; }
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
    if (!query) { showTimeline(); filterTimeline(activeChainFilter); return; }
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
        const t = document.createElement('span'); t.textContent = r.col.title; el.appendChild(t);
        el.addEventListener('click', () => showDetail(r.col.id));
      } else {
        const t = document.createElement('span'); t.textContent = r.piece.title; el.appendChild(t);
        const sub = document.createElement('span'); sub.className = 'result-collection-name'; sub.textContent = ' — ' + r.col.title; el.appendChild(sub);
        el.addEventListener('click', async () => { await showDetail(r.col.id); showPieceByIndex(r.idx); });
      }
      container.appendChild(el);
    });
  }
  timeline.appendChild(container);
}

function showHeroMedia(collection, piece) {
  if (!piece) return;
  if (pieceNeedsIframe(collection, piece)) {
    if (featuredArt) featuredArt.style.display = 'none';
    if (featuredIframe) { featuredIframe.style.display = 'block'; featuredIframe.src = getIframeUrl(piece); }
  } else {
    if (featuredIframe) featuredIframe.style.display = 'none';
    if (featuredArt) { featuredArt.style.display = 'block'; featuredArt.src = getStaticImageUrl(piece); }
  }
}

async function showDetail(collectionId) {
  currentCollectionId = collectionId;
  const collection = await loadCollection(collectionId);
  currentCarouselCollection = collection;
  currentPieceIndex = 0;
  if (detailTitle) detailTitle.textContent = collection.title;
  if (detailChain) { detailChain.textContent = chainNames[collection.chain] || collection.chain; detailChain.dataset.chain = collection.chain; }
  if (detailMetadata) {
    let meta = '';
    if (collection.supply) meta += '<span>' + collection.supply + ' pieces</span> ';
    if (collection.year) meta += '<span>' + collection.year + '</span>';
    if (collection.description) meta += '<p>' + collection.description + '</p>';
    if (collection.artistNote) meta += '<p class="artist-note">' + collection.artistNote + '</p>';
    detailMetadata.innerHTML = meta;
  }
  const mps = collection.marketplaces || {};
  const me = document.getElementById('link-magiceden');
  const gm = document.getElementById('link-gamma');
  const or = document.getElementById('link-ordinals');
  if (me) { me.href = mps.magiceden || '#'; me.style.display = mps.magiceden ? '' : 'none'; }
  if (gm) { gm.href = mps.gamma || '#'; gm.style.display = mps.gamma ? '' : 'none'; }
  if (or) { or.href = mps.ordinals || '#'; or.style.display = mps.ordinals ? '' : 'none'; }
  if (mps.opensea) {
    let os = document.getElementById('link-opensea');
    if (!os) { os = document.createElement('a'); os.id = 'link-opensea'; os.className = 'detail-link'; os.target = '_blank'; os.rel = 'noopener'; os.textContent = 'OpenSea'; document.querySelector('.marketplace-links')?.appendChild(os); }
    os.href = mps.opensea; os.style.display = '';
  }
  if (mps.objkt) {
    let ob = document.getElementById('link-objkt');
    if (!ob) { ob = document.createElement('a'); ob.id = 'link-objkt'; ob.className = 'detail-link'; ob.target = '_blank'; ob.rel = 'noopener'; ob.textContent = 'objkt'; document.querySelector('.marketplace-links')?.appendChild(ob); }
    ob.href = mps.objkt; ob.style.display = '';
  }
  if (collection.pieces && collection.pieces.length > 0) {
    showPiece(collection, 0);
    buildPieceGrid(collection);
  }
  showView('detail');
  timelinePanel.classList.remove('open');
}

function buildPieceGrid(collection) {
  const grid = document.querySelector('.piece-grid') || document.getElementById('art-collection');
  if (!grid) return;
  grid.innerHTML = '';
  collection.pieces.forEach((piece, idx) => {
    const btn = document.createElement('button');
    btn.className = 'piece-thumb';
    btn.setAttribute('aria-label', 'Display this piece');
    const img = document.createElement('img');
    img.src = getStaticImageUrl(piece);
    img.alt = piece.title || '';
    img.loading = 'lazy';
    btn.appendChild(img);
    btn.addEventListener('click', () => { currentPieceIndex = idx; showPiece(collection, idx); });
    grid.appendChild(btn);
  });
}

function showPiece(collection, index) {
  const piece = collection.pieces[index];
  if (!piece) return;
  currentPieceIndex = index;
  if (pieceNeedsIframe(collection, piece)) {
    if (detailImage) detailImage.style.display = 'none';
    if (detailVideo) detailVideo.style.display = 'none';
    if (detailIframe) { detailIframe.style.display = 'block'; detailIframe.src = getIframeUrl(piece); }
  } else {
    if (detailIframe) detailIframe.style.display = 'none';
    if (detailVideo) detailVideo.style.display = 'none';
    if (detailImage) { detailImage.style.display = 'block'; detailImage.src = getStaticImageUrl(piece); }
  }
}

function showPieceByIndex(idx) {
  if (currentCarouselCollection?.pieces[idx]) showPiece(currentCarouselCollection, idx);
}

async function showRandomArt() {
  const randomManifest = collectionsManifest[Math.floor(Math.random() * collectionsManifest.length)];
  const col = await loadCollection(randomManifest.id);
  const piece = col.pieces[Math.floor(Math.random() * col.pieces.length)];
  showHeroMedia(col, piece);
  if (artTitle) artTitle.textContent = piece.title || '';
  if (artChain) { artChain.textContent = chainNames[col.chain] || col.chain; artChain.dataset.chain = col.chain; }
  currentCarouselCollection = col;
  currentPieceIndex = col.pieces.indexOf(piece);
}

function startSlideshow() { stopSlideshow(); slideshowTimer = setInterval(showRandomArt, 5000); }
function stopSlideshow() { if (slideshowTimer) { clearInterval(slideshowTimer); slideshowTimer = null; } }
function toOptimizedUrl(url) { return url; }
function openLightbox(src, title) { const lb = document.getElementById('lightbox'); if (!lb) return; lb.querySelector('#lightbox-img').src = src; lb.querySelector('#lightbox-title').textContent = title || ''; lb.classList.add('active'); }
function closeLightbox() { document.getElementById('lightbox')?.classList.remove('active'); }

function enterDisplayMode(collection, pieceIndex) {
  if (!collection?.pieces) return;
  displayMode?.classList.add('active');
  loadDisplayPiece();
}
function exitDisplayMode() {
  displayMode?.classList.remove('active');
  if (displayIframe) displayIframe.src = '';
  stopSlideshow();
}
function loadDisplayPiece() {
  if (!currentCarouselCollection) return;
  const piece = currentCarouselCollection.pieces[currentPieceIndex];
  if (!piece) return;
  if (displayTitle) displayTitle.textContent = piece.title || '';
  if (displayCollection) displayCollection.textContent = currentCarouselCollection.title || '';
  if (pieceNeedsIframe(currentCarouselCollection, piece)) {
    if (displayArt) displayArt.style.display = 'none';
    if (displayIframe) { displayIframe.style.display = 'block'; displayIframe.src = getIframeUrl(piece); }
  } else {
    if (displayIframe) displayIframe.style.display = 'none';
    if (displayArt) { displayArt.style.display = 'block'; displayArt.src = getStaticImageUrl(piece); }
  }
}
function initDisplayMode() {
  document.getElementById('display-mode-btn')?.addEventListener('click', () => enterDisplayMode(currentCarouselCollection, currentPieceIndex));
  document.getElementById('collection-display-btn')?.addEventListener('click', () => enterDisplayMode(currentCarouselCollection, currentPieceIndex));
  document.querySelector('.display-close')?.addEventListener('click', exitDisplayMode);
  document.querySelector('.display-prev')?.addEventListener('click', () => {
    if (!currentCarouselCollection) return;
    currentPieceIndex = (currentPieceIndex - 1 + currentCarouselCollection.pieces.length) % currentCarouselCollection.pieces.length;
    loadDisplayPiece();
  });
  document.querySelector('.display-next')?.addEventListener('click', () => {
    if (!currentCarouselCollection) return;
    currentPieceIndex = (currentPieceIndex + 1) % currentCarouselCollection.pieces.length;
    loadDisplayPiece();
  });
  document.querySelector('.display-shuffle')?.addEventListener('click', () => {
    if (!currentCarouselCollection) return;
    currentPieceIndex = Math.floor(Math.random() * currentCarouselCollection.pieces.length);
    loadDisplayPiece();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await init();
  initDisplayMode();
  document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
  document.querySelectorAll('[data-view="home"]').forEach(el => el.addEventListener('click', () => showView('home')));
  document.querySelector('.back-btn')?.addEventListener('click', () => showView('home'));
});
