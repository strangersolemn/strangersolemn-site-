// Strange Labs landing page: the live engine screen and the copy buttons.
(function () {
  var ENGINE = 'https://ordinals.com/content/691e244829aceaf438ed9304cf13f5874462c90865524b3f7c8662ad5414fbd1i0';
  var screen = document.getElementById('screen'), modes = document.getElementById('modes'), toast = document.getElementById('toast');
  var current = -1, timer = 0;

  // The engine reads its options from the part after #, so each gl1tch is the same inscription with a different #m.
  function show(m) {
    if (m === current) return;
    current = m;
    var f = document.createElement('iframe');
    f.title = 'Gl1tch ' + (m + 1);
    f.loading = 'lazy';
    f.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    f.src = ENGINE + '#m=' + m;
    var old = screen.querySelector('iframe');
    if (old) old.remove();
    screen.appendChild(f);
    Array.prototype.forEach.call(modes.children, function (b, i) { b.setAttribute('aria-pressed', i === m ? 'true' : 'false'); });
  }
  for (var i = 0; i < 15; i++) (function (m) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = (m < 9 ? '0' : '') + (m + 1);
    b.setAttribute('aria-label', 'Gl1tch ' + (m + 1));
    b.addEventListener('click', function () { show(m); });
    modes.appendChild(b);
  })(i);
  show(0);

  // copy buttons
  function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(timer); timer = setTimeout(function () { toast.classList.remove('on'); }, 1600); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]'); if (!b) return;
    var id = b.getAttribute('data-copy');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(id).then(function () { say('ID copied'); }, function () { say(id); });
    else say(id);
  });
})();
