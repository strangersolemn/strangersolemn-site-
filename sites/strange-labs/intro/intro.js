// Strange Labs intro. A flight through a Bitcoin coin and the collections that sit under Strange Labs.
// Everything is a flat cut-out placed at a depth; the camera only ever moves forward (then rewinds).
// render(t) draws the frame for time t in seconds and depends on nothing else, so it can be played or captured.
(function () {
'use strict';
var canvas = document.getElementById('c'), gl = canvas.getContext('webgl2', { antialias: true, alpha: false, premultipliedAlpha: true });
var ui = document.getElementById('ui'), playBtn = document.getElementById('play'), msg = document.getElementById('msg');
if (!gl) { msg.textContent = 'This browser cannot play the intro.'; return; }

// ---------- timing: cut to the music of Blockrunner, 174 beats a minute ----------
// The tune is an 8-bar loop: a long falling bass note at the start, another at bar 5, two low hits in bar 8,
// then the long note again. The intro follows it:
//   one bar of drums while the coins gather
//   lap 1: bass 1 -> through the coin; bass 2 (bar 5) -> the lights go out; Ord Lot, Trolls, Block Party, Editions, Doom;
//          the low hits in bar 8 flash
//   lap 2: bass 1 -> punch into Gamma Prints; bass 2 (bar 5) -> through its big piece into The Masters;
//          hit "1" in bar 8 flashes; on hit "2", as the big piece in the middle fills the screen, the drums stop and we zoom
//          all the way back out as the note falls;
//   every bass note and low hit pumps the pieces towards you
//   the logo is there when we come out, and it powers down as the note dies
var BEAT = 60 / 174, BAR = BEAT * 4, END = 15.5, RUN = 31;   // END: bars of the tune before we pull back (Solemn's pick: the last note of bar 8, lap 2)
var T_IN = BAR,                        // bass 1
    T_RUN = T_IN + BAR * RUN,          // the flight's speed is set as if it ran 31 bars; that put the pull-back where he wants it
    T_BACK = T_IN + BAR * END,         // the zoom out starts
    T_LOGO = T_BACK + 0.85,     // back outside: the logo
    T_OFF = T_LOGO + 1.5,       // the logo switches off
    T_END = T_OFF + 0.9,
    Q = T_IN / 1.739;           // the opening was first timed for a 1.739 s lead-in; Q squeezes it to one bar
// ---------- depth: one section is 60 units long ----------
var D_COIN = 12, D0 = 12.5, SEC = 60, D_STOP = D0 + SEC * 5 / 7 * RUN, FOCAL = 1.8;

var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
var sm = function (a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
var mix = function (a, b, k) { return a + (b - a) * k; };
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }

function flight(t) { var s = (t - T_IN) / (T_RUN - T_IN); return mix(D0, D_STOP, 1 - Math.pow(1 - s, 1.07)); }
function camDepth(t) {
  var ti = t / Q;
  if (ti < 0.95) return ti * 0.3;
  if (t < T_IN) { var e = (ti - 0.95) / (1.739 - 0.95); return mix(0.285, D0, e * e * e); }
  if (t < T_BACK) return flight(t);   // near-steady, so bass 2 lands as the dark gallery begins
  if (t < T_LOGO) { var b = (t - T_BACK) / (T_LOGO - T_BACK), top = flight(T_BACK); b = b < .5 ? 4 * b * b * b : 1 - Math.pow(-2 * b + 2, 3) / 2; return mix(top, 0, b); }
  return 0;
}
// the colour of the world the camera is in
var INK = hex('#0f1012'), WHITE = hex('#f3f1ea'), DARK = hex('#0a0a10'), NIGHT = hex('#06060c');
var BG = [[0, INK], [10.5, INK], [13.5, WHITE], [D0 + 53, WHITE], [D0 + 60, DARK], [D0 + 116, DARK], [D0 + 182, NIGHT]];   // build() adds a world for each later collection
function bgAt(z) { for (var i = 1; i < BG.length; i++) if (z < BG[i][0]) { var a = BG[i - 1], b = BG[i], k = (z - a[0]) / (b[0] - a[0]); return [mix(a[1][0], b[1][0], k), mix(a[1][1], b[1][1], k), mix(a[1][2], b[1][2], k)]; } return NIGHT; }

// ---------- shaders ----------
var VS = '#version 300 es\nin vec2 a;uniform vec2 C,H;uniform float R,AS;out vec2 v;void main(){v=a*.5+.5;vec2 p=a*H;float c=cos(R),s=sin(R);p=vec2(p.x*c-p.y*s,p.x*s+p.y*c);gl_Position=vec4(C+vec2(p.x/AS,p.y),0.,1.);}';
var FS = ['#version 300 es', 'precision highp float;in vec2 v;out vec4 o;',
  'uniform sampler2D T;uniform int M;uniform vec4 U;uniform float B,A,FG,HO,TL,ED,FX,I,SD,AS;uniform vec3 F,K,EC;',
  'void main(){',
  ' vec2 uv=vec2(FX>.5?1.-v.x:v.x,1.-v.y);float m=max(abs(uv.x-.5),abs(uv.y-.5))*2.;',
  ' if(M==0){',                                           // a picture, blurred by distance, hazed towards the world colour
  '  vec2 q=TL>1.?fract(uv*TL):uv;vec2 st=U.xy+q*U.zw;float l=B*5.5;vec2 r=U.zw*B*.014;',
  '  vec4 c=(texture(T,st,l)*2.+texture(T,st+vec2(r.x,0.),l)+texture(T,st-vec2(r.x,0.),l)+texture(T,st+vec2(0.,r.y),l)+texture(T,st-vec2(0.,r.y),l))/6.;',
  '  c.rgb*=K;if(ED>0.&&m>1.-ED)c=vec4(EC,1.);if(HO>0.)c*=step(HO,m);',
  '  c.rgb=mix(c.rgb,F*c.a,FG);o=c*A;',
  ' }else if(M==1){',                                     // a glow with rays
  '  vec2 p=v*2.-1.;float r=length(p),an=atan(p.y,p.x);',
  '  float ry=pow(abs(sin(an*3.+SD)),10.)+.6*pow(abs(sin(an*5.-SD*2.)),14.);',
  '  float g=(exp(-r*5.)*1.4+ry*exp(-r*2.6)*.55)*smoothstep(1.,.6,r);o=vec4(K*g*I,0.);',
  ' }else if(M==2){vec3 c=mix(K,F,FG);o=vec4(c,1.)*A;',  // a flat panel
  ' }else{',                                              // speed lines
  '  vec2 p=v*2.-1.;p.x*=AS;float r=length(p),an=atan(p.y,p.x);',
  '  float n=fract(sin(floor(an*70.)*91.7+SD)*43758.5);o=vec4(K*smoothstep(.72,1.,n)*smoothstep(.12,1.2,r)*I,0.);',
  ' }}'].join('\n');
function shader(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
var prog = gl.createProgram(); gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);
var U = {}; 'C H R AS T M U B A FG HO TL ED FX I SD F K EC'.split(' ').forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
var loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
gl.enable(gl.BLEND); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

function texFrom(src) {
  var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function load(name) { return new Promise(function (ok, no) { var im = new Image(); im.onload = function () { ok(texFrom(im)); }; im.onerror = function () { no(new Error('could not load ' + name)); }; im.src = 'assets/' + name; }); }
function draw2d(w, h, fn) { var c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return texFrom(c); }
var FONT = '"Helvetica Neue",Helvetica,Arial,sans-serif';
function title(text, color) { return draw2d(1024, 192, function (x, w, h) { x.fillStyle = color; x.font = '700 132px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 6, w - 40); }); }

// ---------- pictures made here ----------
var coinTex = draw2d(512, 512, function (x) {   // the Bitcoin mark: an orange coin with a tilted white B and its two strokes
  x.fillStyle = '#f7931a'; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill();
  x.translate(256, 256); x.rotate(0.24); x.fillStyle = '#fff'; x.font = '700 330px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('B', 6, 14);
  [-52, 6].forEach(function (dx) { x.fillRect(dx, -168, 34, 60); x.fillRect(dx, 122, 34, 60); });
});

// ---------- the scene ----------
var layers = [], tex = {}, M = null, AMBER = hex('#f5a623'), HOT = hex('#ff4a12'), ONE = [1, 1, 1];
function add(o) { o.w = o.w || 1; o.h = o.h || o.w; o.x = o.x || 0; o.y = o.y || 0; layers.push(o); return o; }
// every bass note and low hit of the tune, as times; the pieces pump towards you on each one
var BASS = []; (function () { for (var s = 0; s < 16 * END; s++) { var s8 = s % 128; if (s8 === 0 || s8 === 64 || s8 === 112 || s8 === 120) BASS.push(T_IN + s * BEAT / 4); } })();
function pump(t) { var p = 0; for (var i = 0; i < BASS.length; i++) { var g = t - BASS[i]; if (g >= 0 && g < 0.8) p += sm(0, 0.035, g) * Math.exp(-g * 6); } return Math.min(p, 1.2); }
function at(bars) { return flight(T_IN + bars * BAR); }   // how deep the camera is on a given bar
function build() {
  var r = rng(7), i, side, s0;
  // 1. THE ORD LOT: a white room and a crowd of cut-outs. The one with the sign stands in the way; we go through him.
  s0 = D0; add({ t: title('The Ord Lot', '#111'), d: s0 + 9, y: 3.1, w: 9, h: 1.7 });
  for (i = 0; i < 24; i++) { side = i % 2 ? 1 : -1; add({ t: tex['c' + i], d: s0 + 7 + i * 2, x: side * (2.5 + r() * 3.4), y: -1.1 + r() * 0.5, w: 5.4 }); }
  add({ t: tex.c24, d: s0 + 57.5, x: 0, y: 1.9, w: 12 });
  // 2. TROLLBOX: the trolls in their boxes, flicking from troll to troll like the Trollbox video; the real Trollbox logo on top
  s0 = D0 + SEC; add({ t: tex.tblogo, d: s0 + 8, y: 3.1, w: 7.6, h: 7.6 * 522 / 1988 });
  for (i = 0; i < 12; i++) {
    side = i % 2 ? 1 : -1; var x = side * (2.9 + r() * 2.2), d = s0 + 7 + i * 4.1;
    add({ t: tex['tb' + i], d: d, x: x, y: -0.1, w: 4.8, fb: 30 / 7, ph: i * 1.7, edge: 0.018, ec: INK });
  }
  // 3. BLOCK PARTY: cards with white cut-out edges, bobbing to the beat
  s0 = D0 + SEC * 2; add({ t: title('Block Party', '#fff'), d: s0 + 7, y: 3.2, w: 9, h: 1.7 });
  for (i = 0; i < 34; i++) { side = i % 2 ? 1 : -1; add({ t: tex['p' + (i % 14)], d: s0 + 1 + i * 1.65, x: side * (1.7 + r() * 4.4), y: (r() - .5) * 4.2, w: 3.3 + r() * 1.6, rot: (r() - .5) * 0.5, edge: 0.035, ec: ONE, bob: i }); }
  // 4. EDITIONS: a dark gallery, the Block Clocks glowing behind it
  s0 = D0 + SEC * 3; add({ t: title('Editions', '#fff'), d: s0 + 7, y: 3.2, w: 9, h: 1.7 });
  for (i = 0; i < 10; i++) { side = i % 2 ? 1 : -1; add({ t: tex['e' + i], d: s0 + 3 + i * 5.1, x: side * (2.4 + r() * 1.5), y: (r() - .5) * 1.2, w: 3.7, edge: 0.02, ec: AMBER }); }
  for (i = 0; i < 8; i++) { side = i % 2 ? -1 : 1; add({ t: tex['k' + i], d: s0 + 5 + i * 6.2, x: side * (6.2 + r() * 2.5), y: (r() - .5) * 4, w: 5.2, addv: 1 }); }
  // 5. DOOM and GL1TCH: a tunnel of gl1tch frames with the skulls floating in it
  s0 = D0 + SEC * 4; add({ t: title('Doom', '#fff'), d: s0 + 6, y: 3.3, w: 9, h: 1.7 });
  var dEnd = at(8) - 4, n;   // the tunnel runs on through bar 8 of the first lap
  n = Math.floor((dEnd - s0 - 5) / 4); for (i = 0; i < n; i++) add({ t: tex['g' + (i % 6)], d: s0 + 5 + i * 4, w: 17, hole: 0.64, tile: 3, fb: 6 + (i % 3) * 2, ph: i, addv: 1, a: 0.6 });
  n = Math.floor((dEnd - s0 - 6) / 3.5); for (i = 0; i < n; i++) { side = i % 2 ? 1 : -1; add({ t: tex['s' + (i % 14)], d: s0 + 6 + i * 3.5, x: side * (1.5 + r() * 2.4), y: (r() - .5) * 2.6, w: 4.2 + r() * 1.6, addv: 1, wob: i }); }
  n = Math.floor((dEnd - s0 - 30) / 4); for (i = 0; i < n; i++) { side = i % 2 ? 1 : -1; add({ t: tex['d' + (i % 14)], d: s0 + 30 + i * 4, x: side * (9 + r() * 4), y: (r() - .5) * 7, w: 3.6, addv: 1, a: 0.7 }); }
  // after lap 1: a new world on every bass note, each one ending in a big piece in the middle
  var keys = function (k) { return M[k].map(function (f) { return f.replace('.webp', ''); }); };
  var all = [].concat(keys('party'), keys('skulls'), keys('editions'), keys('clocks'), keys('crowd'), keys('trolls'), keys('gamma'), keys('masters'), keys('originals'), keys('rose'), keys('deliverance'));
  var worlds = [
    { name: 'Gamma Prints', pics: keys('gamma'), bg: '#d8400e', look: 'prints', ink: '#111' },
    { name: 'The Masters', pics: keys('masters'), bg: '#2a0b08', look: 'frames' },
    { name: 'Blockclock Originals', pics: keys('originals'), bg: '#04050d', look: 'glow' },
    { name: 'A Solemn Rose', pics: keys('rose'), bg: '#05201d', look: 'spiral' },
    { name: 'Deliverance', pics: keys('deliverance'), bg: '#1c0202', look: 'corridor' },
    { name: '', pics: all, bg: '#0a0a10', look: 'storm' }];
  worlds = worlds.slice(0, Math.ceil((END - 8) / 4));   // only the ones we reach before pulling back
  worlds.forEach(function (wd, k) {
    var z0 = at(8 + 4 * k), z1 = at(12 + 4 * k), last = k === worlds.length - 1, len = z1 - z0, col = hex(wd.bg), P = wd.pics, m, d, j;
    BG.push([z0 - 5, BG[BG.length - 1][1]], [z0, col]);
    if (wd.name) add({ t: title(wd.name, wd.ink || '#fff'), d: z0 + 8, y: 3.2, w: 9, h: 1.7 });
    if (wd.look === 'prints') for (j = 0, m = Math.floor((len - 14) / 4.6); j < m; j++) { side = j % 2 ? 1 : -1; add({ t: tex[P[j % P.length]], d: z0 + 6 + j * 4.6, x: side * (2.5 + r() * 2.4), y: (r() - .5) * 1.4, w: 4.4 + r(), edge: 0.03, ec: INK }); }
    if (wd.look === 'frames') for (j = 0, m = Math.floor((len - 14) / 4); j < m; j++) { side = j % 2 ? 1 : -1; add({ t: tex[P[j % P.length]], d: z0 + 6 + j * 4, x: side * (2.6 + r() * 1.8), y: (j % 4 < 2 ? .9 : -1.1) + (r() - .5) * .4, w: 3.6, edge: 0.05, ec: AMBER }); }
    if (wd.look === 'glow') for (j = 0, m = Math.floor((len - 12) / 3); j < m; j++) { side = j % 2 ? 1 : -1; add({ t: tex[P[j % P.length]], d: z0 + 5 + j * 3, x: side * (2 + r() * 5.5), y: (r() - .5) * 5, w: 3.5 + r() * 2.5, addv: 1 }); }
    if (wd.look === 'spiral') for (j = 0, m = Math.floor((len - 12) / 2.6); j < m; j++) { var an = j * 2.4, rad = 2.6 + r() * 1.6; add({ t: tex[P[j % P.length]], d: z0 + 5 + j * 2.6, x: Math.cos(an) * rad * 1.5, y: Math.sin(an) * rad, w: 3.2, rot: (r() - .5) * .6, edge: 0.025, ec: ONE, wob: j }); }
    if (wd.look === 'corridor') for (j = 0, m = Math.floor((len - 12) / 1.6); j < m; j++) { var q4 = j % 4; add({ t: tex[P[j % P.length]], d: z0 + 5 + j * 1.6, x: q4 < 2 ? (q4 ? 3.6 : -3.6) : (r() - .5) * 3, y: q4 < 2 ? (r() - .5) * 1.5 : (q4 === 2 ? 2.7 : -2.7), w: 3, edge: 0.02, ec: hex('#ff2a12') }); }
    if (wd.look === 'storm') for (j = 0, m = Math.floor((len - 6) / 1.1); j < m; j++) { side = j % 2 ? 1 : -1; add({ t: tex[P[(j * 7) % P.length]], d: z0 + 3 + j * 1.1, x: side * (1.3 + r() * 5.5), y: (r() - .5) * 5.2, w: 2.2 + r() * 1.8, rot: (r() - .5) * .5, edge: 0.03, ec: ONE, bob: j }); }
    add({ t: tex[P[0]], d: last ? at(END) + 4 : z1 - 2.2, x: 0, y: 0.2, w: 12 });   // the gate into the next world; the last one fills the screen as we pull back
  });
  BG.push([9999, BG[BG.length - 1][1]]);
  layers.sort(function (a, b) { return b.d - a.d; });
}

// ---------- drawing ----------
var W = 1, Hh = 1, AS = 1;
function resize() { var dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } W = canvas.width; Hh = canvas.height; AS = W / Hh; gl.viewport(0, 0, W, Hh); }
function quad(o) {   // o: cx,cy (clip), hw,hh (height units), and the look
  gl.uniform2f(U.C, o.cx, o.cy); gl.uniform2f(U.H, o.hw, o.hh); gl.uniform1f(U.R, o.rot || 0); gl.uniform1f(U.AS, AS);
  gl.uniform1i(U.M, o.mode || 0); gl.uniform1f(U.A, o.a === undefined ? 1 : o.a); gl.uniform1f(U.B, o.blur || 0); gl.uniform1f(U.FG, o.fog || 0);
  gl.uniform1f(U.HO, o.hole || 0); gl.uniform1f(U.TL, o.tile || 1); gl.uniform1f(U.ED, o.edge || 0); gl.uniform1f(U.FX, o.flip ? 1 : 0);
  gl.uniform1f(U.I, o.i === undefined ? 1 : o.i); gl.uniform1f(U.SD, o.seed || 0);
  gl.uniform3fv(U.F, o.fogc || INK); gl.uniform3fv(U.K, o.col || ONE); gl.uniform3fv(U.EC, o.ec || ONE);
  var uv = o.uv || [0, 0, 1, 1]; gl.uniform4f(U.U, uv[0], uv[1], uv[2], uv[3]);
  if (o.t) gl.bindTexture(gl.TEXTURE_2D, o.t);
  if (o.addv) gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
function render(t) {
  resize();
  var f = AS >= 1 ? FOCAL : FOCAL * Math.max(.62, AS * 1.1);
  var cz = camDepth(t), inside = t > T_IN && t < T_LOGO;
  var cx = Math.sin(t * 0.9) * 0.22 * (inside ? 1 : 0.2), cy = Math.sin(t * 0.7 + 1) * 0.14 * (inside ? 1 : 0.2);
  var bg = bgAt(cz); gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
  var boom = 1 + 0.11 * pump(t), rewind = t > T_BACK && t < T_LOGO, i, L, dist, sc, o, world = sm(D_COIN - 2.2, D_COIN + 0.3, cz);
  for (i = 0; i < layers.length; i++) {
    if (world <= 0) break;
    L = layers[i]; dist = L.d - cz; if (dist < 0.3 || dist > 118) continue;
    sc = f / dist * boom;
    var y = L.y, rot = L.rot || 0, w = L.w, h = L.h;
    if (L.bob !== undefined) y += Math.sin(t / BEAT * Math.PI + L.bob * 1.7) * 0.22;
    if (L.wob !== undefined) { rot += Math.sin(t * 1.3 + L.wob) * 0.12; y += Math.sin(t * 0.9 + L.wob * 2) * 0.15; }
    var px = (L.x - cx) * sc / AS, py = (y - cy) * sc, hw = w / 2 * sc, hh = h / 2 * sc;
    if (Math.abs(px) - (hw + hh) / AS > 1.05 || Math.abs(py) - (hw + hh) > 1.05) continue;
    var near = 1 - sm(1.2, 6.5, dist), far = sm(34, 95, dist);
    o = { t: L.t, cx: px, cy: py, hw: hw, hh: hh, rot: rot, mode: L.mode || 0, col: L.col, edge: L.edge, ec: L.ec, hole: L.hole, tile: L.tile, flip: L.flip, addv: L.addv,
          blur: clamp(near * 0.9 + far * 0.45 + (rewind ? 0.35 : 0), 0, 1), fogc: bg, fog: L.wall ? 0 : sm(16, 90, dist) * (L.addv ? 0 : 0.8),
          a: world * (L.gate ? 1 - sm(5, 13, dist) : 1) * (L.wall ? 1 - sm(34, 62, dist) : 1) * (L.a === undefined ? 1 : L.a) * sm(0.3, 1.5, dist) * (1 - sm(96, 118, dist)) * (L.addv ? 1 - sm(30, 100, dist) * 0.7 : 1) };
    if (L.fb) { var fr = Math.floor(t * L.fb + L.ph) % 4; o.uv = [(fr % 2) * .5, (fr >> 1) * .5, .5, .5]; }
    quad(o);
  }
  // the coin outside: six, then one, then through it; on the way back it shrinks to a dot
  var out = t > T_BACK, coinA = t < T_IN + 0.12 ? 1 : (t > T_BACK && t < T_LOGO ? 1 : 0), k;
  if (coinA) {
    var dC = D_COIN - cz; if (dC > 0.3) {
      sc = f / dC; var ti = t / Q, merge = sm(0.78, 1.14, ti), heat = out ? sm(T_BACK, T_LOGO, t) : sm(1.05, 1.739, ti), size = 0.8;
      quad({ mode: 1, cx: -cx * sc / AS, cy: -cy * sc, hw: 5 * sc, hh: 5 * sc, col: out ? HOT : AMBER, i: heat * 1.5, seed: t * 0.6, addv: 1 });
      for (k = 0; k < 6; k++) {
        var a = ti < 1.2 ? sm(0.12 + k * 0.07, 0.4 + k * 0.07, ti) * (k ? 1 - sm(1.0, 1.14, ti) : 1) : (k ? 0 : 1); if (a <= 0 || size <= 0) continue;
        quad({ t: coinTex, cx: ((k - 2.5) * 1.15 * (1 - merge) - cx) * sc / AS, cy: -cy * sc, hw: size / 2 * sc, hh: size / 2 * sc, a: a, blur: clamp(1 - dC / 3, 0, 1) * 0.6 });
      }
    }
  }
  // speed lines and the flash as we go through, and again on the way back
  var beat = 0, hit = 0, L, h;   // every bass note after the first lap punches into a new world; the bar-8 hits flash
  for (L = 0; T_IN + L * 8 * BAR < T_BACK; L++) {
    h = T_IN + L * 8 * BAR;
    if (L > 0 && t >= h) beat += 1 - sm(h, h + 0.5, t);
    if (L > 0 && h + 4 * BAR < T_BACK && t >= h + 4 * BAR) beat += 1 - sm(h + 4 * BAR, h + 4 * BAR + 0.5, t);
    if (h + 7 * BAR < T_BACK && t >= h + 7 * BAR) hit += 1 - sm(h + 7 * BAR, h + 7 * BAR + 0.16, t);
    if (h + 7.5 * BAR < T_BACK && t >= h + 7.5 * BAR) hit += 0.8 * (1 - sm(h + 7.5 * BAR, h + 7.5 * BAR + 0.14, t));
  }
  var punch = sm(1.2 * Q, T_IN, t) * (1 - sm(T_IN, T_IN + 0.5, t)) + beat * 0.8, rush = rewind ? Math.sin((t - T_BACK) / (T_LOGO - T_BACK) * Math.PI) : 0;
  if (punch + rush > 0.01) quad({ mode: 3, cx: 0, cy: 0, hw: AS, hh: 1, col: rush > punch ? ONE : [1, .8, .5], i: (punch + rush) * 0.55, seed: Math.floor(t * 30), addv: 1 });
  var flash = sm(T_IN - 0.1, T_IN, t) * (1 - sm(T_IN, T_IN + 0.35, t)) + beat * beat * 0.3 + hit * 0.22;
  if (flash > 0.01) quad({ mode: 2, cx: 0, cy: 0, hw: AS, hh: 1, col: WHITE, a: flash, fogc: WHITE });
  // the logo: Solemn's own Strange Labs mark. It slams in on the third hit, its glow dies as the bass note falls,
  // then it switches off like an old screen: down to a line, down to a dot, gone.
  if (t >= T_LOGO) {
    var g = t - T_LOGO, slam = 1 + 0.16 * (1 - sm(0, 0.2, g)), hot = 1 - sm(0.04, 1.35, g);
    var offV = sm(T_OFF, T_OFF + 0.16, t), offH = sm(T_OFF + 0.14, T_OFF + 0.3, t), gone = sm(T_OFF + 0.3, T_OFF + 0.5, t);
    var flick = g > 1.0 && t < T_OFF ? 0.72 + 0.28 * Math.round(0.5 + 0.5 * Math.sin(g * 61) * Math.sin(g * 17)) : 1;
    var lh = Math.min(0.42, 0.52 * AS) * slam, lw = lh * 658 / 712, sy = 1 - offV * 0.988, sx = 1 - offH * 0.97, vis = (1 - gone) * flick;
    quad({ mode: 1, cx: 0, cy: 0, hw: lh * 3.8, hh: lh * 3.8 * mix(1, 0.2, offV), col: HOT, i: vis * (0.22 + hot * 1.9) * (1 - offH), seed: 2 + t * 0.15, addv: 1 });
    quad({ t: tex.logo, cx: 0, cy: 0, hw: lw * 1.16 * sx, hh: lh * 1.16 * sy, col: [1, .5, .25], blur: 0.85, a: vis * (0.3 + hot * 1.1), addv: 1 });   // a halo in the logo's own shape
    quad({ t: tex.logo, cx: 0, cy: 0, hw: lw * 1.05 * sx, hh: lh * 1.05 * sy, col: [1, .7, .45], blur: 0.5, a: vis * (0.15 + hot * 0.8), addv: 1 });
    quad({ t: tex.logo, cx: 0, cy: 0, hw: lw * sx, hh: lh * sy, a: vis, col: [mix(0.78, 1, hot * 0.6 + 0.4), mix(0.78, 1, hot * 0.6 + 0.4), mix(0.78, 1, hot * 0.6 + 0.4)] });
    if (g < 0.5) quad({ t: tex.logo, cx: 0, cy: 0, hw: lw, hh: lh, col: [1, .9, .8], a: (1 - sm(0, 0.5, g)) * 0.8, addv: 1 });   // white-hot as it lands
    if (offV > 0 && gone < 1) quad({ mode: 2, cx: 0, cy: 0, hw: lw * 1.25 * sx + 0.004, hh: 0.004, col: [1, .93, .86], a: offV * (1 - gone), fogc: WHITE });   // the last line of light
  }
}

// ---------- sound: the music of Blockrunner ----------
// These four sounds and the pattern are taken as they are from the artwork's code (kick, snare, hat, the falling bass;
// 174 bpm; kick on steps 1, 8 and 11, snare on 5 and 13, a hat on every 16th, bass on bars 1 and 5 of 8, two low hits in bar 8),
// played until bar 5 of the second lap.
var actx = null, aT0 = 0, sound = false;
function music() {
  var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  if (actx) { try { actx.close(); } catch (e) {} }
  actx = new AC(); var out = actx.createGain(); out.connect(actx.destination); aT0 = actx.currentTime + 0.12;
  out.gain.setValueAtTime(0.58, aT0); out.gain.setValueAtTime(0.58, aT0 + T_END - 0.4); out.gain.linearRampToValueAtTime(0.0001, aT0 + T_END);
  function noise(len) { var b = actx.createBuffer(1, Math.floor(actx.sampleRate * len), actx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  var snareBuf = noise(0.1), hatBuf = noise(0.05);
  function kick(t) { var o = actx.createOscillator(), g = actx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(0.01, t + 0.3); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.3); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3); }
  function snare(t) { var s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); s.buffer = snareBuf; f.type = 'bandpass'; f.frequency.value = 1200; g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.15); s.connect(f); f.connect(g); g.connect(out); s.start(t); }
  function hat(t, vol) { var s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); s.buffer = hatBuf; f.type = 'highpass'; f.frequency.value = 8000; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.03); s.connect(f); f.connect(g); g.connect(out); s.start(t); }
  function bass(t, fr) { var o = actx.createOscillator(), g = actx.createGain(), f = actx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(fr, t); o.frequency.exponentialRampToValueAtTime(fr * 0.8, t + 2.0); f.type = 'lowpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(40, t + 2.5); f.Q.value = 8; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.6, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + 2.5); o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + 2.5); }
  var stepT = 60 / 174 / 4, i, s, t, b16;
  for (i = 0; i < 16 + 16 * END; i++) {   // s < 0 is the bar of drums before the tune starts; s % 128 runs through its eight bars
    s = i - 16; t = aT0 + i * stepT; b16 = ((s % 16) + 16) % 16; var s8 = ((s % 128) + 128) % 128;
    if (s >= 0 && (s8 === 0 || s8 === 64)) bass(t, 55);
    if (s >= 0 && (s8 === 112 || s8 === 120)) bass(t, 32.7);
    if (b16 === 0 || b16 === 7 || b16 === 10) kick(t);
    if (b16 === 4 || b16 === 12) snare(t);
    hat(t, b16 % 2 === 0 ? 0.1 : 0.05);
  }
  s = 16 * END; t = aT0 + (16 + s) * stepT; bass(t, s % 128 >= 112 ? 32.7 : 55); kick(t);   // the last note, and nothing after it
  return true;
}

// ---------- loading and playing ----------
var playing = false, t0 = 0, frozen = null, q = new URLSearchParams(location.search);
function frame() {
  if (!playing) return;
  if (sound && actx.state !== 'running' && performance.now() - t0 > 600) sound = false;   // the browser would not start the sound: carry on without it
  var t = sound ? Math.max(0, actx.currentTime - aT0) : (performance.now() - t0) / 1000;
  if (t >= T_END) { playing = false; render(T_END); playBtn.textContent = 'Play again'; msg.innerHTML = '<a class="tiny" href="../">Enter Strange Labs</a>'; ui.classList.remove('off'); return; }
  render(t); requestAnimationFrame(frame);
}
function play(silent) {
  ui.classList.add('off'); playing = true; t0 = performance.now(); sound = false;
  if (!silent) { try { sound = music(); if (sound && actx.resume) actx.resume(); } catch (e) { sound = false; } }
  requestAnimationFrame(frame);
}
playBtn.onclick = function () { play(false); };
window.addEventListener('resize', function () { if (!playing && M) render(frozen === null ? (playBtn.textContent === 'Play again' ? T_END : 0.75 * Q) : frozen); });
fetch('assets/manifest.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (m) {
  M = m; var names = [], done = 0;
  Object.keys(m).forEach(function (k) { [].concat(m[k]).forEach(function (n) { names.push(typeof n === 'string' ? n : n.src); }); });
  return Promise.all(names.map(function (n) { return load(n).then(function (t) { tex[n.replace('.webp', '')] = t; msg.textContent = 'Loading ' + Math.round(++done / names.length * 100) + '%'; }); }));
}).then(function () {
  build();
  window.render = render; window.introLength = T_END;   // for frame-by-frame capture
  if (q.has('t')) { frozen = parseFloat(q.get('t')); ui.hidden = true; document.getElementById('skip').hidden = true; render(frozen); return; }
  for (var b = -0.5; b < END + 3; b += 1.5) render(T_IN + b * BAR);   // draw each part once now, so nothing stutters the first time through
  render(0.75 * Q); msg.textContent = 'Sound on'; playBtn.hidden = false;
  if (q.has('auto')) play(true);
}).catch(function (e) { msg.textContent = 'Could not load the intro: ' + e.message; });
})();
