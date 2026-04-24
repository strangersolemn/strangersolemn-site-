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

function pieceNeedsVideo(piece) {
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
    startSlideshow();
  } else {
    stopSlideshow();
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
  const featuredVideo = document.getElementById('featured-video');
  // Hide all hero media
  if (featuredArt) featuredArt.style.display = 'none';
  if (featuredIframe) featuredIframe.style.display = 'none';
  if (featuredVideo) { featuredVideo.style.display = 'none'; featuredVideo.pause(); featuredVideo.removeAttribute('src'); }
  if (pieceNeedsVideo(piece)) {
    if (featuredVideo) {
      featuredVideo.style.display = 'block';
      featuredVideo.src = piece.animationUrl;
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
    if (collection.artistNote) meta += '<p class="artist-note">' + collection.artistNote + '</p>';
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
  const marketplaceUrl = mps.opensea || mps.objkt || mps.superrare || mps['exchange-art'] || null;
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
}

function buildPieceGrid(collection) {
  const grid = document.querySelector('.piece-grid') || document.getElementById('art-collection');
  if (!grid) return;
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
  piecesToShow.forEach((piece, idx) => {
    const btn = document.createElement('button');
    btn.className = 'piece-thumb';
    btn.setAttribute('aria-label', 'Display this piece');
    const thumbUrl = getThumbnailUrl(piece);
    const isOrdinalsThumb = thumbUrl && thumbUrl.includes('ordinals.com/content/');
    if (pieceNeedsIframe(collection, piece)) {
      const staticUrl = getStaticImageUrl(piece);
      const hasDataUri = piece.animationUrl && piece.animationUrl.startsWith('data:');
      if (hasDataUri) {
        // Data-URI pieces (e.g. Renascent): NFT CDN thumbnails dedupe to a single placeholder,
        // so render the artwork itself as the thumbnail.
        const iframe = document.createElement('iframe');
        iframe.src = piece.animationUrl;
        iframe.loading = 'lazy';
        iframe.sandbox = 'allow-scripts';
        iframe.scrolling = 'no';
        iframe.className = 'piece-thumb-iframe';
        btn.appendChild(iframe);
      } else if (piece.thumbnail && !isOrdinalsThumb) {
        const img = document.createElement('img');
        img.src = piece.thumbnail;
        img.alt = piece.title || '';
        img.loading = 'lazy';
        btn.appendChild(img);
      } else if (staticUrl && !staticUrl.includes('ordinals.com/content/')) {
        const img = document.createElement('img');
        img.src = staticUrl;
        img.alt = piece.title || '';
        img.loading = 'lazy';
        btn.appendChild(img);
      } else {
        // Ordinals on-chain: try img first, fallback to iframe, then placeholder
        const imgUrl = piece.thumbnail || staticUrl;
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = piece.title || '';
        img.loading = 'lazy';
        img.onerror = function() {
          this.remove();
          const iframe = document.createElement('iframe');
          iframe.src = piece.animationUrl || imgUrl;
          iframe.loading = 'lazy';
          iframe.sandbox = 'allow-scripts';
          iframe.scrolling = 'no';
          iframe.className = 'piece-thumb-iframe';
          iframe.onerror = function() { this.remove(); btn.classList.add('piece-thumb-placeholder'); };
          btn.insertBefore(iframe, btn.firstChild);
        };
        btn.appendChild(img);
      }
    } else if (isOrdinalsThumb) {
      // Ordinals content without animationUrl: try img, fallback to iframe, then placeholder
      const img = document.createElement('img');
      img.src = thumbUrl;
      img.alt = piece.title || '';
      img.loading = 'lazy';
      img.onerror = function() {
        this.remove();
        const iframe = document.createElement('iframe');
        iframe.src = thumbUrl;
        iframe.loading = 'lazy';
        iframe.sandbox = 'allow-scripts';
        iframe.scrolling = 'no';
        iframe.className = 'piece-thumb-iframe';
        iframe.onerror = function() { this.remove(); btn.classList.add('piece-thumb-placeholder'); };
        btn.insertBefore(iframe, btn.firstChild);
      };
      btn.appendChild(img);
    } else {
      const img = document.createElement('img');
      img.src = getStaticImageUrl(piece);
      img.alt = piece.title || '';
      img.loading = 'lazy';
      btn.appendChild(img);
    }
    // Add label for all thumbnails that don't already have one
    if (!btn.querySelector('.piece-thumb-label') && piece.title) {
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
    grid.appendChild(btn);
  });
}

function hideDetailMedia() {
  if (detailImage) detailImage.style.display = 'none';
  if (detailIframe) detailIframe.style.display = 'none';
  if (detailVideo) { detailVideo.style.display = 'none'; detailVideo.pause(); detailVideo.removeAttribute('src'); }
}

function showPiece(collection, index) {
  const piece = collection.pieces[index];
  if (!piece) return;
  currentPieceIndex = index;
  hideDetailMedia();
  if (pieceNeedsVideo(piece)) {
    if (detailVideo) {
      detailVideo.style.display = 'block';
      detailVideo.src = piece.animationUrl;
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
      detailImage.src = getStaticImageUrl(piece);
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
const slideshowExclude = new Set([
  'gl1tch-c0des', 'a-solemn-rose', 'doom', 'deliverance',
  'block-clocks', 'glitch-pack', 'renascent', 'block-party',
  'leverage'
]);

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

function exitDisplayMode() {
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
  if (pieceNeedsVideo(piece)) {
    if (displayVideo) {
      displayVideo.style.display = 'block';
      displayVideo.src = piece.animationUrl;
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
}

function initPanelCollapse() {
  const btn = document.getElementById('panel-collapse');
  const container = document.querySelector('.container');
  if (!btn || !container) return;
  btn.addEventListener('click', () => {
    container.classList.toggle('panel-collapsed');
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
