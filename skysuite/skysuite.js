/* Sky Port · suite compartida (Sky Port, Dôjo · Universo Praes, TEGC BGS).
   Una barra con el núcleo de Sky Port (vuelve a /skyport/), menú de apps y acceso con Supabase.
   Las cuentas las crea el administrador en Supabase: aquí no hay registro.
   Uso:  <script src="/skysuite/skysuite.js?v=1" data-app="praes" data-label="Præstantia" data-gate data-float></script>
     data-app    id de la app actual (skyport | praes | bgs)    data-label  texto bajo "Sky Port"
     data-gate   exige sesión antes de mostrar la página        data-float  barra superpuesta en vez de empujar el contenido */
(function () {
  'use strict';
  var me = document.currentScript;
  if (!me || document.getElementById('ss-bar')) return;
  var APP = me.getAttribute('data-app') || '', LABEL = me.getAttribute('data-label') || '';
  var GATE = me.hasAttribute('data-gate'), FLOAT = me.hasAttribute('data-float');
  var APPS = [
    { id: 'skyport', nombre: 'Sky Port', sub: 'Núcleo de TEGC', href: '/skyport/', color: '#FFC700' },
    { id: 'praes', nombre: 'Dôjo · Universo Praes', sub: 'Præstantia · Undead Society · Seishin', href: '/universo-praes/', color: '#00B4FF' },
    { id: 'bgs', nombre: 'TEGC BGS', sub: 'Próximamente', href: '', color: '#FF3B3B' }
  ];
  var base = me.src.replace(/[^\/]*$/, '');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var SS = window.SkySuite = { user: null, sb: null };
  var SIN_SERVICIO = 'No se pudo cargar el servicio de acceso. Recarga la página.';
  if (GATE) {
    /* Bloqueo inmediato (antes de que cargue la hoja de estilos) para que el contenido no se vea sin sesión. */
    var lk = document.createElement('style');
    lk.textContent = 'html.ss-locked{overflow:hidden!important}html.ss-locked body>*:not(#ss-bar):not(#ss-auth){visibility:hidden!important}';
    document.head.appendChild(lk);
    document.documentElement.classList.add('ss-locked');
  }

  function css() {
    if ($('#ss-css')) return;
    var l = document.createElement('link'); l.id = 'ss-css'; l.rel = 'stylesheet'; l.href = base + 'skysuite.css?' + (me.src.split('?')[1] || 'v=1');
    document.head.appendChild(l);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- barra ---------- */
  function barra() {
    var b = document.createElement('div');
    b.id = 'ss-bar'; if (FLOAT) b.className = 'float';
    b.setAttribute('role', 'navigation'); b.setAttribute('aria-label', 'Suite Sky Port');
    b.innerHTML =
      '<a class="ss-home" href="/skyport/" aria-label="Volver a TEGC Sky Port">' +
        '<span class="ss-ico" aria-hidden="true"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c0"></i></span>' +
        '<span class="ss-t"><b>Sky Port</b><small>' + esc(LABEL || 'Núcleo de TEGC') + '</small></span></a>' +
      '<span class="ss-sp"></span>' +
      '<span class="ss-user" id="ss-user" hidden><span class="ss-mail" id="ss-mail"></span><button class="ss-btn" type="button" id="ss-salir">Salir</button></span>' +
      '<button class="ss-btn" type="button" id="ss-abrir" aria-haspopup="true" aria-expanded="false" aria-controls="ss-pop">Apps</button>';
    var pop = document.createElement('div');
    pop.id = 'ss-pop'; pop.hidden = true; pop.setAttribute('role', 'menu');
    pop.innerHTML = APPS.map(function (a) {
      var inner = '<i class="dot" style="background:' + a.color + '"></i><span>' + esc(a.nombre) + '<small>' + esc(a.sub) + '</small></span>';
      return a.href ? '<a role="menuitem" href="' + a.href + '"' + (a.id === APP ? ' aria-current="page"' : '') + '>' + inner + '</a>' : '<span class="off" aria-disabled="true">' + inner + '</span>';
    }).join('');
    document.body.insertBefore(b, document.body.firstChild);
    b.appendChild(pop);
    var btn = $('#ss-abrir'), cerrar = function (f) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (f) btn.focus(); };
    btn.addEventListener('click', function () { var abre = pop.hidden; pop.hidden = !abre; btn.setAttribute('aria-expanded', String(abre)); if (abre) { var a = $('a', pop); if (a) a.focus(); } });
    document.addEventListener('click', function (e) { if (!pop.hidden && !e.target.closest('#ss-pop') && !e.target.closest('#ss-abrir')) cerrar(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) { e.stopPropagation(); cerrar(true); } }, true);
    $('#ss-salir').addEventListener('click', function () { SS.signOut(); });
  }
  function pintar() {
    var u = SS.user, box = $('#ss-user'); if (!box) return;
    box.hidden = !u; $('#ss-mail').textContent = u && u.email ? u.email : '';
  }

  /* ---------- acceso (solo cuentas creadas por el administrador) ---------- */
  var AM = {
    login: { t: 'Iniciar sesión', ayuda: 'Acceso privado. Usa la cuenta que te asignaron.', ok: 'Entrar', correo: 1, clave: 1, cp: 'current-password' },
    olvide: { t: 'Recuperar contraseña', ayuda: 'Escribe tu correo y te enviamos un enlace para crear una contraseña nueva.', ok: 'Enviar enlace', correo: 1, clave: 0 },
    nueva: { t: 'Nueva contraseña', ayuda: 'Escribe la contraseña nueva para tu cuenta.', ok: 'Guardar contraseña', correo: 0, clave: 1, cp: 'new-password' }
  };
  var PIE = { login: [['olvide', 'Olvidé mi contraseña']], olvide: [['login', 'Volver']], nueva: [['cancelar', 'Cancelar']] };
  var modo = 'login', recuperando = false;

  function msgError(e) {
    var c = (e && e.code) || '', m = String((e && e.message) || '').toLowerCase();
    if (c === 'invalid_credentials') return 'Correo o contraseña incorrectos.';
    if (c === 'email_not_confirmed') return 'Tu cuenta aún no está confirmada. Pide al administrador que la active.';
    if (c === 'weak_password') return 'La contraseña es muy débil. Usa al menos 8 caracteres, con letras y números.';
    if (c === 'same_password') return 'La contraseña nueva debe ser distinta de la anterior.';
    if (c === 'over_email_send_rate_limit' || c === 'over_request_rate_limit') return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    if (/fetch|network/.test(m)) return 'No hay conexión con el servicio. Revisa tu internet.';
    return 'No se pudo completar la acción. Inténtalo de nuevo.';
  }
  function acceso() {
    var d = document.createElement('div');
    d.id = 'ss-auth'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'sa-t');
    d.innerHTML =
      '<form class="ss-card" id="sa-form" novalidate>' +
        '<h1>Sky Port</h1><h2 id="sa-t">Iniciar sesión</h2><p class="ss-ayuda" id="sa-ayuda"></p>' +
        '<input id="sa-correo" type="email" autocomplete="username" inputmode="email" placeholder="Correo" aria-label="Correo">' +
        '<input id="sa-clave" type="password" autocomplete="current-password" placeholder="Contraseña" aria-label="Contraseña">' +
        '<p class="ss-err" id="sa-err" role="alert" hidden></p><p class="ss-info" id="sa-info" role="status" hidden></p>' +
        '<button class="ss-ok" type="submit" id="sa-ok">Entrar</button><div class="ss-pie" id="sa-pie"></div></form>';
    document.body.appendChild(d);
    $('#sa-pie').addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return; var m = b.getAttribute('data-m');
      if (m === 'cancelar') { recuperando = false; if (SS.sb) SS.sb.auth.signOut({ scope: 'local' }).catch(function () {}); mostrar('login'); return; }
      mostrar(m);
    });
    $('#sa-form').addEventListener('submit', enviar);
  }
  function mostrar(m) {
    var c = AM[m] || AM.login; modo = m;
    $('#sa-t').textContent = c.t; $('#sa-ayuda').textContent = c.ayuda; $('#sa-ok').textContent = c.ok;
    $('#sa-correo').hidden = !c.correo; $('#sa-clave').hidden = !c.clave;
    if (c.cp) $('#sa-clave').setAttribute('autocomplete', c.cp);
    $('#sa-clave').placeholder = m === 'nueva' ? 'Contraseña (mínimo 8 caracteres)' : 'Contraseña';
    ['#sa-correo', '#sa-clave'].forEach(function (s) { $(s).removeAttribute('aria-invalid'); });
    $('#sa-err').hidden = true; $('#sa-info').hidden = true;
    $('#sa-pie').innerHTML = PIE[m].map(function (x) { return '<button type="button" class="ss-link" data-m="' + x[0] + '">' + x[1] + '</button>'; }).join('');
    $('#ss-auth').classList.add('on');
    setTimeout(function () { var f = c.correo ? $('#sa-correo') : $('#sa-clave'); if (f) f.focus(); }, 30);
  }
  function falla(msg, foco, campo) { var e = $('#sa-err'); e.textContent = msg; e.hidden = false; if (campo) campo.setAttribute('aria-invalid', 'true'); if (foco) foco.focus(); }
  function enviar(ev) {
    ev.preventDefault();
    var m = modo, correo = $('#sa-correo'), clave = $('#sa-clave'), mail = correo.value.trim(), pw = clave.value, ok = $('#sa-ok'), etiqueta = AM[m].ok;
    $('#sa-err').hidden = true; $('#sa-info').hidden = true; correo.removeAttribute('aria-invalid'); clave.removeAttribute('aria-invalid');
    if (AM[m].correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) { falla('Escribe un correo válido.', correo, correo); return; }
    if (AM[m].clave) {
      if (m === 'login' && !pw) { falla('Escribe tu contraseña.', clave, clave); return; }
      if (m === 'nueva' && pw.length < 8) { falla('La contraseña debe tener al menos 8 caracteres.', clave, clave); return; }
    }
    if (!SS.sb) { falla(SIN_SERVICIO); return; }
    ok.disabled = true; ok.textContent = 'Un momento…';
    var auth = SS.sb.auth, p;
    var info = function (t) { var i = $('#sa-info'); i.textContent = t; i.hidden = false; };
    if (m === 'login') p = auth.signInWithPassword({ email: mail, password: pw }).then(function (r) {
      if (r.error) { falla(msgError(r.error), clave, clave); return; }
      recuperando = false; $('#sa-form').reset(); entrar(r.data.session.user);
    });
    else if (m === 'olvide') p = auth.resetPasswordForEmail(mail, { redirectTo: location.origin + location.pathname }).then(function (r) {
      if (r.error) { falla(msgError(r.error)); return; }
      info('Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva.');
    });
    else p = auth.updateUser({ password: pw }).then(function (r) {
      if (r.error) { falla(msgError(r.error)); return; }
      recuperando = false; $('#sa-form').reset();
      return auth.getSession().then(function (s) { if (s.data && s.data.session) entrar(s.data.session.user); });
    });
    Promise.resolve(p).catch(function (x) { falla(msgError(x)); }).then(function () { ok.disabled = false; ok.textContent = etiqueta; });
  }
  function entrar(u) {
    if (!u || recuperando) return;
    SS.user = u; pintar();
    $('#ss-auth').classList.remove('on'); document.documentElement.classList.remove('ss-locked');
  }
  function salir() {
    SS.user = null; pintar();
    if (GATE) { document.documentElement.classList.add('ss-locked'); mostrar('login'); }
  }
  SS.signOut = function () {
    Promise.resolve(SS.sb ? SS.sb.auth.signOut({ scope: 'local' }) : null).catch(function () {}).then(salir);
  };

  function conectar() {
    var cfg = window.SKYSUITE_CFG || {};
    acceso();
    recuperando = /(^|[#&?])type=recovery/.test(location.hash + location.search);
    if (!(window.supabase && window.supabase.createClient && cfg.url && cfg.anon)) { mostrar('login'); falla(SIN_SERVICIO); return; }
    SS.sb = window.supabase.createClient(cfg.url, cfg.anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    var hint = false; try { hint = !!localStorage.getItem('sb-' + new URL(cfg.url).hostname.split('.')[0] + '-auth-token'); } catch (e) {}
    if (!hint || recuperando) mostrar(recuperando ? 'nueva' : 'login');
    SS.sb.auth.onAuthStateChange(function (ev, session) {
      if (ev === 'PASSWORD_RECOVERY') { recuperando = true; setTimeout(function () { mostrar('nueva'); }, 0); return; }
      if (ev === 'SIGNED_OUT') { setTimeout(salir, 0); return; }
      if (session) setTimeout(function () { entrar(session.user); }, 0);
      else if (ev === 'INITIAL_SESSION') setTimeout(function () { if (!SS.user) mostrar(recuperando ? 'nueva' : 'login'); }, 0);
    });
  }
  function cargarSupabase(cb) {
    if (window.supabase && window.supabase.createClient) { cb(); return; }
    var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'; s.onload = cb; s.onerror = cb; document.head.appendChild(s);
  }
  function arrancar() {
    css(); barra();
    if (!GATE) {
      /* Sin gate: mostrar el correo si ya hay sesión compartida, sin pedir acceso. */
      cargarSupabase(function () {
        var cfg = window.SKYSUITE_CFG || {};
        if (!(window.supabase && cfg.url && cfg.anon)) return;
        SS.sb = window.supabase.createClient(cfg.url, cfg.anon, { auth: { persistSession: true, autoRefreshToken: true } });
        SS.sb.auth.getSession().then(function (r) { if (r.data && r.data.session) { SS.user = r.data.session.user; pintar(); } });
      });
      return;
    }
    cargarSupabase(conectar);
  }
  if (document.body) arrancar(); else document.addEventListener('DOMContentLoaded', arrancar);
})();
