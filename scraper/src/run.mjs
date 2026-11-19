// Scraper de precios de PrecIA. Se ejecuta en GitHub Actions (ver .github/workflows/precios.yml).
//
// Variables de entorno:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  -> para leer productos y guardar ofertas (secretos del repo)
//   CADENAS     lista separada por comas (por defecto: todas las de adapters/index.mjs)
//   CATEGORIA   limita a una categoría del catálogo (p. ej. "lacteos")
//   LIMITE      máximo de productos por cadena (para pruebas)
//   DRY_RUN=1   no escribe en la base de datos; solo muestra lo que encontraría
//   DEBUG=1     guarda en scraper/debug/ las respuestas, texto de página y una captura por cadena

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
const BLOQUEOS_PARA_PAUSAR = 3;
const PAUSA_TRAS_BLOQUEO_MS = Number(env.PAUSA_BLOQUEO_MS || 60_000);
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
const bloqueo = (estado) => estado === 403 || estado === 429;

async function cargarProductos(db) {
  let lista;
  if (db) lista = await db.productos();
  else lista = JSON.parse(fs.readFileSync(path.join(aqui, '../data/productos.json'), 'utf8'));
  if (env.CATEGORIA) lista = lista.filter((p) => p.categoria === env.CATEGORIA);
  if (env.LIMITE) lista = lista.slice(0, Number(env.LIMITE));
  return lista;
}

function guardarDebug(dbgDir, nombre, contenido) {
  if (!DEBUG || !dbgDir) return;
  fs.mkdirSync(dbgDir, { recursive: true });
  fs.writeFileSync(path.join(dbgDir, nombre), contenido);
}

// Consulta de API con fetch dentro de la página ya abierta: comparte sesión y cookies del sitio.
async function consultarApi(page, url, base, dbgDir, etiqueta) {
  const r = await page.evaluate(async (u) => {
    try {
      const res = await fetch(u, { credentials: 'include', headers: { accept: 'application/json' } });
      return { estado: res.status, txt: (await res.text()).slice(0, 3_000_000) };
    } catch (e) { return { estado: `error: ${e.message}`, txt: '' }; }
  }, url);
  let json = null;
  try { json = JSON.parse(r.txt); } catch { /* no es JSON (p. ej. el desafío de Cloudflare) */ }
  const productos = json ? extraerProductos(json, { base }) : [];
  guardarDebug(dbgDir, `${etiqueta}-api.json`, JSON.stringify({ url, estado: r.estado, productos: productos.length, cuerpo: r.txt.slice(0, 400_000) }));
  return { estado: r.estado, productos };
}

// Navega a una página y recoge lo que ella pide a su API y los datos embebidos en el HTML.
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
    bodies.slice(0, 12).forEach((b, i) => guardarDebug(dbgDir, `${etiqueta}-${i}.json`, JSON.stringify({ url: b.url, cuerpo: b.txt.slice(0, 400_000) })));
    guardarDebug(dbgDir, `${etiqueta}.txt`, `URL: ${url}\nESTADO: ${estado}\nJSON: ${bodies.length}\nPRODUCTOS: ${productos.length}\n\n${texto.slice(0, 4000)}`);
  }
  return { productos, texto, estado };
}

// Busca un producto: primero por API (misma sesión), luego navegando. Una página 404/403 no cuenta como resultado.
async function buscarProducto(page, ad, prod, ctx, dbgDir) {
  const t = prod.nombre;
  const etiqueta = slug(prod.key);
  let bloqueado = false;
  for (const u of ad.apiUrls?.(t, ctx) ?? []) {
    const r = await consultarApi(page, u, ad.base, dbgDir, etiqueta);
    if (bloqueo(r.estado)) bloqueado = true;
    else if (r.productos.length) return { candidatos: r.productos, via: 'api', bloqueado: false, ciudadTexto: false };
  }
  for (const u of ad.urlsBusqueda?.(t) ?? []) {
    const r = await consultar(page, u, ad.base, dbgDir, etiqueta);
    if (bloqueo(r.estado)) { bloqueado = true; continue; }
    if (r.estado === 404) continue;
    if (r.productos.length) return { candidatos: r.productos, via: 'pagina', bloqueado: false, ciudadTexto: /ibagu[eé]/i.test(r.texto) };
  }
  return { candidatos: [], via: null, bloqueado, ciudadTexto: false };
}

