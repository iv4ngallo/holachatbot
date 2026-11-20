/* Iván Gallo | lienzo de fondo del sistema xNoleet System Design
   Trama base con líneas que se encienden y engordan cerca del cursor, campo de módulos + y x,
   tres bandas con trama, círculo de contorno, formas flotantes, diagonal estructural y disco-cursor.
   Colores: tinta, azul de identidad y papel de la variante Iván Gallo (se leen de las variables CSS). */
(function () {
  'use strict';
  var PI2 = Math.PI * 2;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var motion = !reduceMQ.matches;
  var VEIL = 0.8; // 0 = sin atenuar, 1 = fondo invisible. Medio = 0.5, Alto = 0.8
  var DK = '#1e2838', G = '#0037b3', PAPER = '#f5f7fb', RI = 'rgba(30,40,56,', RA = 'rgba(0,55,179,';
  function rgb(hex) { hex = (hex || '').trim().replace('#', ''); if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1'); var n = parseInt(hex, 16); return isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function colors() {
    var cs = getComputedStyle(document.documentElement), i = rgb(cs.getPropertyValue('--ink')), a = rgb(cs.getPropertyValue('--brand')), p = cs.getPropertyValue('--paper').trim();
    if (i) { DK = '#' + i.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); RI = 'rgba(' + i.join(',') + ','; }
    if (a) { G = '#' + a.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); RA = 'rgba(' + a.join(',') + ','; }
    if (p) PAPER = p;
  }
  colors();
  if (window.matchMedia) { var dm = window.matchMedia('(prefers-color-scheme: dark)'); if (dm.addEventListener) dm.addEventListener('change', function () { colors(); bandsDirty = true; if (!motion) drawStatic(); }); }
  function applyMotion() { document.documentElement.classList.toggle('no-motion', !motion); }
  function L(cur, tar, f) { return motion ? cur + (tar - cur) * (1 - Math.pow(1 - f, dtS)) : tar; }
  var dtS = 1;
  reduceMQ.addEventListener && reduceMQ.addEventListener('change', function () { motion = !reduceMQ.matches; applyMotion(); if (motion) startLoop(); else drawStatic(); });
  /* ---------- Lienzo de fondo ---------- */
  // Optimizaciones: capa de bandas en cache (solo se redibuja mientras mutan),
  // lienzo opaco, suavizado independiente de los fps, lotes de trazos,
  // calidad adaptable segun la fluidez y 30 fps cuando no hay interaccion.
  var cv = document.createElement('canvas'); cv.id = 'fondo'; cv.setAttribute('aria-hidden', 'true'); document.body.insertBefore(cv, document.body.firstChild);
  var cx = cv.getContext('2d', { alpha: false });
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
  // Deriva hacia arriba en loop: la capa en cache es mas alta que la pantalla (margen BM) y solo se
  // desplaza; se redibuja cuando se agota el margen o cuando una banda sale y reaparece por abajo.
  var DRIFT = 26, BM = 260, driftY = 0, driftY0 = 0, wrapOff = [0, 0, 0];
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
  function drawBand(b, idx, yo) {
    var p = b.cur, a = p.a * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    var po = p.o + yo * dx; // la banda sube en perpendicular; la parte a lo largo desliza la onda
    var mx = W / 2 + nx * po, my = H / 2 + ny * po, len = Math.sqrt(W * W + H * H) * 1.15, N = 26, i, os = yo * dy / len;
    var left = [], right = [], path = new Path2D();
    for (i = 0; i <= N; i++) {
      var s = i / N, t = (s - 0.5) * len, ss = s - os, off = p.c * Math.sin(ss * Math.PI * 1.4 + p.ph);
      var hw = p.w / 2 * (1 + 0.45 * Math.sin(ss * Math.PI * 2 + p.ph * 0.7));
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
      var ux = pts[i][0] - W / 2, uy = pts[i][1] - (H / 2 + yo), kk = ux * gx + uy * gy, tt = ux * hx + uy * hy;
      if (kk < kmin) kmin = kk; if (kk > kmax) kmax = kk;
      if (tt < tmin) tmin = tt; if (tt > tmax) tmax = tt;
    }
    bx.save(); bx.clip(path);
    bx.beginPath();
    for (var k = Math.floor(kmin / p.s); k <= Math.ceil(kmax / p.s); k++) {
      var ox = W / 2 + gx * k * p.s, oy = H / 2 + yo + gy * k * p.s;
      bx.moveTo(ox + hx * (tmin - 4), oy + hy * (tmin - 4)); bx.lineTo(ox + hx * (tmax + 4), oy + hy * (tmax + 4));
    }
    if (idx === 0) { bx.strokeStyle = RA + '.8)'; bx.lineWidth = 1.8; }
    else if (idx === 1) { bx.strokeStyle = RI + '.42)'; bx.lineWidth = 1; }
    else { bx.strokeStyle = RI + '.3)'; bx.lineWidth = 0.8; }
    bx.stroke(); bx.restore();
    bx.strokeStyle = RI + '' + (idx === 0 ? 0.85 : 0.35) + ')'; bx.lineWidth = idx === 0 ? 1.4 : 1;
    bx.stroke(path);
  }
  function renderBands() {
    bx.setTransform(DPR, 0, 0, DPR, 0, BM * DPR);
    bx.clearRect(0, -BM, W, H + 2 * BM);
    bands.forEach(function (b, i) { drawBand(b, i, driftY0 + wrapOff[i]); });
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
    cv.width = bl.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); bl.height = Math.round((H + 2 * BM) * DPR);
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
    cx.fillStyle = PAPER; cx.fillRect(0, 0, W, H);
    var hero = Math.max(0.3, 1 - sY / (H * 0.9)), m = 0.45 + 0.55 * hero;
    var sp = 26, off = (sY * 0.15) % sp, x0, base = -H - sp + off;

    // trama base y lineas que se encienden cerca del cursor
    cx.lineWidth = 1; cx.strokeStyle = RI + '.07)'; cx.beginPath();
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

    cx.globalAlpha = m * 0.6; cx.drawImage(bl, 0, -BM + (driftY - driftY0), W, H + 2 * BM); cx.globalAlpha = 1; // capa de bandas en cache

    // circulo grande de contorno con paralaje
    var R = Math.min(W, H) * 0.34;
    cx.lineWidth = 1; cx.strokeStyle = RI + '' + (0.22 * hero + 0.06) + ')';
    cx.beginPath(); cx.arc(W * 0.76 - (disk.x - W / 2) * 0.05, H * 0.42 - (disk.y - H / 2) * 0.05 - sY * 0.12, R, 0, PI2); cx.stroke();

    drawShapes(Math.max(0.55, hero));

    // diagonal estructural que sigue al cursor
    var a = ang * Math.PI / 180, len = Math.max(W, H) * 1.6;
    cx.strokeStyle = RI + '' + (0.5 * hero + 0.12) + ')'; cx.lineWidth = 1;
    cx.beginPath();
    cx.moveTo(disk.x - Math.cos(a) * len, disk.y - Math.sin(a) * len);
    cx.lineTo(disk.x + Math.cos(a) * len, disk.y + Math.sin(a) * len);
    cx.stroke();

    // velo de atenuacion (nivel medio): suaviza todo el fondo menos el cursor y las ondas
    cx.globalAlpha = VEIL; cx.fillStyle = PAPER; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1;

    // disco verde y anillo
    var pulse = motion ? Math.sin(t / 520) * 4 : 0;
    cx.fillStyle = G; cx.strokeStyle = DK; cx.lineWidth = 1.6;
    cx.beginPath(); cx.arc(disk.x, disk.y, 15, 0, PI2); cx.fill(); cx.stroke();
    cx.lineWidth = 1; cx.strokeStyle = RI + '.55)';
    cx.beginPath(); cx.arc(disk.x, disk.y, 30 + pulse, 0, PI2); cx.stroke();

    // ondas por clic
    for (var i = ripples.length - 1; i >= 0; i--) {
      var rp = ripples[i], age = (t - rp.t) / 1000;
      if (age > 1.1) { ripples.splice(i, 1); continue; }
      cx.strokeStyle = RI + '' + (1 - age / 1.1).toFixed(3) + ')'; cx.lineWidth = 1.6;
      cx.beginPath(); cx.arc(rp.x, rp.y, 10 + age * 260, 0, PI2); cx.stroke();
      cx.strokeStyle = RA + '' + (1 - age / 1.1).toFixed(3) + ')'; cx.lineWidth = 4;
      cx.beginPath(); cx.arc(rp.x, rp.y, 6 + age * 260, 0, PI2); cx.stroke();
    }
  }

  function stepDrift() {
    if (motion) driftY -= DRIFT * dtS / 60;
    bands.forEach(function (b, i) {
      var p = b.cur, a = p.a * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
      var E = Math.abs(W * sn) + Math.abs(H * cs), ext = p.w * 0.73 + Math.abs(p.c) + 60;
      if (p.o + (driftY + wrapOff[i]) * cs < -(E / 2 + ext)) { wrapOff[i] += (E + 2 * ext) / cs; bandsDirty = true; } // sale arriba, reaparece abajo
    });
    if (Math.abs(driftY - driftY0) > BM * 0.8) { driftY0 = driftY; bandsDirty = true; }
  }
  function step() {
    disk.x = L(disk.x, mouse.x, 0.09); disk.y = L(disk.y, mouse.y, 0.09);
    ang = L(ang, ang0 + (mouse.x / W - 0.5) * 18 + (mouse.y / H - 0.5) * 10, 0.06);
    stepBands(); stepDrift(); stepShapes();
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

  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; touch();
    if (down) { // arrastrar deforma la banda verde
      bands[0].tar.c = (mouse.y / H - 0.5) * 520;
      bands[0].tar.a = -62 + (mouse.x / W) * 48;
      bands[1].tar.o = (mouse.x / W - 0.5) * W * 0.9;
    }
    if (!motion) drawStatic();
  }, { passive: true });
  window.addEventListener('pointerdown', function (e) {
    
    down = true; taps++; touch();
    mouse.x = e.clientX; mouse.y = e.clientY;
    morph(); reshuffle(); jumpShapes();
    if (!e.target.closest('a,button,.segment,.chip,.sw,.crow')) ripples.push({ x: e.clientX, y: e.clientY, t: performance.now(), id: ++ripId });
    if (!motion) drawStatic();
  }, { passive: true });
  function up() { down = false; }
  window.addEventListener('pointerup', up, { passive: true });
  window.addEventListener('pointercancel', up, { passive: true });
  window.addEventListener('resize', function () { touch(); resize(); });
  window.addEventListener('scroll', function () { sY = window.scrollY; touch(); if (!motion) drawStatic(); }, { passive: true });

  resize();
  if (motion) startLoop(); else drawStatic();
})();
