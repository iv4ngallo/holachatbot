// Utilidades de texto: tokens, presentación (tamaño + unidad) y emparejado con el catálogo de PrecIA.

export const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const STOP = new Set(['de', 'del', 'la', 'el', 'en', 'para', 'con', 'y', 'a', 'al', 'los', 'las', 'un', 'una']);
const singular = (t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t);

export const tokens = (s) =>
  sinTildes(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t)).map(singular);

const FACTOR = { kg: ['g', 1000], kilo: ['g', 1000], kilos: ['g', 1000], g: ['g', 1], gr: ['g', 1], gramo: ['g', 1], gramos: ['g', 1],
  l: ['ml', 1000], lt: ['ml', 1000], lts: ['ml', 1000], litro: ['ml', 1000], litros: ['ml', 1000], ml: ['ml', 1], cc: ['ml', 1] };

// "Leche 6 x 1.000 ml", "Arroz 500 g", "Huevos x 30 und" -> { tamano, unidad: 'g'|'ml'|'und' } o null.
export function presentacion(texto) {
  const s = sinTildes(texto).replace(/(\d)[.,](\d{3})(?!\d)/g, '$1$2').replace(',', '.');
  const U = '(kg|kilos?|gramos?|gr|g|litros?|lts?|lt|ml|cc|l)';
  let m = s.match(new RegExp(`(\\d+)\\s*x\\s*(\\d+(?:\\.\\d+)?)\\s*${U}\\b`));
  if (m) { const [u, f] = FACTOR[m[3]]; return { tamano: Number(m[1]) * Number(m[2]) * f, unidad: u }; }
  m = s.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${U}\\b`));
  if (m) { const [u, f] = FACTOR[m[2]]; return { tamano: Number(m[1]) * f, unidad: u }; }
  m = s.match(/(\d+)\s*(und|unidades?|uds?|unds?|pack|paquetes?)\b/) || s.match(/\bx\s*(\d+)\b/);
  if (m) return { tamano: Number(m[1]), unidad: 'und' };
  return null;
}

// Familia de la unidad del catálogo de PrecIA (kg/g -> g, L/ml -> ml, und -> und).
export const familia = (u) => ({ kg: 'g', g: 'g', L: 'ml', l: 'ml', ml: 'ml', und: 'und' }[u] || 'und');

// ¿El producto encontrado corresponde al producto del catálogo? Devuelve puntaje (mayor = mejor) o 0.
export function relevancia(prod, nombreEncontrado, pres) {
  const t = new Set(tokens(nombreEncontrado));
  const todos = (lista) => lista.length > 0 && lista.every((x) => t.has(x));
  const base = tokens(prod.nombre);
  const porAlias = (prod.alias || []).some((a) => todos(tokens(a)));
  if (!todos(base) && !porAlias) return 0;
  const fam = familia(prod.unidad);
  if (pres && (fam === 'g' || fam === 'ml') && pres.unidad !== 'und' && pres.unidad !== fam) return 0;
  return 100 - Math.min(t.size - base.length, 60); // menos palabras sobrantes = más parecido
}

// Precio por kg / litro / unidad, para comparar presentaciones distintas.
export function precioUnitario(precio, pres) {
  if (!pres || !pres.tamano) return null;
  return pres.unidad === 'und' ? precio / pres.tamano : (precio / pres.tamano) * 1000;
}
