# Scraper de precios de PrecIA

Recolecta precios de supermercados y los guarda en Supabase (`precia_ofertas`), con marca, presentación, precio, enlace, fecha y ciudad del sitio.

## Cómo funciona

1. Lee los productos del catálogo (`precia_productos`; si no hay clave de Supabase usa `data/productos.json`).
2. Por cada cadena y producto, abre la búsqueda del sitio con Chromium (Playwright) y recoge **lo que la propia página pide a su API** (JSON), más los datos embebidos (`__NEXT_DATA__`, JSON-LD).
3. `lib/extraer.mjs` rescata los productos con precio (formas de VTEX, schema.org y nombres en español).
4. `lib/normalizar.mjs` convierte la presentación a g / ml / und y empareja con el catálogo (rechaza, por ejemplo, leche en polvo para "leche entera").
5. Guarda hasta 5 ofertas por producto y cadena. Si una cadena no devuelve nada, **no borra** lo anterior y la marca `sin_dato`.

La columna `ciudad_del_sitio` dice `Ibagué` solo si el texto de la página lo menciona; si no, `No verificada`.

## Historial de precios

Cada corrida deja tres cosas en Supabase:

- `precia_items`: el producto de una tienda, con identidad estable (producto del catálogo + marca + nombre + presentación). `primera_vez` / `ultima_vez` dicen desde cuándo se ve y si sigue vigente.
- `precia_historial`: una observación (precio, precio anterior, disponibilidad, precio por kg/L/und) **solo cuando algo cambia**.
- `precia_ofertas`: la foto actual que lee PrecIA (se reemplaza por cadena).

Vistas para el dashboard (solo lectura, usuarios con sesión): `v_precia_historial`, `v_precia_actual`, `v_precia_variacion` (variación a 7, 30 y 90 días) y la función `precia_serie(producto, dias)` (serie diaria por cadena).

El historial empieza el día de la primera corrida con escritura; no se puede reconstruir hacia atrás.

## Ejecutarlo

Desde GitHub: pestaña **Actions → Precios de supermercados (PrecIA) → Run workflow**. Por defecto corre en simulación con 5 productos de lácteos y guarda un artefacto `debug-precios` (respuestas JSON, texto y captura) para revisar qué devolvió cada sitio.

La ejecución diaria (06:00 Colombia, corrida completa que escribe en la base de datos) viene **desactivada** en el workflow; se activa quitando el `#` de `schedule` cuando la corrida manual dé buenos resultados.

Secretos necesarios del repositorio (Settings → Secrets and variables → Actions):

| Secreto | Valor |
|---|---|
| `SUPABASE_URL` | URL del proyecto (`https://xxfjujppcjiatgfojbvq.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio. Nunca va en el código ni en las páginas. |

## Agregar o ajustar una cadena

Edita `src/adapters/index.mjs` (URLs de búsqueda). Si el sitio devuelve los productos con otra forma de JSON, ajusta `src/lib/extraer.mjs` y agrega un caso en `test/`.

```
cd scraper && npm install && npm test
DRY_RUN=1 DEBUG=1 CATEGORIA=lacteos LIMITE=5 CADENAS=exito node src/run.mjs
```

## Cuidado con los sitios

- Revisa `robots.txt` y los términos de uso de cada cadena antes de activar la ejecución diaria.
- El scraper espera 1,5–3 s entre consultas. No lo hagas más agresivo.
- Si un sitio bloquea las IP de GitHub o cambia su estructura, esa cadena queda como `sin_dato` hasta que se ajuste el adaptador.
