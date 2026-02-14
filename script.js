/**
 * STRANGER SOLEMN - Official Site Script
 * Features: Big detail images, per-piece fullscreen display, clickable carousel
 */

// DOM Elements
const views = { home: document.getElementById('view-home'), detail: document.getElementById('view-detail') };
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
const displayMode = document.getElementById('display-mode');
const displayArt = document.getElementById('display-art');
const displayIframe = document.getElementById('display-iframe');
const displayTitle = document.getElementById('display-title');
const displayCollection = document.getElementById('display-collection');

var currentCollectionId = null;
var currentPieceIndex = 0;
var slideshowInterval = null;
var slideshowPlaying = false;
var displayCollectionData = null;
var displayPieceIndex = 0;
var displaySingleMode = false;
var currentCarouselCollection = null;

var chainNames = {
      ordinals: 'BTC',
      ethereum: 'ETH',
      tezos: 'TEZ',
      solana: 'SOL'
};

/**
 * Check if a piece MUST use an iframe (no good static image available).
 * Ordinals pieces need iframes - their URLs serve HTML, not images.
 * On-chain ETH pieces with data:text/html animationUrls also need iframes.
 */
function pieceNeedsIframe(collection, piece) {
      if (!collection.onchain) return false;
      if (piece.isImage) return false;
      if (collection.chain === 'ordinals') return true;
      // On-chain ETH/TEZ with HTML animation - use iframe
  if (piece.animationUrl && piece.animationUrl.startsWith('data:text/html')) return true;
      return false;
}

/**
 * Check if a piece has a real static image that can render well in an img tag.
 * Returns false for on-chain pieces that only have low-quality CDN thumbnails.
 */
function hasStaticImage(piece) {
      if (!piece) return false;
      var url = piece.image;
      if (!url) return false;
      if (url.startsWith('data:text/html')) return false;
      if (url.includes('ordinals.com/content/')) return false;
      // If piece has a data:text/html animation, the CDN static images are low quality
  if (piece.animationUrl && piece.animationUrl.startsWith('data:text/html')) return false;
      return true;
}

function getStaticImageUrl(piece) {
      if (!piece) return '';
      if (piece.image && !piece.image.startsWith('data:') && !piece.image.includes('ordinals.com/content/')) {
              // Skip low-quality CDN images for on-chain HTML pieces
        if (piece.animationUrl && piece.animationUrl.startsWith('data:text/html')) return '';
              return piece.image;
      }
      if (piece.thumbnail && !piece.thumbnail.startsWith('data:') && !piece.thumbnail.includes('ordinals.com/content/')) {
              if (piece.animationUrl && piece.animationUrl.startsWith('data:text/html')) return '';
              return piece.thumbnail;
      }
      return '';
}

function getIframeUrl(piece) {
      if (!piece) return '';
      return piece.animationUrl || piece.image || '';
}

function init() {
      buildTimeline();
      showRandomArt();
      startSlideshow();

  if (menuToggle) {
          menuToggle.addEventListener('click', function(e) {
                    e.stopPropagation();
                    timelinePanel.classList.toggle('open');
          });
  }

  document.addEventListener('click', function(e) {
          if (window.innerWidth <= 768 && !timelinePanel.contains(e.target) && e.target !== menuToggle) {
                    timelinePanel.classList.remove('open');
          }
  });

  document.querySelectorAll('[data-view="home"]').forEach(function(el) {
          el.addEventListener('click', function(e) {
                    e.preventDefault();
                    showView('home');
          });
  });

  var downloadBtn = document.querySelector('.download-btn');
      if (downloadBtn) {
              downloadBtn.addEventListener('click', function() {
                        var imageUrl = detailImage.src;
                        var link = document.createElement('a');
                        link.href = imageUrl;
                        link.download = 'stranger-solemn-' + currentCollectionId + '.png';
                        link.click();
              });
      }

  [artTitle, artCollection, artChain].forEach(function(el) {
          if (el) {
                    el.addEventListener('click', function(e) {
                                e.stopPropagation();
                                if (currentCarouselCollection) {
                                              stopSlideshow();
                                              showDetail(currentCarouselCollection.id);
                                }
                    });
          }
  });

  initDisplayMode();
}

