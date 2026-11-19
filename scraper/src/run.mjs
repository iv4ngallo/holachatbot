// Scraper de precios de PrecIA. Se ejecuta en GitHub Actions (ver .github/workflows/precios.yml).
//
// Variables de entorno:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  -> para leer productos y guardar ofertas (secretos del repo)
//   CADENAS     lista separada por comas (por defecto: todas las de adapters/index.mjs)
//   CATEGORIA   limita a una categoría del catálogo (p. ej. "lacteos")
//   LIMITE      máximo de productos por cadena (para pruebas)
//   DRY_RUN=1   no escribe en la base de datos; solo muestra lo que encontraría
//   DEBUG=1     guarda en scraper/debug/ las respuestas JSON, texto de página y una captura por cadena

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADAPTADORES } from './adapters/index.mjs';
import { extraerProductos } from './lib/extraer.mjs';
import { presentacion, relevancia, precioUnitario } from './lib/normalizar.mjs';
import { crearCliente } from './lib/supabase.mjs';
import { guardarCadena } from './lib/guardar.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const DRY = env.DRY_RUN === '1' || env.DRY_RUN === 'true';
const DEBUG = env.DEBUG === '1' || env.DEBUG === 'true';
const CIUDAD = 'Ibagué';
const MAX_POR_PRODUCTO = 5;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);

async function cargarProductos(db) {
  let lista;
  if (db) lista = await db.productos();
  else lista = JSON.parse(fs.readFileSync(path.join(aqui, '../data/productos.json'), 'utf8'));
  if (env.CATEGORIA) lista = lista.filter((p) => p.categoria === env.CATEGORIA);
  if (env.LIMITE) lista = lista.slice(0, Number(env.LIMITE));
  return lista;
}

// Abre una URL, recoge las respuestas JSON que la página pide por su cuenta y los datos embebidos en el HTML.
async function consultar(page, url, base, dbgDir, etiqueta) {
  const bodies = [];
  const onResp = async (resp) => {
    try {
      const tipo = resp.headers()['content-type'] || '';
      if (!tipo.includes('json') || resp.status() >= 400) return;
      const txt = await resp.text();
      if (txt.length > 3_000_000) return;
      bodies.push({ url: resp.url(), txt });
    } catch { /* respuesta ya liberada */ }
  };
  page.on('response', onResp);
  let estado = null;
  try {
    const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    estado = r?.status() ?? null;
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await pausa(1500);
  } catch (e) { estado = `error: ${e.message.split('\n')[0]}`; }
  page.off('response', onResp);

  const fuentes = bodies.map((b) => { try { return JSON.parse(b.txt); } catch { return null; } }).filter(Boolean);
  const embebidos = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"], script#__NEXT_DATA__')]
    .map((s) => s.textContent)).catch(() => []);
  embebidos.forEach((t) => { try { fuentes.push(JSON.parse(t)); } catch { /* no es JSON */ } });
  const texto = await page.evaluate(() => document.body?.innerText?.slice(0, 20_000) || '').catch(() => '');

  const productos = fuentes.flatMap((f) => extraerProductos(f, { base }));
  if (DEBUG && dbgDir) {
    fs.mkdirSync(dbgDir, { recursive: true });
    bodies.slice(0, 12).forEach((b, i) => fs.writeFileSync(path.join(dbgDir, `${etiqueta}-${i}.json`), JSON.stringify({ url: b.url, cuerpo: b.txt.slice(0, 400_000) })));
    fs.writeFileSync(path.join(dbgDir, `${etiqueta}.txt`), `URL: ${url}\nESTADO: ${estado}\nJSON: ${bodies.length}\nPRODUCTOS: ${productos.length}\n\n${texto.slice(0, 4000)}`);
  }
  return { productos, texto, estado, nJson: bodies.length };
}

