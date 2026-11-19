/* Palabritas · contenido (4 temas, 48 palabras).
   Cada palabra usa el método de la palabra clave: sonido parecido (ancla) + imagen mental + mini historia.
   Campos: en, es, pr (pronunciación para hispanohablantes), emo (imagen) o col (color), kw (ancla), ke (imagen del ancla), h (historia).
   En la historia, <b> marca el ancla en español e <i> la palabra en inglés. */
window.PAL_TEMAS = [
  { id: 'animales', nombre: 'Animales', color: '#C65A12', emo: '\u{1F43E}', palabras: [
    { en: 'dog', es: 'perro', pr: 'dog', emo: '\u{1F436}', kw: 'dogo', ke: '\u{1F415}', h: 'Imagina un <b>dogo</b> enorme que ladra: <i>dog</i>, <i>dog</i>.' },
    { en: 'cat', es: 'gato', pr: 'cat', emo: '\u{1F431}', kw: 'catre', ke: '\u{1F6CF}️', h: 'Un gato duerme en tu <b>catre</b> y ronronea: <i>cat</i>.' },
    { en: 'bird', es: 'pájaro', pr: 'berd', emo: '\u{1F426}', kw: 'verde', ke: '\u{1F7E2}', h: 'Un pájaro <b>verde</b> canta en el árbol: <i>bird</i>.' },
    { en: 'fish', es: 'pez', pr: 'fish', emo: '\u{1F41F}', kw: 'ficha', ke: '\u{1F3B2}', h: 'Un pez se traga una <b>ficha</b> del parqués: <i>fish</i>.' },
    { en: 'horse', es: 'caballo', pr: 'jors', emo: '\u{1F434}', kw: 'Jorge', ke: '\u{1F466}', h: '<b>Jorge</b> monta un caballo por el parque: <i>horse</i>.' },
    { en: 'cow', es: 'vaca', pr: 'cau', emo: '\u{1F42E}', kw: 'cauce', ke: '\u{1F3DE}️', h: 'La vaca toma agua en el <b>cauce</b> del río: <i>cow</i>.' },
    { en: 'pig', es: 'cerdo', pr: 'pig', emo: '\u{1F437}', kw: 'pijama', ke: '\u{1F6CC}', h: 'Un cerdo rosado se pone la <b>pijama</b> para dormir: <i>pig</i>.' },
    { en: 'duck', es: 'pato', pr: 'dak', emo: '\u{1F986}', kw: 'duque', ke: '\u{1F451}', h: 'El pato es el <b>duque</b> del lago y lleva corona: <i>duck</i>.' },
    { en: 'frog', es: 'rana', pr: 'frog', emo: '\u{1F438}', kw: 'frío', ke: '\u{1F976}', h: 'La rana tiene mucho <b>frío</b> y salta rápido: <i>frog</i>.' },
    { en: 'bear', es: 'oso', pr: 'ber', emo: '\u{1F43B}', kw: 'berro', ke: '\u{1F96C}', h: 'El oso se come un plato de <b>berros</b>: <i>bear</i>.' },
    { en: 'lion', es: 'león', pr: 'láion', emo: '\u{1F981}', kw: 'león', ke: '\u{1F50A}', h: '¡Casi suena igual que <b>león</b>! El rey de la selva ruge: <i>lion</i>.' },
    { en: 'monkey', es: 'mono', pr: 'mánki', emo: '\u{1F435}', kw: 'mono + llave', ke: '\u{1F511}', h: 'El <b>mono</b> agarra una <b>llave</b> (en inglés, key): <i>mon</i> + <i>key</i> = <i>monkey</i>.' }
  ] },
  { id: 'comida', nombre: 'Comida', color: '#2A8A3E', emo: '\u{1F34E}', palabras: [
    { en: 'apple', es: 'manzana', pr: 'ápol', emo: '\u{1F34E}', kw: 'Apolo', ke: '\u{1F680}', h: '<b>Apolo</b>, el astronauta, come una manzana en el espacio: <i>apple</i>.' },
    { en: 'banana', es: 'banano', pr: 'banána', emo: '\u{1F34C}', kw: 'banano', ke: '\u{1F50A}', h: 'Casi igual a <b>banano</b>: lo pelas y te lo comes: <i>banana</i>.' },
    { en: 'milk', es: 'leche', pr: 'milk', emo: '\u{1F95B}', kw: 'mil', ke: '\u{1F4AF}', h: 'Te tomas <b>mil</b> vasos de leche: <i>milk</i>.' },
    { en: 'bread', es: 'pan', pr: 'bred', emo: '\u{1F35E}', kw: 'Brenda', ke: '\u{1F469}', h: '<b>Brenda</b> hornea pan calientico: <i>bread</i>.' },
    { en: 'water', es: 'agua', pr: 'uóter', emo: '\u{1F4A7}', kw: 'guau', ke: '\u{1F415}', h: 'El perro hace <b>guau</b> y toma agua: <i>water</i>.' },
    { en: 'egg', es: 'huevo', pr: 'eg', emo: '\u{1F95A}', kw: 'egoísta', ke: '\u{1F624}', h: 'Un huevo muy <b>egoísta</b> no quiere compartir: <i>egg</i>.' },
    { en: 'cheese', es: 'queso', pr: 'chis', emo: '\u{1F9C0}', kw: 'chis', ke: '\u{1F92B}', h: '¡<b>Chis</b>, en silencio! El ratón se roba el queso: <i>cheese</i>.' },
    { en: 'rice', es: 'arroz', pr: 'rais', emo: '\u{1F35A}', kw: 'raíz', ke: '\u{1F331}', h: 'El arroz crece desde una <b>raíz</b> metida en el agua: <i>rice</i>.' },
    { en: 'juice', es: 'jugo', pr: 'yus', emo: '\u{1F9C3}', kw: 'yuca', ke: '\u{1F360}', h: 'Hoy sirven jugo de <b>yuca</b>, ¡qué raro!: <i>juice</i>.' },
    { en: 'cake', es: 'torta', pr: 'keik', emo: '\u{1F370}', kw: 'cae', ke: '\u{1F632}', h: '¡Cuidado, la torta se <b>cae</b> al piso!: <i>cake</i>.' },
    { en: 'pizza', es: 'pizza', pr: 'pítsa', emo: '\u{1F355}', kw: 'pizza', ke: '\u{1F50A}', h: 'La <b>pizza</b> se escribe igual en los dos idiomas, pero suena distinto: <i>pizza</i>.' },
    { en: 'soup', es: 'sopa', pr: 'sup', emo: '\u{1F372}', kw: 'súper', ke: '\u{1F9B8}', h: 'Una sopa <b>súper</b> rica para el frío: <i>soup</i>.' }
  ] },
  { id: 'cuerpo', nombre: 'Mi cuerpo', color: '#B5307E', emo: '\u{1F9D1}', palabras: [
    { en: 'head', es: 'cabeza', pr: 'jed', emo: '\u{1F9D1}', kw: 'jefe', ke: '\u{1F454}', h: 'El <b>jefe</b> lleva un sombrero gigante en la cabeza: <i>head</i>.' },
    { en: 'eye', es: 'ojo', pr: 'ai', emo: '\u{1F441}️', kw: 'ay', ke: '\u{1F616}', h: '¡<b>Ay</b>! Me entró una basurita en el ojo: <i>eye</i>.' },
    { en: 'nose', es: 'nariz', pr: 'nous', emo: '\u{1F443}', kw: 'no sé', ke: '\u{1F914}', h: 'Con la nariz <b>no sé</b> a qué huele: <i>nose</i>.' },
    { en: 'mouth', es: 'boca', pr: 'maus', emo: '\u{1F444}', kw: 'Mauricio', ke: '\u{1F9D4}', h: '<b>Mauricio</b> abre la boca bien grande: <i>mouth</i>.' },
    { en: 'ear', es: 'oreja', pr: 'ir', emo: '\u{1F442}', kw: 'ir', ke: '\u{1F6B6}', h: 'Mi oreja quiere <b>ir</b> a escuchar música: <i>ear</i>.' },
    { en: 'hand', es: 'mano', pr: 'jand', emo: '✋', kw: 'Juan', ke: '\u{1F466}', h: '<b>Juan</b> me da la mano para saludar: <i>hand</i>.' },
    { en: 'foot', es: 'pie', pr: 'fut', emo: '\u{1F9B6}', kw: 'fútbol', ke: '⚽', h: 'Con el pie le pego al balón en el <b>fútbol</b>: <i>foot</i>.' },
    { en: 'arm', es: 'brazo', pr: 'arm', emo: '\u{1F4AA}', kw: 'armadura', ke: '\u{1F6E1}️', h: 'El caballero lleva <b>armadura</b> en el brazo: <i>arm</i>.' },
    { en: 'leg', es: 'pierna', pr: 'leg', emo: '\u{1F9B5}', kw: 'lego', ke: '\u{1F9F1}', h: 'Se me cayó una torre de <b>legos</b> sobre la pierna: <i>leg</i>.' },
    { en: 'hair', es: 'pelo', pr: 'jer', emo: '\u{1F487}', kw: 'Jeremías', ke: '\u{1F9D2}', h: '<b>Jeremías</b> tiene el pelo largo y rizado: <i>hair</i>.' },
    { en: 'teeth', es: 'dientes', pr: 'tiz', emo: '\u{1F9B7}', kw: 'tiza', ke: '\u{1F58D}️', h: 'Mis dientes están blancos como la <b>tiza</b>: <i>teeth</i>.' },
    { en: 'finger', es: 'dedo', pr: 'fínguer', emo: '\u{1F446}', kw: 'fingir', ke: '\u{1F3AD}', h: 'Voy a <b>fingir</b> que mi dedo es un lápiz: <i>finger</i>.' }
  ] },
  { id: 'colores', nombre: 'Colores', color: '#7A3AB8', emo: '\u{1F3A8}', palabras: [
    { en: 'red', es: 'rojo', pr: 'red', col: '#E53935', kw: 'red', ke: '\u{1F3A3}', h: 'La <b>red</b> de pescar es roja y suena igual en inglés: <i>red</i>.' },
    { en: 'blue', es: 'azul', pr: 'blu', col: '#1E6FD9', kw: 'blusa', ke: '\u{1F45A}', h: 'Mi <b>blusa</b> favorita es azul: <i>blue</i>.' },
    { en: 'green', es: 'verde', pr: 'grin', col: '#2E9E4F', kw: 'gringo', ke: '\u{1F9E2}', h: 'Un <b>gringo</b> con camiseta verde: <i>green</i>.' },
    { en: 'yellow', es: 'amarillo', pr: 'yélou', col: '#FFC107', kw: 'yema', ke: '\u{1F373}', h: 'La <b>yema</b> del huevo es amarilla: <i>yellow</i>.' },
    { en: 'black', es: 'negro', pr: 'blak', col: '#212121', kw: 'bloque', ke: '\u{1F9F1}', h: 'Un <b>bloque</b> negro como el carbón: <i>black</i>.' },
    { en: 'white', es: 'blanco', pr: 'uait', col: '#FFFFFF', kw: 'guayabera', ke: '\u{1F455}', h: 'El abuelo se pone su <b>guayabera</b> blanca: <i>white</i>.' },
    { en: 'orange', es: 'naranja', pr: 'órinch', col: '#FB8C00', kw: 'Orinoco', ke: '\u{1F305}', h: 'El río <b>Orinoco</b> se pinta de naranja al atardecer: <i>orange</i>.' },
    { en: 'pink', es: 'rosado', pr: 'pink', col: '#F06292', kw: 'pingüino', ke: '\u{1F427}', h: 'Un <b>pingüino</b> de color rosado: <i>pink</i>.' },
    { en: 'purple', es: 'morado', pr: 'pérpol', col: '#8E44C8', kw: 'púrpura', ke: '\u{1F50A}', h: 'Casi igual que <b>púrpura</b>, el color de las uvas: <i>purple</i>.' },
    { en: 'brown', es: 'café', pr: 'braun', col: '#795548', kw: 'brownie', ke: '\u{1F36B}', h: 'Mi <b>brownie</b> es de color café: <i>brown</i>.' },
    { en: 'gray', es: 'gris', pr: 'grei', col: '#9E9E9E', kw: 'gris', ke: '☁️', h: 'Casi igual a <b>gris</b>, como las nubes de lluvia: <i>gray</i>.' },
    { en: 'gold', es: 'dorado', pr: 'gould', col: '#D4A017', kw: 'gol', ke: '\u{1F945}', h: '¡<b>Gol</b>! Ganamos la copa dorada: <i>gold</i>.' }
  ] }
];
