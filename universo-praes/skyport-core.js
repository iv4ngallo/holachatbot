/* Barra superior "Núcleo de Sky Port": vuelve a /skyport/ desde cualquier página del universo.
   Un solo archivo para las cuatro páginas. Atributo opcional en el script: data-float (superpone la barra en lugar de empujar el contenido). */
(function () {
  if (document.getElementById('spc-bar')) return;
  var me = document.currentScript, float = !!(me && me.hasAttribute('data-float'));
  var css = '' +
    '#spc-bar{position:' + (float ? 'absolute;left:0;right:0;top:0' : 'relative') + ';z-index:2147481000;display:flex;align-items:center;gap:12px;height:38px;padding:0 14px 0 8px;' +
    'background:linear-gradient(180deg,#04070a,rgba(4,7,10,.94));border-bottom:1px solid rgba(255,199,0,.28);color:#FFF3C4;text-decoration:none;' +
    'font:700 11px/1 "Michroma","Roboto Condensed",system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;-webkit-tap-highlight-color:transparent}' +
    '#spc-bar:hover,#spc-bar:focus-visible{background:#0b0f14;border-bottom-color:rgba(255,199,0,.7);outline:none}' +
    '#spc-bar .spc-ico{--F:64px;position:relative;flex:none;width:34px;height:34px;overflow:hidden}' +
    '#spc-bar .spc-ico i{position:absolute;left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%);display:block}' +
    '#spc-bar .c0{width:calc(var(--F)*.16);height:calc(var(--F)*.16);background:radial-gradient(circle,#fff 0,#FFF3C4 35%,#FFC700 70%,#FF3B3B 100%);box-shadow:0 0 6px #FFC700,0 0 14px rgba(255,59,59,.65);animation:spc-pulse 1.7s ease-in-out infinite}' +
    '#spc-bar .c1{width:calc(var(--F)*.7);height:calc(var(--F)*.7);background:radial-gradient(circle,rgba(255,199,0,.55) 0,rgba(255,120,40,.22) 38%,rgba(255,59,59,0) 70%);animation:spc-halo 3.2s ease-in-out infinite}' +
    '#spc-bar .c2,#spc-bar .c3{border:1px dashed rgba(255,199,0,.75)}' +
    '#spc-bar .c2{width:calc(var(--F)*.3);height:calc(var(--F)*.3);animation:spc-spin 7s linear infinite}' +
    '#spc-bar .c3{width:calc(var(--F)*.46);height:calc(var(--F)*.46);border-color:rgba(255,59,59,.7);border-style:dotted;animation:spc-spin 11s linear infinite reverse}' +
    '#spc-bar .spc-t{display:flex;flex-direction:column;gap:4px;min-width:0}' +
    '#spc-bar .spc-t b{font-weight:700;color:#fff;white-space:nowrap}' +
    '#spc-bar .spc-t small{font:400 9px/1 "Courier Prime",ui-monospace,monospace;letter-spacing:.12em;color:#c9a94a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#spc-bar .spc-go{margin-left:auto;font-size:10px;color:#FFC700;white-space:nowrap}' +
    '@media(max-width:520px){#spc-bar .spc-t small{display:none}#spc-bar .spc-go{font-size:9px}}' +
    '@keyframes spc-pulse{0%,100%{transform:translate(-50%,-50%) scale(.85)}50%{transform:translate(-50%,-50%) scale(1.2)}}' +
    '@keyframes spc-halo{0%,100%{transform:translate(-50%,-50%) scale(.8);opacity:.7}50%{transform:translate(-50%,-50%) scale(1.15);opacity:1}}' +
    '@keyframes spc-spin{to{transform:translate(-50%,-50%) rotate(360deg)}}' +
    '@media(prefers-reduced-motion:reduce){#spc-bar .spc-ico i{animation:none!important}}';
  var st = document.createElement('style'); st.id = 'spc-style'; st.textContent = css; document.head.appendChild(st);
  var a = document.createElement('a');
  a.id = 'spc-bar'; a.href = '/skyport/'; a.setAttribute('aria-label', 'Volver a TEGC Sky Port');
  a.innerHTML = '<span class="spc-ico" aria-hidden="true"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c0"></i></span>' +
    '<span class="spc-t"><b>Sky Port</b><small>Núcleo de TEGC</small></span><span class="spc-go">Volver &#8594;</span>';
  function put() { document.body.insertBefore(a, document.body.firstChild); }
  if (document.body) put(); else document.addEventListener('DOMContentLoaded', put);
})();
