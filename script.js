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

// Check if collection is an edition (supply > unique pieces shown, or explicitly flagged)
function isEditionCollection(collection) {
  if (collection.isEditions === true) return true;
  if (collection.isEditions === false) return false;
  const uniqueCount = collection.uniquePieces || collection.pieces?.length || 0;
  const supply = collection.supply || uniqueCount;
  return supply > uniqueCount;
}

// Check if collection is on-chain (uses animationUrl for HTML content)
function isOnchainCollection(collection) {
  return collection?.onchain === true;
}

// Convert thumbnail URL to AVIF/WebP via Cloudinary f_auto
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
      timeline.querySelectorAll('.timeline-year').forEach(yearEl => {
        let next = yearEl.nextElementSibling;
        let hasVisible = false;
        while (next && !next.classList.contains('timeline-year')) {
          if (next.classList.contains('timeline-item') && next.style.display !== 'none') {
            hasVisible = true;
            break;
          }
          next = next.nextElementSibling;
        }
        yearEl.style.display = hasVisible ? '' : 'none';
      });
    });
  });

  document.querySelector('.art-container').addEventListener('click', () => {
    if (currentCollectionId) showDetail(currentCollectionId);
  });

  const openFullscreen = () => {
    const collection = collections.find(c => c.id === currentCollectionId);
    let title = collection?.title || '';
    if (collection?.pieces?.[currentPieceIndex]) {
      const piece = collection.pieces[currentPieceIndex];
      title = piece.title || `#${piece.tokenId}`;
    }
    const fullImage = detailImage.dataset.fullImage || detailImage.src;
    openLightbox(fullImage, title);
  };

  detailImage.addEventListener('click', openFullscreen);
  document.querySelector('.fullscreen-btn').addEventListener('click', openFullscreen);

  const playBtn = document.getElementById('play-animated');
  playBtn.addEventListener('click', () => {
    const fullImageUrl = detailImage.dataset.fullImage;
    if (!fullImageUrl) return;
    playBtn.classList.add('loading');
    const fullImg = new Image();
    fullImg.onload = () => {
      detailImage.src = fullImageUrl;
      playBtn.classList.add('hidden');
      playBtn.classList.remove('loading');
    };
    fullImg.src = fullImageUrl;
  });

  document.querySelector('.download-btn').addEventListener('click', async () => {
    const collection = collections.find(c => c.id === currentCollectionId);
    let filename = collection?.title || 'artwork';
    if (collection?.pieces?.[currentPieceIndex]) {
      const piece = collection.pieces[currentPieceIndex];
      filename = piece.title || `${collection.title}-${piece.tokenId}`;
    }
    filename = filename.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const imageUrl = detailImage.dataset.fullImage || detailImage.src;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      window.open(imageUrl, '_blank');
    }
  });
}

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
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('timeline-item-chain')) {
        const legendItem = document.querySelector(`.legend-item[data-chain="${item.dataset.chain}"]`);
        if (legendItem) legendItem.click();
        return;
      }
      showDetail(item.dataset.id);
    });
  });
}

