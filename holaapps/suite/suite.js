/* Hola Apps · menú de la suite (PrecIA, AgendIA, Organic, Hábitos Atómicos, PlatIA, Numérica, Palabritas) y acceso compartido con Supabase.
   Uso:  Suite.init({ app:'habitos', gate:true, onUser:function(user, sb){}, onLogout:function(){} })
   Sin gate solo se muestra el menú superior (PrecIA y Organic ya traen su propio acceso); esas apps avisan
   el usuario con Suite.setUser(user, sb) y la salida con Suite.setUser(null).
   Suite.addMenuItems([{ label, onClick }]) agrega opciones propias de la app al menú de usuario. */
(function () {
  'use strict';
  var ICONS = {
    precia: '<path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    agendia: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17M8.5 15l2.2 2.2 4.3-4.4"/>',
    organic: '<path d="M12 21v-8"/><path d="M12 13c0-4 2.6-6.4 7-6.4 0 4.2-2.7 6.4-7 6.4Z"/><path d="M12 15.5c0-3-2-4.9-5.5-4.9 0 3.2 2.1 4.9 5.5 4.9Z"/>',
    platia: '<path d="M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v3"/><path d="M3 6v12a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3"/><path d="M21 12v4h-4a2 2 0 0 1 0-4Z"/>',
    numerica: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 16V9l8 7V9"/>',
    palabritas: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-4 3.5V17H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><path d="M8 10h8M8 13h5"/>',
    habitos: '<circle cx="12" cy="12" r="1.7"/><ellipse cx="12" cy="12" rx="9" ry="3.8"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(120 12 12)"/>'
  };
  var APPS = [
    { id: 'precia', nombre: 'PrecIA', color: '#4B3FC4' },
    { id: 'agendia', nombre: 'AgendIA', color: '#7B3FC4' },
    { id: 'organic', nombre: 'Organic', color: '#2c8447' },
    { id: 'habitos', nombre: 'Hábitos Atómicos', color: '#d97b2e' },
    { id: 'platia', nombre: 'PlatIA', color: '#3D3A86' },
    { id: 'numerica', nombre: 'Numérica', color: '#C0398B' },
    { id: 'palabritas', nombre: 'Palabritas', color: '#1D8FD1' }
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
    bar.setAttribute('aria-label', 'Herramientas de Hola Apps');
    bar.innerHTML =
      '<button class="suite-btn" type="button" id="suite-abrir" aria-haspopup="true" aria-expanded="false" aria-controls="suite-pop" aria-label="Herramientas">' +
        svg('<circle cx="5" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="19" cy="5" r="1.6"/><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/><circle cx="5" cy="19" r="1.6"/><circle cx="12" cy="19" r="1.6"/><circle cx="19" cy="19" r="1.6"/>', ' fill="currentColor" stroke="none"') +
      '</button>' +
      '<span class="suite-marca">Hola Apps</span>' + (actual ? '<span class="suite-actual">· ' + actual.nombre + '</span>' : '') +
      '<span class="suite-sp"></span>' +
      '<a class="suite-btn suite-sky" href="/skyport/" title="Ir a Sky Port"><span class="suite-sky-dot" aria-hidden="true"></span>Sky Port</a>' +
      '<span class="suite-user" id="suite-user" hidden>' +
        '<button class="suite-av-btn" type="button" id="suite-av-btn" aria-haspopup="true" aria-expanded="false" aria-controls="suite-um" aria-label="Menú de usuario"><span class="suite-av" id="suite-av-mini"></span><span class="suite-mail" id="suite-mail"></span></button>' +
      '</span>' +
      '<div class="suite-um" id="suite-um" role="menu" hidden>' +
        '<div class="suite-um-quien"><button type="button" class="suite-av suite-av-grande" id="suite-av-grande" title="Cambiar avatar" aria-label="Cambiar avatar"></button><div class="suite-um-txt"><strong id="suite-um-nombre"></strong><small id="suite-um-correo"></small></div></div>' +
        '<button type="button" class="suite-um-op" role="menuitem" id="suite-av-cambiar">Cambiar avatar</button>' +
        '<button type="button" class="suite-um-op" role="menuitem" id="suite-av-quitar" hidden>Quitar avatar</button>' +
        '<div id="suite-um-extra"></div>' +
        '<div class="suite-um-sep" role="separator"></div>' +
        '<button type="button" class="suite-um-op suite-um-salir" role="menuitem" id="suite-salir">Cerrar sesión</button>' +
        '<p class="suite-um-msg" id="suite-um-msg" role="status" hidden></p>' +
        '<input type="file" id="suite-av-file" accept="image/png,image/jpeg,image/webp" hidden>' +
      '</div>' +
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
    montarMenuUsuario();
    pintarUsuario();
    var fit = Suite.opts.fit;
    if (fit) { var st = document.createElement('style'); st.textContent = 'body.suite-on ' + fit + '{height:calc(100% - 44px) !important}'; document.head.appendChild(st); }
  }
  /* ---------- menú de usuario y avatar ---------- */
  var extras = [];
  function nombreDe(u) { var m = (u && u.user_metadata) || {}; return m.nombre || (u && u.email ? u.email.split('@')[0] : 'Usuario'); }
  function avatarDe(u) { var m = (u && u.user_metadata) || {}; return typeof m.avatar_url === 'string' && /^https:\/\//.test(m.avatar_url) ? m.avatar_url : ''; }
  function pintarAvatar(el, u) {
    if (!el) return;
    var url = avatarDe(u), ini = nombreDe(u).trim().charAt(0).toUpperCase() || 'U';
    el.textContent = '';
    if (url) { var img = document.createElement('img'); img.src = url; img.alt = ''; img.onerror = function () { el.textContent = ini; }; el.appendChild(img); }
    else el.textContent = ini;
  }
  function pintarUsuario() {
    var u = Suite.user, box = $('#suite-user');
    if (!box) return;
    box.hidden = !u;
    if (!u) { cerrarMenu(false); return; }
    $('#suite-mail').textContent = nombreDe(u);
    $('#suite-um-nombre').textContent = nombreDe(u); $('#suite-um-correo').textContent = u.email || '';
    pintarAvatar($('#suite-av-mini'), u); pintarAvatar($('#suite-av-grande'), u);
    $('#suite-av-quitar').hidden = !avatarDe(u);
  }
  function pintarExtras() {
    var box = $('#suite-um-extra'); if (!box) return;
    box.innerHTML = '';
    extras.forEach(function (it) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'suite-um-op'; b.setAttribute('role', 'menuitem'); b.textContent = it.label;
      b.addEventListener('click', function () { cerrarMenu(false); it.onClick(); });
      box.appendChild(b);
    });
  }
  Suite.addMenuItems = function (items) { extras = extras.concat(items || []); pintarExtras(); };
  Suite.setUser = function (u, sb) { if (sb) Suite.sb = sb; Suite.user = u || null; pintarUsuario(); };
  var opsMenu = function () { return [].slice.call(document.querySelectorAll('#suite-um .suite-um-op')).filter(function (b) { return !b.hidden; }); };
  function abrirMenu(foco) { var m = $('#suite-um'); if (!m) return; m.hidden = false; $('#suite-av-btn').setAttribute('aria-expanded', 'true'); msg(''); if (foco) { var o = opsMenu()[0]; if (o) o.focus(); } }
  function cerrarMenu(devolver) { var m = $('#suite-um'); if (!m || m.hidden) return; m.hidden = true; $('#suite-av-btn').setAttribute('aria-expanded', 'false'); if (devolver) $('#suite-av-btn').focus(); }
  function msg(t, error) { var p = $('#suite-um-msg'); if (!p) return; p.textContent = t; p.hidden = !t; p.classList.toggle('error', !!error); }
  function montarMenuUsuario() {
    var btn = $('#suite-av-btn'), m = $('#suite-um'), file = $('#suite-av-file');
    btn.addEventListener('click', function () { if (m.hidden) abrirMenu(false); else cerrarMenu(false); });
    btn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); abrirMenu(true); } });
    m.addEventListener('keydown', function (e) {
      var ops = opsMenu(), i = ops.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrarMenu(true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); ops[(i + 1) % ops.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); ops[(i - 1 + ops.length) % ops.length].focus(); }
      else if (e.key === 'Tab') cerrarMenu(false);
    });
    document.addEventListener('click', function (e) { if (!m.hidden && !e.target.closest('#suite-um') && !e.target.closest('#suite-av-btn')) cerrarMenu(false); });
    var elegir = function () { file.value = ''; file.click(); };
    $('#suite-av-cambiar').addEventListener('click', elegir);
    $('#suite-av-grande').addEventListener('click', elegir);
    file.addEventListener('change', function () { if (file.files && file.files[0]) subirAvatar(file.files[0]); });
    $('#suite-av-quitar').addEventListener('click', function () { guardarAvatar('', 'Avatar quitado.'); });
    $('#suite-salir').addEventListener('click', function () { cerrarMenu(false); Suite.signOut(); });
    pintarExtras();
  }
  /* Recorta al centro y reduce a 256×256 JPEG para que pese poco. */
  function reducir(f) {
    return new Promise(function (ok, mal) {
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        var s = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas'); c.width = c.height = 256;
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
        x.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 256, 256);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { if (b) ok(b); else mal(new Error('canvas')); }, 'image/jpeg', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); mal(new Error('imagen')); };
      img.src = url;
    });
  }
  var rutaEnBucket = function (url) { var k = '/storage/v1/object/public/avatars/'; var i = (url || '').indexOf(k); return i < 0 ? '' : decodeURIComponent(url.slice(i + k.length).split('?')[0]); };
  function guardarAvatar(nueva, okMsg) {
    var sb = Suite.sb, u = Suite.user; if (!sb || !u) return Promise.resolve();
    var vieja = rutaEnBucket(avatarDe(u));
    msg('Guardando…');
    return sb.auth.updateUser({ data: { avatar_url: nueva } }).then(function (r) {
      if (r.error) throw r.error;
      Suite.user = r.data.user; pintarUsuario(); msg(okMsg);
      if (vieja && vieja.indexOf(u.id + '/') === 0) sb.storage.from('avatars').remove([vieja]).catch(function () {});
    }).catch(function (e) { console.warn('Hola Apps: no se pudo guardar el avatar', e); msg('No se pudo guardar el avatar. Inténtalo de nuevo.', true); });
  }
  function subirAvatar(f) {
    var sb = Suite.sb, u = Suite.user; if (!sb || !u) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { msg('Usa una imagen JPG, PNG o WebP.', true); return; }
    if (f.size > 10 * 1024 * 1024) { msg('La imagen pesa más de 10 MB.', true); return; }
    msg('Subiendo…');
    reducir(f).then(function (blob) {
      var ruta = u.id + '/avatar-' + Date.now() + '.jpg';
      return sb.storage.from('avatars').upload(ruta, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }).then(function (r) {
        if (r.error) throw r.error;
        var pub = sb.storage.from('avatars').getPublicUrl(ruta).data.publicUrl;
        return guardarAvatar(pub, 'Avatar actualizado.');
      });
    }).catch(function (e) { console.warn('Hola Apps: no se pudo subir el avatar', e); msg('No se pudo subir la imagen. Inténtalo de nuevo.', true); });
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
        '<h1>Hola Apps</h1><h2 id="sa-titulo">Iniciar sesión</h2><p class="suite-ayuda" id="sa-ayuda"></p>' +
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
    if (!Suite.opts.gate) { if (Suite.opts.onSignOut) Suite.opts.onSignOut(); else if (Suite.sb) Suite.sb.auth.signOut({ scope: 'local' }).catch(function () {}); return; }
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
