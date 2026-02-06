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
const shuffleBtn = document.getElementById('shuffle-btn');

const detailImage = document.getElementById('detail-image');
const detailIframe = document.getElementById('detail-iframe');
const detailTitle = document.getElementById('detail-title');
const detailChain = document.getElementById('detail-chain');
const detailMetadata = document.getElementById('detail-metadata');
const linkMagicEden = document.getElementById('link-magiceden');
const linkGamma = document.getElementById('link-gamma');

// State
let currentView = 'home';
let currentCollectionId = null;
let currentPieceIndex = 0;
let activeChainFilter = null;

// Slideshow state
let slideshowInterval = null;
let slideshowPlaying = false;
let slideshowPieces = [];
let slideshowIndex = 0;

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

  // Event listeners
  shuffleBtn.addEventListener('click', () => {
    if (slideshowPlaying) stopSlideshow();
    showRandomArt();
  });

  // Slideshow play/pause
  document.getElementById('play-slideshow-btn').addEventListener('click', toggleSlideshow);

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
  if (isOnchain && firstPiece?.animationUrl && !firstPiece?.isImage) {
    // On-chain HTML art - use iframe with animationUrl (unless piece is marked as image)
    detailImage.classList.add('hidden');
    detailIframe.classList.remove('hidden');
    detailIframe.src = firstPiece.animationUrl;
    imageActions.classList.add('hidden'); // No download/fullscreen for on-chain HTML
  } else if (firstPiece?.isImage) {
    // Piece marked as image - show as image even in on-chain collection
    const fullImageUrl = collection.heroImage || firstPiece?.image || '';
    const thumbnailUrl = firstPiece?.thumbnail || fullImageUrl;
    detailIframe.classList.add('hidden');
    detailImage.classList.remove('hidden');

    // Show thumbnail immediately (static but fast)
    detailImage.src = toOptimizedUrl(thumbnailUrl);
    detailImage.dataset.fullImage = fullImageUrl;

    // Show play button if there's an animated version to load
    const playBtn = document.getElementById('play-animated');
    if (thumbnailUrl !== fullImageUrl) {
      playBtn.classList.remove('hidden');
    } else {
      playBtn.classList.add('hidden');
    }

    imageActions.classList.remove('hidden');
  } else {
    // Regular images - show static thumbnail, play button loads animated
    const fullImageUrl = collection.heroImage || firstPiece?.image || '';
    const thumbnailUrl = firstPiece?.thumbnail || fullImageUrl;
    detailIframe.classList.add('hidden');
    detailImage.classList.remove('hidden');

    // Show thumbnail immediately (static but fast)
    detailImage.src = toOptimizedUrl(thumbnailUrl);
    detailImage.dataset.fullImage = fullImageUrl;

    // Show play button if there's an animated version to load
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

  // Description
  if (collection.description) {
    metaHtml += `
      <div class="collection-description">
        <p>${collection.description}</p>
      </div>
    `;
  }

  // Artist note
  if (collection.artistNote) {
    metaHtml += `
      <div class="artist-note">
        <span class="note-label">Artist Note</span>
        <p>${collection.artistNote}</p>
      </div>
    `;
  }

  // Stats
  metaHtml += `
    <div class="collection-stats">
      ${metaRow('Pieces', collection.supply || collection.pieces?.length || '?')}
      ${metaRow('Chain', getChainFullName(collection.chain))}
      ${collection.contract ? metaRow('Contract', truncateId(collection.contract), collection.contract) : ''}
    </div>
  `;

  // Pieces grid
  if (collection.pieces && collection.pieces.length > 0) {
    metaHtml += `
      <div class="pieces-section">
        <span class="pieces-label">Pieces</span>
        <div class="pieces-grid">
          ${collection.pieces.map((piece, idx) => {
            // Use iframe for on-chain collections unless piece is marked as image
            if (isOnchain && !piece.isImage && piece.animationUrl) {
              return `
                <div class="piece-thumb" data-index="${idx}" title="${piece.title || '#' + piece.tokenId}">
                  <iframe src="${piece.animationUrl}" sandbox="allow-scripts" frameborder="0" style="width: 100%; height: 100%; border: none; pointer-events: none;"></iframe>
                  <span class="piece-title">${piece.title || '#' + piece.tokenId}</span>
                </div>
              `;
            } else {
              // Use img for regular images or pieces marked as images
              return `
                <div class="piece-thumb" data-index="${idx}" title="${piece.title || '#' + piece.tokenId}">
                  <img src="${toOptimizedUrl(piece.thumbnail || piece.image)}" alt="${piece.title || ''}" loading="lazy" />
                  <span class="piece-title">${piece.title || '#' + piece.tokenId}</span>
                </div>
              `;
            }
          }).join('')}
        </div>
      </div>
    `;
  }

  detailMetadata.innerHTML = metaHtml;

  // Set marketplace links
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

  // Add piece click handlers
  detailMetadata.querySelectorAll('.piece-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const idx = parseInt(thumb.dataset.index);
      showPiece(collection, idx);
    });
  });

  // Add copy functionality for contract
  detailMetadata.querySelectorAll('.copyable').forEach(el => {
    el.addEventListener('click', () => {
      navigator.clipboard.writeText(el.dataset.full);
      el.textContent = 'Copied!';
      setTimeout(() => {
        el.textContent = el.dataset.display;
      }, 1000);
    });
  });

  // Update timeline active state
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

  // Update main image - use iframe for on-chain HTML, img for regular images
  const isOnchain = isOnchainCollection(collection);
  const imageActions = document.querySelector('.image-actions');

  if (isOnchain && piece.animationUrl && !piece.isImage) {
    // On-chain HTML art - use iframe with animationUrl (unless piece is marked as image)
    detailImage.classList.add('hidden');
    detailIframe.classList.remove('hidden');
    detailIframe.src = piece.animationUrl;
    imageActions.classList.add('hidden'); // No download/fullscreen for on-chain HTML
  } else if (piece.isImage) {
    // Piece marked as image - show as image even in on-chain collection
    const fullImageUrl = piece.image || piece.thumbnail;
    const thumbnailUrl = piece.thumbnail || piece.image;

    detailIframe.classList.add('hidden');
    detailImage.classList.remove('hidden');

    // Show thumbnail immediately (static but fast)
    detailImage.src = toOptimizedUrl(thumbnailUrl);
    detailImage.dataset.fullImage = fullImageUrl;

    // Show play button if there's an animated version to load
    const playBtn = document.getElementById('play-animated');
    if (thumbnailUrl !== fullImageUrl) {
      playBtn.classList.remove('hidden');
    } else {
      playBtn.classList.add('hidden');
    }

    imageActions.classList.remove('hidden');
  } else {
    // Regular images - show static thumbnail, play button loads animated
    const fullImageUrl = piece.image || piece.thumbnail;
    const thumbnailUrl = piece.thumbnail || piece.image;

    detailIframe.classList.add('hidden');
    detailImage.classList.remove('hidden');

    // Show thumbnail immediately (static but fast)
    detailImage.src = toOptimizedUrl(thumbnailUrl);
    detailImage.dataset.fullImage = fullImageUrl;

    // Show play button if there's an animated version to load
    const playBtn = document.getElementById('play-animated');
    if (thumbnailUrl !== fullImageUrl) {
      playBtn.classList.remove('hidden');
    } else {
      playBtn.classList.add('hidden');
    }

    imageActions.classList.remove('hidden');
  }

  // Update title to show piece name
  detailTitle.innerHTML = `
    ${collection.title}
    <span class="piece-indicator">${piece.title || '#' + piece.tokenId}</span>
  `;

  // Highlight active thumbnail
  detailMetadata.querySelectorAll('.piece-thumb').forEach((thumb, idx) => {
    thumb.classList.toggle('active', idx === index);
  });

  // Scroll thumbnail into view
  const activeThumb = detailMetadata.querySelector('.piece-thumb.active');
  if (activeThumb) {
    activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

// Get full chain name
function getChainFullName(chain) {
  const names = {
    ordinals: 'Bitcoin (Ordinals)',
    ethereum: 'Ethereum',
    tezos: 'Tezos',
    solana: 'Solana'
  };
  return names[chain] || chain;
}

// Helper: create metadata row
function metaRow(label, value, fullValue = null) {
  if (fullValue) {
    return `
      <div class="meta-row">
        <span class="meta-label">${label}</span>
        <span class="meta-value copyable" data-full="${fullValue}" data-display="${value}" title="Click to copy">${value}</span>
      </div>
    `;
  }
  return `
    <div class="meta-row">
      <span class="meta-label">${label}</span>
      <span class="meta-value">${value}</span>
    </div>
  `;
}

// Helper: truncate long IDs
function truncateId(id) {
  if (!id || id.length <= 16) return id;
  return id.slice(0, 8) + '...' + id.slice(-6);
}


// Build shuffled slideshow order
function buildSlideshowPieces() {
  slideshowPieces = [];
  collections.forEach(col => {
    if (col.pieces && col.pieces.length > 0) {
      col.pieces.forEach(piece => {
        slideshowPieces.push({ collection: col, piece: piece });
      });
    }
  });
  // Shuffle
  for (let i = slideshowPieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slideshowPieces[i], slideshowPieces[j]] = [slideshowPieces[j], slideshowPieces[i]];
  }
}

