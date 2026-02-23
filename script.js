/**
 * STRANGER SOLEMN - Official Site Script
 * Features: CMS (JSON-per-collection), chain filters, search, display mode
 */

// ── CMS CONFIG ────────────────────────────────────────────────────────────────
const COLLECTIONS_BASE = 'collections/';
let collectionsManifest = [];       // lightweight list (from manifest.json)
const collectionCache = {};         // full collection data, loaded on demand

// ── DOM Elements ──────────────────────────────────────────────────────────────
const views = { home: document.getElementById('view-home'), detail: document.getElementById('view-detail') };
const menuToggle = document.getElementById('menu-toggle');
const timelinePanel = document.getElementById('timeline-panel');
const timeline = document.getElementById('timeline');
const featuredArt = document.getElementById('featured-art');
const featuredIframe = document.getElementById('featured-iframe');
const artTitle = document.getElementById('art-title');
const artCollection = document.getElementById('art-collection');
const artChain = document.getElementById('art-chain');
const artInfo = document.querySelector('.art-info');
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

// ── State ─────────────────────────────────────────────────────────────────────
let currentCollectionId = null;
let currentCarouselCollection = null;
let currentPieceIndex = 0;
let slideshowTimer = null;
let activeChainFilter = null;

const chainNames = { ordinals: 'BTC', ethereum: 'ETH', tezos: 'TEZ', solana: 'SOL' };

// ── CMS: Load manifest, then lazy-load collections ────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function pieceNeedsIframe(collection, piece) {
  if (collection.chain === 'ethereum' && collection.onchain) return true;
  if (piece.animationUrl && piece.animationUrl.startsWith('<')) return true;
  if (piece.isImage === false) return true;
  return false;
}
function hasStaticImage(piece) {
  return !!(piece.image || piece.thumbnail);
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

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  menuToggle.addEventListener('click', () => timelinePanel.classList.toggle('open'));
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => showView(el.dataset.view));
  });

  // Load manifest and build timeline
  await loadManifest();
  buildTimeline();

  // Wire chain legend filters
  initChainFilters();

  // Wire search
  initSearch();

  // Show first collection as featured
  if (collectionsManifest.length > 0) {
    const first = await loadCollection(collectionsManifest[0].id);
    showHeroMedia(first, first.pieces[0]);
    artTitle.textContent = first.pieces[0].title;
    artCollection.textContent = first.title;
    artChain.textContent = chainNames[first.chain] || first.chain;
    artChain.dataset.chain = first.chain;
    currentCarouselCollection = first;
    currentPieceIndex = 0;
  }
}

