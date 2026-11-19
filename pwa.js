/* Instalación como app (PWA) para los sitios de holaibague.co.
   Uso: <script src="/pwa.js" data-sw="sw.js" data-name="Nombre" data-icon="icon-192.png" data-accent="#hex" defer></script>
   - Registra el service worker indicado en data-sw (relativo a la página).
   - Al arrancar muestra un aviso para instalar (Chrome, Edge, Android) o las instrucciones de "Añadir a pantalla de inicio" (iOS).
   - No aparece si la app ya está instalada ni durante 3 días después de pulsar "Ahora no". */
(function () {
  'use strict';
  var s = document.currentScript;
  if (!s) return;
  var D = s.dataset;
  var abs = function (p) { return new URL(p, location.href).href; };
  var name = D.name || document.title || 'esta app';
  var swUrl = D.sw ? abs(D.sw) : '';
  var icon = D.icon ? abs(D.icon) : '';
  var accent = D.accent || '#3D3A86', on = D.on || '#FFFFFF', bg = D.bg || '#FFFFFF', fg = D.fg || '#1E1C46', mut = D.muted || '#5B5D60';
  var KEY = 'pwa.no:' + (swUrl ? new URL('.', swUrl).pathname : location.pathname);
  var dp = null, host = null, shown = false;

  if (swUrl && 'serviceWorker' in navigator) {
    addEventListener('load', function () { navigator.serviceWorker.register(swUrl).catch(function () {}); });
  }

  function standalone() { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: window-controls-overlay)').matches || navigator.standalone === true; }
  function muted() { try { var t = +localStorage.getItem(KEY); return !!t && Date.now() - t < 3 * 864e5; } catch (e) { return false; } }
  function hide(remember) {
    if (host) (host.shadowRoot?host.shadowRoot.querySelector(".b"):host.firstChild).classList.remove('on');
    if (remember) { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function build(ios) {
    if (host) return;
    host = document.createElement('div');
    host.setAttribute('data-pwa', '');
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    root.innerHTML =
      '<style>' +
      ':host{all:initial}' +
      '.b{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:2147483000;width:min(440px,calc(100vw - 24px));box-sizing:border-box;transform:translate(-50%,24px);opacity:0;pointer-events:none;transition:opacity .35s ease,transform .35s cubic-bezier(.2,.7,.2,1);background:' + bg + ';color:' + fg + ';border-radius:16px;box-shadow:0 10px 34px rgba(0,0,0,.28),0 0 0 1px rgba(0,0,0,.08);padding:14px;display:flex;gap:12px;align-items:center;font:14px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
      '.b.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}' +
      'img{width:44px;height:44px;border-radius:11px;flex:none}' +
      '.t{flex:1;min-width:0}b{display:block;font-size:15px;font-weight:700}' +
      'span{display:block;margin-top:3px;font-size:12.5px;color:' + mut + '}' +
      '.k{display:flex;flex-direction:column;gap:6px;flex:none}' +
      'button{font:inherit;font-weight:700;font-size:13px;border:0;border-radius:10px;padding:9px 14px;cursor:pointer;min-height:36px}' +
      '.go{background:' + accent + ';color:' + on + '}.go:hover{filter:brightness(1.08)}' +
      '.no{background:transparent;color:' + mut + '}.no:hover{color:' + fg + '}' +
      'button:focus-visible{outline:3px solid ' + accent + ';outline-offset:2px}' +
      '@media (prefers-reduced-motion:reduce){.b{transition:none}}' +
      '</style>' +
      '<div class="b" role="dialog" aria-label="Instalar la aplicación">' +
      (icon ? '<img src="' + esc(icon) + '" alt="" width="44" height="44">' : '') +
      '<div class="t"><b>Instalar ' + esc(name) + '</b><span>' +
      (ios ? 'Toca Compartir y luego «Añadir a pantalla de inicio» para usarla como app.' : 'Instálala como app para abrirla más rápido y en pantalla completa.') +
      '</span></div><div class="k">' + (ios ? '' : '<button type="button" class="go">Instalar</button>') +
      '<button type="button" class="no">' + (ios ? 'Entendido' : 'Ahora no') + '</button></div></div>';
    document.body.appendChild(host);
    var q = function (sel) { return root.querySelector(sel); };
    var go = q('.go');
    if (go) go.addEventListener('click', function () {
      if (!dp) return;
      var p = dp; dp = null; hide(false); p.prompt();
      p.userChoice.then(function (c) { if (c.outcome !== 'accepted') hide(true); }).catch(function () {});
    });
    q('.no').addEventListener('click', function () { hide(true); });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(true); });
  }
  function show(ios) {
    if (shown || standalone() || muted()) return;
    shown = true; build(ios);
    setTimeout(function () { host.shadowRoot ? host.shadowRoot.querySelector('.b').classList.add('on') : host.firstChild.classList.add('on'); }, 1500);
  }
  function whenBody(fn) { if (document.body) fn(); else addEventListener('DOMContentLoaded', fn); }

  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); dp = e; whenBody(function () { show(false); }); });
  addEventListener('appinstalled', function () { dp = null; hide(false); shown = true; });
  whenBody(function () {
    var ua = navigator.userAgent;
    var ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios && !standalone()) show(true);
  });
})();
