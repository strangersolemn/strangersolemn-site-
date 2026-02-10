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
  // Add f_auto,q_auto to Cloudinary URLs for AVIF/WebP
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

  // Auto-start slideshow on home (cycles every 10s)
  startSlideshow();

  // Navigation - home link
  document.querySelectorAll('[data-view="home"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showView('home');
    });
  });

  // Chain filter - click legend items to filter timeline
  document.querySelectorAll('.legend-item').forEach(item => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      const chain = item.dataset.chain;
      if (activeChainFilter === chain) {
        // Toggle off
        activeChainFilter = null;
        document.querySelectorAll('.legend-item').forEach(li => li.classList.remove('active'));
      } else {
        // Filter to this chain
        activeChainFilter = chain;
        document.querySelectorAll('.legend-item').forEach(li => {
          li.classList.toggle('active', li.dataset.chain === chain);
        });
      }
      // Apply filter to timeline items
      timeline.querySelectorAll('.timeline-item').forEach(ti => {
        if (!activeChainFilter || ti.dataset.chain === activeChainFilter) {
          ti.style.display = '';
        } else {
          ti.style.display = 'none';
        }
      });
      // Also show/hide year headers that have no visible items
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

  // Click featured art to go to detail
  document.querySelector('.art-container').addEventListener('click', () => {
    if (currentCollectionId) {
      showDetail(currentCollectionId);
    }
  });

  // Click detail image or fullscreen button to open lightbox with full quality image
  const openFullscreen = () => {
    const collection = collections.find(c => c.id === currentCollectionId);
    let title = collection?.title || '';
    if (collection?.pieces?.[currentPieceIndex]) {
      const piece = collection.pieces[currentPieceIndex];
      title = piece.title || `#${piece.tokenId}`;
    }
    // Use full quality image for lightbox
    const fullImage = detailImage.dataset.fullImage || detailImage.src;
    openLightbox(fullImage, title);
  };

  detailImage.addEventListener('click', openFullscreen);
  document.querySelector('.fullscreen-btn').addEventListener('click', openFullscreen);

  // Play button loads animated version
  const playBtn = document.getElementById('play-animated');
  playBtn.addEventListener('click', () => {
    const fullImageUrl = detailImage.dataset.fullImage;
    if (!fullImageUrl) return;

    // Show loading state
    playBtn.classList.add('loading');
    playBtn.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
    </svg>`;

    // Load full image
    const fullImg = new Image();
    fullImg.onload = () => {
      detailImage.src = fullImageUrl;
      playBtn.classList.add('hidden');
      playBtn.classList.remove('loading');
      playBtn.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>`;
    };
    fullImg.onerror = () => {
      playBtn.classList.remove('loading');
      playBtn.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>`;
    };
    fullImg.src = fullImageUrl;
  });

  // Download button
  document.querySelector('.download-btn').addEventListener('click', async () => {
    const collection = collections.find(c => c.id === currentCollectionId);
    let filename = collection?.title || 'artwork';
    if (collection?.pieces?.[currentPieceIndex]) {
      const piece = collection.pieces[currentPieceIndex];
      filename = piece.title || `${collection.title}-${piece.tokenId}`;
    }
    // Clean filename
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
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
  });
}

// View management
function showView(viewName) {
  Object.keys(views).forEach(key => {
    views[key].classList.toggle('active', key === viewName);
  });
  currentView = viewName;

  if (viewName === 'home') {
    timeline.querySelectorAll('.timeline-item').forEach(item => {
      item.classList.remove('active');
    });
    // Restart slideshow when returning home
    if (!slideshowPlaying) startSlideshow();
  } else {
    // Stop slideshow when leaving home
    if (slideshowPlaying) stopSlideshow();
  }
}

// Build timeline from collections data
function buildTimeline() {
  // Sort by year descending (extract year from first piece or use current)
  const sorted = [...collections].sort((a, b) => {
    const yearA = a.year || 2024;
    const yearB = b.year || 2024;
    return yearB - yearA;
  });

  let currentYear = null;
  let html = '';

  sorted.forEach((collection) => {
    const year = collection.year || 2024;

    // Add year header if new year
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
      </div>
    `;
  });

  timeline.innerHTML = html;

  // Add click handlers
  timeline.querySelectorAll('.timeline-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // If they clicked the chain tag, filter by chain instead of opening detail
      if (e.target.classList.contains('timeline-item-chain')) {
        const chain = item.dataset.chain;
        // Simulate clicking the corresponding legend item
        const legendItem = document.querySelector(`.legend-item[data-chain="${chain}"]`);
        if (legendItem) legendItem.click();
        return;
      }
      showDetail(item.dataset.id);
    });
  });
}

