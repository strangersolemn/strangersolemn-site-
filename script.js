// DOM Elements
const views = {
  home: document.getElementById('view-home'),
  detail: document.getElementById('view-detail')
};

const featuredArt = document.getElementById('featured-art');
const artTitle = document.getElementById('art-title');
const artCollection = document.getElementById('art-collection');
const artChain = document.getElementById('art-chain');
const artInfo = document.querySelector('.art-info');
const timeline = document.getElementById('timeline');
const shuffleBtn = document.getElementById('shuffle-btn');

const detailBackBtn = document.getElementById('detail-back-btn');
const detailImage = document.getElementById('detail-image');
const detailTitle = document.getElementById('detail-title');
const detailChain = document.getElementById('detail-chain');
const detailMetadata = document.getElementById('detail-metadata');
const linkMagicEden = document.getElementById('link-magiceden');
const linkGamma = document.getElementById('link-gamma');

// State
let currentView = 'home';
let currentCollectionId = null;

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

  detailBackBtn.addEventListener('click', () => {
    showView('home');
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
  // Sort by year descending
  const sorted = [...collections].sort((a, b) => b.year - a.year);

  let currentYear = null;
  let html = '';

  sorted.forEach((collection) => {
    // Add year header if new year
    if (collection.year !== currentYear) {
      currentYear = collection.year;
      html += `<div class="timeline-year">${currentYear}</div>`;
    }

    html += `
      <div class="timeline-item" data-chain="${collection.chain}" data-id="${collection.id}">
        <span class="timeline-item-chain">${chainNames[collection.chain]}</span>
        <span class="timeline-item-title">${collection.title}</span>
        <span class="timeline-item-count">${collection.supply}</span>
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

  // Update detail view
  detailImage.src = collection.image;
  detailImage.alt = collection.title;
  detailTitle.textContent = collection.title;
  detailChain.textContent = chainNames[collection.chain];
  detailChain.setAttribute('data-chain', collection.chain);

  // Build metadata
  let metaHtml = '';

  metaHtml += metaRow('Supply', collection.supply);
  metaHtml += metaRow('Year', collection.year);
  metaHtml += metaRow('Chain', getChainFullName(collection.chain));

  if (collection.chain === 'ordinals' && collection.representativeId) {
    metaHtml += metaRow('Inscription', truncateId(collection.representativeId), collection.representativeId);
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
    } else {
      linkGamma.classList.add('hidden');
    }
  } else {
    linkMagicEden.classList.add('hidden');
    linkGamma.classList.add('hidden');
  }

  // Add copy functionality
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

  // Fade out
  featuredArt.classList.remove('loaded');
  artInfo.classList.remove('visible');

  setTimeout(() => {
    featuredArt.src = collection.image;

    featuredArt.onload = () => {
      featuredArt.classList.add('loaded');
      artTitle.textContent = collection.title;
      artCollection.textContent = `${collection.supply} editions`;
      artChain.textContent = chainNames[collection.chain];
      artChain.setAttribute('data-chain', collection.chain);
      artInfo.classList.add('visible');
    };

    // Fallback - show info after timeout in case onload doesn't fire
    setTimeout(() => {
      featuredArt.classList.add('loaded');
      artTitle.textContent = collection.title;
      artCollection.textContent = `${collection.supply} editions`;
      artChain.textContent = chainNames[collection.chain];
      artChain.setAttribute('data-chain', collection.chain);
      artInfo.classList.add('visible');
    }, 1500);
  }, 300);
}

// Placeholder SVG for failed images
function placeholderSvg() {
  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#1a1a1a" width="400" height="400"/>
      <text fill="#444" font-family="monospace" font-size="14" x="50%" y="50%" text-anchor="middle">Image unavailable</text>
    </svg>
  `);
}

// Start
document.addEventListener('DOMContentLoaded', init);