function showView(viewName) {
      Object.keys(views).forEach(function(key) {
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
      var sorted = [...collections].sort(function(a, b) {
              return (b.year || 2024) - (a.year || 2024);
      });

  var currentYear = null;
      var html = '';
      sorted.forEach(function(col) {
              var year = col.year || 2024;
              if (year !== currentYear) {
                        currentYear = year;
                        html += '<div class="timeline-year">' + currentYear + '</div>';
              }
              html += '<div class="timeline-item" data-chain="' + col.chain + '" data-id="' + col.id + '">'
                + '<span class="timeline-item-chain">' + (chainNames[col.chain] || col.chain.toUpperCase()) + '</span>'
                + '<span class="timeline-item-title">' + col.title + '</span>'
                + '<span class="timeline-item-count">' + (col.pieces?.length || col.supply || '?') + '</span>'
                + '</div>';
      });

  timeline.innerHTML = html;
      timeline.querySelectorAll('.timeline-item').forEach(function(item) {
              item.addEventListener('click', function() {
                        showDetail(item.dataset.id);
              });
      });
}

/**
 * Show the hero media for a piece.
 * Strategy:
 * - If piece has a real static image => show it (standard ETH, TEZ, SOL)
 * - If piece needs iframe (ordinals or on-chain HTML) => show iframe
 * - Fallback => try any available URL
 */
function showHeroMedia(collection, piece) {
      detailImage.classList.add('hidden');
      detailIframe.classList.add('hidden');
      detailIframe.src = "";

  if (detailVideo) {
          detailVideo.classList.add('hidden');
          detailVideo.pause();
          detailVideo.src = "";
          detailVideo.load();
  }

  if (!piece) return;

  var isVideo = piece.video || (piece.animationUrl && piece.animationUrl.endsWith('.mp4'));
      if (isVideo) {
              detailVideo.src = piece.video || piece.animationUrl;
              detailVideo.classList.remove('hidden');
              detailVideo.play();
              return;
      }

  // Check if piece needs iframe (ordinals or on-chain HTML)
  if (pieceNeedsIframe(collection, piece)) {
          detailIframe.src = getIframeUrl(piece);
          detailIframe.classList.remove('hidden');
          return;
  }

  // Use static image when available
  var staticUrl = getStaticImageUrl(piece);
      if (staticUrl) {
              detailImage.src = toOptimizedUrl(staticUrl);
              detailImage.classList.remove('hidden');
              return;
      }

  // Final fallback
  detailImage.src = toOptimizedUrl(piece.image || piece.thumbnail || collection.heroImage || '');
      detailImage.classList.remove('hidden');
}

function showDetail(collectionId) {
      var collection = collections.find(function(c) { return c.id === collectionId; });
      if (!collection) return;

  currentCollectionId = collectionId;
      currentPieceIndex = 0;

  var piece = collection.pieces?.[0];
      showHeroMedia(collection, piece);

  detailTitle.textContent = collection.title;
      detailChain.textContent = chainNames[collection.chain] || collection.chain.toUpperCase();
      detailChain.setAttribute('data-chain', collection.chain);

  var displayIcon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';

  var thumbsHtml = collection.pieces.map(function(p, idx) {
          var displayBtn = '<div class="piece-thumb-actions"><button class="piece-display-btn" data-display-index="' + idx + '" title="Display this piece">' + displayIcon + '</button></div>';

                                             // Use iframe for on-chain pieces (ordinals + on-chain ETH with HTML animation)
                                             if (pieceNeedsIframe(collection, p)) {
                                                       return '<div class="piece-thumb" data-index="' + idx + '">'
                                                         + '<iframe src="' + (p.animationUrl || p.image) + '" loading="lazy" sandbox="allow-scripts" scrolling="no"></iframe>'
                                                         + displayBtn
                                                         + '</div>';
                                             }

                                             // For standard pieces with static images
                                             var staticUrl = getStaticImageUrl(p);
          if (staticUrl) {
                    var thumbUrl = toOptimizedUrl(p.thumbnail || p.image);
                    return '<div class="piece-thumb" data-index="' + idx + '">'
                      + '<img src="' + thumbUrl + '" loading="lazy">'
                      + displayBtn
                      + '</div>';
          }

                                             // Fallback to iframe
                                             return '<div class="piece-thumb" data-index="' + idx + '">'
            + '<iframe src="' + (p.animationUrl || p.image) + '" loading="lazy" sandbox="allow-scripts" scrolling="no"></iframe>'
            + displayBtn
            + '</div>';
  }).join('');

  // Build marketplace links from collection-level data
  var linksHtml = '';
      if (collection.marketplaceLinks) {
              collection.marketplaceLinks.forEach(function(link) {
                        linksHtml += '<a href="' + link.url + '" target="_blank" class="detail-link">' + link.name + '</a>';
              });
      }

  detailMetadata.innerHTML = '<div class="collection-stats">'
        + '<div class="meta-row"><span class="meta-label">Pieces</span><span class="meta-value">' + (collection.supply || collection.pieces?.length || '?') + '</span></div>'
        + '<div class="meta-row"><span class="meta-label">Chain</span><span class="meta-value">' + collection.chain.toUpperCase() + '</span></div>'
        + '</div>'
        + '<div class="pieces-grid">' + thumbsHtml + '</div>'
        + (linksHtml ? '<div class="marketplace-links">' + linksHtml + '</div>' : '');

  detailMetadata.querySelectorAll('.piece-thumb').forEach(function(thumb) {
          thumb.addEventListener('click', function(e) {
                    if (e.target.closest('.piece-display-btn')) return;
                    var idx = parseInt(thumb.dataset.index);
                    currentPieceIndex = idx;
                    showPiece(collection, idx);
          });
  });

  detailMetadata.querySelectorAll('.piece-display-btn').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var idx = parseInt(btn.dataset.displayIndex);
                    enterDisplayMode(collection, idx, true);
          });
  });

  showView('detail');
}