// Show collection detail
function showDetail(collectionId) {
  const collection = collections.find(c => c.id === collectionId);
  if (!collection) return;

  currentCollectionId = collectionId;
  currentPieceIndex = 0;

  // Update detail view - use iframe for on-chain HTML, img for regular images
  const firstPiece = collection.pieces?.[0];
  const isOnchain = isOnchainCollection(collection);

  // Hide/show appropriate element and actions
  const imageActions = document.querySelector('.image-actions');

  // RESET ALL MEDIA ELEMENTS FIRST TO PREVENT GHOST VIDEOS
  detailImage.classList.add('hidden');
  detailIframe.classList.add('hidden');
  if (detailVideo) {
    detailVideo.classList.add('hidden');
    detailVideo.src = ""; 
    detailVideo.load();
  }

  // Check if piece has a video URL (MP4, WebM, etc.)
  const hasVideo = firstPiece?.video || (firstPiece?.animationUrl && (
    firstPiece.animationUrl.endsWith('.mp4') ||
    firstPiece.animationUrl.endsWith('.webm') ||
    firstPiece.animationUrl.endsWith('.mov') ||
    firstPiece.animationUrl.includes('video')
  ));

  if (hasVideo) {
    // Use video element for actual video files
    const videoUrl = firstPiece.video || firstPiece.animationUrl;
    detailVideo.src = videoUrl;
    detailVideo.classList.remove('hidden');
    imageActions.classList.add('hidden');
  } else if (isOnchain && firstPiece?.animationUrl && !firstPiece?.isImage) {
    // On-chain HTML art
    detailIframe.classList.remove('hidden');
    detailIframe.src = firstPiece.animationUrl;
    imageActions.classList.add('hidden'); 
  } else {
    // Regular images (like Acid Family)
    const fullImageUrl = collection.heroImage || firstPiece?.image || '';
    const thumbnailUrl = firstPiece?.thumbnail || fullImageUrl;
    detailImage.classList.remove('hidden');

    detailImage.src = toOptimizedUrl(thumbnailUrl);
    detailImage.dataset.fullImage = fullImageUrl;

    const playBtn = document.getElementById('play-animated');
    if (thumbnailUrl !== fullImageUrl) {
      playBtn.classList.remove('hidden');
    } else {
      playBtn.classList.add('hidden');
    }

    imageActions.classList.remove('hidden');
  }

  detailTitle.textContent = collection.title;
  detailChain.textContent = chainNames[collection.chain] || collection.chain.toUpperCase();
  detailChain.setAttribute('data-chain', collection.chain);

  // Build metadata
  let metaHtml = '';
  if (collection.description) {
    metaHtml += `<div class="collection-description"><p>${collection.description}</p></div>`;
  }
  if (collection.artistNote) {
    metaHtml += `<div class="artist-note"><span class="note-label">Artist Note</span><p>${collection.artistNote}</p></div>`;
  }

  metaHtml += `
    <div class="collection-stats">
      ${metaRow('Pieces', collection.supply || collection.pieces?.length || '?')}
      ${metaRow('Chain', getChainFullName(collection.chain))}
      ${collection.contract ? metaRow('Contract', truncateId(collection.contract), collection.contract) : ''}
      ${collection.chain === 'ordinals' && firstPiece ? `
        <div class="meta-row" id="inscription-row">
          <span class="meta-label">Inscription</span>
          <a class="meta-value inscription-link" href="https://ordinals.com/inscription/${firstPiece.tokenId}" target="_blank" rel="noopener" title="${firstPiece.tokenId}">${truncateId(firstPiece.tokenId)}</a>
        </div>
      ` : ''}
    </div>
  `;

  if (collection.pieces && collection.pieces.length > 0) {
    metaHtml += `
      <div class="pieces-section">
        <span class="pieces-label">Pieces</span>
        <div class="pieces-grid">
          ${collection.pieces.map((piece, idx) => {
            if (isOnchain && !piece.isImage && piece.animationUrl) {
              return `
                <div class="piece-thumb" data-index="${idx}" title="${piece.title || '#' + piece.tokenId}">
                  <iframe src="${piece.animationUrl}" sandbox="allow-scripts" frameborder="0" style="width: 100%; height: 100%; border: none; pointer-events: none;"></iframe>
                  <span class="piece-title">${piece.title || '#' + piece.tokenId}</span>
                </div>`;
            } else {
              return `
                <div class="piece-thumb" data-index="${idx}" title="${piece.title || '#' + piece.tokenId}">
                  <img src="${toOptimizedUrl(piece.thumbnail || piece.image)}" alt="${piece.title || ''}" loading="lazy" />
                  <span class="piece-title">${piece.title || '#' + piece.tokenId}</span>
                </div>`;
            }
          }).join('')}
        </div>
      </div>`;
  }

  detailMetadata.innerHTML = metaHtml;

  // Marketplace links
  if (collection.marketplaces) {
    if (collection.marketplaces.magicEden) {
      linkMagicEden.href = collection.marketplaces.magicEden;
      linkMagicEden.classList.remove('hidden');
    } else {
      linkMagicEden.classList.add('hidden');
    }

    if (collection.marketplaces.gamma) {
      linkGamma.href = collection.marketplaces.gamma;
      linkGamma.classList.remove('hidden');
    } else if (collection.marketplaces.opensea) {
      linkGamma.href = collection.marketplaces.opensea;
      linkGamma.textContent = 'OpenSea';
      linkGamma.classList.remove('hidden');
    } else if (collection.marketplaces.objkt) {
      linkGamma.href = collection.marketplaces.objkt;
      linkGamma.textContent = 'objkt';
      linkGamma.classList.remove('hidden');
    } else {
      linkGamma.classList.add('hidden');
    }
  } else {
    linkMagicEden.classList.add('hidden');
    linkGamma.classList.add('hidden');
  }

  if (collection.chain === 'ordinals' && firstPiece) {
    linkOrdinals.href = 'https://ordinals.com/inscription/' + firstPiece.tokenId;
    linkOrdinals.classList.remove('hidden');
  } else {
    linkOrdinals.classList.add('hidden');
  }

  detailMetadata.querySelectorAll('.piece-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const idx = parseInt(thumb.dataset.index);
      showPiece(collection, idx);
    });
  });

  detailMetadata.querySelectorAll('.copyable').forEach(el => {
    el.addEventListener('click', () => {
      navigator.clipboard.writeText(el.dataset.full);
      el.textContent = 'Copied!';
      setTimeout(() => { el.textContent = el.dataset.display; }, 1000);
    });
  });

  const collDisplayBtn = document.getElementById('collection-display-btn');
  collDisplayBtn.onclick = () => enterDisplayMode(collectionId);

  timeline.querySelectorAll('.timeline-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === collectionId);
  });

  showView('detail');
}

