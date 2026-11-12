// Walk-in gallery: one long paper-white room, the collection hung down both walls.
// Tap a piece (or the arrows) to walk to it; drag to look around. Uses the same data/<id>.json as the page.
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const id = new URLSearchParams(location.search).get('c') || 'everyday-strange';
const C = await (await fetch(`data/${encodeURIComponent(id)}.json`)).json();
document.title = `${C.title} — Walk in — Solemn`;
$('roomName').textContent = C.title;
$('leave').href = `work.html?c=${encodeURIComponent(C.id)}`;

// what can hang: a recorded loop (same-site video) or a real still. Live-code pieces with no loop can't go on a wall yet.
const MAX = 40;
const hangable = C.pieces.filter((p) => p[4] || (p[2] && !/html/.test(p[5])));
const P = hangable.slice(0, MAX);
if (P.length) buildRoom();
else {
  $('loading').textContent = 'This collection runs as live code, so it can\'t hang in 3D yet.';
  $('hint').hidden = true;
  document.querySelector('.room-ctrl').hidden = true;
}

function buildRoom() {

  // ---------- the room ----------
  const ROOM_W = 9, ROOM_H = 4.4, GAP = 4.2, START = 5, EYE = 1.6;
  const pairs = Math.ceil(P.length / 2);
  const ROOM_L = START + pairs * GAP + 3;

  const canvas = $('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#F4F2EC');
  scene.fog = new THREE.Fog('#F4F2EC', 10, 34);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 200);
  camera.rotation.order = 'YXZ';

  // flat paper tones (no lighting maths): walls, a slightly darker floor, a brighter ceiling; the fog gives the depth
  const paper = new THREE.MeshBasicMaterial({ color: '#EEEBE3' });
  const floorMat = new THREE.MeshBasicMaterial({ color: '#DAD5C9' });
  const ceilMat = new THREE.MeshBasicMaterial({ color: '#F7F6F1' });
  function plane(w, h, mat, pos, rot) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(...pos); m.rotation.set(...rot);
    scene.add(m); return m;
  }
  const midZ = -ROOM_L / 2 + 1.5;
  plane(ROOM_W, ROOM_L, floorMat, [0, 0, midZ], [-Math.PI / 2, 0, 0]);
  plane(ROOM_W, ROOM_L, ceilMat, [0, ROOM_H, midZ], [Math.PI / 2, 0, 0]);
  plane(ROOM_L, ROOM_H, paper, [-ROOM_W / 2, ROOM_H / 2, midZ], [0, Math.PI / 2, 0]);
  plane(ROOM_L, ROOM_H, paper, [ROOM_W / 2, ROOM_H / 2, midZ], [0, -Math.PI / 2, 0]);
  plane(ROOM_W, ROOM_H, paper, [0, ROOM_H / 2, -ROOM_L + 1.5], [0, 0, 0]);
  plane(ROOM_W, ROOM_H, paper, [0, ROOM_H / 2, 1.5], [0, Math.PI, 0]);
  // a strip of ceiling lights down the middle, so the room reads as a gallery
  const lampMat = new THREE.MeshBasicMaterial({ color: '#E2DED4' });
  for (let z = -1; z > -ROOM_L + 2; z -= 3) plane(0.5, 2, lampMat, [0, ROOM_H - 0.01, z], [Math.PI / 2, 0, 0]);
  // the floor line where wall meets floor
  const skirt = new THREE.MeshBasicMaterial({ color: '#121110' });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, ROOM_L), skirt);
    m.position.set(s * (ROOM_W / 2 - 0.01), 0.01, midZ); scene.add(m);
  }

  // text painted onto a wall (title on the far wall, a small label under each piece)
  function textPlane(lines, w, h, opts = {}) {
    const k = 256, c = document.createElement('canvas');
    c.width = w * k; c.height = h * k;
    const g = c.getContext('2d');
    g.fillStyle = '#EEEBE3'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#121110'; g.textBaseline = 'top';
    let y = 0;
    const pad = (opts.pad || 0) * k;
    for (const [txt, size, font] of lines) {
      let px = size * k;
      const set = () => { g.font = `${font || '700'} ${px}px "Helvetica Neue", Helvetica, Arial, sans-serif`; };
      set();
      while (px > 8 && g.measureText(txt).width > c.width - pad * 2) { px *= 0.92; set(); }   // shrink long titles to fit
      g.fillText(txt, pad, y * k);
      y += size * 1.35;
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  }
  const farWall = textPlane([[C.title, 0.62], [`${CHAINS[C.chain] || C.chain} · ${C.year} · ${C.pieces.length} pieces`, 0.18, '500 ']], 6, 1.4, { pad: 0.1 });
  farWall.position.set(0, 2.2, -ROOM_L + 1.52); scene.add(farWall);

  // ---------- hanging the work ----------
  const pieces = [];   // { p, mesh, video, side, z }
  const MAXW = 2.5, MAXH = 2.2;
  const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
  P.forEach((p, i) => {
    const side = i % 2 ? 1 : -1;
    const z = -(START + Math.floor(i / 2) * GAP);
    const x = side * (ROOM_W / 2 - 0.03);
    const group = new THREE.Group();
    group.position.set(x, 1.75, z);
    group.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.04), new THREE.MeshBasicMaterial({ color: '#121110' }));
    const art = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#e9e6de' }));
    art.position.z = 0.025;
    group.add(frame, art);
    const label = textPlane([[p[1] || `#${p[0]}`, 0.13], [`${i + 1} / ${P.length}`, 0.09, '500 ']], 2.4, 0.36);
    label.position.set(0, -1.45, 0.005);
    group.add(label);
    scene.add(group);
    const item = { p, art, frame, label, side, z, video: null, index: i };
    art.userData.item = frame.userData.item = item;
    pieces.push(item);

    const fit = (w, h) => {
      const s = Math.min(MAXW / w, MAXH / h);
      art.scale.set(w * s, h * s, 1);
      frame.scale.set(w * s + 0.08, h * s + 0.08, 1);
      label.position.y = -(h * s) / 2 - 0.3;
    };
    fit(1, 1);
    if (p[4]) {
      const v = document.createElement('video');
      Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'metadata', crossOrigin: 'anonymous' });
      v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
      v.src = media(p[4]);
      v.addEventListener('loadedmetadata', () => fit(v.videoWidth || 1, v.videoHeight || 1), { once: true });
      const t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace;
      art.material = new THREE.MeshBasicMaterial({ map: t });
      item.video = v;
    } else {
      loader.load(media(p[2]), (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        art.material = new THREE.MeshBasicMaterial({ map: t });
        fit(t.image.width || 1, t.image.height || 1);
      });
    }
  });

  // ---------- moving around ----------
  const look = { yaw: 0, pitch: 0, dYaw: 0, dPitch: 0 };
  // stand back just far enough that the piece and its label fit on this screen
  function stopFor(it) {
    const v = (camera.fov * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    const w = it.frame.scale.x / 2 + 0.3, h = it.frame.scale.y / 2 + 0.75;
    const dist = Math.min(ROOM_W - 0.8, Math.max(1.6, w / Math.tan(hf / 2), h / Math.tan(v / 2)));
    return { x: it.side * (ROOM_W / 2 - dist), z: it.z, yaw: it.side < 0 ? Math.PI / 2 : -Math.PI / 2 };
  }
  const ENTRANCE = { x: 0, z: 0.5, yaw: 0 };
  let at = -1, glide = null;
  camera.position.set(ENTRANCE.x, EYE, ENTRANCE.z);

  function go(i) {
    i = Math.max(-1, Math.min(pieces.length - 1, i));
    at = i;
    const to = i < 0 ? ENTRANCE : stopFor(pieces[i]);
    let dy = to.yaw - look.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    glide = { t0: performance.now(), dur: 1100, from: { x: camera.position.x, z: camera.position.z, yaw: look.yaw, dYaw: look.dYaw, dPitch: look.dPitch }, to: { ...to, yaw: look.yaw + dy } };
    showPiece();
    hint(false);
  }
  function showPiece() {
    if (at < 0) {
      $('pCount').textContent = `${P.length} pieces${C.pieces.length > P.length ? ` of ${C.pieces.length}` : ''}`;
      $('pTitle').textContent = C.title;
      $('collect').href = `work.html?c=${encodeURIComponent(C.id)}#buy`;
      $('collect').removeAttribute('target');
      return;
    }
    const p = pieces[at].p;
    $('pCount').textContent = `${at + 1} of ${P.length}`;
    $('pTitle').textContent = p[1] || `#${p[0]}`;
    $('collect').href = pieceUrl(C.chain, p[7] || C.contract, p[0]);
    $('collect').target = '_blank';
  }
  showPiece();
  $('next').addEventListener('click', () => go(at + 1));
  $('prev').addEventListener('click', () => go(at - 1));
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'd' || e.key === 'w') go(at + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'a' || e.key === 's') go(at - 1);
  });

  // drag to look; a tap (no real drag) walks to the piece under the finger
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
    look.dYaw += dx * 0.004;
    look.dPitch = Math.max(-0.6, Math.min(0.6, look.dPitch + dy * 0.003));
    hint(false);
  });
  canvas.addEventListener('pointerup', (e) => {
    if (drag && drag.moved < 8) {
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pieces.flatMap((it) => [it.art, it.frame]))[0];
      if (hit) go(hit.object.userData.item.index);
    }
    drag = null;
  });

  let hintTimer = setTimeout(() => hint(false), 6000);
  function hint(on) { if (!on) { $('hint').classList.add('gone'); clearTimeout(hintTimer); } }

  // ---------- frame loop ----------
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 72 : 58;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let frame = 0;
  renderer.setAnimationLoop((now) => {
    if (glide) {
      const t = Math.min(1, (now - glide.t0) / glide.dur), k = ease(t);
      camera.position.x = glide.from.x + (glide.to.x - glide.from.x) * k;
      camera.position.z = glide.from.z + (glide.to.z - glide.from.z) * k;
      look.yaw = glide.from.yaw + (glide.to.yaw - glide.from.yaw) * k;
      look.dYaw = glide.from.dYaw * (1 - k);
      look.dPitch = glide.from.dPitch * (1 - k);
      if (t >= 1) glide = null;
    }
    camera.position.y = EYE;
    camera.rotation.y = look.yaw + look.dYaw;
    camera.rotation.x = look.pitch + look.dPitch;
    // only the pieces near you play, so phones stay cool
    if (frame++ % 20 === 0) {
      for (const it of pieces) {
        if (!it.video) continue;
        const near = Math.abs(it.z - camera.position.z) < 9;
        if (near && it.video.paused) it.video.play().catch(() => {});
        if (!near && !it.video.paused) it.video.pause();
      }
    }
    renderer.render(scene, camera);
  });
  $('loading').hidden = true;
  document.addEventListener('visibilitychange', () => { if (document.hidden) pieces.forEach((it) => it.video?.pause()); });
}