function showPiece(collection, index) {
      var piece = collection.pieces[index];
      if (!piece) return;
      showHeroMedia(collection, piece);
      detailTitle.innerHTML = collection.title + ' <span class="piece-indicator">' + (piece.title || '#' + piece.tokenId) + '</span>';
}

function showRandomArt() {
      var col = collections[Math.floor(Math.random() * collections.length)];
      var piece = col.pieces[Math.floor(Math.random() * col.pieces.length)];
      currentCarouselCollection = col;

  var staticUrl = getStaticImageUrl(piece);
      if (staticUrl) {
              featuredIframe.classList.remove('active');
              featuredIframe.src = '';
              featuredArt.style.display = '';
              featuredArt.src = staticUrl;
      } else if (pieceNeedsIframe(col, piece)) {
              featuredArt.style.display = 'none';
              featuredIframe.classList.add('active');
              featuredIframe.src = piece.animationUrl || piece.image;
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

function enterDisplayMode(collection, pieceIndex, singleOnly) {
      displayCollectionData = collection;
      displayPieceIndex = pieceIndex;
      displaySingleMode = !!singleOnly;
      loadDisplayPiece();
      displayMode.classList.add('active');
      document.body.style.overflow = 'hidden';

  var navBtns = displayMode.querySelectorAll('.display-prev, .display-next, .display-shuffle');
      navBtns.forEach(function(btn) {
              btn.style.display = displaySingleMode ? 'none' : '';
      });
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

  displayArt.style.display = 'none';
      displayIframe.style.display = 'none';
      displayIframe.src = '';

  // Use iframe for on-chain pieces
  if (pieceNeedsIframe(displayCollectionData, piece)) {
          displayIframe.src = getIframeUrl(piece);
          displayIframe.style.display = 'block';
  } else {
          var staticUrl = getStaticImageUrl(piece);
          if (staticUrl) {
                    displayArt.src = staticUrl;
                    displayArt.style.display = 'block';
          } else {
                    displayArt.src = piece.image || piece.thumbnail;
                    displayArt.style.display = 'block';
          }
  }

  if (displayTitle) displayTitle.textContent = piece.title || displayCollectionData.title;
      if (displayCollection) displayCollection.textContent = displayCollectionData.title;
}

function initDisplayMode() {
      var btn = document.getElementById('display-mode-btn');
      if (btn) {
              btn.addEventListener('click', function() {
                        var col = collections[Math.floor(Math.random() * collections.length)];
                        var idx = Math.floor(Math.random() * col.pieces.length);
                        enterDisplayMode(col, idx, false);
              });
      }

  var collectionDisplayBtn = document.getElementById('collection-display-btn');
      if (collectionDisplayBtn) {
              collectionDisplayBtn.addEventListener('click', function() {
                        var collection = collections.find(function(c) { return c.id === currentCollectionId; });
                        if (collection) enterDisplayMode(collection, 0, false);
              });
      }

  var closeBtn = document.querySelector('.display-close');
      if (closeBtn) closeBtn.addEventListener('click', exitDisplayMode);

  var nextBtn = document.querySelector('.display-next');
      if (nextBtn) {
              nextBtn.addEventListener('click', function() {
                        if (!displayCollectionData || displaySingleMode) return;
                        displayPieceIndex = (displayPieceIndex + 1) % displayCollectionData.pieces.length;
                        loadDisplayPiece();
              });
      }

  var prevBtn = document.querySelector('.display-prev');
      if (prevBtn) {
              prevBtn.addEventListener('click', function() {
                        if (!displayCollectionData || displaySingleMode) return;
                        displayPieceIndex = (displayPieceIndex - 1 + displayCollectionData.pieces.length) % displayCollectionData.pieces.length;
                        loadDisplayPiece();
              });
      }

  var shuffleBtn = document.querySelector('.display-shuffle');
      if (shuffleBtn) {
              shuffleBtn.addEventListener('click', function() {
                        if (!displayCollectionData || displaySingleMode) return;
                        displayPieceIndex = Math.floor(Math.random() * displayCollectionData.pieces.length);
                        loadDisplayPiece();
              });
      }

  document.addEventListener('keydown', function(e) {
          if (!displayMode.classList.contains('active')) return;
          if (e.key === 'Escape') exitDisplayMode();
          if (!displaySingleMode && displayCollectionData) {
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
      document.getElementById('lightbox-img').src = src;
      lb.classList.add('active');
}

function closeLightbox() {
      document.getElementById('lightbox').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', init);