// ── Views ─────────────────────────────────────────────────────────────────────
function showView(viewName) {
  Object.entries(views).forEach(([name, el]) => {
    if (el) el.classList.toggle('active', name === viewName);
  });
  if (viewName === 'home') {
    timelinePanel.classList.remove('hidden');
    currentCollectionId = null;
  }
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function buildTimeline() {
  timeline.innerHTML = '';
  const byYear = {};
  collectionsManifest.forEach(c => {
    const y = c.year || 'Unknown';
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(c);
  });
  const years = Object.keys(byYear).sort((a, b) => b - a);
  years.forEach(year => {
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

// ── Chain Filters ─────────────────────────────────────────────────────────────
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
  const searchActive = document.getElementById('search-input')?.value.trim().length > 0;
  if (searchActive) return;
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

// ── Search ────────────────────────────────────────────────────────────────────
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
  // Hide regular timeline items, show search results
  document.querySelectorAll('.timeline-year, .timeline-item').forEach(el => el.style.display = 'none');

  // Remove old results
  document.querySelectorAll('.search-results').forEach(el => el.remove());

  const results = [];
  collectionsManifest.forEach(col => {
    if (col.title.toLowerCase().includes(query)) {
      results.push({ type: 'collection', col });
    }
    // Search loaded pieces
    if (collectionCache[col.id]?.pieces) {
      collectionCache[col.id].pieces.forEach((piece, idx) => {
        if (piece.title && piece.title.toLowerCase().includes(query)) {
          results.push({ type: 'piece', col, piece, idx });
        }
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
        const sub = document.createElement('span');
        sub.className = 'result-collection-name';
        sub.textContent = ' — ' + r.col.title;
        el.appendChild(t);
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

// ── Hero Media ────────────────────────────────────────────────────────────────
function showHeroMedia(collection, piece) {
  if (!piece) return;
  if (pieceNeedsIframe(collection, piece)) {
    featuredArt.style.display = 'none';
    featuredIframe.style.display = 'block';
    featuredIframe.src = getIframeUrl(piece);
  } else {
    featuredIframe.style.display = 'none';
    featuredArt.style.display = 'block';
    featuredArt.src = getStaticImageUrl(piece);
  }
}

// ── Detail View ───────────────────────────────────────────────────────────────
async function showDetail(collectionId) {
  currentCollectionId = collectionId;
  const collection = await loadCollection(collectionId);
  currentCarouselCollection = collection;
  currentPieceIndex = 0;

  detailTitle.textContent = collection.title;
  detailChain.textContent = chainNames[collection.chain] || collection.chain;
  detailChain.dataset.chain = collection.chain;

  const metaEl = document.getElementById('detail-metadata');
  if (metaEl) {
    let meta = '';
    if (collection.supply) meta += '<span>' + collection.supply + ' pieces</span> ';
    if (collection.year) meta += '<span>' + collection.year + '</span>';
    if (collection.description) meta += '<p>' + collection.description + '</p>';
    if (collection.artistNote) meta += '<p class="artist-note">' + collection.artistNote + '</p>';
    metaEl.innerHTML = meta;
  }

  // Marketplace links
  const mpLinks = { magiceden: document.getElementById('link-magiceden'), gamma: document.getElementById('link-gamma'), ordinals: document.getElementById('link-ordinals') };
  const mps = collection.marketplaces || {};
  if (mpLinks.magiceden) { mpLinks.magiceden.href = mps.magiceden || '#'; mpLinks.magiceden.style.display = mps.magiceden ? '' : 'none'; }
  if (mpLinks.gamma) { mpLinks.gamma.href = mps.gamma || '#'; mpLinks.gamma.style.display = mps.gamma ? '' : 'none'; }
  if (mpLinks.ordinals) { mpLinks.ordinals.href = mps.ordinals || '#'; mpLinks.ordinals.style.display = mps.ordinals ? '' : 'none'; }

  // Build piece grid
  const artCollection = document.getElementById('art-collection');
  const gridEl = document.querySelector('#view-detail .art-collection') || document.getElementById('art-collection');

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
    detailImage.style.display = 'none';
    if (detailVideo) detailVideo.style.display = 'none';
    detailIframe.style.display = 'block';
    detailIframe.src = getIframeUrl(piece);
  } else {
    detailIframe.style.display = 'none';
    if (detailVideo) detailVideo.style.display = 'none';
    detailImage.style.display = 'block';
    detailImage.src = getStaticImageUrl(piece);
  }
}

function showPieceByIndex(idx) {
  if (currentCarouselCollection && currentCarouselCollection.pieces[idx]) {
    showPiece(currentCarouselCollection, idx);
  }
}

// ── Random / Slideshow ────────────────────────────────────────────────────────
async function showRandomArt() {
  const randomManifest = collectionsManifest[Math.floor(Math.random() * collectionsManifest.length)];
  const col = await loadCollection(randomManifest.id);
  const piece = col.pieces[Math.floor(Math.random() * col.pieces.length)];
  showHeroMedia(col, piece);
  artTitle.textContent = piece.title;
  artCollection.textContent = col.title;
  artChain.textContent = chainNames[col.chain] || col.chain;
  artChain.dataset.chain = col.chain;
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
function toOptimizedUrl(url) { return url; }

// ── Display Mode ──────────────────────────────────────────────────────────────
function enterDisplayMode(collection, pieceIndex, singleOnly) {
  if (!collection || !collection.pieces) return;
  displayMode.classList.add('active');
  loadDisplayPiece();
}
function exitDisplayMode() {
  displayMode.classList.remove('active');
  if (displayIframe) displayIframe.src = '';
  stopSlideshow();
}
function loadDisplayPiece() {
  if (!currentCarouselCollection) return;
  const piece = currentCarouselCollection.pieces[currentPieceIndex];
  if (!piece) return;
  if (displayTitle) displayTitle.textContent = piece.title;
  if (displayCollection) displayCollection.textContent = currentCarouselCollection.title;
  const needsIframe = pieceNeedsIframe(currentCarouselCollection, piece);
  if (needsIframe) {
    if (displayArt) displayArt.style.display = 'none';
    if (displayIframe) { displayIframe.style.display = 'block'; displayIframe.src = getIframeUrl(piece); }
  } else {
    if (displayIframe) displayIframe.style.display = 'none';
    if (displayArt) { displayArt.style.display = 'block'; displayArt.src = getStaticImageUrl(piece); }
  }
}
function initDisplayMode() {
  document.getElementById('display-mode-btn')?.addEventListener('click', () => enterDisplayMode(currentCarouselCollection, currentPieceIndex));
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

// ── Lightbox ──────────────────────────────────────────────────────────────────
function openLightbox(src, title) {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.querySelector('.lightbox-img').src = src;
  lb.querySelector('#lightbox-title').textContent = title || '';
  lb.classList.add('active');
}
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.remove('active');
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await init();
  initDisplayMode();
  document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
  document.getElementById('display-mode-btn')?.addEventListener('click', () => {
    enterDisplayMode(currentCarouselCollection, currentPieceIndex);
  });
  document.querySelectorAll('[data-view="home"]').forEach(el => el.addEventListener('click', () => showView('home')));
});
/**
 * STRANGER SOLEMN - Official Site Script
 * Features: Big detail images, per-piece fullscreen display, clickable carousel
 */

// DOM Elements
const views = { home: document.getElementById('view-home'), detail: document.getElementById('view-detail') };
const menuToggle = document.getElementById('menu-toggle');
const timelinePanel = document.getElementById('timeline-panel');
const timeline = document.getElementById('timeline');
const featuredArt = document.getElementById('featured-art');
const featuredIframe = document.getElementById('featured-iframe');
const artTitle = document.getElementById('art-title');
const artCollection = document.getElementById('art-collection');
const artChain = document.getElementById('art-chain');
const artInfo = document.querySelector('.art-info');
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

var currentCollectionId = null;
var currentPieceIndex = 0;
var slideshowInterval = null;
var slideshowPlaying = false;
var displayCollectionData = null;
var displayPieceIndex = 0;
var displaySingleMode = false;
var currentCarouselCollection = null;

var chainNames = {
      ordinals: 'BTC',
      ethereum: 'ETH',
      tezos: 'TEZ',
      solana: 'SOL'
};

/**
 * Check if a piece MUST use an iframe (no good static image available).
 * Ordinals pieces need iframes - their URLs serve HTML, not images.
 * On-chain ETH pieces with data:text/html animationUrls also need iframes.
 */
function pieceNeedsIframe(collection, piece) {
      if (!collection.onchain) return false;
      if (piece.isImage) return false;
      if (collection.chain === 'ordinals') return true;
      // On-chain ETH/TEZ with HTML animation - use iframe
  if (piece.animationUrl && piece.animationUrl.startsWith('data:text/html')) return true;
      return false;
}

/**
 * Check if a piece has a real static image that can render well in an img tag.
 * Returns false for on-chain pieces that only have low-quality CDN thumbnails.
 */
function hasStaticImage(piece) {
      if (!piece) return false;
      var url = piece.image;
      if (!url) return false;
      if (url.startsWith('data:text/html')) return false;
      if (url.includes('ordinals.com/content/')) return false;
      // If piece has a data:text/html animation, the CDN static images are low quality
  if (piece.animationUrl && piece.animationUrl.startsWith('data:text/html')) return false;
      return true;
}

function getStaticImageUrl(piece) {
      if (!piece) return '';
      if (piece.image && !piece.image.startsWith('data:') && !piece.image.includes('ordinals.com/content/')) {
              // Skip low-quality CDN images for on-chain HTML pieces
        if (piece.animationUrl && piece.animationUrl.startsWith('data:text/html')) return '';
              return piece.image;
      }
      if (piece.thumbnail && !piece.thumbnail.startsWith('data:') && !piece.thumbnail.includes('ordinals.com/content/')) {
              if (piece.animationUrl && piece.animationUrl.startsWith('data:text/html')) return '';
              return piece.thumbnail;
      }
      return '';
}

function getIframeUrl(piece) {
      if (!piece) return '';
      return piece.animationUrl || piece.image || '';
}

function init() {
      buildTimeline();
      showRandomArt();
      startSlideshow();

  if (menuToggle) {
          menuToggle.addEventListener('click', function(e) {
                    e.stopPropagation();
                    timelinePanel.classList.toggle('open');
          });
  }

  document.addEventListener('click', function(e) {
          if (window.innerWidth <= 768 && !timelinePanel.contains(e.target) && e.target !== menuToggle) {
                    timelinePanel.classList.remove('open');
          }
  });

  document.querySelectorAll('[data-view="home"]').forEach(function(el) {
          el.addEventListener('click', function(e) {
                    e.preventDefault();
                    showView('home');
          });
  });

  var downloadBtn = document.querySelector('.download-btn');
      if (downloadBtn) {
              downloadBtn.addEventListener('click', function() {
                        var imageUrl = detailImage.src;
                        var link = document.createElement('a');
                        link.href = imageUrl;
                        link.download = 'stranger-solemn-' + currentCollectionId + '.png';
                        link.click();
              });
      }

  [artTitle, artCollection, artChain].forEach(function(el) {
          if (el) {
                    el.addEventListener('click', function(e) {
                                e.stopPropagation();
                                if (currentCarouselCollection) {
                                              stopSlideshow();
                                              showDetail(currentCarouselCollection.id);
                                }
                    });
          }
  });

  initDisplayMode();
}

function showView(viewName) {
      Object.keys(views).forEach(function(key) {
              views[key].classList.toggle('active', key === viewName);
      });
      if (viewName === 'home') {
              detailIframe.src = '';
              if (detailVideo) {
                        detailVideo.pause();
                        detailVideo.src = "";
                        detailVideo.load();
              }
              if (!slideshowPlaying) startSlideshow();
      } else {
              stopSlideshow();
      }
      if (window.innerWidth <= 768) {
              timelinePanel.classList.remove('open');
      }
}

function buildTimeline() {
      var sorted = [...collections].sort(function(a, b) {
              return (b.year || 2024) - (a.year || 2024);
      });

  var currentYear = null;
      var html = '';
      sorted.forEach(function(col) {
              var year = col.year || 2024;
              if (year !== currentYear) {
                        currentYear = year;
                        html += '<div class="timeline-year">' + currentYear + '</div>';
              }
              html += '<div class="timeline-item" data-chain="' + col.chain + '" data-id="' + col.id + '">'
                + '<span class="timeline-item-chain">' + (chainNames[col.chain] || col.chain.toUpperCase()) + '</span>'
                + '<span class="timeline-item-title">' + col.title + '</span>'
                + '<span class="timeline-item-count">' + (col.pieces?.length || col.supply || '?') + '</span>'
                + '</div>';
      });

  timeline.innerHTML = html;
      timeline.querySelectorAll('.timeline-item').forEach(function(item) {
              item.addEventListener('click', function() {
                        showDetail(item.dataset.id);
              });
      });
}

/**
 * Show the hero media for a piece.
 * Strategy:
 * - If piece has a real static image => show it (standard ETH, TEZ, SOL)
 * - If piece needs iframe (ordinals or on-chain HTML) => show iframe
 * - Fallback => try any available URL
 */
function showHeroMedia(collection, piece) {
      detailImage.classList.add('hidden');
      detailIframe.classList.add('hidden');
      detailIframe.src = "";

  if (detailVideo) {
          detailVideo.classList.add('hidden');
          detailVideo.pause();
          detailVideo.src = "";
          detailVideo.load();
  }

  if (!piece) return;

  var isVideo = piece.video || (piece.animationUrl && piece.animationUrl.endsWith('.mp4'));
      if (isVideo) {
              detailVideo.src = piece.video || piece.animationUrl;
              detailVideo.classList.remove('hidden');
              detailVideo.play();
              return;
      }

  // Check if piece needs iframe (ordinals or on-chain HTML)
  if (pieceNeedsIframe(collection, piece)) {
          detailIframe.src = getIframeUrl(piece);
          detailIframe.classList.remove('hidden');
          return;
  }

  // Use static image when available
  var staticUrl = getStaticImageUrl(piece);
      if (staticUrl) {
              detailImage.src = toOptimizedUrl(staticUrl);
              detailImage.classList.remove('hidden');
              return;
      }

  // Final fallback
  detailImage.src = toOptimizedUrl(piece.image || piece.thumbnail || collection.heroImage || '');
      detailImage.classList.remove('hidden');
}

function showDetail(collectionId) {
      var collection = collections.find(function(c) { return c.id === collectionId; });
      if (!collection) return;

  currentCollectionId = collectionId;
      currentPieceIndex = 0;

  var piece = collection.pieces?.[0];
      showHeroMedia(collection, piece);

  detailTitle.textContent = collection.title;
      detailChain.textContent = chainNames[collection.chain] || collection.chain.toUpperCase();
      detailChain.setAttribute('data-chain', collection.chain);

  var displayIcon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';

  var thumbsHtml = collection.pieces.map(function(p, idx) {
          var displayBtn = '<div class="piece-thumb-actions"><button class="piece-display-btn" data-display-index="' + idx + '" title="Display this piece">' + displayIcon + '</button></div>';

                                             // Use iframe for on-chain pieces (ordinals + on-chain ETH with HTML animation)
                                             if (pieceNeedsIframe(collection, p)) {
                                                       return '<div class="piece-thumb" data-index="' + idx + '">'
                                                         + '<iframe src="' + (p.animationUrl || p.image) + '" loading="lazy" sandbox="allow-scripts" scrolling="no"></iframe>'
                                                         + displayBtn
                                                         + '</div>';
                                             }

                                             // For standard pieces with static images
                                             var staticUrl = getStaticImageUrl(p);
          if (staticUrl) {
                    var thumbUrl = toOptimizedUrl(p.thumbnail || p.image);
                    return '<div class="piece-thumb" data-index="' + idx + '">'
                      + '<img src="' + thumbUrl + '" loading="lazy">'
                      + displayBtn
                      + '</div>';
          }

                                             // Fallback to iframe
                                             return '<div class="piece-thumb" data-index="' + idx + '">'
            + '<iframe src="' + (p.animationUrl || p.image) + '" loading="lazy" sandbox="allow-scripts" scrolling="no"></iframe>'
            + displayBtn
            + '</div>';
  }).join('');

  // Build marketplace links from collection-level data
  var linksHtml = '';
      if (collection.marketplaceLinks) {
              collection.marketplaceLinks.forEach(function(link) {
                        linksHtml += '<a href="' + link.url + '" target="_blank" class="detail-link">' + link.name + '</a>';
              });
      }

  detailMetadata.innerHTML = '<div class="collection-stats">'
        + '<div class="meta-row"><span class="meta-label">Pieces</span><span class="meta-value">' + (collection.supply || collection.pieces?.length || '?') + '</span></div>'
        + '<div class="meta-row"><span class="meta-label">Chain</span><span class="meta-value">' + collection.chain.toUpperCase() + '</span></div>'
        + '</div>'
        + '<div class="pieces-grid">' + thumbsHtml + '</div>'
        + (linksHtml ? '<div class="marketplace-links">' + linksHtml + '</div>' : '');

  detailMetadata.querySelectorAll('.piece-thumb').forEach(function(thumb) {
          thumb.addEventListener('click', function(e) {
                    if (e.target.closest('.piece-display-btn')) return;
                    var idx = parseInt(thumb.dataset.index);
                    currentPieceIndex = idx;
                    showPiece(collection, idx);
          });
  });

  detailMetadata.querySelectorAll('.piece-display-btn').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var idx = parseInt(btn.dataset.displayIndex);
                    enterDisplayMode(collection, idx, true);
          });
  });

  showView('detail');
}

function showPiece(collection, index) {
      var piece = collection.pieces[index];
      if (!piece) return;
      showHeroMedia(collection, piece);
      detailTitle.innerHTML = collection.title + ' <span class="piece-indicator">' + (piece.title || '#' + piece.tokenId) + '</span>';
}

function showRandomArt() {
      var col = collections[Math.floor(Math.random() * collections.length)];
      var piece = col.pieces[Math.floor(Math.random() * col.pieces.length)];
      currentCarouselCollection = col;

  var staticUrl = getStaticImageUrl(piece);
      if (staticUrl) {
              featuredIframe.classList.remove('active');
              featuredIframe.src = '';
              featuredArt.style.display = '';
              featuredArt.src = staticUrl;
      } else if (pieceNeedsIframe(col, piece)) {
              featuredArt.style.display = 'none';
              featuredIframe.classList.add('active');
              featuredIframe.src = piece.animationUrl || piece.image;
      } else {
              featuredIframe.classList.remove('active');
              featuredIframe.src = '';
              featuredArt.style.display = '';
              featuredArt.src = piece.image || piece.thumbnail || col.heroImage;
      }

  artTitle.textContent = piece.title || col.title;
      artCollection.textContent = col.title;
      artChain.textContent = chainNames[col.chain] || col.chain.toUpperCase();
      artChain.setAttribute('data-chain', col.chain);
      artInfo.classList.add('visible');
}

function startSlideshow() {
      slideshowPlaying = true;
      slideshowInterval = setInterval(showRandomArt, 10000);
}

function stopSlideshow() {
      slideshowPlaying = false;
      clearInterval(slideshowInterval);
}

function toOptimizedUrl(url) {
      if (!url) return '';
      if (url.includes('res.cloudinary.com')) {
              return url.replace('/upload/', '/upload/f_auto,q_auto/');
      }
      return url;
}

// ==========================================
// DISPLAY MODE - Fullscreen art display
// ==========================================

function enterDisplayMode(collection, pieceIndex, singleOnly) {
      displayCollectionData = collection;
      displayPieceIndex = pieceIndex;
      displaySingleMode = !!singleOnly;
      loadDisplayPiece();
      displayMode.classList.add('active');
      document.body.style.overflow = 'hidden';

  var navBtns = displayMode.querySelectorAll('.display-prev, .display-next, .display-shuffle');
      navBtns.forEach(function(btn) {
              btn.style.display = displaySingleMode ? 'none' : '';
      });
}

function exitDisplayMode() {
      displayMode.classList.remove('active');
      displayIframe.src = '';
      displayArt.style.display = 'none';
      displayIframe.style.display = 'none';
      document.body.style.overflow = '';
}

function loadDisplayPiece() {
      if (!displayCollectionData) return;
      var piece = displayCollectionData.pieces[displayPieceIndex];
      if (!piece) return;

  displayArt.style.display = 'none';
      displayIframe.style.display = 'none';
      displayIframe.src = '';

  // Use iframe for on-chain pieces
  if (pieceNeedsIframe(displayCollectionData, piece)) {
          displayIframe.src = getIframeUrl(piece);
          displayIframe.style.display = 'block';
  } else {
          var staticUrl = getStaticImageUrl(piece);
          if (staticUrl) {
                    displayArt.src = staticUrl;
                    displayArt.style.display = 'block';
          } else {
                    displayArt.src = piece.image || piece.thumbnail;
                    displayArt.style.display = 'block';
          }
  }

  if (displayTitle) displayTitle.textContent = piece.title || displayCollectionData.title;
      if (displayCollection) displayCollection.textContent = displayCollectionData.title;
}

function initDisplayMode() {
      var btn = document.getElementById('display-mode-btn');
      if (btn) {
              btn.addEventListener('click', function() {
                        var col = collections[Math.floor(Math.random() * collections.length)];
                        var idx = Math.floor(Math.random() * col.pieces.length);
                        enterDisplayMode(col, idx, false);
              });
      }

  var collectionDisplayBtn = document.getElementById('collection-display-btn');
      if (collectionDisplayBtn) {
              collectionDisplayBtn.addEventListener('click', function() {
                        var collection = collections.find(function(c) { return c.id === currentCollectionId; });
                        if (collection) enterDisplayMode(collection, 0, false);
              });
      }

  var closeBtn = document.querySelector('.display-close');
      if (closeBtn) closeBtn.addEventListener('click', exitDisplayMode);

  var nextBtn = document.querySelector('.display-next');
      if (nextBtn) {
              nextBtn.addEventListener('click', function() {
                        if (!displayCollectionData || displaySingleMode) return;
                        displayPieceIndex = (displayPieceIndex + 1) % displayCollectionData.pieces.length;
                        loadDisplayPiece();
              });
      }

  var prevBtn = document.querySelector('.display-prev');
      if (prevBtn) {
              prevBtn.addEventListener('click', function() {
                        if (!displayCollectionData || displaySingleMode) return;
                        displayPieceIndex = (displayPieceIndex - 1 + displayCollectionData.pieces.length) % displayCollectionData.pieces.length;
                        loadDisplayPiece();
              });
      }

  var shuffleBtn = document.querySelector('.display-shuffle');
      if (shuffleBtn) {
              shuffleBtn.addEventListener('click', function() {
                        if (!displayCollectionData || displaySingleMode) return;
                        displayPieceIndex = Math.floor(Math.random() * displayCollectionData.pieces.length);
                        loadDisplayPiece();
              });
      }

  document.addEventListener('keydown', function(e) {
          if (!displayMode.classList.contains('active')) return;
          if (e.key === 'Escape') exitDisplayMode();
          if (!displaySingleMode && displayCollectionData) {
                    if (e.key === 'ArrowRight') {
                                displayPieceIndex = (displayPieceIndex + 1) % displayCollectionData.pieces.length;
                                loadDisplayPiece();
                    } else if (e.key === 'ArrowLeft') {
                                displayPieceIndex = (displayPieceIndex - 1 + displayCollectionData.pieces.length) % displayCollectionData.pieces.length;
                                loadDisplayPiece();
                    }
          }
  });
}

function openLightbox(src, title) {
      var lb = document.getElementById('lightbox');
      document.getElementById('lightbox-img').src = src;
      lb.classList.add('active');
}

function closeLightbox() {
      document.getElementById('lightbox').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', init);
