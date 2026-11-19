/* Markdown mínimo y seguro (escapa todo el HTML antes de interpretar). Sirve en el navegador y en Node.
   Admite: títulos #, párrafos, **negrita**, *cursiva*, `código`, bloques ```, listas - y 1., citas >, ---, enlaces y imágenes. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BlogMD = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) {
    u = String(u).trim();
    return /^(https?:\/\/|\/|\.\.?\/|#|mailto:)/i.test(u) ? u : '';
  }
  function inline(t) {
    var codes = [];
    t = esc(t).replace(/`([^`]+)`/g, function (_, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, u) {
      u = safeUrl(u.replace(/&amp;/g, '&')); return u && !/^mailto:/i.test(u) ? '<img src="' + esc(u) + '" alt="' + alt + '" loading="lazy">' : alt;
    });
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, txt, u) {
      u = safeUrl(u.replace(/&amp;/g, '&')); if (!u) return txt;
      var ext = /^https?:\/\//i.test(u) ? ' rel="noopener noreferrer" target="_blank"' : '';
      return '<a href="' + esc(u) + '"' + ext + '>' + txt + '</a>';
    });
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    return t.replace(/\u0000(\d+)\u0000/g, function (_, i) { return '<code>' + codes[+i] + '</code>'; });
  }
  function render(src) {
    var lines = String(src || '').replace(/\r\n?/g, '\n').split('\n'), out = [], i = 0, m;
    function para(buf) { if (buf.length) out.push('<p>' + inline(buf.join(' ')) + '</p>'); }
    var buf = [];
    while (i < lines.length) {
      var ln = lines[i];
      if ((m = /^```(\w*)\s*$/.exec(ln))) {
        para(buf); buf = []; var code = []; i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
        i++; out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); continue;
      }
      if (!ln.trim()) { para(buf); buf = []; i++; continue; }
      if ((m = /^(#{1,4})\s+(.*)$/.exec(ln))) { para(buf); buf = []; var lv = Math.min(m[1].length + 1, 5); out.push('<h' + lv + '>' + inline(m[2]) + '</h' + lv + '>'); i++; continue; }
      if (/^(-{3,}|\*{3,})\s*$/.test(ln)) { para(buf); buf = []; out.push('<hr>'); i++; continue; }
      if (/^>\s?/.test(ln)) { para(buf); buf = []; var q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, '')); out.push('<blockquote>' + render(q.join('\n')) + '</blockquote>'); continue; }
      if (/^\s*[-*]\s+/.test(ln)) { para(buf); buf = []; var ul = []; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) ul.push('<li>' + inline(lines[i++].replace(/^\s*[-*]\s+/, '')) + '</li>'); out.push('<ul>' + ul.join('') + '</ul>'); continue; }
      if (/^\s*\d+[.)]\s+/.test(ln)) { para(buf); buf = []; var ol = []; while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) ol.push('<li>' + inline(lines[i++].replace(/^\s*\d+[.)]\s+/, '')) + '</li>'); out.push('<ol>' + ol.join('') + '</ol>'); continue; }
      buf.push(ln.trim()); i++;
    }
    para(buf);
    return out.join('\n');
  }
  return { render: render, esc: esc };
});
