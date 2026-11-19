// Guarda el resultado de una cadena: items (identidad estable), historial (solo cuando algo cambia)
// y la foto actual en precia_ofertas. Recibe `db` (ver supabase.mjs) para poder probarse con uno simulado.

import { sinTildes, precioUnitario } from './normalizar.mjs';

const slug = (s) => sinTildes(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Identidad de un producto dentro de una cadena: no depende de la URL (que puede ser la de una categoría).
export const identItem = (f) => f.sku
  ? `${f.producto_key}|sku:${f.sku}`
  : [f.producto_key, slug(f.marca || ''), slug(f.producto_encontrado), `${f.presentacion_tamano ?? ''}${f.presentacion_unidad ?? ''}`].join('|');

// Decide qué observaciones nuevas hay que escribir: primera vez, o cambió precio, precio anterior o disponibilidad.
export function observacionesNuevas(filas, idsPorIdent, ultimos, ahora) {
  const out = [];
  let sinCambio = 0;
  for (const f of filas) {
    const id = idsPorIdent.get(identItem(f));
    if (id === undefined) continue;
    const previo = ultimos.get(id);
    const cambio = !previo || previo.precio !== f.precio || (previo.precio_antes ?? null) !== (f.precio_antes ?? null)
      || (previo.disponible ?? null) !== (f.disponible ?? null);
    if (!cambio) { sinCambio++; continue; }
    const pres = f.presentacion_tamano ? { tamano: f.presentacion_tamano, unidad: f.presentacion_unidad } : null;
    const pu = pres ? precioUnitario(f.precio, pres) : null;
    out.push({ item_id: id, observado_en: ahora, precio: f.precio, precio_antes: f.precio_antes ?? null, disponible: f.disponible ?? null,
      precio_unitario: pu === null ? null : Math.round(pu * 100) / 100, ciudad_del_sitio: f.ciudad_del_sitio ?? null });
  }
  return { observaciones: out, sinCambio };
}

// opts: { ahora, parcial }. Con parcial=true solo se reemplazan las ofertas de los productos obtenidos
// (corrida incompleta, p. ej. bloqueada); con false se reemplazan todas las de la cadena.
export async function guardarCadena(db, cadenaId, filas, opts = {}) {
  const { ahora = new Date().toISOString(), parcial = false } = typeof opts === 'string' ? { ahora: opts } : opts;
  // 1. Items: una fila por identidad (si hay repetidas dentro de la corrida, gana la primera).
  const porIdent = new Map();
  filas.forEach((f) => { const k = identItem(f); if (!porIdent.has(k)) porIdent.set(k, f); });
  const items = [...porIdent].map(([ident, f]) => ({
    cadena_id: cadenaId, ident, producto_key: f.producto_key, marca: f.marca, producto_encontrado: f.producto_encontrado,
    presentacion_tamano: f.presentacion_tamano, presentacion_unidad: f.presentacion_unidad, url: f.url, ultima_vez: ahora,
  }));
  const guardados = await db.upsertItems(items);
  const idsPorIdent = new Map(guardados.map((r) => [r.ident, r.id]));

  // 2. Historial: solo lo que cambió respecto de la última observación.
  const ultimos = await db.ultimosPorItem([...idsPorIdent.values()]);
  const { observaciones, sinCambio } = observacionesNuevas([...porIdent.values()], idsPorIdent, ultimos, ahora);
  await db.insertarHistorial(observaciones);

  // 3. Foto actual (lo que lee PrecIA): reemplaza las ofertas de la cadena.
  await db.borrarOfertasDeCadena(cadenaId, parcial ? [...new Set(filas.map((f) => f.producto_key))] : null);
  await db.insertarOfertas(filas.map(({ sku, ...fila }) => fila)); // precia_ofertas no tiene columna sku
  return { items: items.length, nuevas: observaciones.length, sinCambio };
}
