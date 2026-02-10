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

// State
let currentCollectionId = null;
const chainNames = { ordinals: 'BTC', ethereum: 'ETH', tezos: 'TEZ', solana: 'SOL' };

function toOptimizedUrl(url) {
  if (!url) return url;
  return url.includes('res.cloudinary.com') ? url.replace('/upload/', '/upload/f_auto,q_auto/') : url;
}

function init() {
  buildTimeline();
  // Navigation for Home
  document.querySelectorAll('[data-view="home"]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); showView('home'); });
  });
}

function showView(viewName) {
  Object.keys(views).forEach(key => views[key].classList.toggle('active', key === viewName));
}

// --- RESTORED SIDE PANEL (matches styles.css) ---
function buildTimeline() {
  const sorted = [...collections].sort((a, b) => (b.year || 2024) - (a.year || 2024));
  let html = '';
  let currentYear = null;

  sorted.forEach((col) => {
    const year = col.year || 2024;
    if (year !== currentYear) {
      currentYear = year;
      html += `<div class="timeline-year">${currentYear}</div>`;
    }
    // These specific span classes restore your layout
    html += `
      <div class="timeline-item" data-chain="${col.chain}" data-id="${col.id}">
        <span class="timeline-item-chain">${chainNames[col.chain] || col.chain}</span>
        <span class="timeline-item-title">${col.title}</span>
        <span class="timeline-item-count">${col.pieces?.length || col.supply || '?'}</span>
      </div>`;
  });
  timeline.innerHTML = html;
  timeline.querySelectorAll('.timeline-item').forEach(item => {
    item.addEventListener('click', () => showDetail(item.dataset.id));
  });
}

// --- FIXED DETAIL VIEW (Kills video bug) ---
function showDetail(id) {
  const col = collections.find(c => c.id === id);
  if (!col) return;
  currentCollectionId = id;
  const piece = col.pieces?.[0];

  // 1. COMPLETELY RESET ALL MEDIA
  detailImage.classList.add('hidden');
  detailIframe.classList.add('hidden');
  if (detailVideo) {
    detailVideo.classList.add('hidden');
    detailVideo.pause(); 
    detailVideo.src = ""; // This kills the ghost video
    detailVideo.load();
  }

  // 2. LOAD NEW MEDIA
  const isVid = piece?.video || (piece?.animationUrl && piece.animationUrl.endsWith('.mp4'));
  
  if (isVid) {
    detailVideo.src = piece.video || piece.animationUrl;
    detailVideo.classList.remove('hidden');
    detailVideo.play();
  } else if (col.onchain && piece?.animationUrl) {
    detailIframe.src = piece.animationUrl;
    detailIframe.classList.remove('hidden');
  } else {
    // Normal Images (Acid Family)
    detailImage.src = toOptimizedUrl(piece?.image || col.heroImage);
    detailImage.classList.remove('hidden');
  }

  detailTitle.textContent = col.title;
  detailChain.textContent = chainNames[col.chain] || col.chain;
  detailChain.setAttribute('data-chain', col.chain);
  
  showView('detail');
}

document.addEventListener('DOMContentLoaded', init);
