/**
 * STRANGER SOLEMN - Official Site Script
 * Features: Big detail images, per-piece fullscreen display, clickable carousel
 */

// DOM Elements
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
const artCollection = document.getElementById('art-collection');
const artChain = document.getElementById('art-chain');
const artInfo = document.querySelector('.art-info');
const detailImage = document.getElementById('detail-image');
const detailIframe = document.getElementById('detail-iframe');
const detailVideo = document.getElementById('detail-video');
const detailTitle = document.getElementById('detail-title');
const detailChain = document.getElementById('detail-chain');
const detailMetadata = document.getElementById('detail-metadata');

// Display mode elements
const displayMode = document.getElementById('display-mode');
const displayArt = document.getElementById('display-art');
const displayIframe = document.getElementById('display-iframe');
const displayTitle = document.getElementById('display-title');
const displayCollection = document.getElementById('display-collection');

// State
let currentCollectionId = null;
let currentPieceIndex = 0;
let slideshowInterval = null;
let slideshowPlaying = false;
let displayCollectionData = null;
let displayPieceIndex = 0;
let currentCarouselCollection = null;

// Configuration
const chainNames = {
  ordinals: 'BTC', ethereum: 'ETH', tezos: 'TEZ', solana: 'SOL'
};

function pieceNeedsIframe(collection, piece) {
  if (!collection.onchain) return false;
  if (piece.isImage) return false;
  if (collection.chain === 'ordinals') return true;
  if (piece.animationUrl && piece.animationUrl !== piece.image) return true;
  return false;
}

function init() {
  buildTimeline();
  showRandomArt();
  startSlideshow();

  if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      timelinePanel.classList.toggle('open');
    });
  }

  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && !timelinePanel.contains(e.target) && e.target !== menuToggle) {
      timelinePanel.classList.remove('open');
    }
  });

  document.querySelectorAll('[data-view="home"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showView('home');
    });
  });

  const downloadBtn = document.querySelector('.download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const imageUrl = detailImage.src;
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'stranger-solemn-' + currentCollectionId + '.png';
      link.click();
    });
  }

  // Clickable carousel - title, collection name, and chain badge
  if (artTitle) {
    artTitle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentCarouselCollection) {
        stopSlideshow();
        showDetail(currentCarouselCollection.id);
      }
    });
  }
  if (artCollection) {
    artCollection.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentCarouselCollection) {
        stopSlideshow();
        showDetail(currentCarouselCollection.id);
      }
    });
  }
  if (artChain) {
    artChain.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentCarouselCollection) {
        stopSlideshow();
        showDetail(currentCarouselCollection.id);
      }
    });
  }

  initDisplayMode();
}