// Show a specific piece on the home hero
function showHeroPiece(entry) {
  if (!entry) return;
  const { collection, piece } = entry;

  currentCollectionId = collection.id;

  const isOnchain = isOnchainCollection(collection) && piece.animationUrl && !piece.isImage;
  const imageUrl = isOnchain
    ? piece.animationUrl
    : (piece.image || piece.thumbnail || collection.heroImage);
  const pieceTitle = piece.title || collection.title;

  // Fade out
  featuredArt.classList.remove('loaded');
  featuredIframe.classList.remove('loaded');
  artInfo.classList.remove('visible');

  setTimeout(() => {
    const showInfo = () => {
      artTitle.textContent = pieceTitle;
      let infoText;
      if (piece.editionCount) {
        infoText = collection.title + ' \u2022 1/' + piece.editionCount;
      } else if (isEditionCollection(collection)) {
        infoText = collection.title + ' \u2022 ' + (collection.supply || '?') + ' editions';
      } else {
        infoText = collection.title + ' \u2022 ' + (collection.pieces?.length || collection.supply || '?') + ' pieces';
      }
      artCollection.textContent = infoText;
      artChain.textContent = chainNames[collection.chain] || collection.chain.toUpperCase();
      artChain.setAttribute('data-chain', collection.chain);
      artInfo.classList.add('visible');
    };

    if (isOnchain) {
      featuredArt.classList.add('hidden');
      featuredIframe.classList.remove('hidden');
      featuredIframe.src = imageUrl;
      featuredIframe.onload = () => {
        featuredIframe.classList.add('loaded');
        showInfo();
      };
    } else {
      featuredIframe.classList.add('hidden');
      featuredArt.classList.remove('hidden');
      featuredArt.src = imageUrl;
      featuredArt.onload = () => {
        featuredArt.classList.add('loaded');
        showInfo();
      };
    }

    // Preload next image in background
    preloadNextSlide();

    // Fallback
    setTimeout(showInfo, 2000);
  }, 300);
}

