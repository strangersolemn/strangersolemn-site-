// DOM Elements
const views = {
  home: document.getElementById('view-home'),
  detail: document.getElementById('view-detail')
};

const featuredArt = document.getElementById('featured-art');
const featuredIframe = document.getElementById('featured-iframe');
const artTitle = document.getElementById('art-title');
const artCollection = document.getElementById('art-collection');
const artChain = document.getElementById('art-chain');
const artInfo = document.querySelector('.art-info');
const timeline = document.getElementById('timeline');

const detailImage = document.getElementById('detail-image');
const detailIframe = document.getElementById('detail-iframe');
const detailVideo = document.getElementById('detail-video');
const detailTitle = document.getElementById('detail-title');
const detailChain = document.getElementById('detail-chain');
const detailMetadata = document.getElementById('detail-metadata');
const linkMagicEden = document.getElementById('link-magiceden');
const linkGamma = document.getElementById('link-gamma');
const linkOrdinals = document.getElementById('link-ordinals');

// State
let currentView = 'home';
let currentCollectionId = null;
let currentPieceIndex = 0;
let activeChainFilter = null;

// Slideshow state
let slideshowInterval = null;
let slideshowPlaying = false;

// Check if collection is an edition
function isEditionCollection(collection) {
  if (collection.isEditions === true) return true;
  if (collection.isEditions === false) return false;
  const uniqueCount = collection.uniquePieces || collection.pieces?.length || 0;
  const supply = collection.supply || uniqueCount;
  return supply > uniqueCount;
}

// Check if collection is on-chain
function isOnchainCollection(collection) {
  return collection?.onchain === true;
}

// Convert thumbnail URL to optimized version
function toOptimizedUrl(url) {
  if (!url) return url;
  if (url.includes('res.cloudinary.com/alchemyapi/image/upload/')) {
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
  }
  return url;
}

// Chain display names
const chainNames = {
  ordinals: 'BTC',
  ethereum: 'ETH',
  tezos: 'TEZ',
  solana: 'SOL'
};

// Initialize
function init() {
  buildTimeline();
  showRandomArt();
  initDisplayMode();
  startSlideshow();

  document.querySelectorAll('[data-view="home"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showView('home');
    });
  });

  document.querySelectorAll('.legend-item').forEach(item => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      const chain = item.dataset.chain;
      if (activeChainFilter === chain) {
        activeChainFilter = null;
        document.querySelectorAll('.legend-item').forEach(li => li.classList.remove('active'));
      } else {
        activeChainFilter = chain;
        document.querySelectorAll('.legend-item').forEach(li => {
          li.classList.toggle('active', li.dataset.chain === chain);
        });
      }
      timeline.querySelectorAll('.timeline-item').forEach(ti => {
        ti.style.display = (!activeChainFilter || ti.dataset.chain === activeChainFilter) ? '' : 'none';
      });
    });
  });
}

// View management
function showView(viewName) {
  Object.keys(views).forEach(key => views[key].classList.toggle('active', key === viewName));
  currentView = viewName;
  if (viewName === 'home') {
    timeline.querySelectorAll('.timeline-item').forEach(item => item.classList.remove('active'));
    if (!slideshowPlaying) startSlideshow();
  } else {
    if (slideshowPlaying) stopSlideshow();
  }
}

// Build timeline - Restored original HTML structure for side panel
function buildTimeline() {
  const sorted = [...collections].sort((a, b) => (b.year || 2024) - (a.year || 2024));
  let currentYear = null;
  let html = '';

  sorted.forEach((collection) => {
    const year = collection.year || 2024;
    if (year !== currentYear) {
      currentYear = year;
      html += `<div class="timeline-year">${currentYear}</div>`;
    }

    const editionTag = isEditionCollection(collection) ? '<span class="timeline-item-editions">Editions</span>' : '';
    const collabTag = collection.isCollab ? '<span class="timeline-item-collab">Collab</span>' : '';

    html += `
      <div class="timeline-item" data-chain="${collection.chain}" data-id="${collection.id}">
        <span class="timeline-item-chain">${chainNames[collection.chain] || collection.chain.toUpperCase()}</span>
        <span class="timeline-item-title">${collection.title}${editionTag}${collabTag}</span>
        <span class="timeline-item-count">${collection.supply || collection.pieces?.length || '?'}</span>
      </div>`;
  });

  timeline.innerHTML = html;
  timeline.querySelectorAll('.timeline-item').forEach(item => {
    item.addEventListener('click', () => showDetail(item.dataset.id));
  });
}

