
(function () {
  var r = document.documentElement, b = document.querySelectorAll('[data-set-lang]');
  function paint() {
    var l = r.getAttribute('data-lang');
    b.forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-set-lang') === l ? 'true' : 'false'); });
  }
  b.forEach(function (x) {
    x.addEventListener('click', function () {
      var l = x.getAttribute('data-set-lang');
      r.setAttribute('data-lang', l); r.setAttribute('lang', l);
      try { localStorage.setItem('lang', l); } catch (e) {}
      paint();
    });
  });
  paint();
})();


(function () {
  var d = document, r = d.documentElement, w = window;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function lang() { return r.getAttribute('data-lang') === 'en' ? 'en' : 'es'; }

  /* Título de la pestaña según idioma */
  var T = { pm: { es: 'Iván Gallo · Consultor estratégico y administrador de proyectos', en: 'Iván Gallo · Strategic Consultant & Project Manager' }, ui: { es: 'Iván Gallo · Diseñador de interfaces UI/UX', en: 'Iván Gallo · UI/UX Interface Designer' } };
  function setTitle() { d.title = T[profile()][lang()]; }

  /* Contadores */
  var nums = [].slice.call(d.querySelectorAll('.stat-n[data-to]'));
  function fmt(n) { return new Intl.NumberFormat(lang() === 'en' ? 'en-US' : 'de-DE').format(Math.round(n)); }
  function show(el, v) { el.textContent = fmt(v) + (el.getAttribute('data-suffix') || ''); }
  function run(el) {
    var to = +el.getAttribute('data-to'), t0 = null, dur = 1600;
    el.__done = false;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      show(el, to * e);
      if (p < 1) w.requestAnimationFrame(step); else el.__done = true;
    }
    w.requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in w && !reduce) {
    nums.forEach(function (el) { show(el, 0); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { run(x.target); io.unobserve(x.target); } });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { io.observe(el); });
  } else { nums.forEach(function (el) { el.__done = true; show(el, +el.getAttribute('data-to')); }); }
  nums.forEach(function (el) {
    el.parentNode.addEventListener('mouseenter', function () { if (el.__done && !reduce) run(el); });
  });

  /* Perfil */
  function profile() { return r.getAttribute('data-profile') === 'ui' ? 'ui' : 'pm'; }
  var pbtns = [].slice.call(d.querySelectorAll('[data-set-profile]'));
  function paintProfile() { pbtns.forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-set-profile') === profile() ? 'true' : 'false'); }); }

  /* Cronología */
  var lists = [].slice.call(d.querySelectorAll('.tl'));
  var entries = [], pmEntries = [];
  var allBtn = d.getElementById('tl-all');
  lists.forEach(function (ol) {
    var es = [].slice.call(ol.querySelectorAll('.entry'));
    es.forEach(function (e, i) {
      var body = e.querySelector('.entry-body'), b = d.createElement('button');
      b.type = 'button'; b.className = 'more';
      b.innerHTML = '<span class="off"><span lang="es">Ver más</span><span lang="en">Read more</span></span><span class="on"><span lang="es">Ver menos</span><span lang="en">Show less</span></span>';
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function () { toggle(e, !e.classList.contains('open')); syncAll(); });
      body.appendChild(b); e.__btn = b;
      if (i < 2) { e.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }
      entries.push(e); if (ol.getAttribute('data-p') === 'pm') pmEntries.push(e);
    });
    if (es.length) es[es.length - 1].classList.add('is-last');
  });
  function toggle(e, open) { e.classList.toggle('open', open); e.__btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  function shown(e) { return !e.hidden && e.offsetParent !== null; }
  function visible() { return entries.filter(shown); }
  function syncAll() {
    if (!allBtn) return;
    var v = visible(), all = v.length && v.every(function (e) { return e.classList.contains('open') || e.__btn.hidden; });
    allBtn.setAttribute('aria-pressed', all ? 'true' : 'false');
  }
  function refit() {
    entries.forEach(function (e) {
      if (e.offsetParent === null) return;
      var desc = e.querySelector('.desc'), foc = e.querySelector('.focus');
      var keep = desc.style.transition; desc.style.transition = 'none'; desc.style.maxHeight = 'none';
      var nat = desc.scrollHeight; desc.style.maxHeight = ''; void desc.offsetHeight; desc.style.transition = keep;
      var over = nat > 72;
      e.style.setProperty('--h', nat + 'px');
      desc.classList.toggle('cut', over);
      e.__btn.hidden = !(over || foc);
      e.__btn.setAttribute('aria-expanded', e.classList.contains('open') ? 'true' : 'false');
    });
    syncAll();
  }
  if (allBtn) allBtn.addEventListener('click', function () {
    var open = allBtn.getAttribute('aria-pressed') !== 'true';
    visible().forEach(function (e) { if (!e.__btn.hidden) toggle(e, open); });
    syncAll();
  });
  var chips = [].slice.call(d.querySelectorAll('.chip'));
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var f = c.getAttribute('data-filter');
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
      pmEntries.forEach(function (e) { e.hidden = !(f === 'all' || e.getAttribute('data-cat') === f); e.classList.remove('is-last'); });
      var v = pmEntries.filter(function (e) { return !e.hidden; }); if (v.length) v[v.length - 1].classList.add('is-last');
      refit();
    });
  });

  /* Línea de progreso, hito actual y aparición escalonada */
  function tlProgress() {
    var mid = w.innerHeight * 0.55, cur = null;
    lists.forEach(function (ol) {
      if (ol.offsetParent === null) return;
      var rc = ol.getBoundingClientRect();
      ol.style.setProperty('--fill', Math.max(0, Math.min(rc.height - 30, mid - rc.top - 26)) + 'px');
    });
    entries.forEach(function (e) {
      if (!shown(e)) return;
      var reached = e.getBoundingClientRect().top + 13 <= mid;
      if (e.classList.contains('reached') !== reached) e.classList.toggle('reached', reached);
      if (reached) cur = e;
    });
    entries.forEach(function (e) { var on = e === cur; if (e.classList.contains('current') !== on) e.classList.toggle('current', on); });
  }
  if ('IntersectionObserver' in w && !reduce) {
    r.classList.add('anim');
    var rio = new IntersectionObserver(function (es) {
      var k = 0;
      es.forEach(function (x) {
        if (!x.isIntersecting) return;
        x.target.style.setProperty('--stg', (k++ * 110) + 'ms');
        x.target.classList.add('in'); rio.unobserve(x.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    entries.forEach(function (e) { rio.observe(e); });
  }

  /* Barra de progreso, sección activa y volver arriba */
  var bar = d.querySelector('.progress'), fab = d.getElementById('fab');
  var links = [].slice.call(d.querySelectorAll('.topnav a'));
  var secs = links.map(function (a) { return d.querySelector(a.getAttribute('href')); });
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = w.pageYOffset, h = r.scrollHeight - w.innerHeight, cur = -1;
    bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
    secs.forEach(function (s, i) { if (s && s.offsetParent !== null && s.getBoundingClientRect().top <= 120) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle('active', i === cur); });
    var ct = d.getElementById('contacto');
    fab.hidden = y < 700 || (w.innerWidth < 560 && ct && ct.getBoundingClientRect().top < w.innerHeight * 0.6);
    tlProgress();
  }
  w.addEventListener('scroll', function () { if (!ticking) { ticking = true; w.requestAnimationFrame(onScroll); } }, { passive: true });
  fab.addEventListener('click', function () { w.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* Perfil: cambio */
  pbtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var p = b.getAttribute('data-set-profile');
      r.setAttribute('data-profile', p);
      try { localStorage.setItem('profile', p); } catch (e) {}
      paintProfile(); setTitle(); onScroll();
      w.setTimeout(refit, 0);
    });
  });
  paintProfile();

  /* Idioma */
  [].slice.call(d.querySelectorAll('[data-set-lang]')).forEach(function (b) {
    b.addEventListener('click', function () {
      setTitle();
      nums.forEach(function (el) { if (el.__done) show(el, +el.getAttribute('data-to')); });
      w.setTimeout(refit, 0);
    });
  });
  w.addEventListener('resize', refit);
  setTitle(); onScroll();
  refit();
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(refit);
  w.addEventListener('load', refit);
})();

