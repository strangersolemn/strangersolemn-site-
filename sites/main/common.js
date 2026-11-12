// Shared by every page. Media paths in the data are relative to the main site root.
const SITE_ROOT = '../../';
const CHAINS = { ethereum: 'Ethereum', ordinals: 'Bitcoin', tezos: 'Tezos', solana: 'Solana' };

const media = (u) => (!u ? '' : /^(https?:|data:)/.test(u) ? u : SITE_ROOT + u);
const isVideo = (u) => /\.(mp4|webm|mov)(\?|$)/i.test(u || '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const short = (a) => (a && a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || '');
const num = (n) => Number(n || 0).toLocaleString('en-GB');

// a still that turns into its moving loop once it scrolls into view (and pauses when it leaves)
const watcher = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    const box = e.target, src = box.dataset.moving;
    let v = box.querySelector('video');
    if (e.isIntersecting) {
      if (!v) {
        v = document.createElement('video');
        Object.assign(v, { muted: true, loop: true, playsInline: true, autoplay: true, preload: 'none' });
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        v.src = media(src);
        v.style.opacity = 0;
        v.addEventListener('playing', () => { v.style.opacity = 1; }, { once: true });
        box.appendChild(v);
      }
      v.play().catch(() => {});
    } else if (v) v.pause();
  }
}, { rootMargin: '200px' }) : null;

// fills a square box with art: still first, the loop over it when on screen
function fillArt(box, still, moving, alt = '') {
  const s = media(still);
  if (s && !isVideo(s)) {
    const img = document.createElement('img');
    img.loading = 'lazy'; img.decoding = 'async'; img.alt = alt; img.src = s;
    img.onerror = () => img.remove();
    box.appendChild(img);
  }
  const m = moving || (isVideo(s) ? still : '');
  if (m && isVideo(m) && watcher) { box.dataset.moving = m; watcher.observe(box); }
}

// where a single piece can be collected
function pieceUrl(chain, contract, tokenId) {
  if (chain === 'ethereum') return `https://opensea.io/assets/ethereum/${contract}/${tokenId}`;
  if (chain === 'tezos') return `https://objkt.com/tokens/${contract}/${tokenId}`;
  if (chain === 'ordinals') return `https://magiceden.io/ordinals/item-details/${tokenId}`;
  if (chain === 'solana') return `https://exchange.art/single/${tokenId}`;
  return '#';
}

const fmtDate = (iso, withTime) => {
  if (!iso) return '';
  if (/^\d{4}$/.test(iso)) return iso;
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return withTime ? `${day}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC` : day;
};

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) document.querySelectorAll('[data-moving] video').forEach((v) => v.play().catch(() => {}));
});
