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
    { t: 'Estudio 07', s: 'Estructura', type: 'torre',    seed: 79, d: 'Estructura metálica con plataforma y antenas, recortada contra un círculo blanco.' },
    { t: 'Estudio 08', s: 'Tipografía', type: 'tipo',     seed: 86, d: 'Módulos tipográficos con cruces x como marcas de corte.' }
  ];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
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

  /* ---------- Fondo: diagonales y circulos reactivos ---------- */
  var cv = $('#bg'), cx = cv.getContext('2d');
  var W = 0, H = 0, DPR = 1;
  var mouse = { x: 0, y: 0 }, disk = { x: 0, y: 0 }, ang = -35;
  var ripples = [], looping = false, lastT = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!mouse.x) { mouse.x = disk.x = W * 0.72; mouse.y = disk.y = H * 0.4; }
    if (!motion) drawStatic();
  }

  function draw(t) {
    cx.clearRect(0, 0, W, H);
    var sy = window.scrollY || 0;
    var hero = Math.max(0.3, 1 - sy / (H * 0.9));
    var sp = 26, off = (sy * 0.15) % sp;

    // trama base
    cx.lineWidth = 1;
    cx.strokeStyle = 'rgba(243,246,244,.055)';
    cx.beginPath();
    for (var x0 = -H - sp + off; x0 < W; x0 += sp) { cx.moveTo(x0, H); cx.lineTo(x0 + H, 0); }
    cx.stroke();

    // lineas cercanas al cursor se encienden
    var D = 190;
    for (var x1 = -H - sp + off; x1 < W; x1 += sp) {
      var d = Math.abs((disk.x - x1) + (disk.y - H)) / 1.4142;
      if (d < D) {
        var k = 1 - d / D;
        cx.strokeStyle = 'rgba(57,255,20,' + (k * 0.85).toFixed(3) + ')';
        cx.lineWidth = 1 + k * 1.6;
        cx.beginPath(); cx.moveTo(x1, H); cx.lineTo(x1 + H, 0); cx.stroke();
      }
    }

    // circulo grande de contorno con paralaje
    var R = Math.min(W, H) * 0.34;
    var px = W * 0.76 - (disk.x - W / 2) * 0.05, py = H * 0.42 - (disk.y - H / 2) * 0.05 - sy * 0.12;
    cx.lineWidth = 1;
    cx.strokeStyle = 'rgba(243,246,244,' + (0.16 * hero + 0.04) + ')';
    cx.beginPath(); cx.arc(px, py, R, 0, 6.2832); cx.stroke();

    // diagonal estructural que sigue al cursor
    var a = ang * Math.PI / 180, L = Math.max(W, H) * 1.6;
    cx.strokeStyle = 'rgba(243,246,244,' + (0.38 * hero + 0.08) + ')';
    cx.lineWidth = 1;
    cx.beginPath();
    cx.moveTo(disk.x - Math.cos(a) * L, disk.y - Math.sin(a) * L);
    cx.lineTo(disk.x + Math.cos(a) * L, disk.y + Math.sin(a) * L);
    cx.stroke();

    // disco verde y anillo
    var pulse = motion ? Math.sin(t / 520) * 4 : 0;
    cx.fillStyle = 'rgba(57,255,20,' + (0.35 + 0.65 * hero) + ')';
    cx.beginPath(); cx.arc(disk.x, disk.y, 15, 0, 6.2832); cx.fill();
    cx.strokeStyle = 'rgba(57,255,20,.55)';
    cx.beginPath(); cx.arc(disk.x, disk.y, 30 + pulse, 0, 6.2832); cx.stroke();

    // ondas por clic
    for (var i = ripples.length - 1; i >= 0; i--) {
      var rp = ripples[i], age = (t - rp.t) / 1000;
      if (age > 1.1) { ripples.splice(i, 1); continue; }
      cx.strokeStyle = 'rgba(57,255,20,' + (1 - age / 1.1).toFixed(3) + ')';
      cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(rp.x, rp.y, 10 + age * 260, 0, 6.2832); cx.stroke();
    }
  }

  function frame(t) {
    if (!motion || document.hidden) { looping = false; return; }
    disk.x += (mouse.x - disk.x) * 0.09;
    disk.y += (mouse.y - disk.y) * 0.09;
    var target = -35 + (mouse.x / W - 0.5) * 18 + (mouse.y / H - 0.5) * 10;
    ang += (target - ang) * 0.06;
    draw(t);
    requestAnimationFrame(frame);
  }
  function startLoop() { if (!looping) { looping = true; requestAnimationFrame(frame); } }
  function drawStatic() { disk.x = mouse.x; disk.y = mouse.y; draw(performance.now()); }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && motion) startLoop(); });

  var rx = $('#rx'), ry = $('#ry'), ra = $('#ra'), ticking = false;
  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (!motion) { ang = -35 + (mouse.x / W - 0.5) * 18; drawStatic(); }
    if (!ticking) {
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
    if (e.target.closest('a,button,.card,dialog')) return;
    ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (!motion) drawStatic();
  }, { passive: true });
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', function () { if (!motion) drawStatic(); }, { passive: true });

  /* ---------- Palabra xNoleet: bloques tipograficos ---------- */
  var word = $('#word');
  var LET = ['x', 'N', 'O', 'L', 'E', 'E', 'T', '×'];
  var GLYPHS = 'XNOLET41/+#<>';
  var tiles = LET.map(function (ch, i) {
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
      var dx = (Math.random() - 0.5) * 420, dy = (Math.random() - 0.5) * 320, r = (Math.random() - 0.5) * 70;
      el.style.transition = 'none';
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + r + 'deg) scale(.6)';
      el.classList.add('away');
    });
    void word.offsetWidth;
    tiles.forEach(function (el, i) {
      setTimeout(function () {
        el.style.transition = '';
        el.style.transform = '';
        el.classList.remove('away');
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
  var uid = 0, G = '#39ff14', WH = '#f3f6f4';
  function tower(bx, top, wb, wt, rr) {
    var s = '', h = 420 - top, n = 7, i;
    s += '<path d="M' + (bx - wb) + ' 420L' + (bx - wt) + ' ' + top + 'M' + (bx + wb) + ' 420L' + (bx + wt) + ' ' + top + '" stroke="' + WH + '" stroke-width="3" fill="none"/>';
    for (i = 0; i < n; i++) {
      var y1 = 420 - h * i / n, y2 = 420 - h * (i + 1) / n;
      var w1 = wb + (wt - wb) * i / n, w2 = wb + (wt - wb) * (i + 1) / n;
      s += '<path d="M' + (bx - w1) + ' ' + y1 + 'L' + (bx + w2) + ' ' + y2 + 'M' + (bx + w1) + ' ' + y1 + 'L' + (bx - w2) + ' ' + y2 +
           'M' + (bx - w2) + ' ' + y2 + 'H' + (bx + w2) + '" stroke="' + WH + '" stroke-width="1.4" fill="none"/>';
    }
    s += '<ellipse cx="' + bx + '" cy="' + (top + 26) + '" rx="' + (wt + 20) + '" ry="7" fill="none" stroke="' + WH + '" stroke-width="2"/>';
    var d = rr() > 0.5 ? 1 : -1;
    s += '<path d="M' + bx + ' ' + (top + 4) + 'l' + (d * 36) + ' -26 v30z M' + bx + ' ' + (top + 4) + 'l' + (-d * 22) + ' -18 v22z" fill="' + WH + '"/>';
    return s;
  }
  function gen(type, seed) {
    var r = rng(seed), id = 'p' + (++uid), bg = r() > 0.5 ? '#1d2022' : '#272b2e', s = '', i;
    s += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">';
    s += '<defs><pattern id="' + id + '" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="' + WH + '" stroke-width="1.6"/></pattern>' +
         '<clipPath id="' + id + 'c"><path d="M32 0H128V0L160 32V128H0V32Z"/></clipPath></defs>';
    s += '<rect width="400" height="400" fill="' + bg + '"/>';
    var cx0 = 110 + r() * 180, cy0 = 120 + r() * 160, R = 60 + r() * 70, green = r() > 0.4;
    if (type === 'circulo') {
      s += '<circle cx="' + cx0 + '" cy="' + cy0 + '" r="' + R + '" fill="' + (green ? G : WH) + '"/>';
      s += '<circle cx="' + (400 - cx0) + '" cy="' + (400 - cy0) + '" r="' + (R * 0.45) + '" fill="none" stroke="' + (green ? WH : G) + '" stroke-width="2"/>';
      s += '<path d="M-20 ' + (330 + r() * 40) + 'L420 ' + (40 + r() * 60) + '" stroke="' + WH + '" stroke-width="1.5"/>';
      s += '<path d="M' + (300 + r() * 60) + ' ' + (300 + r() * 40) + 'l24 24h-24z" fill="' + G + '"/>';
    } else if (type === 'torre') {
      s += '<circle cx="' + cx0 + '" cy="' + (cy0 + 20) + '" r="' + (R + 10) + '" fill="' + G + '"/>';
      s += tower(140 + r() * 120, 50 + r() * 70, 74, 18, r);
      s += '<path d="M-20 ' + (380 - r() * 40) + 'L420 ' + (120 + r() * 60) + '" stroke="' + WH + '" stroke-width="1.2" opacity=".7"/>';
    } else if (type === 'tipo') {
      var words = ['NO', 'ER', '41', 'XN', 'LT', 'EX'], w = words[Math.floor(r() * words.length)], k = 0;
      for (var row = 0; row < 2; row++) for (var col = 0; col < 2; col++) {
        var x = 70 + col * 138 + (row ? 14 : 0), y = 70 + row * 138, ch = w.charAt(col);
        s += '<g transform="translate(' + x + ' ' + y + ')"><path d="M26 0H126V100L100 126H0V26Z" fill="url(#' + id + ')" stroke="' + WH + '" stroke-width="1.5"/>' +
             '<text x="63" y="92" text-anchor="middle" font-family="Syne,sans-serif" font-weight="800" font-size="86" fill="' + (k % 3 === 0 && green ? G : bg) + '" stroke="' + WH + '" stroke-width="' + (k % 3 === 0 && green ? 0 : 1.4) + '">' + (row ? (col ? w.charAt(0) : w.charAt(1)) : ch) + '</text></g>';
        k++;
      }
      s += '<path d="M-20 ' + (360 - r() * 60) + 'L420 ' + (60 + r() * 60) + '" stroke="' + WH + '" stroke-width="2"/>';
      s += '<circle cx="' + (330 + r() * 40) + '" cy="' + (50 + r() * 30) + '" r="16" fill="' + G + '"/>';
      s += '<text x="372" y="392" text-anchor="end" font-family="Space Mono,monospace" font-size="11" fill="' + WH + '" opacity=".7">x x x</text>';
    } else {
      for (i = -4; i < 34; i++) {
        s += '<path d="M' + (i * 14) + ' 420L' + (i * 14 + 420) + ' 0" stroke="' + WH + '" stroke-width="1" opacity=".28"/>';
      }
      var bandX = 80 + r() * 160;
      s += '<path d="M' + bandX + ' 420L' + (bandX + 420) + ' 0" stroke="' + G + '" stroke-width="' + (22 + r() * 26) + '" opacity=".95"/>';
      s += '<circle cx="' + cx0 + '" cy="' + cy0 + '" r="' + (R * 0.7) + '" fill="none" stroke="' + WH + '" stroke-width="1.6"/>';
      for (i = 0; i < 16; i++) {
        s += '<circle cx="' + (r() * 400) + '" cy="' + (r() * 400) + '" r="' + (1.5 + r() * 5) + '" fill="' + (r() > 0.5 ? G : WH) + '"/>';
      }
    }
    s += '<text x="14" y="388" font-family="Space Mono,monospace" font-size="11" fill="' + WH + '" opacity=".75">' + String(seed).padStart(3, '0') + ' / x41</text>';
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
  function step(dir) {
    var list = visible(), pos = list.indexOf(idx);
    idx = list[(pos + dir + list.length) % list.length];
    render();
  }
  function openViewer(i) { idx = i; render(); if (!dlg.open) dlg.showModal(); }
  revealOn(vArt);
  $('#v-close').addEventListener('click', function () { dlg.close(); });
  $('#v-prev').addEventListener('click', function () { step(-1); });
  $('#v-next').addEventListener('click', function () { step(1); });
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
    if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('keydown', function (e) {
    if (!dlg.open) return;
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
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
  applyMotion();
})();