(function () {
  var NAME = { gen: { es: 'Ivan-Gallo-CV-ES.pdf', en: 'Ivan-Gallo-CV-EN.pdf' }, ui: { es: 'Ivan-Gallo-CV-UI-ES.pdf', en: 'Ivan-Gallo-CV-UI-EN.pdf' } };
  var btn = document.getElementById('cv');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var r = document.documentElement;
    var l = r.getAttribute('data-lang') === 'en' ? 'en' : 'es', kind = r.getAttribute('data-profile') === 'ui' ? 'ui' : 'gen';
    var a = document.createElement('a'); a.href = 'cv/' + NAME[kind][l]; a.download = NAME[kind][l];
    document.body.appendChild(a); a.click(); a.remove();
  });
})();


(function () {
  [].slice.call(document.querySelectorAll('[data-copy]')).forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-copy');
      function done() { b.classList.add('ok'); setTimeout(function () { b.classList.remove('ok'); }, 1600); }
      function fallback() {
        try { var t = document.createElement('textarea'); t.value = v; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); var ok = document.execCommand('copy'); t.remove(); if (ok) done(); } catch (e) {}
      }
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, fallback); else fallback(); } catch (e) { fallback(); }
    });
  });
})();


(function () {
  var d = document, w = window;
  var secs = [].slice.call(d.querySelectorAll('.rvs'));
  /* titulares: palabra por palabra */
  [].slice.call(d.querySelectorAll('.wsplit [lang]')).forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/); el.textContent = ''; el.setAttribute('aria-label', words.join(' '));
    words.forEach(function (wd, i) {
      var o = d.createElement('span'), n = d.createElement('span');
      o.className = 'w'; o.setAttribute('aria-hidden', 'true'); n.className = 'wi'; n.style.setProperty('--i', i); n.textContent = wd;
      o.appendChild(n); el.appendChild(o); if (i < words.length - 1) el.appendChild(d.createTextNode(' '));
    });
  });
  function delays(sec) {
    var k = 0;
    [].slice.call(sec.querySelectorAll('.rv')).forEach(function (el) {
      if (el.offsetParent === null) return;
      el.style.setProperty('--d', Math.min(k, 9) * 110 + 'ms'); k++;
    });
  }
  if ('IntersectionObserver' in w) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { delays(x.target); x.target.classList.add('in'); io.unobserve(x.target); } });
    }, { threshold: 0.25 });
    secs.forEach(function (sx) { io.observe(sx); });
  } else { secs.forEach(function (sx) { sx.classList.add('in'); }); }
  [].slice.call(d.querySelectorAll('[data-set-profile]')).forEach(function (b) {
    b.addEventListener('click', function () { secs.forEach(delays); });
  });
  /* parallax suave de los anillos */
  var ticking = false;
  function par() {
    ticking = false;
    secs.forEach(function (sx) {
      var art = sx.querySelector('.sum-art'); if (!art) return;
      var rc = sx.getBoundingClientRect();
      if (rc.bottom < -200 || rc.top > w.innerHeight + 200) return;
      var p = (rc.top + rc.height / 2 - w.innerHeight / 2) / w.innerHeight;
      art.style.setProperty('--py', (Math.max(-1, Math.min(1, p)) * -60).toFixed(1) + 'px');
    });
  }
  if (!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    w.addEventListener('scroll', function () { if (!ticking) { ticking = true; w.requestAnimationFrame(par); } }, { passive: true });
    par();
  }
})();


(function () {
  var d = document, w = window, hero = d.querySelector('.hero');
  if (!hero || (w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var busy = false;
  function replay() {
    if (busy) return; busy = true;
    hero.classList.add('rp'); void hero.offsetWidth; hero.classList.remove('rp');
    w.setTimeout(function () { busy = false; }, 1500);
  }
  [].slice.call(d.querySelectorAll('[data-set-lang],[data-set-profile]')).forEach(function (b) {
    b.addEventListener('click', function () { w.setTimeout(replay, 30); });
  });
  if ('IntersectionObserver' in w) {
    var seen = false, away = false;
    new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        if (!x.isIntersecting) { away = true; return; }
        if (seen && away) { away = false; replay(); } seen = true;
      });
    }, { threshold: 0.6 }).observe(hero);
  }
})();
