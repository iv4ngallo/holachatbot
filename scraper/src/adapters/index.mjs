// Una cadena = id (el de precia_cadenas), nombre, base y una o más URLs de búsqueda candidatas.
// El motor prueba las URLs en orden y se queda con la primera que devuelva productos.
// Los patrones de URL de búsqueda son una primera hipótesis: la primera ejecución con DEBUG=1 confirma o corrige.

const q = encodeURIComponent;

export const ADAPTADORES = {
  exito: {
    id: 'exito',
    nombre: 'Éxito',
    base: 'https://www.exito.com',
    urlsBusqueda: (t) => [`https://www.exito.com/s?q=${q(t)}&sort=score_desc&page=0`],
  },
  d1: {
    id: 'd1',
    nombre: 'D1',
    base: 'https://www.d1.com.co',
    urlsBusqueda: (t) => [
      `https://www.d1.com.co/search?query=${q(t)}`,
      `https://www.d1.com.co/search?q=${q(t)}`,
      `https://www.d1.com.co/busqueda?q=${q(t)}`,
    ],
  },
};