async function prepararCadena(page, ad, dbgDir) {
  let estado = null;
  try {
    const r = await page.goto(ad.inicio, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    estado = r?.status() ?? null;
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await pausa(1500);
  } catch (e) { estado = `error: ${e.message.split('\n')[0]}`; }
  let ctx = {};
  if (estado === 200 && ad.preparar) ctx = await ad.preparar(page).catch((e) => ({ detalle: `error preparando: ${e.message}` }));
  console.log(`  inicio: ${estado}${ctx.detalle ? ` · ${ctx.detalle}` : ''}`);
  if (DEBUG && dbgDir) { fs.mkdirSync(dbgDir, { recursive: true }); await page.screenshot({ path: path.join(dbgDir, 'inicio.png') }).catch(() => {}); }
  return { estado, ctx };
}

async function correrCadena(browserCtx, ad, productos) {
  const page = await browserCtx.newPage();
  const dbgDir = path.join(aqui, '../debug', ad.id);
  const filas = [];
  let { estado: estadoInicio, ctx } = await prepararCadena(page, ad, dbgDir);
  let ciudadSitio = ctx.ciudad || 'No verificada';
  let sinResultado = 0, consultados = 0, seguidos = 0, pausas = 0, omitidos = 0, bloqueada = bloqueo(estadoInicio);

  for (let i = 0; i < productos.length && !bloqueada; i++) {
    const prod = productos[i];
    const r = await buscarProducto(page, ad, prod, ctx, dbgDir);
    if (r.bloqueado && !r.candidatos.length) {
      // Protección antibots: no insistir. Pausa larga, nueva sesión y un único reintento; si persiste, se detiene la cadena.
      if (++seguidos >= BLOQUEOS_PARA_PAUSAR) {
        if (pausas++ >= 1) { bloqueada = true; omitidos++; break; }
        console.log(`  bloqueado por el sitio ${seguidos} veces seguidas: pausa de ${Math.round(PAUSA_TRAS_BLOQUEO_MS / 1000)} s y nueva sesión`);
        await pausa(PAUSA_TRAS_BLOQUEO_MS);
        const p = await prepararCadena(page, ad, dbgDir);
        ctx = p.ctx; ciudadSitio = ctx.ciudad || ciudadSitio; seguidos = 0;
        if (bloqueo(p.estado)) { bloqueada = true; omitidos++; break; }
        i--; // reintenta este mismo producto
        continue;
      }
      omitidos++;
      continue;
    }
    seguidos = 0; consultados++;
    if (r.ciudadTexto && ciudadSitio === 'No verificada') ciudadSitio = CIUDAD;
    const ahora = new Date().toISOString();
    const buenos = r.candidatos
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
        url: c.url || ad.base, ciudad_del_sitio: ciudadSitio, consultado_en: ahora, estado: 'ok', motivo: null, sku: c.sku,
      });
      const pu = pres ? precioUnitario(c.precio, pres) : null;
      console.log(`  ${prod.key.padEnd(20)} ${String(c.precio).padStart(8)}  ${c.nombre.slice(0, 60)}${pu ? `  (${Math.round(pu)}/${pres.unidad === 'und' ? 'und' : pres.unidad === 'g' ? 'kg' : 'L'})` : ''}`);
    }
    await pausa(1500 + Math.random() * 1500); // consulta pausada: no saturar sus servidores
  }
  await page.close();
  if (omitidos > 0) bloqueada = true; // hubo productos que el sitio no dejó consultar
  return { filas, ciudadSitio, sinResultado, consultados, bloqueada };
}

async function main() {
  const hayClave = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY;
  const cliente = hayClave ? crearCliente(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY) : null;
  const db = DRY ? null : cliente;
  const productos = await cargarProductos(cliente);
  const ids = (env.CADENAS || Object.keys(ADAPTADORES).join(',')).split(',').map((s) => s.trim()).filter(Boolean);
  console.log(`Productos: ${productos.length} · Cadenas: ${ids.join(', ')} · ${DRY || !db ? 'SIMULACIÓN (no escribe)' : 'escribe en Supabase'}${DEBUG ? ' · DEBUG' : ''}`);

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: env.HEADLESS !== '0' }); // HEADLESS=0: ventana visible (útil en tu computador)
  const ctx = await browser.newContext({ userAgent: UA, locale: 'es-CO', timezoneId: 'America/Bogota', viewport: { width: 1366, height: 900 } });
  let hayError = false, hayExito = false;

  for (const id of ids) {
    const ad = ADAPTADORES[id];
    if (!ad) { console.error(`Cadena desconocida: ${id}`); hayError = true; continue; }
    console.log(`\n== ${ad.nombre} ==`);
    const { filas, ciudadSitio, consultados, bloqueada } = await correrCadena(ctx, ad, productos);
    const conPrecio = new Set(filas.map((f) => f.producto_key)).size;
    const resumen = `${filas.length} ofertas, ${conPrecio} de ${consultados} productos consultados con precio${bloqueada ? ' (el sitio bloqueó las consultas; quedaron productos sin consultar)' : ''}; ciudad del sitio: ${ciudadSitio}`;
    console.log(`-> ${resumen}`);
    if (bloqueada) hayError = true;
    if (filas.length) hayExito = true;
    if (!db) continue;
    if (filas.length) {
      // Historial (solo cambios) + foto actual. Con corrida incompleta solo se reemplazan los productos obtenidos.
      const g = await guardarCadena(db, ad.id, filas, { parcial: bloqueada || consultados < productos.length });
      console.log(`-> historial: ${g.items} productos de tienda, ${g.nuevas} observaciones nuevas, ${g.sinCambio} sin cambio`);
      await db.actualizarCadena(ad.id, { estado: 'ok', motivo: `${resumen}.`, consultado_en: new Date().toISOString() });
    } else {
      const motivo = bloqueada ? 'El sitio bloqueó las consultas automáticas (protección antibots).' : 'La última ejecución no obtuvo productos (el sitio cambió o bloqueó la consulta).';
      await db.actualizarCadena(ad.id, { estado: 'sin_dato', motivo, consultado_en: new Date().toISOString() });
    }
  }
  await browser.close();
  // Una cadena bloqueada no tumba la corrida si otra sí entregó datos; solo falla si ninguna lo hizo.
  if (!hayExito || ids.some((i) => !ADAPTADORES[i])) process.exitCode = 1;
  else if (hayError) console.log('\nAviso: alguna cadena quedó incompleta o bloqueada (ver arriba).');
}

main().catch((e) => { console.error(e); process.exit(1); });