async function correrCadena(ctx, ad, productos, db) {
  const page = await ctx.newPage();
  const dbgDir = path.join(aqui, '../debug', ad.id);
  const filas = [];
  let ciudadSitio = 'No verificada';
  let idxUrl = null;
  let sinResultado = 0;
  let primera = true;

  for (const prod of productos) {
    const urls = ad.urlsBusqueda(prod.nombre);
    const orden = idxUrl === null ? urls.map((u, i) => i) : [idxUrl];
    let candidatos = [];
    for (const i of orden) {
      const r = await consultar(page, urls[i], ad.base, dbgDir, slug(prod.key));
      if (primera && DEBUG) { await page.screenshot({ path: path.join(dbgDir, 'primera.png'), fullPage: false }).catch(() => {}); }
      primera = false;
      if (/ibagu[eé]/i.test(r.texto)) ciudadSitio = CIUDAD;
      if (r.productos.length) { candidatos = r.productos; idxUrl = i; break; }
    }
    const ahora = new Date().toISOString();
    const buenos = candidatos
      .map((c) => { const pres = presentacion(c.nombre); return { c, pres, score: relevancia(prod, c.nombre, pres) }; })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.c.precio - b.c.precio)
      .slice(0, MAX_POR_PRODUCTO);
    if (!buenos.length) sinResultado++;
    for (const { c, pres } of buenos) {
      filas.push({
        producto_key: prod.key, cadena_id: ad.id, marca: c.marca, producto_encontrado: c.nombre,
        presentacion_tamano: pres?.tamano ?? null, presentacion_unidad: pres?.unidad ?? null,
        precio: c.precio, precio_antes: c.precioAntes, disponible: c.disponible,
        url: c.url || ad.base, ciudad_del_sitio: ciudadSitio, consultado_en: ahora, estado: 'ok', motivo: null,
      });
      const pu = pres ? precioUnitario(c.precio, pres) : null;
      console.log(`  ${prod.key.padEnd(20)} ${String(c.precio).padStart(8)}  ${c.nombre.slice(0, 60)}${pu ? `  (${Math.round(pu)}/${pres.unidad === 'und' ? 'und' : pres.unidad === 'g' ? 'kg' : 'L'})` : ''}`);
    }
    await pausa(1500 + Math.random() * 1500); // consulta pausada: no saturar sus servidores
  }
  await page.close();
  return { filas, ciudadSitio, sinResultado };
}

async function main() {
  const db = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && !DRY ? crearCliente(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY) : null;
  const dbLectura = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY ? crearCliente(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY) : null;
  const productos = await cargarProductos(dbLectura);
  const ids = (env.CADENAS || Object.keys(ADAPTADORES).join(',')).split(',').map((s) => s.trim()).filter(Boolean);
  console.log(`Productos: ${productos.length} · Cadenas: ${ids.join(', ')} · ${DRY ? 'SIMULACIÓN (no escribe)' : 'escribe en Supabase'}${DEBUG ? ' · DEBUG' : ''}`);

  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, locale: 'es-CO', timezoneId: 'America/Bogota', viewport: { width: 1366, height: 900 } });
  let hayError = false;

  for (const id of ids) {
    const ad = ADAPTADORES[id];
    if (!ad) { console.error(`Cadena desconocida: ${id}`); hayError = true; continue; }
    console.log(`\n== ${ad.nombre} ==`);
    const { filas, ciudadSitio, sinResultado } = await correrCadena(ctx, ad, productos, db);
    const resumen = `${filas.length} ofertas, ${productos.length - sinResultado} de ${productos.length} productos con precio; ciudad del sitio: ${ciudadSitio}`;
    console.log(`-> ${resumen}`);
    if (!db) continue;
    if (filas.length) {
      // Historial (solo cambios) + foto actual; reemplaza las ofertas únicamente si hubo resultados nuevos.
      const g = await guardarCadena(db, ad.id, filas);
      console.log(`-> historial: ${g.items} productos de tienda, ${g.nuevas} observaciones nuevas, ${g.sinCambio} sin cambio`);
      await db.actualizarCadena(ad.id, { estado: 'ok', motivo: `${resumen}.`, consultado_en: new Date().toISOString() });
    } else {
      await db.actualizarCadena(ad.id, { estado: 'sin_dato', motivo: 'La última ejecución no obtuvo productos (el sitio cambió o bloqueó la consulta).', consultado_en: new Date().toISOString() });
      hayError = true;
    }
  }
  await browser.close();
  if (hayError) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
