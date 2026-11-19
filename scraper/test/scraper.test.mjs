import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { aNumero, extraerProductos } from '../src/lib/extraer.mjs';
import { presentacion, relevancia, precioUnitario, tokens } from '../src/lib/normalizar.mjs';

const prod = (nombre, unidad, alias = []) => ({ nombre, unidad, alias });

test('aNumero entiende formatos colombianos', () => {
  assert.equal(aNumero('$ 4.280'), 4280);
  assert.equal(aNumero('1.234.567'), 1234567);
  assert.equal(aNumero('4280.50'), 4280.5);
  assert.equal(aNumero(3090), 3090);
  assert.equal(aNumero('gratis'), null);
});

test('extrae productos con la forma de VTEX productSearch', () => {
  const json = { data: { productSearch: { products: [
    { productName: 'Leche Colanta entera bolsa 1000 ml', brand: 'COLANTA', link: '/leche-colanta-1l/p',
      priceRange: { sellingPrice: { lowPrice: 4280 }, listPrice: { lowPrice: 4500 } },
      items: [{ sellers: [{ commertialOffer: { Price: 4280, ListPrice: 4500, AvailableQuantity: 12 } }] }] },
    { productName: 'Sin precio', brand: 'X' },
  ] } } };
  const r = extraerProductos(json, { base: 'https://www.exito.com' });
  assert.equal(r.length, 1);
  assert.deepEqual(r[0], { nombre: 'Leche Colanta entera bolsa 1000 ml', marca: 'COLANTA', precio: 4280, precioAntes: 4500,
    url: 'https://www.exito.com/leche-colanta-1l/p', disponible: true, sku: null });
});

test('lee una respuesta REAL de Éxito (SearchQuery de huevos, 18-nov-2026)', () => {
  const real = JSON.parse(fs.readFileSync(new URL('./fixtures/exito-search-huevos.json', import.meta.url), 'utf8'));
  const r = extraerProductos(real, { base: 'https://www.exito.com' });
  assert.equal(r.length, 4);
  const [a, b] = r;
  assert.equal(a.nombre, 'Huevos AA KIKES Rojo Pet (30  und)');
  assert.equal(a.marca, 'KIKES');
  assert.equal(a.precio, 24500);
  assert.equal(a.precioAntes, null);
  assert.equal(a.sku, '1037843');
  assert.equal(a.disponible, true);
  assert.equal(a.url, 'https://www.exito.com/huevo-aa-rojo-30und-pet-744836-1037843/p');
  assert.equal(b.precio, 10250);
  assert.equal(b.precioAntes, 14700); // descuento del 30 %
  // el emparejado con el catálogo acepta los huevos y calcula la presentación
  const huevos = { nombre: 'Huevos', unidad: 'und', alias: ['huevo', 'huevos aa'] };
  r.forEach((p) => assert.ok(relevancia(huevos, p.nombre, presentacion(p.nombre)) > 0, p.nombre));
  assert.deepEqual(presentacion(a.nombre), { tamano: 30, unidad: 'und' });
});

test('extrae productos de schema.org / JSON-LD y de nombres en español', () => {
  const ld = { '@type': 'Product', name: 'Arroz Diana 500 g', brand: { name: 'Diana' }, offers: { price: '2.990', availability: 'https://schema.org/InStock', url: 'https://x.co/a' } };
  const es = { nombre: 'Huevos AA x 30 und', precio: 14990 };
  const r = extraerProductos([ld, es]);
  assert.equal(r[0].precio, 2990); assert.equal(r[0].marca, 'Diana'); assert.equal(r[0].disponible, true);
  assert.equal(r[1].precio, 14990);
});

test('descarta precios fuera de rango y no repite productos', () => {
  const r = extraerProductos({ a: [{ name: 'Caramelo', price: 5 }, { name: 'Lote', price: 99999999 }, { name: 'Pan', price: 3000 }, { name: 'Pan', price: 3000 }] });
  assert.deepEqual(r.map((p) => p.nombre), ['Pan']);
});

test('presentacion normaliza g, kg, ml, L y multipacks', () => {
  assert.deepEqual(presentacion('Arroz Diana 500 g'), { tamano: 500, unidad: 'g' });
  assert.deepEqual(presentacion('Arroz premium 4 kg'), { tamano: 4000, unidad: 'g' });
  assert.deepEqual(presentacion('Leche entera 900ml'), { tamano: 900, unidad: 'ml' });
  assert.deepEqual(presentacion('Gaseosa 1.5 L'), { tamano: 1500, unidad: 'ml' });
  assert.deepEqual(presentacion('Leche 1.000 ml'), { tamano: 1000, unidad: 'ml' });
  assert.deepEqual(presentacion('Leche 6 x 1000 ml'), { tamano: 6000, unidad: 'ml' });
  assert.deepEqual(presentacion('Huevos x 30 und'), { tamano: 30, unidad: 'und' });
  assert.equal(presentacion('Escoba clásica'), null);
});

test('relevancia empareja con el catálogo y rechaza lo que no corresponde', () => {
  const leche = prod('Leche entera', 'L', ['leche']);
  assert.ok(relevancia(leche, 'Leche Colanta entera pasteurizada', { tamano: 1000, unidad: 'ml' }) > 0);
  assert.equal(relevancia(leche, 'Yogur de fresa', null), 0);
  assert.equal(relevancia(leche, 'Leche entera en polvo 400 g', { tamano: 400, unidad: 'g' }), 0, 'familia de unidad distinta');
  const polvo = prod('Leche en polvo', 'g');
  assert.ok(relevancia(polvo, 'Leche en Polvo Entera Latti', { tamano: 350, unidad: 'g' }) > 0);
  const banano = prod('Bananos', 'und', ['banano', 'guineo']);
  assert.ok(relevancia(banano, 'Banano criollo', null) > 0);
  assert.ok(relevancia(prod('Pechuga de pollo', 'kg', ['pollo']), 'Pechuga de Pollo sin hueso x kg', null) > 0);
});

test('precio unitario compara presentaciones', () => {
  assert.equal(Math.round(precioUnitario(3090, { tamano: 900, unidad: 'ml' })), 3433); // por litro
  assert.equal(Math.round(precioUnitario(8300, { tamano: 350, unidad: 'g' })), 23714); // por kg
  assert.equal(precioUnitario(100, null), null);
});

test('tokens quita tildes, plurales y palabras vacías', () => {
  assert.deepEqual(tokens('Plátano hartón de Ibagué'), ['platano', 'harton', 'ibague']);
});
