// Sonda: revisa qué sitios responden y cómo, sin recolectar precios. Uso: node src/sonda.mjs [id,id,...]
// Guarda scraper/debug/sonda.json (y una captura por sitio) para decidir cómo escribir el adaptador de cada cadena.
import fs from 'node:fs';
import { CANDIDATAS, ADAPTADORES, regionVtex } from './adapters/index.mjs';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const todas = { ...CANDIDATAS, ...Object.fromEntries(Object.values(ADAPTADORES).map((a) => [a.id, [a.nombre, a.base]])) };
const ids = (process.env.CADENAS || process.argv[2] || Object.keys(todas).join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: process.env.HEADLESS !== '0' });
const ctx = await browser.newContext({ userAgent: UA, locale: 'es-CO', timezoneId: 'America/Bogota', viewport: { width: 1366, height: 900 } });
fs.mkdirSync('debug/sonda', { recursive: true });
const informe = {};

// Sitios no VTEX: escribe "leche" en el buscador de la página y anota la URL resultante y las respuestas JSON que la página pide.
async function probarBusqueda(page, base) {
  const out = { json: [] };
  const onResp = async (resp) => {
    try {
      if (!(resp.headers()['content-type'] || '').includes('json') || resp.status() >= 400) return;
      const txt = await resp.text();
      out.json.push({ url: resp.url().slice(0, 300), bytes: txt.length, muestra: txt.slice(0, 200), precios: /"(price|precio|sellingPrice|finalPrice|salePrice)"/i.test(txt) });
    } catch { /* respuesta liberada */ }
  };
  page.on('response', onResp);
  try {
    const caja = page.locator('input[type="search"], input[placeholder*="uscar" i], input[name*="search" i], input[name="q"], input[id*="search" i]').first();
    await caja.waitFor({ state: 'visible', timeout: 8000 });
    await caja.fill('leche');
    await caja.press('Enter');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(2500);
    out.url_resultado = page.url();
    out.texto = await page.evaluate(() => document.body?.innerText?.slice(0, 1500) || '');
  } catch (e) { out.error = e.message.split('\n')[0]; }
  page.off('response', onResp);
  out.json = out.json.filter((j) => j.precios).slice(0, 8);
  return out;
}

for (const id of ids) {
  const [nombre, base] = todas[id] || [];
  if (!base) { console.log(`${id}: desconocida`); continue; }
  const page = await ctx.newPage();
  const r = { nombre, base };
  try {
    const resp = await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
    r.inicio = resp?.status() ?? null;
    r.url_final = page.url();
    r.titulo = await page.title().catch(() => '');
    r.antibots = /verificaci[oó]n de seguridad|verify you are human|just a moment|captcha/i.test(await page.evaluate(() => document.body?.innerText?.slice(0, 2000) || '').catch(() => ''));
    r.vtex = await page.evaluate(() => !!(window.__RUNTIME__ || window.vtex || document.querySelector('script[src*="vtex"], link[href*="vteximg"], link[href*="vtexassets"]'))).catch(() => false);
    r.catalogo = await page.evaluate(async (b) => {
      try {
        const x = await fetch(`${b}/api/catalog_system/pub/products/search?ft=leche&_from=0&_to=3`, { credentials: 'include' });
        const t = await x.text(); let n = null; try { n = JSON.parse(t).length; } catch {}
        return { estado: x.status, productos: n, inicio: t.slice(0, 160) };
      } catch (e) { return { estado: `error: ${e.message}` }; }
    }, base);
    r.regiones = await regionVtex(page, base);
    if (!r.vtex || process.env.BUSCAR === '1') r.busqueda = await probarBusqueda(page, base);
    await page.screenshot({ path: `debug/sonda/${id}.png` }).catch(() => {});
  } catch (e) { r.error = e.message.split('\n')[0]; }
  await page.close();
  informe[id] = r;
  console.log(`${id}: inicio ${r.inicio ?? r.error} · antibots ${r.antibots ?? '?'} · vtex ${r.vtex ?? '?'} · catálogo ${r.catalogo?.estado ?? '-'} (${r.catalogo?.productos ?? '-'}) · regiones ${r.regiones?.estado ?? '-'}`);
}
fs.writeFileSync('debug/sonda/sonda.json', JSON.stringify(informe, null, 2));
await browser.close();