// Show individual piece
function showPiece(collection, index) {
  const piece = collection.pieces[index];
  if (!piece) return;

  currentPieceIndex = index;
  const isOnchain = isOnchainCollection(collection);
  const imageActions = document.querySelector('.image-actions');

  // RESET ALL MEDIA ELEMENTS
  detailImage.classList.add('hidden');
  detailIframe.classList.add('hidden');
  if (detailVideo) {
    detailVideo.classList.add('hidden');
    detailVideo.src = "";
    detailVideo.load();
  }

  if (isOnchain && piece.animationUrl && !piece.isImage) {
    detailIframe.classList.remove('hidden');
    detailIframe.src = piece.animationUrl;
    imageActions.classList.add('hidden');
  } else {
    const fullImageUrl = piece.image || piece.thumbnail;
    const thumbnailUrl = piece.thumbnail || piece.image;
    detailImage.classList.remove('hidden');
    detailImage.src = toOptimizedUrl(thumbnailUrl);
    detailImage.dataset.fullImage = fullImageUrl;

    const playBtn = document.getElementById('play-animated');
    playBtn.classList.toggle('hidden', thumbnailUrl === fullImageUrl);
    imageActions.classList.remove('hidden');
  }

  detailTitle.innerHTML = `${collection.title} <span class="piece-indicator">${piece.title || '#' + piece.tokenId}</span>`;

  if (collection.chain === 'ordinals' && piece.tokenId) {
    const inscriptionRow = document.getElementById('inscription-row');
    if (inscriptionRow) {
      const link = inscriptionRow.querySelector('.inscription-link');
      if (link) {
        link.href = 'https://ordinals.com/inscription/' + piece.tokenId;
        link.textContent = truncateId(piece.tokenId);
      }
    }
  }

  detailMetadata.querySelectorAll('.piece-thumb').forEach((thumb, idx) => {
    thumb.classList.toggle('active', idx === index);
  });

  const activeThumb = detailMetadata.querySelector('.piece-thumb.active');
  if (activeThumb) {
    activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function getChainFullName(chain) {
  const names = { ordinals: 'Bitcoin (Ordinals)', ethereum: 'Ethereum', tezos: 'Tezos', solana: 'Solana' };
  return names[chain] || chain;
}

function metaRow(label, value, fullValue = null) {
  if (fullValue) {
    return `<div class="meta-row"><span class="meta-label">${label}</span><span class="meta-value copyable" data-full="${fullValue}" data-display="${value}" title="Click to copy">${value}</span></div>`;
  }
  return `<div class="meta-row"><span class="meta-label">${label}</span><span class="meta-value">${value}</span></div>`;
}

function truncateId(id) {
  if (!id || id.length <= 16) return id;
  return id.slice(0, 8) + '...' + id.slice(-6);
}

let lastShownCollectionId = null;

function pickRandomPiece(sourceCollections) {
  const cols = (sourceCollections || collections).filter(c => c.pieces && c.pieces.length > 0 && !c.imagesUnavailable);
  if (cols.length === 0) return null;
  let available = cols.filter(c => c.id !== lastShownCollectionId);
  if (available.length === 0) available = cols; 
  const col = available[Math.floor(Math.random() * available.length)];
  const piece = col.pieces[Math.floor(Math.random() * col.pieces.length)];
  lastShownCollectionId = col.id;
  return { collection: col, piece };
}

let lastDisplayCollectionId = null;

function pickRandomDisplayPiece(sourceCollections) {
  const cols = (sourceCollections || collections).filter(c => c.pieces && c.pieces.length > 0 && !c.imagesUnavailable);
  if (cols.length === 0) return null;
  let available = cols.filter(c => c.id !== lastDisplayCollectionId);
  if (available.length === 0) available = cols;
  const col = available[Math.floor(Math.random() * available.length)];
  const piece = col.pieces[Math.floor(Math.random() * col.pieces.length)];
  lastDisplayCollectionId = col.id;
  return { collection: col, piece };
}

function showHeroPiece(entry) {
  if (!entry) return;
  const { collection, piece } = entry;
  currentCollectionId = collection.id;
  const isOnchain = isOnchainCollection(collection) && piece.animationUrl && !piece.isImage;
  const imageUrl = isOnchain ? piece.animationUrl : (piece.image || piece.thumbnail || collection.heroImage);
  const pieceTitle = piece.title || collection.title;

  featuredArt.classList.remove('loaded');
  featuredIframe.classList.remove('loaded');
  artInfo.classList.remove('visible');

  setTimeout(() => {
    const showInfo = () => {
      artTitle.textContent = pieceTitle;
      artCollection.textContent = collection.title + (isEditionCollection(collection) ? ` \u2022 ${collection.supply || '?'} editions` : ` \u2022 ${collection.pieces?.length || '?'} pieces`);
      artChain.textContent = chainNames[collection.chain] || collection.chain.toUpperCase();
      artChain.setAttribute('data-chain', collection.chain);
      artInfo.classList.add('visible');
    };

    if (isOnchain) {
      featuredArt.classList.add('hidden');
      featuredIframe.classList.remove('hidden');
      featuredIframe.src = imageUrl;
      featuredIframe.onload = () => { featuredIframe.classList.add('loaded'); showInfo(); };
    } else {
      featuredIframe.classList.add('hidden');
      featuredArt.classList.remove('hidden');
      featuredArt.src = imageUrl;
      featuredArt.onload = () => { featuredArt.classList.add('loaded'); showInfo(); };
    }
  }, 300);
}

let nextSlideshowEntry = null;

function preloadNextSlide() {
  nextSlideshowEntry = pickRandomPiece();
  if (!nextSlideshowEntry) return;
  const { collection, piece } = nextSlideshowEntry;
  if (!(isOnchainCollection(collection) && piece.animationUrl && !piece.isImage)) {
    const img = new Image();
    img.src = piece.image || piece.thumbnail || collection.heroImage;
  }
}

function showRandomArt() {
  const entry = pickRandomPiece();
  if (entry) { showHeroPiece(entry); preloadNextSlide(); }
}

function startSlideshow() { slideshowPlaying = true; slideshowInterval = setInterval(slideshowNext, 15000); }
function stopSlideshow() { slideshowPlaying = false; clearInterval(slideshowInterval); slideshowInterval = null; }
function slideshowNext() { const entry = nextSlideshowEntry || pickRandomPiece(); if (entry) showHeroPiece(entry); preloadNextSlide(); }

// Display Mode logic
const displayMode = document.getElementById('display-mode');
const displayArt = document.getElementById('display-art');
const displayIframe = document.getElementById('display-iframe');
const displayTitle = document.getElementById('display-title');
const displayCollection = document.getElementById('display-collection');

let displayControlsTimeout = null;
let displayAutoplayInterval = null;
let displaySourceCollections = null;
let currentDisplayEntry = null;
let nextDisplayEntry = null;

function preloadNextDisplayPiece() {
  nextDisplayEntry = pickRandomDisplayPiece(displaySourceCollections);
  if (!nextDisplayEntry) return;
  const { collection, piece } = nextDisplayEntry;
  if (!(isOnchainCollection(collection) && piece.animationUrl && !piece.isImage)) {
    const img = new Image();
    img.src = piece.image || piece.thumbnail || collection.heroImage;
  }
}

function enterDisplayMode(collectionId) {
  if (collectionId) {
    const col = collections.find(c => c.id === collectionId);
    if (!col || !col.pieces || col.pieces.length === 0) return;
    displaySourceCollections = [col];
  } else {
    displaySourceCollections = null;
  }
  displayMode.classList.add('active');
  document.body.style.overflow = 'hidden';
  if (slideshowPlaying) stopSlideshow();

  currentDisplayEntry = pickRandomDisplayPiece(displaySourceCollections);
  showDisplayPiece();
  preloadNextDisplayPiece();
  showDisplayControls();

  displayAutoplayInterval = setInterval(() => {
    currentDisplayEntry = nextDisplayEntry || pickRandomDisplayPiece(displaySourceCollections);
    showDisplayPiece();
    preloadNextDisplayPiece();
  }, 15000);

  if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
}

function exitDisplayMode() {
  displayMode.classList.remove('active');
  document.body.style.overflow = '';
  displayIframe.src = '';
  clearInterval(displayAutoplayInterval);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

function showDisplayPiece() {
  if (!currentDisplayEntry) return;
  const { collection, piece } = currentDisplayEntry;
  const isOnchain = isOnchainCollection(collection) && piece.animationUrl && !piece.isImage;
  displayArt.classList.remove('loaded');
  displayIframe.classList.remove('loaded');

  setTimeout(() => {
    if (isOnchain) {
      displayArt.classList.add('hidden');
      displayIframe.classList.remove('hidden');
      displayIframe.src = piece.animationUrl;
      displayIframe.onload = () => displayIframe.classList.add('loaded');
    } else {
      displayIframe.classList.add('hidden');
      displayArt.classList.remove('hidden');
      displayArt.src = piece.image || piece.thumbnail || collection.heroImage;
      displayArt.onload = () => displayArt.classList.add('loaded');
    }
    displayTitle.textContent = piece.title || '#' + piece.tokenId;
    displayCollection.textContent = collection.title;
  }, 200);
}

function showDisplayControls() {
  displayMode.classList.add('show-controls');
  clearTimeout(displayControlsTimeout);
  displayControlsTimeout = setTimeout(() => { displayMode.classList.remove('show-controls'); }, 3000);
}

function initDisplayMode() {
  document.getElementById('display-mode-btn').addEventListener('click', (e) => { e.stopPropagation(); enterDisplayMode(); });
  document.querySelector('.display-close').addEventListener('click', exitDisplayMode);
  displayMode.addEventListener('mousemove', showDisplayControls);
  document.addEventListener('keydown', (e) => {
    if (!displayMode.classList.contains('active')) return;
    if (e.key === 'Escape') exitDisplayMode();
  });
}

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxTitle = document.getElementById('lightbox-title');

function openLightbox(imageSrc, title) {
  lightbox.style.display = 'flex';
  lightbox.classList.add('loading');
  lightboxTitle.textContent = title || '';
  document.body.style.overflow = 'hidden';
  lightboxImg.onload = () => lightbox.classList.remove('loading');
  lightboxImg.src = imageSrc;
}

function closeLightbox() { lightbox.style.display = 'none'; document.body.style.overflow = ''; }
lightbox.addEventListener('click', (e) => { if (e.target === lightbox || e.target === lightboxImg) closeLightbox(); });

document.addEventListener('DOMContentLoaded', init);
