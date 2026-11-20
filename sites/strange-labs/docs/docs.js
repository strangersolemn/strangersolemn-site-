// Shows the Markdown pages listed in SUMMARY.md, GitBook-style. #gl1tch-composer/playing.md opens a page.
// The Markdown reader is small on purpose: headings, paragraphs, lists, bold, code, links, images, tables, quotes.
(function () {
'use strict';
var nav = document.getElementById('nav'), page = document.getElementById('page'), menu = document.getElementById('menu');
var pages = [];   // [{ title, file }] in book order

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function resolve(base, href) {   // a link inside a page, made relative to the docs folder
  if (/^(https?:|mailto:|#)/.test(href)) return href;
  var parts = base.split('/'); parts.pop();
  href.split('/').forEach(function (p) { if (p === '..') parts.pop(); else if (p !== '.') parts.push(p); });
  return parts.join('/');
}
function inline(s, base) {
  var codes = [];
  s = s.replace(/`([^`]+)`/g, function (_, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, src) { return '<img alt="' + alt + '" src="' + esc(resolve(base, src)) + '" loading="lazy">'; });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, text, href) {
    var h = resolve(base, href), ext = /^https?:/.test(h);
    if (!ext && /\.md(#.*)?$/.test(h)) h = '#' + h;
    return '<a href="' + esc(h) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + text + '</a>';
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return '<code>' + esc(codes[+i]) + '</code>'; });
}
function render(md, base) {
  var L = md.replace(/\r/g, '').split('\n'), out = [], i = 0, m, buf;
  while (i < L.length) {
    var line = L[i];
    if (/^```/.test(line)) { buf = []; i++; while (i < L.length && !/^```/.test(L[i])) buf.push(L[i++]); i++; out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>'); continue; }
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { out.push('<h' + m[1].length + '>' + inline(m[2], base) + '</h' + m[1].length + '>'); i++; continue; }
    if (/^\|/.test(line)) {
      buf = []; while (i < L.length && /^\|/.test(L[i])) buf.push(L[i++]);
      var rows = buf.map(function (r) { return r.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); });
      var head = rows[0], body = rows.slice(rows[1] && /^-+$/.test((rows[1][0] || '').replace(/:/g, '')) ? 2 : 1), emptyHead = head.every(function (c) { return !c; });
      out.push('<div class="tbl"><table>' + (emptyHead ? '' : '<thead><tr>' + head.map(function (c) { return '<th>' + inline(c, base) + '</th>'; }).join('') + '</tr></thead>') +
        '<tbody>' + body.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inline(c, base) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>');
      continue;
    }
    if (/^>/.test(line)) { buf = []; while (i < L.length && /^>/.test(L[i])) buf.push(L[i++].replace(/^>\s?/, '')); out.push('<blockquote>' + render(buf.join('\n'), base) + '</blockquote>'); continue; }
    if (/^\s*([*-]|\d+\.)\s+/.test(line)) {
      var ordered = /^\s*\d+\./.test(line); buf = [];
      while (i < L.length && /^\s*([*-]|\d+\.)\s+/.test(L[i])) { var item = L[i++].replace(/^\s*([*-]|\d+\.)\s+/, ''); while (i < L.length && /^\s{2,}\S/.test(L[i]) && !/^\s*([*-]|\d+\.)\s+/.test(L[i])) item += ' ' + L[i++].trim(); buf.push(item); }
      out.push('<' + (ordered ? 'ol' : 'ul') + '>' + buf.map(function (x) { return '<li>' + inline(x, base) + '</li>'; }).join('') + '</' + (ordered ? 'ol' : 'ul') + '>');
      continue;
    }
    if (!line.trim()) { i++; continue; }
    buf = []; while (i < L.length && L[i].trim() && !/^(#{1,3}\s|```|\||>|\s*([*-]|\d+\.)\s)/.test(L[i])) buf.push(L[i++]);
    out.push('<p>' + inline(buf.join(' '), base) + '</p>');
  }
  return out.join('\n');
}

function buildNav(summary) {
  var html = [];
  summary.replace(/\r/g, '').split('\n').forEach(function (line) {
    var g = line.match(/^##\s+(.*)$/), it = line.match(/^\s*\*\s+\[([^\]]+)\]\(([^)]+)\)/);
    if (g) html.push('<h2>' + esc(g[1]) + '</h2>');
    else if (it) { pages.push({ title: it[1], file: it[2] }); html.push('<a href="#' + esc(it[2]) + '" data-file="' + esc(it[2]) + '">' + esc(it[1]) + '</a>'); }
  });
  nav.innerHTML = html.join('');
}
function open() {
  var file = decodeURIComponent(location.hash.slice(1)) || 'README.md';
  var n = pages.findIndex(function (p) { return p.file === file; });
  if (n < 0) { file = 'README.md'; n = 0; }
  Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) { if (a.getAttribute('data-file') === file) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false');
  fetch(file, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (md) {
    var prev = pages[n - 1], next = pages[n + 1];
    page.innerHTML = render(md, file) + '<div class="pager">' +
      (prev ? '<a href="#' + esc(prev.file) + '"><span>Previous</span>' + esc(prev.title) + '</a>' : '<i></i>') +
      (next ? '<a class="next" href="#' + esc(next.file) + '"><span>Next</span>' + esc(next.title) + '</a>' : '<i></i>') + '</div>';
    var h1 = page.querySelector('h1'), t = h1 ? h1.textContent : ''; document.title = t && t !== 'Strange Labs docs' ? t + ' · Strange Labs docs' : 'Strange Labs docs';
    window.scrollTo(0, 0); page.focus({ preventScroll: true });
  }).catch(function () { page.innerHTML = '<h1>Not found</h1><p>That page could not be loaded. <a href="#README.md">Back to the start</a>.</p>'; });
}
menu.addEventListener('click', function () { var on = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(on)); });
window.addEventListener('hashchange', open);
fetch('SUMMARY.md', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (s) { buildNav(s); open(); })
  .catch(function () { page.innerHTML = '<p>Could not load the contents.</p>'; });
})();