function showView(viewName) {
  Object.keys(views).forEach(key => {
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
  const sorted = [...collections].sort((a, b) => (b.year || 2024) - (a.year || 2024));
  let currentYear = null;
  let html = '';
  sorted.forEach((col) => {
    const year = col.year || 2024;
    if (year !== currentYear) {
      currentYear = year;
      html += '<div class="timeline-year">' + currentYear + '</div>';
    }
    html += '<div class="timeline-item" data-chain="' + col.chain + '" data-id="' + col.id + '">' +
      '<span class="timeline-item-chain">' + (chainNames[col.chain] || col.chain.toUpperCase()) + '</span>' +
      '<span class="timeline-item-title">' + col.title + '</span>' +
      '<span class="timeline-item-count">' + (col.pieces?.length || col.supply || '?') + '</span>' +
    '</div>';
  });
  timeline.innerHTML = html;
  timeline.querySelectorAll('.timeline-item').forEach(item => {
    item.addEventListener('click', () => showDetail(item.dataset.id));
  });
}

function showDetail(collectionId) {
  const collection = collections.find(c => c.id === collectionId);
  if (!collection) return;
  currentCollectionId = collectionId;
  currentPieceIndex = 0;
  const piece = collection.pieces?.[0];

  detailImage.classList.add('hidden');
  detailIframe.classList.add('hidden');
  detailIframe.src = "";
  if (detailVideo) {
    detailVideo.classList.add('hidden');
    detailVideo.pause();
    detailVideo.src = "";
    detailVideo.load();
  }

  const isVideo = piece?.video || piece?.animationUrl?.endsWith('.mp4');
  const needsIframe = pieceNeedsIframe(collection, piece);

  if (isVideo) {
    detailVideo.src = piece.video || piece.animationUrl;
    detailVideo.classList.remove('hidden');
    detailVideo.play();
  } else if (needsIframe) {
    detailIframe.src = piece.animationUrl || piece.image;
    detailIframe.classList.remove('hidden');
  } else if (collection.onchain && piece?.animationUrl && piece.animationUrl !== piece.image) {
    detailIframe.src = piece.animationUrl;
    detailIframe.classList.remove('hidden');
  } else {
    detailImage.src = toOptimizedUrl(piece?.thumbnail || piece?.image || collection.heroImage);
    detailImage.classList.remove('hidden');
  }

  detailTitle.textContent = collection.title;
  detailChain.textContent = chainNames[collection.chain] || collection.chain.toUpperCase();
  detailChain.setAttribute('data-chain', collection.chain);

  // Build pieces grid with per-piece display buttons
  var displayIcon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
  var thumbsHtml = collection.pieces.map(function(p, idx) {
    var usesIframe = pieceNeedsIframe(collection, p);
    var displayBtn = '<div class="piece-thumb-actions"><button class="piece-display-btn" data-display-index="' + idx + '" title="Display this piece">' + displayIcon + '</button></div>';
    if (usesIframe) {
      return '<div class="piece-thumb" data-index="' + idx + '">' +
        '<iframe src="' + (p.animationUrl || p.image) + '" loading="lazy" sandbox="allow-scripts" scrolling="no"></iframe>' +
        displayBtn + '</div>';
    } else {
      var thumbUrl = toOptimizedUrl(p.thumbnail || p.image);
      return '<div class="piece-thumb" data-index="' + idx + '">' +
        '<img src="' + thumbUrl + '" loading="lazy">' +
        displayBtn + '</div>';
    }
  }).join('');

  detailMetadata.innerHTML = '<div class="collection-stats">' +
    '<div class="meta-row"><span class="meta-label">Pieces</span><span class="meta-value">' + (collection.supply || collection.pieces?.length || '?') + '</span></div>' +
    '<div class="meta-row"><span class="meta-label">Chain</span><span class="meta-value">' + collection.chain.toUpperCase() + '</span></div>' +
    '</div>' +
    '<div class="pieces-grid">' + thumbsHtml + '</div>';

  detailMetadata.querySelectorAll('.piece-thumb').forEach(function(thumb) {
    thumb.addEventListener('click', function(e) {
      if (e.target.closest('.piece-display-btn')) return;
      showPiece(collection, parseInt(thumb.dataset.index));
    });
  });

  detailMetadata.querySelectorAll('.piece-display-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var idx = parseInt(btn.dataset.displayIndex);
      enterDisplayMode(collection, idx);
    });
  });

  showView('detail');
}

function showPiece(collection, index) {
  var piece = collection.pieces[index];
  if (!piece) return;

  detailImage.classList.add('hidden');
  detailIframe.classList.add('hidden');
  detailIframe.src = "";
  if (detailVideo) {
    detailVideo.classList.add('hidden');
    detailVideo.pause();
    detailVideo.src = "";
    detailVideo.load();
  }

  var needsIframe = pieceNeedsIframe(collection, piece);
  if (needsIframe) {
    detailIframe.src = piece.animationUrl || piece.image;
    detailIframe.classList.remove('hidden');
  } else if (collection.onchain && piece.animationUrl && piece.animationUrl !== piece.image) {
    detailIframe.src = piece.animationUrl;
    detailIframe.classList.remove('hidden');
  } else {
    detailImage.src = toOptimizedUrl(piece.thumbnail || piece.image);
    detailImage.classList.remove('hidden');
  }

  detailTitle.innerHTML = collection.title + ' <span class="piece-indicator">' + (piece.title || '#' + piece.tokenId) + '</span>';
}

