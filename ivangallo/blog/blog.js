/* Blog de Iván Gallo: lectura desde Supabase (solo posts publicados, políticas RLS) con respaldo estático. */
(function () {
  'use strict';
  var cfg = window.BLOG_CFG, MD = window.BlogMD, page = document.body.getAttribute('data-page');
  var $ = function (s) { return document.querySelector(s); };
  var esc = MD.esc;
  var STATIC = window.BLOG_STATIC || [];
  function api(q) {
    return fetch(cfg.url + '/rest/v1/blog_posts?' + q, { headers: { apikey: cfg.anon, Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); });
  }
  function fmt(d, lang) {
    try { return new Date(d).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return ''; }
  }
  function href(slug, base) { return (STATIC.indexOf(slug) > -1 ? base + slug + '/' : base + 'post.html?s=' + encodeURIComponent(slug)); }

  if (page === 'index') {
    var list = $('#plist'), st = $('#bstate');
    api('select=slug,lang,title,excerpt,tags,published_at&published=eq.true&order=published_at.desc&limit=100').then(function (rows) {
      if (!rows.length) { list.innerHTML = ''; st.textContent = 'Todavía no hay entradas publicadas.'; st.hidden = false; return; }
      list.innerHTML = rows.map(function (p) {
        return '<li class="pitem"><time datetime="' + esc(p.published_at || '') + '">' + esc(fmt(p.published_at, p.lang)) + '</time><article><h2><a href="' + esc(href(p.slug, '')) + '" lang="' + esc(p.lang) + '">' + esc(p.title) + '</a></h2>'
          + (p.excerpt ? '<p lang="' + esc(p.lang) + '">' + esc(p.excerpt) + '</p>' : '')
          + ((p.tags || []).length ? '<div class="tags">' + p.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' : '') + '</article></li>';
      }).join('');
      st.hidden = true;
    }).catch(function () { if (!list.children.length) { st.textContent = 'No se pudieron cargar las entradas. Recarga la página.'; st.hidden = false; } });
  }

  if (page === 'post') {
    var slug = new URLSearchParams(location.search).get('s'), box = $('#post'), ps = $('#bstate');
    if (!slug) { ps.textContent = 'Falta indicar la entrada. Vuelve al blog y elige una.'; ps.hidden = false; return; }
    api('select=slug,lang,title,excerpt,body,tags,published_at&published=eq.true&slug=eq.' + encodeURIComponent(slug) + '&limit=1').then(function (rows) {
      var p = rows[0];
      if (!p) { ps.textContent = 'No encontramos esta entrada. Puede que se haya despublicado.'; ps.hidden = false; return; }
      document.title = p.title + ' · Iván Gallo';
      document.documentElement.setAttribute('lang', p.lang);
      box.innerHTML = '<p class="eyebrow">' + esc(fmt(p.published_at, p.lang)) + '</p><h1 class="btitle">' + esc(p.title) + '</h1>'
        + ((p.tags || []).length ? '<div class="tags">' + p.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' : '')
        + '<div class="prose-b">' + MD.render(p.body) + '</div>';
      ps.hidden = true;
    }).catch(function () { ps.textContent = 'No se pudo cargar la entrada. Recarga la página.'; ps.hidden = false; });
  }
})();
