/* xNoleet | portafolio interactivo */
(function () {
  'use strict';

  /* ---------- Datos editables ----------
     Para usar una obra real, agrega  src: 'img/mi-obra.jpg'  a la pieza.
     Sin src, la pieza se genera en codigo con el lenguaje visual de xNoleet. */
  var PIEZAS = [
    { t: 'Estudio 01', s: 'Trama',      type: 'diagonal', seed: 11, d: 'Una banda diagonal verde atraviesa un campo de líneas finas. La trama decide qué se ve.' },
    { t: 'Estudio 02', s: 'Círculo',    type: 'circulo',  seed: 23, d: 'Un círculo sólido ancla la composición y una diagonal lo cruza sin tocar el borde.' },
    { t: 'Estudio 03', s: 'Estructura', type: 'torre',    seed: 37, d: 'Torre de celosía en negativo sobre un disco plano, con el microtexto técnico al pie.' },
    { t: 'Estudio 04', s: 'Tipografía', type: 'tipo',     seed: 41, d: 'Bloques recortados con relleno de líneas. Cuatro módulos que forman una palabra.' },
    { t: 'Estudio 05', s: 'Trama',      type: 'diagonal', seed: 58, d: 'Salpicaduras pequeñas sobre diagonales paralelas. El ruido controlado rompe la rejilla.' },
    { t: 'Estudio 06', s: 'Círculo',    type: 'circulo',  seed: 64, d: 'Dos círculos a distinta escala y una diagonal estructural que los une.' },
    { t: 'Estudio 07', s: 'Estructura', type: 'torre',    seed: 79, d: 'Estructura metálica con plataforma y antenas, recortada contra un círculo verde.' },
    { t: 'Estudio 08', s: 'Tipografía', type: 'tipo',     seed: 86, d: 'Módulos tipográficos con cruces x como marcas de corte.' }
  ];

  var DK = '#1f2326', G = '#39ff14', PI2 = Math.PI * 2;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Movimiento (control del usuario) ---------- */
  var motion = !reduceMQ.matches;
  try {
    var saved = localStorage.getItem('xn-motion');
    if (saved === '0') motion = false;
    if (saved === '1' && !reduceMQ.matches) motion = true;
  } catch (e) {}
  var motionBtn = $('#motion');
  function applyMotion() {
    document.documentElement.classList.toggle('no-motion', !motion);
    motionBtn.setAttribute('aria-pressed', String(motion));
    motionBtn.textContent = 'Movimiento: ' + (motion ? 'sí' : 'no');
    if (motion) startLoop(); else drawStatic();
  }
  motionBtn.addEventListener('click', function () {
    motion = !motion;
    try { localStorage.setItem('xn-motion', motion ? '1' : '0'); } catch (e) {}
    applyMotion();
  });
  // Con movimiento apagado los valores saltan directo al destino; con movimiento van suavizados.
  var dtS = 1; // escala de tiempo del cuadro (1 = 60 fps): el suavizado no depende de los fps
  function L(cur, tar, f) { return motion ? cur + (tar - cur) * (1 - Math.pow(1 - f, dtS)) : tar; }

  /* ---------- Lienzo de fondo ---------- */
  // Optimizaciones: capa de bandas en cache (solo se redibuja mientras mutan),
  // lienzo opaco, suavizado independiente de los fps, lotes de trazos,
  // calidad adaptable segun la fluidez y 30 fps cuando no hay interaccion.
  var cv = $('#bg'), cx = cv.getContext('2d', { alpha: false });
  var bl = document.createElement('canvas'), bx = bl.getContext('2d');
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var mouse = { x: 0, y: 0 }, disk = { x: 0, y: 0 }, ang = -35, ang0 = -35;
  var down = false, taps = 0, ripples = [], ripId = 0, looping = false;
  var sY = window.scrollY || 0, bandsDirty = true, lastInput = 0, lastT = 0, skip = false, ema = 16.7, slow = 0;
  function touch() { lastInput = performance.now(); }

  /* Campo de modulos + y x: tiras horizontales y verticales aleatorias */
  var CELL = 40, cols = 0, rows = 0, cells = {}, cellList = [], strips = [], hotList = [];
  function addStrip() {
    strips.push({
      h: Math.random() < 0.5, len: 3 + Math.floor(Math.random() * 8),
      c: Math.floor(Math.random() * cols), r: Math.floor(Math.random() * rows),
      t: Math.random() < 0.5 ? 0 : 1, alt: Math.random() < 0.3
    });
  }
  function syncCells() {
    var want = {}, k;
    strips.forEach(function (s) {
      for (var i = 0; i < s.len; i++) {
        var c = s.c + (s.h ? i : 0), r = s.r + (s.h ? 0 : i);
        if (c >= cols || r >= rows) break;
        want[c + ',' + r] = { c: c, r: r, t: s.alt ? (s.t + i) % 2 : s.t };
      }
    });
    for (k in cells) if (!want[k]) cells[k].ta = 0;
    for (k in want) {
      if (cells[k]) cells[k].ta = 1;
      else {
        var g = { k: k, c: want[k].c, r: want[k].r, t: want[k].t, rot: want[k].t * Math.PI / 4, sc: 1, a: 0, ta: 1, rid: 0 };
        cells[k] = g; cellList.push(g);
      }
    }
  }
  function buildGlyphs() {
    CELL = Math.max(34, Math.min(48, Math.round(W / 30)));
    cols = Math.ceil(W / CELL) + 1; rows = Math.ceil(H / CELL) + 2;
    strips = []; cells = {}; cellList = [];
    var n = Math.round(cols * rows / 22);
    for (var i = 0; i < n; i++) addStrip();
    syncCells();
  }
  function reshuffle() {
    var n = Math.max(3, Math.round(strips.length / 6)), i;
    for (i = 0; i < n && strips.length; i++) strips.splice(Math.floor(Math.random() * strips.length), 1);
    for (i = 0; i < n; i++) addStrip();
    syncCells();
  }
  function drawGlyphs(t) {
    var gy = (sY * 0.18) % CELL, i, g, w = 0, nrip = ripples.length, hl = 0;
    cx.lineWidth = 1.8; cx.strokeStyle = DK; cx.globalAlpha = 0.2; cx.beginPath();
    for (i = 0; i < cellList.length; i++) {
      g = cellList[i];
      g.a = L(g.a, g.ta, 0.08);
      if (g.ta === 0 && g.a < 0.02) { delete cells[g.k]; continue; }
      cellList[w++] = g;
      var x = g.c * CELL + CELL / 2, y = g.r * CELL + CELL / 2 - gy - CELL;
      if (y < -CELL || y > H + CELL) continue;
      var dx = x - disk.x, dy = y - disk.y, d2 = dx * dx + dy * dy, near = d2 < 25600 ? 1 - Math.sqrt(d2) / 160 : 0;
      for (var j = 0; j < nrip; j++) {
        var rp = ripples[j], rx = x - rp.x, ry = y - rp.y, rd = Math.sqrt(rx * rx + ry * ry), rr = 10 + (t - rp.t) / 1000 * 260;
        if (g.rid !== rp.id && Math.abs(rd - rr) < 26) { g.t = 1 - g.t; g.rid = rp.id; }
      }
      g.rot = L(g.rot, (near > 0.45 ? 1 - g.t : g.t) * Math.PI / 4, 0.14);
      g.sc = L(g.sc, 1 + near * 0.9, 0.14);
      g.x = x; g.y = y; g.near = near;
      if (near < 0.02 && g.a > 0.97) { // la mayoria: un solo trazo por lote
        var s = CELL * 0.2 * g.sc, c = Math.cos(g.rot) * s, sn = Math.sin(g.rot) * s;
        cx.moveTo(x - c, y - sn); cx.lineTo(x + c, y + sn);
        cx.moveTo(x + sn, y - c); cx.lineTo(x - sn, y + c);
      } else hotList[hl++] = g;
    }
    cellList.length = w;
    cx.stroke();
    for (i = 0; i < hl; i++) {
      g = hotList[i];
      var s2 = CELL * 0.2 * g.sc, c2 = Math.cos(g.rot) * s2, sn2 = Math.sin(g.rot) * s2;
      if (g.near > 0.3) {
        cx.globalAlpha = g.near * g.a; cx.fillStyle = G;
        cx.beginPath(); cx.arc(g.x, g.y, s2 * 1.7, 0, PI2); cx.fill();
      }
      cx.globalAlpha = (0.2 + 0.7 * g.near) * g.a;
      cx.beginPath();
      cx.moveTo(g.x - c2, g.y - sn2); cx.lineTo(g.x + c2, g.y + sn2);
      cx.moveTo(g.x + sn2, g.y - c2); cx.lineTo(g.x - sn2, g.y + c2);
      cx.stroke();
    }
    cx.globalAlpha = 1;
  }

  /* Bandas diagonales texturizadas que mutan al tocar (capa en cache) */
  var BASE = [
    { a: -36, o: -40, w: 190, c: 70, s: 8, h: 18, ph: 0.6 },
    { a: -44, o: 270, w: 120, c: -50, s: 7, h: 62, ph: 2 },
    { a: -28, o: -310, w: 80, c: 30, s: 12, h: -30, ph: 4 }
  ];
  var bands = BASE.map(function (b) { return { cur: Object.assign({}, b), tar: Object.assign({}, b) }; });
  var WRANGE = [[110, 260], [70, 170], [40, 110]];
  function randBand(i) {
    var a = rnd(-62, -14), side = Math.random() < 0.5 ? 1 : -1;
    return {
      a: a, o: rnd(-0.5, 0.5) * Math.min(W, H) * (i === 0 ? 0.7 : 1.15), w: rnd(WRANGE[i][0], WRANGE[i][1]),
      c: rnd(-200, 200), s: rnd(i === 1 ? 7 : 6, 15), h: a + side * rnd(15, 80), ph: rnd(0, 6.28)
    };
  }
  function morph() { bands.forEach(function (b, i) { b.tar = randBand(i); }); }
  function stepBands() {
    var maxd = 0;
    bands.forEach(function (b) {
      for (var k in b.tar) {
        var nv = L(b.cur[k], b.tar[k], 0.045), dd = Math.abs(nv - b.cur[k]);
        if (dd > maxd) maxd = dd;
        b.cur[k] = nv;
      }
    });
    if (maxd > 0.002) bandsDirty = true; // solo se redibuja la capa mientras hay cambio
  }
  function drawBand(b, idx) {
    var p = b.cur, a = p.a * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    var mx = W / 2 + nx * p.o, my = H / 2 + ny * p.o, len = Math.sqrt(W * W + H * H) * 1.15, N = 26, i;
    var left = [], right = [], path = new Path2D();
    for (i = 0; i <= N; i++) {
      var s = i / N, t = (s - 0.5) * len, off = p.c * Math.sin(s * Math.PI * 1.4 + p.ph);
      var hw = p.w / 2 * (1 + 0.45 * Math.sin(s * Math.PI * 2 + p.ph * 0.7));
      var qx = mx + dx * t + nx * off, qy = my + dy * t + ny * off;
      left.push([qx + nx * hw, qy + ny * hw]); right.push([qx - nx * hw, qy - ny * hw]);
    }
    path.moveTo(left[0][0], left[0][1]);
    for (i = 1; i <= N; i++) path.lineTo(left[i][0], left[i][1]);
    for (i = N; i >= 0; i--) path.lineTo(right[i][0], right[i][1]);
    path.closePath();

    // la trama se dibuja solo dentro de la caja orientada de la banda
    var ha = p.h * Math.PI / 180, hx = Math.cos(ha), hy = Math.sin(ha), gx = -hy, gy = hx;
    var kmin = 1e9, kmax = -1e9, tmin = 1e9, tmax = -1e9, pts = left.concat(right);
    for (i = 0; i < pts.length; i++) {
      var ux = pts[i][0] - W / 2, uy = pts[i][1] - H / 2, kk = ux * gx + uy * gy, tt = ux * hx + uy * hy;
      if (kk < kmin) kmin = kk; if (kk > kmax) kmax = kk;
      if (tt < tmin) tmin = tt; if (tt > tmax) tmax = tt;
    }
    bx.save(); bx.clip(path);
    bx.beginPath();
    for (var k = Math.floor(kmin / p.s); k <= Math.ceil(kmax / p.s); k++) {
      var ox = W / 2 + gx * k * p.s, oy = H / 2 + gy * k * p.s;
      bx.moveTo(ox + hx * (tmin - 4), oy + hy * (tmin - 4)); bx.lineTo(ox + hx * (tmax + 4), oy + hy * (tmax + 4));
    }
    if (idx === 0) { bx.strokeStyle = 'rgba(57,255,20,.8)'; bx.lineWidth = 1.8; }
    else if (idx === 1) { bx.strokeStyle = 'rgba(31,35,38,.42)'; bx.lineWidth = 1; }
    else { bx.strokeStyle = 'rgba(31,35,38,.3)'; bx.lineWidth = 0.8; }
    bx.stroke(); bx.restore();
    bx.strokeStyle = 'rgba(31,35,38,' + (idx === 0 ? 0.85 : 0.35) + ')'; bx.lineWidth = idx === 0 ? 1.4 : 1;
    bx.stroke(path);
  }
  function renderBands() {
    bx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bx.clearRect(0, 0, W, H);
    bands.forEach(function (b, i) { drawBand(b, i); });
  }

  /* Formas geometricas flotantes: repelen el cursor y saltan al tocar */
  var shapes = [
    { k: 'tri', u: 0.1, v: 0.34, r: 34 }, { k: 'ring', u: 0.9, v: 0.72, r: 30 },
    { k: 'semi', u: 0.52, v: 0.9, r: 44 }, { k: 'sq', u: 0.3, v: 0.62, r: 20 },
    { k: 'dot', u: 0.62, v: 0.18, r: 10 }, { k: 'tri0', u: 0.84, v: 0.16, r: 28 },
    { k: 'ring', u: 0.18, v: 0.82, r: 14 }
  ];
  shapes.forEach(function (s, i) { s.x = s.y = 0; s.rot = rnd(0, 6.28); s.vr0 = (i % 2 ? 1 : -1) * 0.004; s.vr = s.vr0; s.init = false; });
  function placeShapes() { shapes.forEach(function (s) { s.init = false; }); }
  function jumpShapes() {
    shapes.forEach(function (s) { s.u = rnd(0.06, 0.94); s.v = rnd(0.1, 0.9); s.vr += rnd(-0.14, 0.14); });
  }
  function stepShapes() {
    shapes.forEach(function (s, i) {
      var dep = 0.06 + i * 0.024, px = s.u * W - (disk.x - W / 2) * dep, py = s.v * H - (disk.y - H / 2) * dep;
      var dx = px - disk.x, dy = py - disk.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < 180) { var f = (1 - d / 180) * 90; px += dx / d * f; py += dy / d * f; }
      if (!s.init) { s.x = px; s.y = py; s.init = true; }
      s.x = L(s.x, px, 0.09); s.y = L(s.y, py, 0.09);
      if (motion) { s.vr = L(s.vr, s.vr0, 0.04); s.rot += s.vr * dtS; }
    });
  }
  function drawShapes(m) {
    cx.globalAlpha = m; cx.lineWidth = 1.8; cx.strokeStyle = DK;
    shapes.forEach(function (s) {
      cx.save(); cx.translate(s.x, s.y); cx.rotate(s.rot);
      cx.fillStyle = DK;
      var r = s.r;
      if (s.k === 'tri' || s.k === 'tri0') {
        cx.beginPath(); cx.moveTo(0, -r); cx.lineTo(r * 0.9, r * 0.7); cx.lineTo(-r * 0.9, r * 0.7); cx.closePath();
        if (s.k === 'tri') { cx.fillStyle = G; cx.fill(); }
        cx.stroke();
      } else if (s.k === 'ring') {
        cx.beginPath(); cx.arc(0, 0, r, 0, PI2); cx.stroke();
        cx.beginPath(); cx.arc(r, 0, 3.5, 0, PI2); cx.fill();
      } else if (s.k === 'semi') {
        cx.beginPath(); cx.arc(0, 0, r, 0, Math.PI); cx.closePath(); cx.fill();
      } else if (s.k === 'sq') {
        cx.strokeRect(-r, -r, r * 2, r * 2);
        cx.beginPath(); cx.moveTo(-r, 0); cx.lineTo(r, 0); cx.moveTo(0, -r); cx.lineTo(0, r); cx.stroke();
      } else {
        cx.beginPath(); cx.arc(0, 0, r, 0, PI2); cx.fill();
      }
      cx.restore();
    });
    cx.globalAlpha = 1;
  }

  /* Tamano y calidad */
  function applyDPR() {
    cv.width = bl.width = Math.round(W * DPR); cv.height = bl.height = Math.round(H * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bandsDirty = true;
  }
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    applyDPR();
    if (!mouse.x) { mouse.x = disk.x = W * 0.72; mouse.y = disk.y = H * 0.4; }
    buildGlyphs(); placeShapes();
    if (!motion) drawStatic();
  }

  /* Dibujo principal */
  function draw(t) {
    if (bandsDirty) { renderBands(); bandsDirty = false; }
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H);
    var hero = Math.max(0.3, 1 - sY / (H * 0.9)), m = 0.45 + 0.55 * hero;
    var sp = 26, off = (sY * 0.15) % sp, x0, base = -H - sp + off;

    // trama base y lineas que se encienden cerca del cursor
    cx.lineWidth = 1; cx.strokeStyle = 'rgba(31,35,38,.07)'; cx.beginPath();
    for (x0 = base; x0 < W; x0 += sp) { cx.moveTo(x0, H); cx.lineTo(x0 + H, 0); }
    cx.stroke();
    var c0 = disk.x + disk.y - H, lo = c0 - 190 * 1.4142, hi = c0 + 190 * 1.4142;
    cx.strokeStyle = G;
    for (x0 = base + Math.max(0, Math.ceil((lo - base) / sp)) * sp; x0 <= hi && x0 < W; x0 += sp) {
      var k = 1 - Math.abs((disk.x - x0) + (disk.y - H)) / 1.4142 / 190;
      if (k > 0) {
        cx.globalAlpha = k * 0.95; cx.lineWidth = 1 + k * 2.2;
        cx.beginPath(); cx.moveTo(x0, H); cx.lineTo(x0 + H, 0); cx.stroke();
      }
    }
    cx.globalAlpha = 1;

    drawGlyphs(t);

    cx.globalAlpha = m; cx.drawImage(bl, 0, 0, W, H); cx.globalAlpha = 1; // capa de bandas en cache

    // circulo grande de contorno con paralaje
    var R = Math.min(W, H) * 0.34;
    cx.lineWidth = 1; cx.strokeStyle = 'rgba(31,35,38,' + (0.22 * hero + 0.06) + ')';
    cx.beginPath(); cx.arc(W * 0.76 - (disk.x - W / 2) * 0.05, H * 0.42 - (disk.y - H / 2) * 0.05 - sY * 0.12, R, 0, PI2); cx.stroke();

    drawShapes(Math.max(0.55, hero));

    // diagonal estructural que sigue al cursor
    var a = ang * Math.PI / 180, len = Math.max(W, H) * 1.6;
    cx.strokeStyle = 'rgba(31,35,38,' + (0.5 * hero + 0.12) + ')'; cx.lineWidth = 1;
    cx.beginPath();
    cx.moveTo(disk.x - Math.cos(a) * len, disk.y - Math.sin(a) * len);
    cx.lineTo(disk.x + Math.cos(a) * len, disk.y + Math.sin(a) * len);
    cx.stroke();

    // disco verde y anillo
    var pulse = motion ? Math.sin(t / 520) * 4 : 0;
    cx.fillStyle = G; cx.strokeStyle = DK; cx.lineWidth = 1.6;
    cx.beginPath(); cx.arc(disk.x, disk.y, 15, 0, PI2); cx.fill(); cx.stroke();
    cx.lineWidth = 1; cx.strokeStyle = 'rgba(31,35,38,.55)';
    cx.beginPath(); cx.arc(disk.x, disk.y, 30 + pulse, 0, PI2); cx.stroke();

    // ondas por clic
    for (var i = ripples.length - 1; i >= 0; i--) {
      var rp = ripples[i], age = (t - rp.t) / 1000;
      if (age > 1.1) { ripples.splice(i, 1); continue; }
      cx.strokeStyle = 'rgba(31,35,38,' + (1 - age / 1.1).toFixed(3) + ')'; cx.lineWidth = 1.6;
      cx.beginPath(); cx.arc(rp.x, rp.y, 10 + age * 260, 0, PI2); cx.stroke();
      cx.strokeStyle = 'rgba(57,255,20,' + (1 - age / 1.1).toFixed(3) + ')'; cx.lineWidth = 4;
      cx.beginPath(); cx.arc(rp.x, rp.y, 6 + age * 260, 0, PI2); cx.stroke();
    }
  }

  function step() {
    disk.x = L(disk.x, mouse.x, 0.09); disk.y = L(disk.y, mouse.y, 0.09);
    ang = L(ang, ang0 + (mouse.x / W - 0.5) * 18 + (mouse.y / H - 0.5) * 10, 0.06);
    stepBands(); stepShapes();
  }
  function frame(t) {
    if (!motion || document.hidden) { looping = false; return; }
    var idle = t - lastInput > 3000;
    if (idle) { skip = !skip; if (skip) { requestAnimationFrame(frame); return; } } // 30 fps en reposo
    var dt = lastT ? Math.min(t - lastT, 50) : 16.7;
    lastT = t; dtS = dt / 16.667;
    if (!idle) { // calidad adaptable: si cuesta mucho, baja la resolucion del lienzo
      ema += (dt - ema) * 0.05;
      if (ema > 24 && DPR > 1) { if (++slow > 90) { DPR = Math.max(1, DPR - 0.25); applyDPR(); slow = 0; ema = 16.7; } }
      else slow = 0;
    }
    step(); draw(t);
    requestAnimationFrame(frame);
  }
  function startLoop() { if (!looping) { looping = true; lastT = 0; requestAnimationFrame(frame); } }
  function drawStatic() { dtS = 1; step(); draw(performance.now()); }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && motion) startLoop(); });

  var rx = $('#rx'), ry = $('#ry'), ra = $('#ra'), ticking = false;
  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; touch();
    if (down) { // arrastrar deforma la banda verde
      bands[0].tar.c = (mouse.y / H - 0.5) * 520;
      bands[0].tar.a = -62 + (mouse.x / W) * 48;
      bands[1].tar.o = (mouse.x / W - 0.5) * W * 0.9;
    }
    if (!motion) drawStatic();
    if (!ticking && sY < H) {
      ticking = true;
      requestAnimationFrame(function () {
        rx.textContent = String(Math.round(mouse.x)).padStart(4, '0');
        ry.textContent = String(Math.round(mouse.y)).padStart(4, '0');
        ra.textContent = Math.round(ang) + '°';
        ticking = false;
      });
    }
  }, { passive: true });
  window.addEventListener('pointerdown', function (e) {
    if (e.target.closest('dialog')) return;
    down = true; taps++; touch();
    mouse.x = e.clientX; mouse.y = e.clientY;
    morph(); reshuffle(); jumpShapes();
    if (!e.target.closest('a,button,.card,.mod')) ripples.push({ x: e.clientX, y: e.clientY, t: performance.now(), id: ++ripId });
    if (!motion) drawStatic();
  }, { passive: true });
  function up() { down = false; }
  window.addEventListener('pointerup', up, { passive: true });
  window.addEventListener('pointercancel', up, { passive: true });
  window.addEventListener('resize', function () { touch(); resize(); clearTimeout(resize.t); resize.t = setTimeout(buildMods, 150); });
  window.addEventListener('scroll', function () { sY = window.scrollY; touch(); if (!motion) drawStatic(); }, { passive: true });

  /* ---------- Tiras de modulos + y x en el contenido ---------- */
  function buildMods() {
    $$('.mods').forEach(function (box) {
      var vertical = box.classList.contains('v'), size = window.innerWidth <= 520 ? 28 : 32;
      var n = vertical ? 14 : Math.max(6, Math.floor(box.clientWidth / size)), mods = [], t = Math.random() < 0.5 ? 1 : 0, run = 0, i;
      box.innerHTML = '';
      for (i = 0; i < n; i++) {
        if (run <= 0) { t = 1 - t; run = 2 + Math.floor(Math.random() * 5); }
        run--;
        var el = document.createElement('span');
        el.className = 'mod' + (t ? ' x' : '');
        mods.push(el); box.appendChild(el);
      }
      function flip(el) {
        el.classList.toggle('x'); el.classList.add('hot');
        setTimeout(function () { el.classList.remove('hot'); }, 650);
      }
      mods.forEach(function (el, idx) {
        function wave() {
          for (var d = 0; d <= 3; d++) {
            (function (dd) {
              setTimeout(function () {
                if (mods[idx - dd]) flip(mods[idx - dd]);
                if (dd && mods[idx + dd]) flip(mods[idx + dd]);
              }, motion ? dd * 70 : 0);
            })(d);
          }
        }
        el.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') wave(); });
        el.addEventListener('pointerdown', wave);
      });
    });
  }

  /* ---------- Palabra xNoleet: bloques tipograficos ---------- */
  var word = $('#word');
  var LET = ['x', 'N', 'O', 'L', 'E', 'E', 'T', '×'];
  var GLYPHS = 'XNOLET41/+#<>';
  var tiles = LET.map(function (ch) {
    var el = document.createElement('div');
    el.className = 'tile' + (ch === '×' ? ' deco' : '');
    el.innerHTML = '<span>' + ch + '</span>';
    el.dataset.ch = ch;
    word.appendChild(el);
    return el;
  });
  function scramble(el) {
    if (!motion || el.busy) return;
    el.busy = true; el.classList.add('hot');
    var span = el.firstChild, n = 0, real = el.dataset.ch;
    var iv = setInterval(function () {
      n++;
      if (n > 7) { clearInterval(iv); span.textContent = real; el.busy = false; el.classList.remove('hot'); return; }
      span.textContent = GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
    }, 55);
  }
  function scatter(then) {
    tiles.forEach(function (el) {
      el.style.transition = 'none';
      el.style.transform = 'translate(' + rnd(-210, 210) + 'px,' + rnd(-160, 160) + 'px) rotate(' + rnd(-35, 35) + 'deg) scale(.6)';
      el.classList.add('away');
    });
    void word.offsetWidth;
    tiles.forEach(function (el, i) {
      setTimeout(function () {
        el.style.transition = ''; el.style.transform = ''; el.classList.remove('away');
        if (then) scramble(el);
      }, 60 + i * 70);
    });
  }
  tiles.forEach(function (el) {
    el.addEventListener('pointerenter', function () { scramble(el); });
    el.addEventListener('click', function () { if (motion) scatter(true); });
  });
  if (motion) scatter(false);
  setInterval(function () {
    if (!motion || document.hidden) return;
    scramble(tiles[Math.floor(Math.random() * tiles.length)]);
  }, 3500);

  /* ---------- Generador de piezas (SVG) ---------- */
  function rng(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var uid = 0;
  function tower(bx, top, wb, wt, rr, ink) {
    var s = '', h = 420 - top, n = 7, i;
    s += '<path d="M' + (bx - wb) + ' 420L' + (bx - wt) + ' ' + top + 'M' + (bx + wb) + ' 420L' + (bx + wt) + ' ' + top + '" stroke="' + ink + '" stroke-width="3" fill="none"/>';
    for (i = 0; i < n; i++) {
      var y1 = 420 - h * i / n, y2 = 420 - h * (i + 1) / n;
      var w1 = wb + (wt - wb) * i / n, w2 = wb + (wt - wb) * (i + 1) / n;
      s += '<path d="M' + (bx - w1) + ' ' + y1 + 'L' + (bx + w2) + ' ' + y2 + 'M' + (bx + w1) + ' ' + y1 + 'L' + (bx - w2) + ' ' + y2 +
           'M' + (bx - w2) + ' ' + y2 + 'H' + (bx + w2) + '" stroke="' + ink + '" stroke-width="1.4" fill="none"/>';
    }
    s += '<ellipse cx="' + bx + '" cy="' + (top + 26) + '" rx="' + (wt + 20) + '" ry="7" fill="none" stroke="' + ink + '" stroke-width="2"/>';
    var d = rr() > 0.5 ? 1 : -1;
    s += '<path d="M' + bx + ' ' + (top + 4) + 'l' + (d * 36) + ' -26 v30z M' + bx + ' ' + (top + 4) + 'l' + (-d * 22) + ' -18 v22z" fill="' + ink + '"/>';
    return s;
  }
  function gen(type, seed) {
    var r = rng(seed), id = 'p' + (++uid), inv = r() > 0.66, s = '', i;
    var bg = inv ? DK : (r() > 0.5 ? '#f3f5f4' : '#e6eae8'), INK = inv ? '#f3f6f4' : DK;
    s += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">';
    s += '<defs><pattern id="' + id + '" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="' + INK + '" stroke-width="1.6"/></pattern></defs>';
    s += '<rect width="400" height="400" fill="' + bg + '"/>';
    var cx0 = 110 + r() * 180, cy0 = 120 + r() * 160, R = 60 + r() * 70, green = r() > 0.4;
    if (type === 'circulo') {
      s += '<circle cx="' + cx0 + '" cy="' + cy0 + '" r="' + R + '" fill="' + (green ? G : INK) + '"/>';
      s += '<circle cx="' + (400 - cx0) + '" cy="' + (400 - cy0) + '" r="' + (R * 0.45) + '" fill="none" stroke="' + (green ? INK : G) + '" stroke-width="2.4"/>';
      s += '<path d="M-20 ' + (330 + r() * 40) + 'L420 ' + (40 + r() * 60) + '" stroke="' + INK + '" stroke-width="1.5"/>';
      s += '<path d="M' + (300 + r() * 60) + ' ' + (300 + r() * 40) + 'l24 24h-24z" fill="' + G + '"/>';
    } else if (type === 'torre') {
      s += '<circle cx="' + cx0 + '" cy="' + (cy0 + 20) + '" r="' + (R + 10) + '" fill="' + G + '"/>';
      s += tower(140 + r() * 120, 50 + r() * 70, 74, 18, r, inv ? '#f3f6f4' : DK);
      s += '<path d="M-20 ' + (380 - r() * 40) + 'L420 ' + (120 + r() * 60) + '" stroke="' + INK + '" stroke-width="1.2" opacity=".7"/>';
    } else if (type === 'tipo') {
      var words = ['NO', 'ER', '41', 'XN', 'LT', 'EX'], w = words[Math.floor(r() * words.length)], k = 0;
      for (var row = 0; row < 2; row++) for (var col = 0; col < 2; col++) {
        var x = 70 + col * 138 + (row ? 14 : 0), y = 70 + row * 138, hot = k % 3 === 0 && green;
        s += '<g transform="translate(' + x + ' ' + y + ')"><path d="M26 0H126V100L100 126H0V26Z" fill="url(#' + id + ')" stroke="' + INK + '" stroke-width="1.5"/>' +
             '<text x="63" y="92" text-anchor="middle" font-family="Syne,sans-serif" font-weight="800" font-size="86" fill="' + (hot ? G : bg) + '" stroke="' + INK + '" stroke-width="' + (hot ? 2 : 1.4) + '">' + (row ? (col ? w.charAt(0) : w.charAt(1)) : w.charAt(col)) + '</text></g>';
        k++;
      }
      s += '<path d="M-20 ' + (360 - r() * 60) + 'L420 ' + (60 + r() * 60) + '" stroke="' + INK + '" stroke-width="2"/>';
      s += '<circle cx="' + (330 + r() * 40) + '" cy="' + (50 + r() * 30) + '" r="16" fill="' + G + '"/>';
      s += '<text x="372" y="392" text-anchor="end" font-family="Space Mono,monospace" font-size="11" fill="' + INK + '" opacity=".7">x x x</text>';
    } else {
      for (i = -4; i < 34; i++) s += '<path d="M' + (i * 14) + ' 420L' + (i * 14 + 420) + ' 0" stroke="' + INK + '" stroke-width="1" opacity=".3"/>';
      var bandX = 80 + r() * 160;
      s += '<path d="M' + bandX + ' 420L' + (bandX + 420) + ' 0" stroke="' + G + '" stroke-width="' + (22 + r() * 26) + '"/>';
      s += '<circle cx="' + cx0 + '" cy="' + cy0 + '" r="' + (R * 0.7) + '" fill="none" stroke="' + INK + '" stroke-width="1.8"/>';
      for (i = 0; i < 16; i++) s += '<circle cx="' + (r() * 400) + '" cy="' + (r() * 400) + '" r="' + (1.5 + r() * 5) + '" fill="' + (r() > 0.5 ? G : INK) + '"/>';
    }
    s += '<text x="14" y="388" font-family="Space Mono,monospace" font-size="11" fill="' + INK + '" opacity=".75">' + String(seed).padStart(3, '0') + ' / x41</text>';
    return s + '</svg>';
  }

  /* ---------- Galeria ---------- */
  var grid = $('#grid'), filtersEl = $('#filters'), statusEl = $('#status');
  var vary = {}, current = 'Todas';
  var series = ['Todas'].concat(PIEZAS.reduce(function (a, p) { if (a.indexOf(p.s) < 0) a.push(p.s); return a; }, []));

  function artHTML(p, i) {
    if (p.src) return '<img src="' + p.src + '" alt="' + p.t + ', serie ' + p.s + '" loading="lazy">';
    return gen(p.type, p.seed + (vary[i] || 0) * 7);
  }
  function revealOn(el) {
    el.addEventListener('pointermove', function (e) {
      var b = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - b.left) + 'px');
      el.style.setProperty('--my', (e.clientY - b.top) + 'px');
    });
    el.addEventListener('pointerleave', function () {
      el.style.setProperty('--mx', '-300px'); el.style.setProperty('--my', '-300px');
    });
  }

  PIEZAS.forEach(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'card rv'; b.dataset.i = i; b.dataset.s = p.s;
    b.setAttribute('aria-label', 'Ver ' + p.t + ', serie ' + p.s + ' en grande');
    b.innerHTML = '<div class="art">' + artHTML(p, i) + '</div><div class="meta"><strong>' + p.t + '</strong><span class="micro">' + p.s + '</span></div>';
    revealOn($('.art', b));
    b.addEventListener('click', function () { openViewer(i); });
    grid.appendChild(b);
  });
  var cards = $$('.card', grid);

  function applyFilter() {
    var n = 0;
    cards.forEach(function (c) {
      var show = current === 'Todas' || c.dataset.s === current;
      c.hidden = !show; if (show) n++;
    });
    statusEl.innerHTML = 'Mostrando <b>' + n + '</b> de ' + PIEZAS.length + ' piezas' + (current === 'Todas' ? '' : ' / Serie ' + current);
    $$('.chip', filtersEl).forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.s === current)); });
  }
  series.forEach(function (s) {
    var c = document.createElement('button');
    c.type = 'button'; c.className = 'chip'; c.textContent = s; c.dataset.s = s;
    c.addEventListener('click', function () { current = s; applyFilter(); });
    filtersEl.appendChild(c);
  });
  applyFilter();

  /* ---------- Visor ---------- */
  var dlg = $('#viewer'), vArt = $('#v-art'), idx = 0;
  var vHatch = $('#v-hatch'), vVary = $('#v-vary');
  function visible() { return cards.filter(function (c) { return !c.hidden; }).map(function (c) { return +c.dataset.i; }); }
  function render() {
    var list = visible(), p = PIEZAS[idx], pos = list.indexOf(idx) + 1;
    vArt.innerHTML = artHTML(p, idx);
    vArt.classList.remove('open');
    vHatch.setAttribute('aria-pressed', 'false'); vHatch.textContent = 'Trama: puesta';
    vVary.disabled = !!p.src;
    $('#v-title').textContent = p.t;
    $('#v-series').textContent = 'Serie ' + p.s;
    $('#v-desc').textContent = p.d;
    $('#v-count').textContent = String(pos).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
  }
  function stepViewer(dir) {
    var list = visible(), pos = list.indexOf(idx);
    idx = list[(pos + dir + list.length) % list.length];
    render();
  }
  function openViewer(i) { idx = i; render(); if (!dlg.open) dlg.showModal(); }
  revealOn(vArt);
  $('#v-close').addEventListener('click', function () { dlg.close(); });
  $('#v-prev').addEventListener('click', function () { stepViewer(-1); });
  $('#v-next').addEventListener('click', function () { stepViewer(1); });
  vHatch.addEventListener('click', function () {
    var on = vArt.classList.toggle('open');
    vHatch.setAttribute('aria-pressed', String(on));
    vHatch.textContent = 'Trama: ' + (on ? 'abierta' : 'puesta');
  });
  vVary.addEventListener('click', function () {
    vary[idx] = (vary[idx] || 0) + 1;
    var on = vArt.classList.contains('open');
    vArt.innerHTML = artHTML(PIEZAS[idx], idx);
    $('.art', cards[idx]).innerHTML = artHTML(PIEZAS[idx], idx);
    vArt.classList.toggle('open', on);
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  var tx = 0;
  dlg.addEventListener('touchstart', function (e) { tx = e.changedTouches[0].clientX; }, { passive: true });
  dlg.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 60) stepViewer(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('keydown', function (e) {
    if (!dlg.open) return;
    if (e.key === 'ArrowRight') stepViewer(1);
    else if (e.key === 'ArrowLeft') stepViewer(-1);
    else if (e.key === 't' || e.key === 'T') vHatch.click();
  });

  /* ---------- Navegacion: seccion activa, progreso y aparicion ---------- */
  var links = $$('nav a'), prog = $('#progress');
  var secObs = new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      if (en.isIntersecting) {
        links.forEach(function (a) { a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id)); });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  $$('main section').forEach(function (s) { secObs.observe(s); });
  window.addEventListener('scroll', function () {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
  }, { passive: true });
  var rvObs = new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); rvObs.unobserve(en.target); } });
  }, { threshold: 0.12 });
  $$('.rv').forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + 'ms'; rvObs.observe(el); });

  $('#year').textContent = new Date().getFullYear();
  resize();
  buildMods();
  applyMotion();
})();
