// Genera el blog estático de Iván Gallo a partir de los posts publicados en Supabase.
// Uso: node tools/build-blog.mjs   (sin dependencias; Node 18+)
// Escribe: ivangallo/blog/<slug>/index.html, listado en ivangallo/blog/index.html, feed.xml,
// entradas en sitemap.xml y llms.txt. Si la consulta falla, termina con error y no toca nada.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const blog = path.join(root, 'ivangallo', 'blog');
const SITE = 'https://holaibague.co';
const MD = require(path.join(blog, 'md.js'));
const cfgSrc = fs.readFileSync(path.join(blog, 'config.js'), 'utf8');
const url = /url:\s*'([^']+)'/.exec(cfgSrc)?.[1];
const anon = /anon:\s*'([^']+)'/.exec(cfgSrc)?.[1];
if (!url || !anon) throw new Error('No se pudo leer config.js');

const res = await fetch(`${url}/rest/v1/blog_posts?select=slug,lang,title,excerpt,body,tags,published_at,updated_at&published=eq.true&order=published_at.desc`, { headers: { apikey: anon, Accept: 'application/json' } });
if (!res.ok) throw new Error(`Supabase respondió ${res.status}`);
const posts = await res.json();
const esc = MD.esc;
const fmt = (d, l) => new Date(d).toLocaleDateString(l === 'en' ? 'en-US' : 'es-CO', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota' });
const swap = (file, tag, inner) => {
  const s = fs.readFileSync(file, 'utf8');
  const re = new RegExp(`(<!--\\s*${tag}\\s*-->)[\\s\\S]*?(<!--\\s*/${tag}\\s*-->)`);
  if (!re.test(s)) throw new Error(`Falta el marcador ${tag} en ${file}`);
  fs.writeFileSync(file, s.replace(re, (_, a, b) => `${a}\n${inner}\n${b}`));
};

// 1) Páginas de cada entrada
const manifestFile = path.join(blog, '.posts.json');
const prev = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : [];
const now = new Set(posts.map(p => p.slug));
for (const old of prev) if (!now.has(old) && /^[a-z0-9-]+$/.test(old)) fs.rmSync(path.join(blog, old), { recursive: true, force: true });

for (const p of posts) {
  const canon = `${SITE}/ivangallo/blog/${p.slug}/`;
  const desc = p.excerpt || p.title;
  const ld = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: desc, inLanguage: p.lang,
    datePublished: p.published_at, dateModified: p.updated_at || p.published_at, mainEntityOfPage: canon, url: canon,
    keywords: (p.tags || []).join(', '), author: { '@type': 'Person', name: 'Iván Gallo', url: `${SITE}/ivangallo/` },
    isPartOf: { '@type': 'Blog', '@id': `${SITE}/ivangallo/blog/#blog` }
  };
  const html = `<!DOCTYPE html>
<html lang="${esc(p.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(p.title)} · Iván Gallo</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canon}">
<link rel="icon" type="image/svg+xml" href="../../favicon.svg?v=2">
<link rel="icon" type="image/png" sizes="32x32" href="../../favicon-32.png?v=2">
<link rel="alternate" type="application/rss+xml" title="Blog de Iván Gallo" href="${SITE}/ivangallo/blog/feed.xml">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canon}">
<meta property="article:published_time" content="${esc(p.published_at)}">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap">
<link rel="stylesheet" href="../../css/style.css">
<link rel="stylesheet" href="../blog.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<header class="bh"><div class="wrap bh-in">
  <a class="label" href="../../">Iván Gallo</a>
  <nav class="label" aria-label="Principal"><a href="../../">Perfil</a><a href="../">Blog</a></nav>
</div></header>
<main class="wrap bmain narrow">
<article>
  <p class="eyebrow"><time datetime="${esc(p.published_at)}">${esc(fmt(p.published_at, p.lang))}</time></p>
  <h1 class="btitle">${esc(p.title)}</h1>
  ${(p.tags || []).length ? `<div class="tags">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
  <div class="prose-b">
${MD.render(p.body)}
  </div>
</article>
</main>
<footer class="bfoot"><div class="wrap"><a href="../">Volver al blog</a></div></footer>
</body>
</html>
`;
  fs.mkdirSync(path.join(blog, p.slug), { recursive: true });
  fs.writeFileSync(path.join(blog, p.slug, 'index.html'), html);
}
fs.writeFileSync(manifestFile, JSON.stringify([...now].sort(), null, 1) + '\n');

// 2) Listado en el índice del blog (mismo formato que dibuja blog.js)
const list = posts.map(p => `    <li class="pitem"><time datetime="${esc(p.published_at)}">${esc(fmt(p.published_at, p.lang))}</time><article><h2><a href="${p.slug}/" lang="${esc(p.lang)}">${esc(p.title)}</a></h2>${p.excerpt ? `<p lang="${esc(p.lang)}">${esc(p.excerpt)}</p>` : ''}${(p.tags || []).length ? `<div class="tags">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}</article></li>`).join('\n');
const indexFile = path.join(blog, 'index.html');
swap(indexFile, 'BLOG:LIST', `  <ul class="plist" id="plist">\n${list}\n  </ul>`);
swap(indexFile, 'BLOG:STATIC', `<script>window.BLOG_STATIC=${JSON.stringify(posts.map(p => p.slug))};</script>`);

// 3) RSS
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Blog de Iván Gallo</title><link>${SITE}/ivangallo/blog/</link>
<description>Notas sobre estrategia, administración de proyectos, producto digital y Go-To-Market.</description>
${posts.map(p => `<item><title>${esc(p.title)}</title><link>${SITE}/ivangallo/blog/${p.slug}/</link><guid>${SITE}/ivangallo/blog/${p.slug}/</guid><pubDate>${new Date(p.published_at).toUTCString()}</pubDate><description>${esc(p.excerpt || '')}</description></item>`).join('\n')}
</channel></rss>
`;
fs.writeFileSync(path.join(blog, 'feed.xml'), feed);

// 4) sitemap.xml y llms.txt
swap(path.join(root, 'sitemap.xml'), 'BLOG:URLS', posts.map(p => `  <url><loc>${SITE}/ivangallo/blog/${p.slug}/</loc><lastmod>${(p.updated_at || p.published_at).slice(0, 10)}</lastmod></url>`).join('\n'));
swap(path.join(root, 'llms.txt'), 'BLOG:LIST', posts.length ? posts.map(p => `- [${p.title}](${SITE}/ivangallo/blog/${p.slug}/): ${p.excerpt || p.title}`).join('\n') : '(Aún no hay entradas publicadas.)');
console.log(`Blog generado: ${posts.length} entrada(s).`);
