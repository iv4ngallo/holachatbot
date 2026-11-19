// Cliente mínimo de Supabase por REST (sin dependencias). Usa la clave de servicio: solo en secretos de GitHub Actions.

export function crearCliente(url, clave) {
  const h = { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' };
  const base = `${url.replace(/\/$/, '')}/rest/v1`;
  async function llamar(ruta, opts = {}) {
    const r = await fetch(`${base}/${ruta}`, { ...opts, headers: { ...h, ...(opts.headers || {}) } });
    if (!r.ok) throw new Error(`Supabase ${opts.method || 'GET'} ${ruta.split('?')[0]} -> ${r.status} ${await r.text()}`);
    return r.status === 204 ? null : r.json().catch(() => null);
  }
  const porLotes = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
  return {
    productos: () => llamar('precia_productos?select=*&order=key'),
    borrarOfertasDeCadena: (cadena) => llamar(`precia_ofertas?cadena_id=eq.${encodeURIComponent(cadena)}`, { method: 'DELETE' }),
    async insertarOfertas(filas) {
      for (const lote of porLotes(filas, 200)) {
        await llamar('precia_ofertas', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(lote) });
      }
    },
    // Crea o actualiza items por (cadena_id, ident). No toca primera_vez de los que ya existen.
    async upsertItems(items) {
      const out = [];
      for (const lote of porLotes(items, 200)) {
        const r = await llamar('precia_items?on_conflict=cadena_id,ident&select=id,ident', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(lote) });
        out.push(...(r || []));
      }
      return out;
    },
    // Última observación de cada item: Map(item_id -> { precio, precio_antes, disponible }).
    async ultimosPorItem(ids) {
      const m = new Map();
      for (const lote of porLotes(ids, 150)) {
        const r = await llamar(`v_precia_actual?item_id=in.(${lote.join(',')})&select=item_id,precio,precio_antes,disponible`);
        (r || []).forEach((x) => m.set(x.item_id, x));
      }
      return m;
    },
    async insertarHistorial(obs) {
      for (const lote of porLotes(obs, 200)) {
        await llamar('precia_historial', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(lote) });
      }
    },
    actualizarCadena: (id, campos) => llamar(`precia_cadenas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(campos) }),
  };
}