function showRandomArt() {
  var col = collections[Math.floor(Math.random() * collections.length)];
  var piece = col.pieces[Math.floor(Math.random() * col.pieces.length)];
  currentCarouselCollection = col;

  var needsIframe = pieceNeedsIframe(col, piece);
  if (needsIframe) {
    featuredArt.style.display = 'none';
    featuredIframe.classList.add('active');
    featuredIframe.src = piece.animationUrl || piece.image;
  } else if (col.onchain && piece.animationUrl && piece.animationUrl !== piece.image) {
    featuredArt.style.display = 'none';
    featuredIframe.classList.add('active');
    featuredIframe.src = piece.animationUrl;
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
function enterDisplayMode(collection, pieceIndex) {
  displayCollectionData = collection;
  displayPieceIndex = pieceIndex;
  loadDisplayPiece();
  displayMode.classList.add('active');
  document.body.style.overflow = 'hidden';
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

  var needsIframe = pieceNeedsIframe(displayCollectionData, piece);
  displayArt.style.display = 'none';
  displayIframe.style.display = 'none';
  displayIframe.src = '';

  if (needsIframe) {
    displayIframe.src = piece.animationUrl || piece.image;
    displayIframe.style.display = 'block';
  } else if (displayCollectionData.onchain && piece.animationUrl && piece.animationUrl !== piece.image) {
    displayIframe.src = piece.animationUrl;
    displayIframe.style.display = 'block';
  } else {
    displayArt.src = piece.image || piece.thumbnail;
    displayArt.style.display = 'block';
  }

  if (displayTitle) displayTitle.textContent = piece.title || displayCollectionData.title;
  if (displayCollection) displayCollection.textContent = displayCollectionData.title;
}

function initDisplayMode() {
  // Home page display mode button
  var btn = document.getElementById('display-mode-btn');
  if (btn) {
    btn.addEventListener('click', function() {
      var col = collections[Math.floor(Math.random() * collections.length)];
      var idx = Math.floor(Math.random() * col.pieces.length);
      enterDisplayMode(col, idx);
    });
  }

  // Collection-level display button in detail view
  var collectionDisplayBtn = document.getElementById('collection-display-btn');
  if (collectionDisplayBtn) {
    collectionDisplayBtn.addEventListener('click', function() {
      var collection = collections.find(function(c) { return c.id === currentCollectionId; });
      if (collection) {
        enterDisplayMode(collection, 0);
      }
    });
  }

  // Close display mode
  var closeBtn = document.querySelector('.display-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', exitDisplayMode);
  }

  // Next piece
  var nextBtn = document.querySelector('.display-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      if (!displayCollectionData) return;
      displayPieceIndex = (displayPieceIndex + 1) % displayCollectionData.pieces.length;
      loadDisplayPiece();
    });
  }

  // Previous piece
  var prevBtn = document.querySelector('.display-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      if (!displayCollectionData) return;
      displayPieceIndex = (displayPieceIndex - 1 + displayCollectionData.pieces.length) % displayCollectionData.pieces.length;
      loadDisplayPiece();
    });
  }

  // Shuffle
  var shuffleBtn = document.querySelector('.display-shuffle');
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', function() {
      if (!displayCollectionData) return;
      displayPieceIndex = Math.floor(Math.random() * displayCollectionData.pieces.length);
      loadDisplayPiece();
    });
  }

  // ESC key to exit display mode
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && displayMode.classList.contains('active')) {
      exitDisplayMode();
    }
    // Arrow keys for navigation in display mode
    if (displayMode.classList.contains('active') && displayCollectionData) {
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
  var lbImg = document.getElementById('lightbox-img');
  lbImg.src = src;
  lb.classList.add('active');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', init);
