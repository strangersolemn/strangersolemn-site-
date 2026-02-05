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
  ordinals: 'ORD',
  ethereum: 'ETH',
  tezos: 'TEZ',
  solana: 'SOL'
};

// Initialize
function init() {
  buildTimeline();
  showRandomArt();

  // Event listeners
  shuffleBtn.addEventListener('click', showRandomArt);

  // Navigation - home link
  document.querySelectorAll('[data-view="home"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showView('home');
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

    html += `
      <div class="timeline-item" data-chain="${collection.chain}" data-id="${collection.id}">
        <span class="timeline-item-chain">${chainNames[collection.chain] || collection.chain.toUpperCase()}</span>
        <span class="timeline-item-title">${collection.title}</span>
        <span class="timeline-item-count">${collection.pieces?.length || collection.supply || '?'}</span>
      </div>
    `;
  });

  timeline.innerHTML = html;

  // Add click handlers
  timeline.querySelectorAll('.timeline-item').forEach(item => {
    item.addEventListener('click', () => {
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
  if (isOnchain && firstPiece?.animationUrl) {
    // On-chain HTML art - use iframe with animationUrl
    detailImage.classList.add('hidden');
    detailIframe.classList.remove('hidden');
    detailIframe.src = firstPiece.animationUrl;
    imageActions.classList.add('hidden'); // No download/fullscreen for on-chain HTML
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
      ${metaRow('Pieces', collection.pieces?.length || collection.supply || '?')}
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
          ${collection.pieces.map((piece, idx) => `
            <div class="piece-thumb" data-index="${idx}" title="${piece.title || '#' + piece.tokenId}">
              <img src="${toOptimizedUrl(piece.thumbnail || piece.image)}" alt="${piece.title || ''}" loading="lazy" />
              <span class="piece-title">${piece.title || '#' + piece.tokenId}</span>
            </div>
          `).join('')}
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

  if (isOnchain && piece.animationUrl) {
    // On-chain HTML art - use iframe with animationUrl
    detailIframe.src = piece.animationUrl;
  } else {
    // Regular images - show static thumbnail, play button loads animated
    const fullImageUrl = piece.image || piece.thumbnail;
    const thumbnailUrl = piece.thumbnail || piece.image;

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


// Show random artwork
function showRandomArt() {
  if (collections.length === 0) return;

  const collection = collections[Math.floor(Math.random() * collections.length)];
  currentCollectionId = collection.id;

  // Pick random piece from collection
  let imageUrl = collection.heroImage;
  let pieceTitle = collection.title;

  let randomPiece = null;
  if (collection.pieces && collection.pieces.length > 0) {
    randomPiece = collection.pieces[Math.floor(Math.random() * collection.pieces.length)];
    const isOnchain = isOnchainCollection(collection);
    // Use animationUrl for on-chain, full image for others (to preserve animation)
    imageUrl = (isOnchain && randomPiece.animationUrl)
      ? randomPiece.animationUrl
      : (randomPiece.image || collection.heroImage);
    pieceTitle = randomPiece.title || collection.title;
  }

  const isOnchain = isOnchainCollection(collection) && randomPiece?.animationUrl;

  // Fade out
  featuredArt.classList.remove('loaded');
  featuredIframe.classList.remove('loaded');
  artInfo.classList.remove('visible');

  setTimeout(() => {
    const showInfo = () => {
      artTitle.textContent = pieceTitle;
      artCollection.textContent = collection.title + ' • ' + (collection.pieces?.length || collection.supply || '?') + ' pieces';
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

    // Fallback
    setTimeout(showInfo, 2000);
  }, 300);
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
  if (e.key === 'Escape' && lightbox.style.display === 'flex') {
    closeLightbox();
  }
});

// Start
document.addEventListener('DOMContentLoaded', init);