// Show collection detail - Includes the Video Kill Switch
function showDetail(collectionId) {
  const collection = collections.find(c => c.id === collectionId);
  if (!collection) return;

  currentCollectionId = collectionId;
  currentPieceIndex = 0;
  const piece = collection.pieces?.[0];
  const imageActions = document.querySelector('.image-actions');

  // RESET ALL MEDIA - Stops "Ghost Video" bug
  detailImage.classList.add('hidden');
  detailIframe.classList.add('hidden');
  if (detailVideo) {
    detailVideo.classList.add('hidden');
    detailVideo.pause();
    detailVideo.src = "";
    detailVideo.load();
  }

  const hasVideo = piece?.video || (piece?.animationUrl && (
    piece.animationUrl.endsWith('.mp4') || piece.animationUrl.includes('video')
  ));

  if (hasVideo) {
    detailVideo.src = piece.video || piece.animationUrl;
    detailVideo.classList.remove('hidden');
    imageActions.classList.add('hidden');
  } else if (isOnchainCollection(collection) && piece?.animationUrl && !piece?.isImage) {
    detailIframe.src = piece.animationUrl;
    detailIframe.classList.remove('hidden');
    imageActions.classList.add('hidden');
  } else {
    const fullUrl = piece?.image || collection.heroImage || '';
    detailImage.src = toOptimizedUrl(piece?.thumbnail || fullUrl);
    detailImage.dataset.fullImage = fullUrl;
    detailImage.classList.remove('hidden');
    imageActions.classList.remove('hidden');
  }

  detailTitle.textContent = collection.title;
  detailChain.textContent = chainNames[collection.chain] || collection.chain.toUpperCase();
  detailChain.setAttribute('data-chain', collection.chain);

  // Metadata Area
  let metaHtml = `<div class="collection-stats">
    ${metaRow('Pieces', collection.supply || collection.pieces?.length || '?')}
    ${metaRow('Chain', collection.chain)}
  </div>`;

  if (collection.pieces && collection.pieces.length > 0) {
    metaHtml += `<div class="pieces-grid">
      ${collection.pieces.map((p, idx) => `
        <div class="piece-thumb" data-index="${idx}">
          <img src="${toOptimizedUrl(p.thumbnail || p.image)}" loading="lazy" />
        </div>`).join('')}
    </div>`;
  }
  detailMetadata.innerHTML = metaHtml;
  detailMetadata.querySelectorAll('.piece-thumb').forEach(t => {
    t.addEventListener('click', () => showPiece(collection, parseInt(t.dataset.index)));
  });

  showView('detail');
}

function showPiece(collection, index) {
  const piece = collection.pieces[index];
  if (!piece) return;
  currentPieceIndex = index;
  
  detailImage.classList.add('hidden');
  detailIframe.classList.add('hidden');
  if (detailVideo) { detailVideo.classList.add('hidden'); detailVideo.src = ""; detailVideo.load(); }

  const fullUrl = piece.image || piece.thumbnail;
  detailImage.src = toOptimizedUrl(piece.thumbnail || piece.image);
  detailImage.dataset.fullImage = fullUrl;
  detailImage.classList.remove('hidden');
  detailTitle.innerHTML = `${collection.title} <span class="piece-indicator">${piece.title || '#' + piece.tokenId}</span>`;
}

function metaRow(l, v) { return `<div class="meta-row"><span class="meta-label">${l}</span><span class="meta-value">${v}</span></div>`; }

function pickRandomPiece() {
  const cols = collections.filter(c => c.pieces?.length > 0);
  const col = cols[Math.floor(Math.random() * cols.length)];
  return { collection: col, piece: col.pieces[Math.floor(Math.random() * col.pieces.length)] };
}

function showHeroPiece(entry) {
  const { collection, piece } = entry;
  featuredArt.src = piece.image || piece.thumbnail;
  artTitle.textContent = piece.title || collection.title;
  artCollection.textContent = collection.title;
  artChain.textContent = chainNames[collection.chain] || collection.chain.toUpperCase();
}

function startSlideshow() { slideshowPlaying = true; slideshowInterval = setInterval(() => showHeroPiece(pickRandomPiece()), 15000); }
function stopSlideshow() { slideshowPlaying = false; clearInterval(slideshowInterval); }

function initDisplayMode() {
  const btn = document.getElementById('display-mode-btn');
  if (btn) btn.onclick = () => document.getElementById('display-mode').classList.add('active');
}

document.addEventListener('DOMContentLoaded', init);
