// Una cadena = id (el de precia_cadenas), nombre, base y cómo consultarla.
//
// Orden de consulta por producto (ver run.mjs):
//   1. apiUrls(termino, ctx): URLs de API pedidas con fetch DESDE la página ya cargada (misma sesión y cookies,
//      sin abrir una página nueva por producto: evita el bloqueo antibots).
//   2. urlsBusqueda(termino): navegación a la página de resultados, leyendo lo que la página pide a su API.
//
// preparar(page, ctx): se ejecuta una vez por cadena tras abrir `inicio`; puede fijar la región de Ibagué.
// Confirmado con la primera corrida (Actions, 18-nov-2026): Éxito y D1 son VTEX.

const q = encodeURIComponent;
export const CP_IBAGUE = '730001'; // código postal usado para resolver la región de Ibagué en VTEX

// Pregunta a VTEX qué región atiende un código postal. Devuelve { estado, id, n }.
export async function regionVtex(page, base, cp = CP_IBAGUE) {
  return page.evaluate(async ({ base, cp }) => {
    try {
      const r = await fetch(`${base}/api/checkout/pub/regions?country=COL&postalCode=${cp}`, { credentials: 'include', headers: { accept: 'application/json' } });
      if (!r.ok) return { estado: r.status, id: null, n: 0 };
      const j = await r.json();
      return { estado: 200, id: Array.isArray(j) && j[0]?.id ? String(j[0].id) : null, n: Array.isArray(j) ? j.length : 0 };
    } catch (e) { return { estado: `error: ${e.message}`, id: null, n: 0 }; }
  }, { base, cp });
}

// Tienda VTEX genérica: API pública de catálogo y, si no responde, la búsqueda del sitio.
// Sonda del 18-nov-2026: olimpica, jumbo (jumbocolombia.com), mercacentro, carulla y d1 son VTEX con API de catálogo abierta.
// Makro y Alkosto no son VTEX (falta adaptador propio); Ara no tiene tienda en línea; Éxito bloquea las IP de GitHub (Cloudflare).
export function vtex(id, nombre, base) {
  return {
    id, nombre, base, inicio: `${base}/`,
    async preparar(page) {
      const r = await regionVtex(page, base);
      return { detalle: `regiones: estado ${r.estado}, ${r.n} resultado(s); ciudad sin verificar` };
    },
    apiUrls: (t) => [`${base}/api/catalog_system/pub/products/search?ft=${q(t)}&_from=0&_to=23`],
    urlsBusqueda: (t) => [`${base}/${q(t)}?_q=${q(t)}&map=ft`],
  };
}

export const CANDIDATAS = {
  olimpica: ['Olímpica', 'https://www.olimpica.com'],
  jumbo: ['Jumbo', 'https://www.jumbocolombia.com'],
  makro: ['Makro', 'https://www.makro.com.co'],
  mercacentro: ['Mercacentro', 'https://www.mercacentro.com'],
  ara: ['Ara', 'https://www.ara.com.co'],
  alkosto: ['Alkosto', 'https://www.alkosto.com'],
  carulla: ['Carulla', 'https://www.carulla.com'],
};

export const ADAPTADORES = {
  exito: {
    id: 'exito',
    nombre: 'Éxito',
    base: 'https://www.exito.com',
    inicio: 'https://www.exito.com/',
    async preparar(page) {
      const r = await regionVtex(page, this.base);
      const ctx = { regionId: r.id, detalle: `regiones: estado ${r.estado}, ${r.n} resultado(s)` };
      if (r.id) ctx.ciudad = `Ibagué (CP ${CP_IBAGUE})`;
      return ctx;
    },
    // Misma consulta que hace la propia página (FastStore): operación SearchQuery con la región como faceta "channel".
    apiUrls: (t, ctx = {}) => {
      const variables = {
        first: 16, after: '0', sort: 'score_desc', term: t,
        selectedFacets: [{ key: 'channel', value: JSON.stringify({ salesChannel: '1', regionId: ctx.regionId || '' }) }, { key: 'locale', value: 'es-CO' }],
      };
      return [`https://www.exito.com/api/graphql?operationName=SearchQuery&variables=${q(JSON.stringify(variables))}`];
    },
    urlsBusqueda: (t) => [`https://www.exito.com/s?q=${q(t)}&sort=score_desc&page=0`],
  },
  d1: {
    id: 'd1',
    nombre: 'D1',
    base: 'https://www.d1.com.co',
    inicio: 'https://www.d1.com.co/',
    async preparar(page) {
      const r = await regionVtex(page, this.base);
      return { detalle: `regiones: estado ${r.estado}, ${r.n} resultado(s); D1 no se filtra por región (ciudad sin verificar)` };
    },
    // API pública de catálogo de VTEX (si el sitio la tiene habilitada) y, si no, la búsqueda de VTEX IO por texto.
    apiUrls: (t) => [`https://www.d1.com.co/api/catalog_system/pub/products/search?ft=${q(t)}&_from=0&_to=23`],
    urlsBusqueda: (t) => [`https://www.d1.com.co/${q(t)}?_q=${q(t)}&map=ft`],
  },
  ...Object.fromEntries(['olimpica', 'jumbo', 'mercacentro'].map((id) => [id, vtex(id, CANDIDATAS[id][0], CANDIDATAS[id][1])])),
};