// Preload next slide image
function preloadNextSlide() {
  const nextIdx = (slideshowIndex + 1) % slideshowPieces.length;
  const next = slideshowPieces[nextIdx];
  if (!next) return;
  const isOnchain = isOnchainCollection(next.collection) && next.piece.animationUrl && !next.piece.isImage;
  if (!isOnchain) {
    const img = new Image();
    img.src = next.piece.image || next.piece.thumbnail || next.collection.heroImage;
  }
}

// Show random artwork
function showRandomArt() {
  if (slideshowPieces.length === 0) buildSlideshowPieces();
  slideshowIndex = Math.floor(Math.random() * slideshowPieces.length);
  showHeroPiece(slideshowPieces[slideshowIndex]);
}

// Slideshow controls
function startSlideshow() {
  if (slideshowPieces.length === 0) buildSlideshowPieces();
  slideshowPlaying = true;
  updatePlayBtn();

  // Show next immediately then every 10s
  slideshowNext();
  slideshowInterval = setInterval(slideshowNext, 10000);
}

function stopSlideshow() {
  slideshowPlaying = false;
  updatePlayBtn();
  clearInterval(slideshowInterval);
  slideshowInterval = null;
}

function toggleSlideshow() {
  if (slideshowPlaying) {
    stopSlideshow();
  } else {
    startSlideshow();
  }
}