function showDetail(collectionId) {
  const collection = collections.find(c => c.id === collectionId);
  if (!collection) return;
  currentCollectionId = collectionId;
  currentPieceIndex = 0;
  const firstPiece = collection.pieces?.[0];
  const isOnchain = isOnchainCollection(collection);
  const imageActions = document.querySelector('.image-actions');

  // FIX: Reset all media first
  detailImage.classList.add('hidden');
  detailIframe.classList.add('hidden');
  if (detailVideo) {
    detailVideo.classList.add('hidden');
    detailVideo.src = "";
    detailVideo.load();
  }

  const hasVideo = firstPiece?.video || (firstPiece?.animationUrl && (
    firstPiece.animationUrl.endsWith('.mp4') || firstPiece.animationUrl.endsWith('.webm') ||
    firstPiece.animationUrl.endsWith('.mov') || firstPiece.animationUrl.includes('video')
  ));

  if (hasVideo) {
    detailVideo.src = firstPiece.video || firstPiece.animationUrl;
    detailVideo.classList.remove('hidden');
    imageActions.classList.add('hidden');
  } else if (isOnchain && firstPiece?.animationUrl && !firstPiece?.isImage) {
    detailIframe.classList.remove('hidden');
    detailIframe.src = firstPiece.animationUrl;
    imageActions.classList.add('hidden');
  } else {
    const fullImageUrl = collection.heroImage || firstPiece?.image || '';
    const thumbnailUrl = firstPiece?.thumbnail || fullImageUrl;
    detailImage.classList.remove('hidden');
    detailImage.src = toOptimizedUrl(thumbnailUrl);
    detailImage.dataset.fullImage = fullImageUrl;
    const playBtn = document.getElementById('play-animated');
    playBtn.classList.toggle('hidden', thumbnailUrl === fullImageUrl);
    imageActions.classList.remove('hidden');
  }

  detailTitle.textContent = collection.title;
  detailChain.textContent = chainNames[collection.chain] || collection.chain.toUpperCase();
  detailChain.setAttribute('data-chain', collection.chain);

  // Metadata building (Exactly as your original)
  let metaHtml = '';
  if (collection.description) metaHtml += `<div class="collection-description"><p>${collection.description}</p></div>`;
  if (collection.artistNote) metaHtml += `<div class="artist-note"><span class="note-label">Artist Note</span><p>${collection.artistNote}</p></div>`;
  metaHtml += `
    <div class="collection-stats">
      ${metaRow('Pieces', collection.supply || collection.pieces?.length || '?')}
      ${metaRow('Chain', getChainFullName(collection.chain))}
      ${collection.contract ? metaRow('Contract', truncateId(collection.contract), collection.contract) : ''}
    </div>`;

  if (collection.pieces && collection.pieces.length > 0) {
    metaHtml += `
      <div class="pieces-section">
        <span class="pieces-label">Pieces</span>
        <div class="pieces-grid">
          ${collection.pieces.map((p, idx) => `
            <div class="piece-thumb" data-index="${idx}">
              <img src="${toOptimizedUrl(p.thumbnail || p.image)}" alt="" loading="lazy" />
              <span class="piece-title">${p.title || '#' + p.tokenId}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }
  detailMetadata.innerHTML = metaHtml;

  // Marketplace links
  if (collection.marketplaces) {
    linkMagicEden.href = collection.marketplaces.magicEden || '';
    linkMagicEden.classList.toggle('hidden', !collection.marketplaces.magicEden);
    linkGamma.href = collection.marketplaces.gamma || collection.marketplaces.opensea || '';
    linkGamma.classList.toggle('hidden', !linkGamma.href);
  }

  detailMetadata.querySelectorAll('.piece-thumb').forEach(t => t.addEventListener('click', () => showPiece(collection, parseInt(t.dataset.index))));
  showView('detail');
}

function showPiece(collection, index) {
  const piece = collection.pieces[index];
  if (!piece) return;
  currentPieceIndex = index;
  const imageActions = document.querySelector('.image-actions');

  // Reset media
  detailImage.classList.add('hidden');
  detailIframe.classList.add('hidden');
  if (detailVideo) { detailVideo.classList.add('hidden'); detailVideo.src = ""; detailVideo.load(); }

  if (piece.isImage || (!piece.video && !piece.animationUrl)) {
    const fullImageUrl = piece.image || piece.thumbnail;
    detailImage.classList.remove('hidden');
    detailImage.src = toOptimizedUrl(piece.thumbnail || piece.image);
    detailImage.dataset.fullImage = fullImageUrl;
    imageActions.classList.remove('hidden');
  }

  detailTitle.innerHTML = `${collection.title} <span class="piece-indicator">${piece.title || '#' + piece.tokenId}</span>`;
  detailMetadata.querySelectorAll('.piece-thumb').forEach((t, i) => t.classList.toggle('active', i === index));
}

function getChainFullName(c) { return { ordinals: 'Bitcoin (Ordinals)', ethereum: 'Ethereum', tezos: 'Tezos', solana: 'Solana' }[c] || c; }
function metaRow(l, v, f = null) { return `<div class="meta-row"><span class="meta-label">${l}</span><span class="meta-value ${f ? 'copyable' : ''}" data-full="${f || ''}" data-display="${v}">${v}</span></div>`; }
function truncateId(i) { return i && i.length > 16 ? i.slice(0, 8) + '...' + i.slice(-6) : i; }

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
  document.getElementById('display-mode-btn').addEventListener('click', () => {
    document.getElementById('display-mode').classList.add('active');
  });
}

function openLightbox(s, t) { lightbox.style.display = 'flex'; lightboxImg.src = s; lightboxTitle.textContent = t; }
function closeLightbox() { lightbox.style.display = 'none'; }
document.addEventListener('DOMContentLoaded', init);
