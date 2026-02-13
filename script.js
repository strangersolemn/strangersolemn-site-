/**
 * STRANGER SOLEMN - Official Site Script
 * Integrated Fixes: Mobile Menu, Iframe Scaling, Video Bug Reset, Featured Iframe Toggle
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

// State
let currentCollectionId = null;
let currentPieceIndex = 0;
let slideshowInterval = null;
let slideshowPlaying = false;

// Configuration
const chainNames = {
    ordinals: 'BTC',
    ethereum: 'ETH',
    tezos: 'TEZ',
    solana: 'SOL'
};

/**
 * Initialization
 */
function init() {
    buildTimeline();
    showRandomArt();
    startSlideshow();

  // Mobile Menu Toggle Logic
  if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                timelinePanel.classList.toggle('open');
        });
  }

  // Close mobile menu when clicking outside or on a selection
  document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && !timelinePanel.contains(e.target) && e.target !== menuToggle) {
                timelinePanel.classList.remove('open');
        }
  });

  // Navigation: Home Link
  document.querySelectorAll('[data-view="home"]').forEach(el => {
        el.addEventListener('click', (e) => {
                e.preventDefault();
                showView('home');
        });
  });

  // Detail View: Download Action
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

  // Display Mode Button
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
        // Kill detail media when returning home
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

  // Auto-close menu on mobile after selection
  if (window.innerWidth <= 768) {
        timelinePanel.classList.remove('open');
  }
}

/**
 * Timeline Builder (Side Panel)
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
 * Detail View Logic (Fixes Video Bug)
 */
function showDetail(collectionId) {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

  currentCollectionId = collectionId;
    currentPieceIndex = 0;
    const piece = collection.pieces?.[0];
    const isOnchain = collection.onchain === true;

  // 1. THE RESET (Kill Switch): Stops ghost videos and clears iframes
  detailImage.classList.add('hidden');
    detailIframe.classList.add('hidden');
    detailIframe.src = "";
    if (detailVideo) {
          detailVideo.classList.add('hidden');
          detailVideo.pause();
          detailVideo.src = "";
          detailVideo.load();
    }

  // 2. Identify Media Type
  const isVideo = piece?.video || piece?.animationUrl?.endsWith('.mp4');

  if (isVideo) {
        detailVideo.src = piece.video || piece.animationUrl;
        detailVideo.classList.remove('hidden');
        detailVideo.play();
  } else if (isOnchain && piece?.animationUrl && !piece?.isImage) {
        detailIframe.src = piece.animationUrl;
        detailIframe.classList.remove('hidden');
  } else {
        // Standard Image
      detailImage.src = toOptimizedUrl(piece?.thumbnail || piece?.image || collection.heroImage);
        detailImage.classList.remove('hidden');
  }

  // Update Text UI
  detailTitle.textContent = collection.title;
    detailChain.textContent = chainNames[collection.chain] || collection.chain.toUpperCase();
    detailChain.setAttribute('data-chain', collection.chain);

  // Metadata Stats
  detailMetadata.innerHTML = `
      <div class="collection-stats">
            <div class="meta-row"><span class="meta-label">Pieces</span><span class="meta-value">${collection.supply || collection.pieces?.length || '?'}</span></div>
                  <div class="meta-row"><span class="meta-label">Chain</span><span class="meta-value">${collection.chain.toUpperCase()}</span></div>
                      </div>
                          <div class="pieces-grid">
                                ${collection.pieces.map((p, idx) => `
                                        <div class="piece-thumb" data-index="${idx}">
                                                  <img src="${toOptimizedUrl(p.thumbnail || p.image)}" loading="lazy">
                                                          </div>`).join('')}
                                                              </div>
                                                                `;

  detailMetadata.querySelectorAll('.piece-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => showPiece(collection, parseInt(thumb.dataset.index)));
  });

  showView('detail');
}

/**
 * Thumbnail Navigation
 */
function showPiece(collection, index) {
    const piece = collection.pieces[index];
    if (!piece) return;

  // Reset media elements for piece switching
  detailImage.classList.add('hidden');
    detailIframe.classList.add('hidden');
    if (detailVideo) {
          detailVideo.classList.add('hidden');
          detailVideo.pause();
          detailVideo.src = "";
          detailVideo.load();
    }

  detailImage.src = toOptimizedUrl(piece.thumbnail || piece.image);
    detailImage.classList.remove('hidden');

  detailTitle.innerHTML = `${collection.title} <span class="piece-indicator">${piece.title || '#' + piece.tokenId}</span>`;
}

/**
 * Slideshow / Random Art Functions
 * FIX: Now properly hides iframe and shows image for each random artwork
 */
function showRandomArt() {
    const col = collections[Math.floor(Math.random() * collections.length)];
    const piece = col.pieces[Math.floor(Math.random() * col.pieces.length)];

  // Hide iframe, show image
  featuredIframe.classList.remove('active');
    featuredIframe.src = '';
    featuredArt.style.display = '';

  featuredArt.src = piece.image || piece.thumbnail || col.heroImage;
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

function initDisplayMode() {
    const btn = document.getElementById('display-mode-btn');
    if (btn) {
          btn.addEventListener('click', () => {
                  document.getElementById('display-mode').classList.add('active');
          });
    }

  // Close display mode
  const closeBtn = document.querySelector('.display-close');
    if (closeBtn) {
          closeBtn.addEventListener('click', () => {
                  document.getElementById('display-mode').classList.remove('active');
          });
    }
}

// Fullscreen Lightbox logic
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
