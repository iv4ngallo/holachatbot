import test from 'node:test';
import assert from 'node:assert/strict';
import { identItem, observacionesNuevas, guardarCadena } from '../src/lib/guardar.mjs';

const fila = (extra = {}) => ({
  producto_key: 'leche', cadena_id: 'd1', marca: 'Latti', producto_encontrado: 'Leche Entera Bolsa UHT',
  presentacion_tamano: 900, presentacion_unidad: 'ml', precio: 3090, precio_antes: null, disponible: null,
  url: 'https://x.co/a', ciudad_del_sitio: 'No verificada', ...extra,
});

// Base simulada en memoria con la misma interfaz que supabase.mjs.
function dbFalsa() {
  const s = { items: [], historial: [], ofertas: [], seq: 0, borrados: [] };
  return {
    s,
    async upsertItems(items) {
      return items.map((it) => {
        let e = s.items.find((x) => x.cadena_id === it.cadena_id && x.ident === it.ident);
        if (e) Object.assign(e, it); else { e = { id: ++s.seq, ...it }; s.items.push(e); }
        return { id: e.id, ident: e.ident };
      });
    },
    async ultimosPorItem(ids) {
      const m = new Map();
      s.historial.filter((h) => ids.includes(h.item_id)).forEach((h) => m.set(h.item_id, h)); // la última sobrescribe
      return m;
    },
    async insertarHistorial(o) { s.historial.push(...o); },
    async borrarOfertasDeCadena(c) { s.borrados.push(c); s.ofertas = s.ofertas.filter((x) => x.cadena_id !== c); },
    async insertarOfertas(f) { s.ofertas.push(...f); },
  };
}

test('identItem es estable y no depende de la URL', () => {
  assert.equal(identItem(fila()), identItem(fila({ url: 'https://otra.co/b' })));
  assert.notEqual(identItem(fila()), identItem(fila({ presentacion_tamano: 1000 })));
  assert.equal(identItem(fila({ marca: null })), 'leche||leche-entera-bolsa-uht|900ml');
});

test('primera corrida: escribe una observación por item', async () => {
  const db = dbFalsa();
  const r = await guardarCadena(db, 'd1', [fila(), fila({ producto_encontrado: 'Leche Entera Tetrapak UHT', precio: 3550 })], '2026-11-19T10:00:00Z');
  assert.deepEqual(r, { items: 2, nuevas: 2, sinCambio: 0 });
  assert.equal(db.s.historial.length, 2);
  assert.equal(db.s.historial[0].precio_unitario, 3433.33);
  assert.equal(db.s.ofertas.length, 2);
});

test('segunda corrida igual: no repite observaciones, pero refresca la foto actual', async () => {
  const db = dbFalsa();
  await guardarCadena(db, 'd1', [fila()], '2026-11-19T10:00:00Z');
  const r = await guardarCadena(db, 'd1', [fila()], '2026-11-20T10:00:00Z');
  assert.deepEqual(r, { items: 1, nuevas: 0, sinCambio: 1 });
  assert.equal(db.s.historial.length, 1);
  assert.equal(db.s.items[0].ultima_vez, '2026-11-20T10:00:00Z');
  assert.equal(db.s.ofertas.length, 1);
});

test('si cambia el precio (o aparece un precio anterior) se agrega una observación', async () => {
  const db = dbFalsa();
  await guardarCadena(db, 'd1', [fila()], '2026-11-19T10:00:00Z');
  await guardarCadena(db, 'd1', [fila({ precio: 3290 })], '2026-11-20T10:00:00Z');
  await guardarCadena(db, 'd1', [fila({ precio: 2990, precio_antes: 3290 })], '2026-11-21T10:00:00Z');
  assert.deepEqual(db.s.historial.map((h) => [h.precio, h.precio_antes]), [[3090, null], [3290, null], [2990, 3290]]);
  assert.equal(db.s.items.length, 1);
});

test('si el mismo item aparece repetido en una corrida, se guarda una sola vez', async () => {
  const db = dbFalsa();
  const r = await guardarCadena(db, 'd1', [fila(), fila()], '2026-11-19T10:00:00Z');
  assert.equal(r.items, 1);
  assert.equal(db.s.historial.length, 1);
});

test('observacionesNuevas ignora filas sin item', () => {
  const { observaciones } = observacionesNuevas([fila()], new Map(), new Map(), 'x');
  assert.equal(observaciones.length, 0);
});
