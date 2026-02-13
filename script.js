/**
 * STRANGER SOLEMN - Official Site Script
 * Fixes: Mobile Menu, Iframe Scaling, Video Bug Reset, On-chain Art Display
 * Features: Per-piece display mode for standalone screen viewing
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

// Configuration
const chainNames = {
        ordinals: 'BTC',
        ethereum: 'ETH',
        tezos: 'TEZ',
        solana: 'SOL'
};

/**
 * Helper: determine if a piece needs an iframe (HTML content) vs img
 */
function pieceNeedsIframe(collection, piece) {
        if (!collection.onchain) return false;
        if (piece.isImage) return false;
        if (collection.chain === 'ordinals') return true;
        if (piece.animationUrl && piece.animationUrl !== piece.image) return true;
        return false;
}

/**
 * Initialization
 */
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
                              link.download = `stranger-solemn-${currentCollectionId}.png`;
                              link.click();
                  });
        }

  initDisplayMode();
}

/**
 * View Management
 */
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

/**
 * Timeline Builder
 */
function buildTimeline() {
        const sorted = [...collections].sort((a, b) => (b.year || 2024) - (a.year || 2024));
        let currentYear = null;
        let html = '';

  sorted.forEach((col) => {
            const year = col.year || 2024;
            if (year !== currentYear) {
                        currentYear = year;
                        html += `<div class="timeline-year">${currentYear}</div>`;
            }

                     html += `
                           <div class="timeline-item" data-chain="${col.chain}" data-id="${col.id}">
                                   <span class="timeline-item-chain">${chainNames[col.chain] || col.chain.toUpperCase()}</span>
                                           <span class="timeline-item-title">${col.title}</span>
                                                   <span class="timeline-item-count">${col.pieces?.length || col.supply || '?'}</span>
                                                         </div>`;
  });

  timeline.innerHTML = html;

  timeline.querySelectorAll('.timeline-item').forEach(item => {
            item.addEventListener('click', () => showDetail(item.dataset.id));
  });
}

/**
 * Detail View Logic
 */
function showDetail(collectionId) {
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;

  currentCollectionId = collectionId;
        currentPieceIndex = 0;
        const piece = collection.pieces?.[0];

  // Reset all media
  detailImage.classList.add('hidden');
        detailIframe.classList.add('hidden');
        detailIframe.src = "";
        if (detailVideo) {
                  detailVideo.classList.add('hidden');
                  detailVideo.pause();
                  detailVideo.src = "";
                  detailVideo.load();
        }

  // Show the right media type
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

  // Update text
  detailTitle.textContent = collection.title;
        detailChain.textContent = chainNames[collection.chain] || collection.chain.toUpperCase();
        detailChain.setAttribute('data-chain', collection.chain);

  // Build metadata and pieces grid with per-piece display buttons
  const displayIcon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';

  let thumbsHtml = collection.pieces.map((p, idx) => {
            const usesIframe = pieceNeedsIframe(collection, p);
            const displayBtn = `<div class="piece-thumb-actions"><button class="piece-display-btn" data-display-index="${idx}" title="Display this piece">${displayIcon}</button></div>`;

                                             if (usesIframe) {
                                                         return `<div class="piece-thumb" data-index="${idx}">
                                                                 <iframe src="${p.animationUrl || p.image}" loading="lazy" sandbox="allow-scripts" scrolling="no"></iframe>
                                                                         ${displayBtn}
                                                                               </div>`;
                                             } else {
                                                         const thumbUrl = toOptimizedUrl(p.thumbnail || p.image);
                                                         return `<div class="piece-thumb" data-index="${idx}">
                                                                 <img src="${thumbUrl}" loading="lazy">
                                                                         ${displayBtn}
                                                                               </div>`;
                                             }
  }).join('');

  detailMetadata.innerHTML = `
      <div class="collection-stats">
            <div class="meta-row"><span class="meta-label">Pieces</span><span class="meta-value">${collection.supply || collection.pieces?.length || '?'}</span></div>
                  <div class="meta-row"><span class="meta-label">Chain</span><span class="meta-value">${collection.chain.toUpperCase()}</span></div>
                      </div>
                          <div class="pieces-grid">${thumbsHtml}</div>
                            `;

  // Click thumb to view piece in detail
  detailMetadata.querySelectorAll('.piece-thumb').forEach(thumb => {
            thumb.addEventListener('click', (e) => {
                        // Don't trigger if display button was clicked
                                         if (e.target.closest('.piece-display-btn')) return;
                        showPiece(collection, parseInt(thumb.dataset.index));
            });
  });

  // Click display button to enter display mode for that piece
  detailMetadata.querySelectorAll('.piece-display-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = parseInt(btn.dataset.displayIndex);
                        enterDisplayMode(collection, idx);
            });
  });

  showView('detail');
}