function slideshowNext() {
  slideshowIndex = (slideshowIndex + 1) % slideshowPieces.length;
  showHeroPiece(slideshowPieces[slideshowIndex]);
}

function updatePlayBtn() {
  const btn = document.getElementById('play-slideshow-btn');
  if (!btn) return;
  if (slideshowPlaying) {
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    btn.setAttribute('aria-label', 'Pause slideshow');
    btn.classList.add('playing');
  } else {
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg>';
    btn.setAttribute('aria-label', 'Play slideshow');
    btn.classList.remove('playing');
  }
}

// Display Mode (Frame Mode)
const displayMode = document.getElementById('display-mode');
const displayArt = document.getElementById('display-art');
const displayIframe = document.getElementById('display-iframe');
const displayTitle = document.getElementById('display-title');
const displayCollection = document.getElementById('display-collection');

let displayPieces = []; // flat array of {collection, piece} for navigation
let displayIndex = 0;
let displayControlsTimeout = null;
let displayAutoplayInterval = null;

function buildDisplayPieces() {
  displayPieces = [];
  collections.forEach(col => {
    if (col.pieces && col.pieces.length > 0) {
      col.pieces.forEach(piece => {
        displayPieces.push({ collection: col, piece: piece });
      });
    }
  });
  // Shuffle the array for variety
  for (let i = displayPieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [displayPieces[i], displayPieces[j]] = [displayPieces[j], displayPieces[i]];
  }
}

function enterDisplayMode() {
  buildDisplayPieces();
  if (displayPieces.length === 0) return;

  // Start with a random piece
  displayIndex = Math.floor(Math.random() * displayPieces.length);
  displayMode.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Stop home slideshow if playing
  if (slideshowPlaying) stopSlideshow();

  showDisplayPiece();
  showDisplayControls();

  // Start auto-play in display mode (10s interval)
  displayAutoplayInterval = setInterval(() => {
    displayIndex = (displayIndex + 1) % displayPieces.length;
    showDisplayPiece();
  }, 10000);

  // Request fullscreen
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

function exitDisplayMode() {
  displayMode.classList.remove('active');
  displayMode.classList.remove('show-controls');
  document.body.style.overflow = '';
  displayIframe.src = '';
  clearTimeout(displayControlsTimeout);
  clearInterval(displayAutoplayInterval);

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

function showDisplayPiece() {
  const entry = displayPieces[displayIndex];
  if (!entry) return;

  const { collection, piece } = entry;
  const isOnchain = isOnchainCollection(collection) && piece.animationUrl && !piece.isImage;

  // Fade out
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
      displayIframe.src = '';
      displayArt.classList.remove('hidden');
      displayArt.src = piece.image || piece.thumbnail || collection.heroImage;
      displayArt.onload = () => displayArt.classList.add('loaded');
    }

    displayTitle.textContent = piece.title || '#' + piece.tokenId;
    displayCollection.textContent = collection.title;

    // Preload next display piece
    const nextIdx = (displayIndex + 1) % displayPieces.length;
    const nextEntry = displayPieces[nextIdx];
    if (nextEntry) {
      const nextOnchain = isOnchainCollection(nextEntry.collection) && nextEntry.piece.animationUrl && !nextEntry.piece.isImage;
      if (!nextOnchain) {
        const preImg = new Image();
        preImg.src = nextEntry.piece.image || nextEntry.piece.thumbnail || nextEntry.collection.heroImage;
      }
    }
  }, 200);
}

