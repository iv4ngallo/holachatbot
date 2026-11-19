// Extractor genérico: recorre cualquier JSON (respuestas de API, __NEXT_DATA__, JSON-LD) y rescata
// objetos que parezcan un producto con precio. Conoce las formas de VTEX (productSearch / commertialOffer),
// schema.org y nombres comunes en español. Si un sitio usa otra forma, se ajusta aquí tras ver el modo debug.

export const PRECIO_MIN = 100;      // COP: por debajo se descarta (probable error de unidad)
export const PRECIO_MAX = 5_000_000;

export function aNumero(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const t = v.replace(/[^\d.,]/g, '');
  if (!t) return null;
  const miles = /[.,]\d{3}(?!\d)/.test(t) && !/[.,]\d{1,2}$/.test(t);
  const n = parseFloat(miles ? t.replace(/[.,]/g, '') : t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const primero = (...vals) => { for (const v of vals) { const n = aNumero(v?.value ?? v); if (n !== null) return n; } return null; };
const uno = (x) => (Array.isArray(x) ? x[0] : x);

function nombreDe(o) {
  for (const k of ['productName', 'name', 'nombre', 'title', 'displayName', 'product_name']) {
    if (typeof o[k] === 'string' && o[k].trim().length >= 3 && o[k].length <= 200) return o[k].trim();
  }
  return null;
}

export function aProducto(o, base = '') {
  const nombre = nombreDe(o);
  if (!nombre) return null;
  const oferta = o.items?.[0]?.sellers?.[0]?.commertialOffer;
  const ofLd = uno(o.offers);
  const precio = primero(o.priceRange?.sellingPrice?.lowPrice, oferta?.Price, ofLd?.lowPrice, ofLd?.price, o.sellingPrice,
    o.price, o.salePrice, o.specialPrice, o.currentPrice, o.precio, o.precioOferta);
  if (precio === null || precio < PRECIO_MIN || precio > PRECIO_MAX) return null;
  let antes = primero(o.priceRange?.listPrice?.lowPrice, oferta?.ListPrice, o.listPrice, o.regularPrice, o.previousPrice, o.precioAnterior);
  if (antes !== null && antes <= precio) antes = null;
  const marca = [o.brand?.name, o.brand, o.brandName, o.marca].find((m) => typeof m === 'string' && m.trim()) || null;
  let url = o.link || o.url || o.href || (o.linkText ? `/${o.linkText}/p` : null) || ofLd?.url || null;
  if (typeof url !== 'string') url = null;
  else if (url.startsWith('/')) url = base + url;
  let disponible = null;
  if (typeof oferta?.AvailableQuantity === 'number') disponible = oferta.AvailableQuantity > 0;
  else if (typeof ofLd?.availability === 'string') disponible = /InStock/i.test(ofLd.availability);
  else if (typeof o.available === 'boolean') disponible = o.available;
  else if (typeof o.isAvailable === 'boolean') disponible = o.isAvailable;
  return { nombre, marca, precio: Math.round(precio), precioAntes: antes === null ? null : Math.round(antes), url, disponible };
}

export function extraerProductos(json, { base = '', max = 400 } = {}) {
  const out = [];
  const vistos = new WeakSet();
  (function recorre(n, d) {
    if (!n || typeof n !== 'object' || d > 14 || out.length >= max || vistos.has(n)) return;
    vistos.add(n);
    if (!Array.isArray(n)) { const p = aProducto(n, base); if (p) out.push(p); }
    for (const v of Array.isArray(n) ? n : Object.values(n)) recorre(v, d + 1);
  })(json, 0);
  const unicos = new Map();
  out.forEach((p) => { const k = `${p.nombre}|${p.precio}`; if (!unicos.has(k)) unicos.set(k, p); });
  return [...unicos.values()];
}
