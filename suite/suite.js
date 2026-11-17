/* Hola Chatbot · menú de la suite (PrecIA, AgendIA, Organic, Hábitos Atómicos) y acceso compartido con Supabase.
   Uso:  Suite.init({ app:'habitos', gate:true, onUser:function(user, sb){}, onLogout:function(){} })
   Sin gate solo se muestra el menú superior (PrecIA y Organic ya traen su propio acceso). */
(function () {
  'use strict';
  var ICONS = {
    precia: '<path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    agendia: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17M8.5 15l2.2 2.2 4.3-4.4"/>',
    organic: '<path d="M12 21v-8"/><path d="M12 13c0-4 2.6-6.4 7-6.4 0 4.2-2.7 6.4-7 6.4Z"/><path d="M12 15.5c0-3-2-4.9-5.5-4.9 0 3.2 2.1 4.9 5.5 4.9Z"/>',
    habitos: '<circle cx="12" cy="12" r="1.7"/><ellipse cx="12" cy="12" rx="9" ry="3.8"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(120 12 12)"/>'
  };
  var APPS = [
    { id: 'precia', nombre: 'PrecIA', color: '#4B3FC4' },
    { id: 'agendia', nombre: 'AgendIA', color: '#7B3FC4' },
    { id: 'organic', nombre: 'Organic', color: '#2c8447' },
    { id: 'habitos', nombre: 'Hábitos Atómicos', color: '#d97b2e' }
  ];
  var svg = function (inner, extra) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + inner + '</svg>'; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var Suite = window.Suite = { user: null, sb: null, opts: {} };
  var SIN_SERVICIO = 'No se pudo cargar el servicio de acceso. Recarga la página.';

  function msgError(e) {
    var c = (e && e.code) || '', m = String((e && e.message) || '').toLowerCase();
    if (c === 'invalid_credentials') return 'Correo o contraseña incorrectos.';
    if (c === 'email_not_confirmed') return 'Confirma tu correo: te enviamos un enlace de verificación.';
    if (c === 'user_already_exists' || c === 'email_exists') return 'Ya existe una cuenta con ese correo. Inicia sesión.';
    if (c === 'weak_password') return 'La contraseña es muy débil. Usa al menos 8 caracteres, con letras y números.';
    if (c === 'same_password') return 'La contraseña nueva debe ser distinta de la anterior.';
    if (c === 'over_email_send_rate_limit' || c === 'over_request_rate_limit') return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    if (/fetch|network/.test(m)) return 'No hay conexión con el servicio. Revisa tu internet.';
    return 'No se pudo completar la acción. Inténtalo de nuevo.';
  }

  /* ---------- menú superior ---------- */
  function montarBarra(app) {
    if ($('.suite-bar')) return;
    var actual = APPS.filter(function (a) { return a.id === app; })[0];
    var bar = document.createElement('div');
    bar.className = 'suite-bar';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'Herramientas de Hola Chatbot');
    bar.innerHTML =
      '<button class="suite-btn" type="button" id="suite-abrir" aria-haspopup="true" aria-expanded="false" aria-controls="suite-pop" aria-label="Herramientas">' +
        svg('<circle cx="5" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="19" cy="5" r="1.6"/><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/><circle cx="5" cy="19" r="1.6"/><circle cx="12" cy="19" r="1.6"/><circle cx="19" cy="19" r="1.6"/>', ' fill="currentColor" stroke="none"') +
      '</button>' +
      '<span class="suite-marca">Hola Chatbot</span>' + (actual ? '<span class="suite-actual">· ' + actual.nombre + '</span>' : '') +
      '<span class="suite-sp"></span>' +
      '<span class="suite-user" id="suite-user" hidden><span class="suite-mail" id="suite-mail"></span><button class="suite-btn" type="button" id="suite-salir">Cerrar sesión</button></span>' +
      '<div class="suite-pop" id="suite-pop" role="menu" hidden>' +
        APPS.map(function (a) {
          return '<a class="suite-app" role="menuitem" href="' + new URL('../' + a.id + '/', location.href).pathname + '"' + (a.id === app ? ' aria-current="page"' : '') + '>' +
            '<span class="suite-ico" style="background:' + a.color + '">' + svg(ICONS[a.id]) + '</span>' + a.nombre + '</a>';
        }).join('') +
      '</div>';
    document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add('suite-on');
    var btn = $('#suite-abrir'), pop = $('#suite-pop');
    var cerrar = function (foco) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (foco) btn.focus(); };
    btn.addEventListener('click', function () {
      var abre = pop.hidden; pop.hidden = !abre; btn.setAttribute('aria-expanded', String(abre));
      if (abre) { var a = $('.suite-app[aria-current="page"]', pop) || $('.suite-app', pop); if (a) a.focus(); }
    });
    document.addEventListener('click', function (e) { if (!pop.hidden && !e.target.closest('.suite-pop') && !e.target.closest('#suite-abrir')) cerrar(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) { e.stopPropagation(); cerrar(true); } }, true);
    $('#suite-salir').addEventListener('click', function () { Suite.signOut(); });
    var fit = Suite.opts.fit;
    if (fit) { var st = document.createElement('style'); st.textContent = 'body.suite-on ' + fit + '{height:calc(100% - 44px) !important}'; document.head.appendChild(st); }
  }
  function pintarUsuario() {
    var u = Suite.user, box = $('#suite-user');
    if (!box) return;
    box.hidden = !u; $('#suite-mail').textContent = u && u.email ? u.email : '';
  }

  /* ---------- acceso ---------- */
  var AM = {
    login: { t: 'Iniciar sesión', ayuda: 'Entra para ver tus datos en cualquier dispositivo.', ok: 'Entrar', nombre: 0, correo: 1, clave: 1, cp: 'current-password' },
    registro: { t: 'Crear cuenta', ayuda: 'Una sola cuenta para todas las herramientas. Tus datos solo los ves tú.', ok: 'Crear cuenta', nombre: 1, correo: 1, clave: 1, cp: 'new-password' },
    olvide: { t: 'Recuperar contraseña', ayuda: 'Escribe tu correo y te enviamos un enlace para crear una contraseña nueva.', ok: 'Enviar enlace', nombre: 0, correo: 1, clave: 0 },
    nueva: { t: 'Nueva contraseña', ayuda: 'Escribe la contraseña nueva para tu cuenta.', ok: 'Guardar contraseña', nombre: 0, correo: 0, clave: 1, cp: 'new-password' }
  };
  var PIE = { login: [['registro', 'Crear cuenta'], ['olvide', 'Olvidé mi contraseña']], registro: [['login', 'Ya tengo cuenta']], olvide: [['login', 'Volver']], nueva: [['cancelar', 'Cancelar']] };
  var modo = 'login', recuperando = false;

  function montarAcceso() {
    var d = document.createElement('div');
    d.className = 'suite-auth'; d.id = 'suite-auth'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'sa-titulo');
    d.innerHTML =
      '<form class="suite-card" id="sa-form" novalidate>' +
        '<h1>Hola Chatbot</h1><h2 id="sa-titulo">Iniciar sesión</h2><p class="suite-ayuda" id="sa-ayuda"></p>' +
        '<input id="sa-nombre" type="text" autocomplete="name" placeholder="Nombre (opcional)" aria-label="Nombre" hidden>' +
        '<input id="sa-correo" type="email" autocomplete="email" inputmode="email" placeholder="Correo" aria-label="Correo">' +
        '<input id="sa-clave" type="password" autocomplete="current-password" placeholder="Contraseña" aria-label="Contraseña">' +
        '<p class="suite-err" id="sa-err" role="alert" hidden></p><p class="suite-info" id="sa-info" role="status" hidden></p>' +
        '<button class="suite-ok" type="submit" id="sa-ok">Entrar</button><div class="suite-pie" id="sa-pie"></div>' +
      '</form>';
    document.body.appendChild(d);
    $('#sa-pie').addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return; var m = b.getAttribute('data-m');
      if (m === 'cancelar') { recuperando = false; if (Suite.sb) Suite.sb.auth.signOut({ scope: 'local' }).catch(function () {}); mostrar('login'); return; }
      mostrar(m);
    });
    $('#sa-form').addEventListener('submit', enviar);
  }
  function mostrar(m) {
    var c = AM[m] || AM.login; modo = m;
    $('#sa-titulo').textContent = c.t; $('#sa-ayuda').textContent = c.ayuda; $('#sa-ok').textContent = c.ok;
    $('#sa-nombre').hidden = !c.nombre; $('#sa-correo').hidden = !c.correo; $('#sa-clave').hidden = !c.clave;
    if (c.cp) $('#sa-clave').setAttribute('autocomplete', c.cp);
    $('#sa-clave').placeholder = (m === 'registro' || m === 'nueva') ? 'Contraseña (mínimo 8 caracteres)' : 'Contraseña';
    ['#sa-correo', '#sa-clave'].forEach(function (s) { $(s).removeAttribute('aria-invalid'); });
    $('#sa-err').hidden = true; $('#sa-info').hidden = true;
    $('#sa-pie').innerHTML = PIE[m].map(function (x) { return '<button type="button" class="suite-link" data-m="' + x[0] + '">' + x[1] + '</button>'; }).join('');
    $('#suite-auth').classList.add('on');
    setTimeout(function () { var f = c.correo ? $('#sa-correo') : $('#sa-clave'); if (f) f.focus(); }, 30);
  }
  var ocultar = function () { $('#suite-auth').classList.remove('on'); };
  function falla(msg, foco, campo) { var e = $('#sa-err'); e.textContent = msg; e.hidden = false; if (campo) campo.setAttribute('aria-invalid', 'true'); if (foco) foco.focus(); }

  function enviar(ev) {
    ev.preventDefault();
    var m = modo, correo = $('#sa-correo'), clave = $('#sa-clave'), mail = correo.value.trim(), pw = clave.value, ok = $('#sa-ok'), etiqueta = AM[m].ok;
    $('#sa-err').hidden = true; $('#sa-info').hidden = true; correo.removeAttribute('aria-invalid'); clave.removeAttribute('aria-invalid');
    if (AM[m].correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) { falla('Escribe un correo válido, por ejemplo tucorreo@ejemplo.com.', correo, correo); return; }
    if (AM[m].clave) {
      if (m === 'login' && !pw) { falla('Escribe tu contraseña.', clave, clave); return; }
      if (m !== 'login' && pw.length < 8) { falla('La contraseña debe tener al menos 8 caracteres.', clave, clave); return; }
    }
    if (!Suite.sb) { falla(SIN_SERVICIO); return; }
    ok.disabled = true; ok.textContent = 'Un momento…';
    var auth = Suite.sb.auth, base = location.origin + location.pathname, p;
    var info = function (t) { var i = $('#sa-info'); i.textContent = t; i.hidden = false; };
    if (m === 'login') p = auth.signInWithPassword({ email: mail, password: pw }).then(function (r) {
      if (r.error) { falla(msgError(r.error), clave, clave); return; }
      recuperando = false; $('#sa-form').reset(); entrar(r.data.session.user);
    });
    else if (m === 'registro') p = auth.signUp({ email: mail, password: pw, options: { data: { nombre: $('#sa-nombre').value.trim() }, emailRedirectTo: base } }).then(function (r) {
      if (r.error) { falla(msgError(r.error)); return; }
      if (r.data.session) { recuperando = false; $('#sa-form').reset(); entrar(r.data.session.user); }
      else { $('#sa-form').reset(); info('Cuenta creada. Te enviamos un correo para confirmarla: ábrelo y luego inicia sesión.'); }
    });
    else if (m === 'olvide') p = auth.resetPasswordForEmail(mail, { redirectTo: base }).then(function (r) {
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
    if (!u) return;
    if (Suite.user && Suite.user.id === u.id) { Suite.user = u; pintarUsuario(); return; }
    if (recuperando) return;
    Suite.user = u; pintarUsuario(); ocultar();
    if (Suite.opts.onUser) Suite.opts.onUser(u, Suite.sb);
  }
  function salir() {
    if (!Suite.user) return;
    Suite.user = null; pintarUsuario();
    if (Suite.opts.onLogout) Suite.opts.onLogout();
    mostrar('login');
  }
  Suite.signOut = function () {
    var fin = function () { salir(); };
    if (!Suite.sb) { fin(); return; }
    Promise.resolve(Suite.sb.auth.signOut({ scope: 'local' })).catch(function () {}).then(fin);
  };

  Suite.init = function (opts) {
    opts = opts || {}; Suite.opts = opts;
    var arrancar = function () {
      montarBarra(opts.app);
      if (!opts.gate) return;
      var cfg = window.SUITE_CFG || {};
      recuperando = /(^|[#&?])type=recovery/.test(location.hash + location.search);
      if (window.supabase && window.supabase.createClient && cfg.url && cfg.anon) {
        Suite.sb = window.supabase.createClient(cfg.url, cfg.anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      }
      montarAcceso();
      if (!Suite.sb) { mostrar('login'); falla(SIN_SERVICIO); return; }
      var hint = false; try { hint = !!localStorage.getItem('sb-' + new URL(cfg.url).hostname.split('.')[0] + '-auth-token'); } catch (e) {}
      if (!hint || recuperando) mostrar(recuperando ? 'nueva' : 'login');
      /* Dentro del callback no se llama a Supabase directamente: se difiere con setTimeout. */
      Suite.sb.auth.onAuthStateChange(function (ev, session) {
        if (ev === 'PASSWORD_RECOVERY') { recuperando = true; setTimeout(function () { mostrar('nueva'); }, 0); return; }
        if (ev === 'SIGNED_OUT') { setTimeout(salir, 0); return; }
        if (session) setTimeout(function () { entrar(session.user); }, 0);
        else if (ev === 'INITIAL_SESSION') setTimeout(function () { if (!Suite.user) mostrar(recuperando ? 'nueva' : 'login'); }, 0);
      });
    };
    if (document.body) arrancar(); else document.addEventListener('DOMContentLoaded', arrancar);
  };
})();