function resetDisplayAutoplay() {
  clearInterval(displayAutoplayInterval);
  displayAutoplayInterval = setInterval(() => {
    displayIndex = (displayIndex + 1) % displayPieces.length;
    showDisplayPiece();
  }, 10000);
}

function displayNext() {
  displayIndex = (displayIndex + 1) % displayPieces.length;
  showDisplayPiece();
  showDisplayControls();
  resetDisplayAutoplay();
}

function displayPrev() {
  displayIndex = (displayIndex - 1 + displayPieces.length) % displayPieces.length;
  showDisplayPiece();
  showDisplayControls();
  resetDisplayAutoplay();
}

function displayShuffle() {
  displayIndex = Math.floor(Math.random() * displayPieces.length);
  showDisplayPiece();
  showDisplayControls();
  resetDisplayAutoplay();
}

function showDisplayControls() {
  displayMode.classList.add('show-controls');
  clearTimeout(displayControlsTimeout);
  displayControlsTimeout = setTimeout(() => {
    displayMode.classList.remove('show-controls');
  }, 3000);
}

// Display mode event listeners
function initDisplayMode() {
  // Enter display mode
  document.getElementById('display-mode-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    enterDisplayMode();
  });

  // Controls
  document.querySelector('.display-close').addEventListener('click', exitDisplayMode);
  document.querySelector('.display-next').addEventListener('click', displayNext);
  document.querySelector('.display-prev').addEventListener('click', displayPrev);
  document.querySelector('.display-shuffle').addEventListener('click', displayShuffle);

  // Mouse move shows controls
  displayMode.addEventListener('mousemove', showDisplayControls);
  // Touch shows controls
  displayMode.addEventListener('touchstart', showDisplayControls);

  // Keyboard navigation in display mode
  document.addEventListener('keydown', (e) => {
    if (!displayMode.classList.contains('active')) return;

    if (e.key === 'Escape') {
      exitDisplayMode();
    } else if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      displayNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      displayPrev();
    } else if (e.key === 'r' || e.key === 'R') {
      displayShuffle();
    }
    showDisplayControls();
  });

  // Click on the display area (not controls) to show/hide controls
  displayMode.addEventListener('click', (e) => {
    if (e.target === displayMode || e.target.closest('.display-bg') || e.target.closest('.display-frame')) {
      if (displayMode.classList.contains('show-controls')) {
        displayMode.classList.remove('show-controls');
        clearTimeout(displayControlsTimeout);
      } else {
        showDisplayControls();
      }
    }
  });

  // Fullscreen change - if user exits fullscreen via ESC, also exit display mode
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && displayMode.classList.contains('active')) {
      exitDisplayMode();
    }
  });
}

// Lightbox functions
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxTitle = document.getElementById('lightbox-title');

function openLightbox(imageSrc, title) {
  // Show loading state
  lightbox.style.display = 'flex';
  lightbox.classList.add('loading');
  lightboxTitle.textContent = title || '';
  document.body.style.overflow = 'hidden';

  // Load full image
  lightboxImg.onload = () => {
    lightbox.classList.remove('loading');
  };
  lightboxImg.src = imageSrc;
}

function closeLightbox() {
  lightbox.style.display = 'none';
  document.body.style.overflow = '';
}

// Close lightbox on background click or escape key
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox || e.target === lightboxImg) {
    closeLightbox();
  }
});

document.addEventListener('keydown', (e) => {
  // Don't handle lightbox escape if display mode is active (display mode has its own handler)
  if (e.key === 'Escape' && lightbox.style.display === 'flex' && !displayMode.classList.contains('active')) {
    closeLightbox();
  }
});

// Start
document.addEventListener('DOMContentLoaded', init);
