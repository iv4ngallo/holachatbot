# Scraper de precios de PrecIA

Recolecta precios de supermercados y los guarda en Supabase (`precia_ofertas`), con marca, presentación, precio, enlace, fecha y ciudad del sitio.

## Cómo funciona

1. Lee los productos del catálogo (`precia_productos`; si no hay clave de Supabase usa `data/productos.json`).
2. Por cada cadena y producto, abre la búsqueda del sitio con Chromium (Playwright) y recoge **lo que la propia página pide a su API** (JSON), más los datos embebidos (`__NEXT_DATA__`, JSON-LD).
3. `lib/extraer.mjs` rescata los productos con precio (formas de VTEX, schema.org y nombres en español).
4. `lib/normalizar.mjs` convierte la presentación a g / ml / und y empareja con el catálogo (rechaza, por ejemplo, leche en polvo para "leche entera").
5. Guarda hasta 5 ofertas por producto y cadena. Si una cadena no devuelve nada, **no borra** lo anterior y la marca `sin_dato`.

La columna `ciudad_del_sitio` dice `Ibagué` solo si el texto de la página lo menciona; si no, `No verificada`.

## Cómo consulta cada sitio (confirmado con la primera corrida)

Éxito y D1 son VTEX. Para no abrir una página nueva por producto (Cloudflare de Éxito responde 403 a las siguientes), el scraper abre la página de inicio una vez y desde esa misma sesión pide la API con `fetch`. Si la API no devuelve nada, navega a la búsqueda como respaldo. Una página 404 o 403 nunca cuenta como resultado.

- **Éxito:** operación `SearchQuery` de su API GraphQL, con la región de Ibagué (código postal 730001, resuelto con `/api/checkout/pub/regions`). Si la región se obtiene, `ciudad_del_sitio` queda como `Ibagué (CP 730001)`.
- **D1:** API pública de catálogo de VTEX (`/api/catalog_system/pub/products/search?ft=…`) y, si no responde, la búsqueda del sitio. Sin filtro de ciudad.
- **Bloqueos:** tras 3 respuestas 403/429 seguidas hace una pausa de 60 s y abre una sesión nueva; si vuelve a fallar, detiene la cadena. Con una corrida incompleta solo se reemplazan las ofertas de los productos obtenidos.

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
