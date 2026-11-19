/* Administración del blog: sesión de Supabase y CRUD sobre blog_posts. Las políticas RLS limitan la escritura al dueño. */
(function () {
  'use strict';
  var cfg = window.BLOG_CFG, MD = window.BlogMD;
  var $ = function (s) { return document.querySelector(s); };
  if (!window.supabase) { document.body.innerHTML = '<main class="wrap bmain"><p>No se pudo cargar el servicio de acceso. Recarga la página.</p></main>'; return; }
  var sb = window.supabase.createClient(cfg.url, cfg.anon, { auth: { persistSession: true, autoRefreshToken: true } });
  var posts = [], cur = null, dirty = false, slugTouched = false, mt = 0;

  function msg(t, err) { var m = $('#msg'); m.textContent = t; m.className = err ? 'err' : ''; m.hidden = false; clearTimeout(mt); mt = setTimeout(function () { m.hidden = true; }, 4200); }
  function slugify(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }
  function setDirty(v) { dirty = v; $('#dirty').textContent = v ? 'Cambios sin guardar' : ''; }
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---- sesión ---- */
  function show(logged, email) {
    $('#vLogin').hidden = logged; $('#vApp').hidden = !logged;
    $('#out').hidden = !logged; $('#who').hidden = !logged; $('#who').textContent = email || '';
    if (logged) load(); else $('#lEm').focus();
  }
  sb.auth.getSession().then(function (r) { var s = r.data && r.data.session; show(!!s, s && s.user.email); });
  $('#fLogin').addEventListener('submit', function (e) {
    e.preventDefault(); $('#lEr').textContent = '';
    var em = $('#lEm').value.trim(), pw = $('#lPw').value;
    if (!em || !pw) { $('#lEr').textContent = 'Escribe tu correo y tu contraseña.'; return; }
    $('#lBt').disabled = true;
    sb.auth.signInWithPassword({ email: em, password: pw }).then(function (r) {
      $('#lBt').disabled = false;
      if (r.error) { $('#lEr').textContent = 'Correo o contraseña incorrectos.'; return; }
      $('#lPw').value = ''; show(true, r.data.user.email);
    }, function () { $('#lBt').disabled = false; $('#lEr').textContent = 'No hay conexión con el servicio. Intenta de nuevo.'; });
  });
  $('#out').addEventListener('click', function () {
    if (dirty && !confirm('Tienes cambios sin guardar. ¿Cerrar sesión de todos modos?')) return;
    setDirty(false); sb.auth.signOut().then(function () { show(false); });
  });

  /* ---- lista ---- */
  function load(selectId) {
    sb.from('blog_posts').select('id,slug,lang,title,published,published_at,updated_at').order('updated_at', { ascending: false }).then(function (r) {
      if (r.error) { msg('No se pudieron cargar las entradas. Recarga la página.', true); return; }
      posts = r.data; renderList();
      if (selectId) pick(selectId); else if (!cur) blank();
    });
  }
  function renderList() {
    var h = posts.map(function (p) {
      return '<button type="button" data-id="' + p.id + '"' + (cur && cur.id === p.id ? ' aria-current="true"' : '') + '><span class="t">' + MD.esc(p.title || 'Sin título') + '</span><span class="s"><i class="dot' + (p.published ? ' on' : '') + '"></i>' + (p.published ? 'Publicada' : 'Borrador') + ' · ' + p.lang.toUpperCase() + '</span></button>';
    }).join('');
    $('#pl').innerHTML = h || '<p class="hint" style="padding:16px">Aún no hay entradas. Crea la primera.</p>';
  }
  $('#pl').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-id]'); if (!b) return;
    if (dirty && !confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return;
    pick(b.getAttribute('data-id'));
  });
  $('#nuevo').addEventListener('click', function () {
    if (dirty && !confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return;
    blank(); $('#pTit').focus();
  });

  /* ---- editor ---- */
  function fill(p) {
    cur = p && p.id ? p : null;
    $('#eTitle').textContent = cur ? 'Editar entrada' : 'Nueva entrada';
    $('#pTit').value = p ? p.title : ''; $('#pLang').value = p ? p.lang : 'es';
    $('#pSlug').value = p ? p.slug : ''; $('#pExc').value = p ? p.excerpt : '';
    $('#pTag').value = p ? (p.tags || []).join(', ') : ''; $('#pBody').value = p ? p.body : '';
    $('#pPub').checked = !!(p && p.published);
    slugTouched = !!cur; $('#pEr').textContent = ''; setDirty(false);
    $('#del').hidden = !cur;
    var v = $('#ver'); v.hidden = !(cur && cur.published); if (cur) v.href = '../post.html?s=' + encodeURIComponent(cur.slug);
    tab('E'); renderList();
  }
  function blank() { fill(null); }
  function pick(id) {
    sb.from('blog_posts').select('*').eq('id', id).single().then(function (r) {
      if (r.error) { msg('No se pudo abrir la entrada.', true); return; } fill(r.data);
    });
  }
  function tab(w) {
    var e = w === 'E'; $('#tabE').setAttribute('aria-selected', e); $('#tabP').setAttribute('aria-selected', !e);
    $('#boxE').hidden = !e; $('#boxP').hidden = e;
    if (!e) $('#prev').innerHTML = MD.render($('#pBody').value) || '<p class="hint">No hay contenido para mostrar.</p>';
  }
  $('#tabE').addEventListener('click', function () { tab('E'); }); $('#tabP').addEventListener('click', function () { tab('P'); });
  $('#fPost').addEventListener('input', function (e) {
    setDirty(true);
    if (e.target.id === 'pTit' && !slugTouched) $('#pSlug').value = slugify($('#pTit').value);
    if (e.target.id === 'pSlug') slugTouched = true;
  });
  $('#pSlug').addEventListener('blur', function () { this.value = slugify(this.value); });

  $('#fPost').addEventListener('submit', function (e) {
    e.preventDefault(); var er = $('#pEr'); er.textContent = '';
    var t = $('#pTit').value.trim(), slug = slugify($('#pSlug').value || t);
    if (!t) { er.textContent = 'Escribe un título.'; $('#pTit').focus(); return; }
    if (!slug) { er.textContent = 'El enlace no puede quedar vacío.'; $('#pSlug').focus(); return; }
    var pub = $('#pPub').checked;
    if (pub && !$('#pBody').value.trim()) { er.textContent = 'Para publicar, escribe el contenido de la entrada.'; $('#pBody').focus(); return; }
    var row = { title: t, slug: slug, lang: $('#pLang').value, excerpt: $('#pExc').value.trim(), body: $('#pBody').value,
      tags: $('#pTag').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 8), published: pub };
    $('#save').disabled = true;
    var q = cur ? sb.from('blog_posts').update(row).eq('id', cur.id).select().single() : sb.from('blog_posts').insert(row).select().single();
    q.then(function (r) {
      $('#save').disabled = false;
      if (r.error) {
        er.textContent = r.error.code === '23505' ? 'Ya existe una entrada con ese enlace. Cambia el enlace y guarda de nuevo.' : 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.';
        return;
      }
      msg(pub ? 'Entrada guardada y publicada.' : 'Borrador guardado.'); setDirty(false); load(r.data.id);
    }, function () { $('#save').disabled = false; er.textContent = 'No hay conexión con el servicio. Intenta de nuevo.'; });
  });

  /* ---- eliminar ---- */
  var dlg = $('#dlg');
  $('#del').addEventListener('click', function () { if (!cur) return; $('#dP').textContent = 'Se eliminará "' + cur.title + '" de forma permanente. Esta acción no se puede deshacer.'; dlg.showModal(); });
  $('#dNo').addEventListener('click', function () { dlg.close(); });
  $('#dYes').addEventListener('click', function () {
    var id = cur.id; dlg.close();
    sb.from('blog_posts').delete().eq('id', id).then(function (r) {
      if (r.error) { msg('No se pudo eliminar la entrada.', true); return; }
      msg('Entrada eliminada.'); setDirty(false); cur = null; load();
    });
  });
})();