/**
 * Thumbnail Navigation
 */
function showPiece(collection, index) {
        const piece = collection.pieces[index];
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

  const needsIframe = pieceNeedsIframe(collection, piece);

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

  detailTitle.innerHTML = `${collection.title} <span class="piece-indicator">${piece.title || '#' + piece.tokenId}</span>`;
}

/**
 * Slideshow - handles on-chain art properly
 */
function showRandomArt() {
        const col = collections[Math.floor(Math.random() * collections.length)];
        const piece = col.pieces[Math.floor(Math.random() * col.pieces.length)];
        const needsIframe = pieceNeedsIframe(col, piece);

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

/**
 * Utilities
 */
function toOptimizedUrl(url) {
        if (!url) return '';
        if (url.includes('res.cloudinary.com')) {
                  return url.replace('/upload/', '/upload/f_auto,q_auto/');
        }
        return url;
}

/**
 * Display Mode - standalone art display for any piece
 */
function enterDisplayMode(collection, pieceIndex) {
        displayCollectionData = collection;
        displayPieceIndex = pieceIndex;
        loadDisplayPiece();
        displayMode.classList.add('active');
}

function loadDisplayPiece() {
        if (!displayCollectionData) return;
        const piece = displayCollectionData.pieces[displayPieceIndex];
        if (!piece) return;

  const needsIframe = pieceNeedsIframe(displayCollectionData, piece);

  // Reset both
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

  displayTitle.textContent = piece.title || displayCollectionData.title;
        displayCollection.textContent = displayCollectionData.title;
}

function initDisplayMode() {
        // Home display mode button
  const btn = document.getElementById('display-mode-btn');
        if (btn) {
                  btn.addEventListener('click', () => {
                              // Enter display mode with random art from all collections
                                             const col = collections[Math.floor(Math.random() * collections.length)];
                              const idx = Math.floor(Math.random() * col.pieces.length);
                              enterDisplayMode(col, idx);
                  });
        }

  // Collection-level display button in detail view
  const collectionDisplayBtn = document.getElementById('collection-display-btn');
        if (collectionDisplayBtn) {
                  collectionDisplayBtn.addEventListener('click', () => {
                              const collection = collections.find(c => c.id === currentCollectionId);
                              if (collection) {
                                            enterDisplayMode(collection, 0);
                              }
                  });
        }

  // Close display mode
  const closeBtn = document.querySelector('.display-close');
        if (closeBtn) {
                  closeBtn.addEventListener('click', () => {
                              displayMode.classList.remove('active');
                              displayIframe.src = '';
                  });
        }

  // Next piece in display mode
  const nextBtn = document.querySelector('.display-next');
        if (nextBtn) {
                  nextBtn.addEventListener('click', () => {
                              if (!displayCollectionData) return;
                              displayPieceIndex = (displayPieceIndex + 1) % displayCollectionData.pieces.length;
                              loadDisplayPiece();
                  });
        }

  // Previous piece in display mode
  const prevBtn = document.querySelector('.display-prev');
        if (prevBtn) {
                  prevBtn.addEventListener('click', () => {
                              if (!displayCollectionData) return;
                              displayPieceIndex = (displayPieceIndex - 1 + displayCollectionData.pieces.length) % displayCollectionData.pieces.length;
                              loadDisplayPiece();
                  });
        }

  // Shuffle in display mode
  const shuffleBtn = document.querySelector('.display-shuffle');
        if (shuffleBtn) {
                  shuffleBtn.addEventListener('click', () => {
                              if (!displayCollectionData) return;
                              displayPieceIndex = Math.floor(Math.random() * displayCollectionData.pieces.length);
                              loadDisplayPiece();
                  });
        }
}

function openLightbox(src, title) {
        const lb = document.getElementById('lightbox');
        const lbImg = document.getElementById('lightbox-img');
        lbImg.src = src;
        lb.classList.add('active');
}

function closeLightbox() {
        document.getElementById('lightbox').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', init);
