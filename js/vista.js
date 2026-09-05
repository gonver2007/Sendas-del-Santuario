// ============================================================
//  vista.js - dibujado, entrada y bucle principal (vista cenital).
//  Estética de animación japonesa: contorno de tinta, sombreado plano de dos
//  tonos, noche azul y farolillos que dan luz. La lógica vive en mazmorra.js.
// ============================================================
const lienzo = document.getElementById('vista');
const ctx = lienzo.getContext('2d');
// Resolución fija del juego: se ve igual de grande en cualquier pantalla. El
// tamaño de ventana solo decide cómo se escala el lienzo (letterbox) y cómo se
// acomoda el hud, que sí vive en píxeles de pantalla.
const ANCHO_JUEGO = 1440, ALTO_JUEGO = 900;
let AN = lienzo.width, AL = lienzo.height;

const TILE = 44;              // píxeles por casilla
const ALCANCE_LUZ = 12;       // hasta dónde llega el farol del héroe, en casillas
const RAYOS_LUZ = 320;        // rayos con que se recorta la silueta iluminada
const MORDIDA_PARED = 0.7;    // cuánto entra el rayo en el muro, para verle la cara
const OSCURIDAD = 0.82;       // la noche no llega a negra: es azul de tinta
const MARGEN_SOMBRA = 14;     // sobra alrededor, para que el temblor no descubra bordes
const SPR = 56;               // lado en que están dibujadas las figuras
const LADO_SPR = 1.912;       // lo que ocupa una figura, medido en casillas
// El tamaño en pantalla sale de la casilla y no de un número suelto: así el
// héroe crece con el mundo cuando cambia TILE
const ESCALA_SPR = LADO_SPR * TILE / SPR;

// ============================================================
//  Paleta: cada material lleva base, luz y sombra, los tres planos. El contorno
//  es siempre el mismo violeta de tinta, nunca negro puro.
// ============================================================
const P = {
    tinta: '#17132b',

    // el bosque nocturno que rodea el recinto
    nocheAlta: '#16274d',
    nocheBaja: '#101c3a',
    hoja: '#1e3d70', hojaLuz: '#33619e', hojaSombra: '#132749',
    hojaFria: '#255a7e', hojaFriaLuz: '#3d87ab',

    // tejados de teja vidriada, verdes como en las estampas
    teja: '#2f7a76', tejaLuz: '#4ea79c', tejaSombra: '#1d4f54',

    // el interior: tatami y madera de tarima
    tatami: '#6f9a63', tatamiLuz: '#82ad72', tatamiSombra: '#4f7350',
    madera: '#8a5f3e', maderaLuz: '#ad7c53', maderaSombra: '#5d3d29',
    piedra: '#8d93a8', piedraLuz: '#b2b8c8', piedraSombra: '#5c6178',

    // luz cálida de los farolillos de papel
    papel: '#ffcf72', papelLuz: '#fff0c4', bermellon: '#c8402f',

    // El héroe: un samurái de armadura de laca azul noche, atada con cordón
    // rojo y ribeteada de oro, con el peto de cuero crudo y la careta granate.
    // No es blanco por una razón de fondo: lo blanco de la senda es lo que
    // hace daño -el filo, la estela, el destello del golpe-, y el que lo lleva
    // puesto se confundía con ello.
    laca: '#2c3b5e', lacaLuz: '#455780', lacaSombra: '#18213a',
    cordon: '#a8352b', cordonLuz: '#d2564a',
    cuero: '#cfc2a0', cueroLuz: '#eae1c6', cueroSombra: '#96895f',
    menpo: '#7b2b26', menpoLuz: '#a8453c',
    // la bota levanta el tono sobre la laca: es lo que hace visible la zancada
    bota: '#5a6484', botaLuz: '#828cab',
    acero: '#dfe9ff', aceroSombra: '#8f9fc4',
    oro: '#e8b352', oroLuz: '#ffd784', oroSombra: '#9a6f2b',

    // los adversarios se pintan en bestias.js y allí tienen sus colores

    elixir: '#e04f7a', elixirLuz: '#ff9cba',
    sakura: '#f0a8c8', sakuraLuz: '#ffd3e4',

    // Colores de sitio, no de material: los pisa cada bioma con su paleta. Los
    // de aquí son los de la mansión, el aspecto del juego antes de las comarcas.
    fondoAlto: '#16274d', fondoBajo: '#101c3a',        // lo que hay más allá
    suelo: '#6f9a63', sueloLuz: '#82ad72', sueloSombra: '#4f7350',
    junta: 'rgba(28, 44, 34, 0.6)',                    // lo que separa una pieza de otra
    zocalo: '#8a5f3e', zocaloLuz: '#ad7c53', zocaloSombra: '#5d3d29',
    bordeBase: '#2f7a76', bordeLuz: '#4ea79c', bordeSombra: '#1d4f54',
    mota: '#c8b98f',                                   // el menudeo del fondo
    tinte: '#ffcf72'                                   // el color con que se firma la comarca
};

// ============================================================
//  El tema de la senda: la paleta de arriba pisada por la del bioma. Los
//  sprites siguen leyendo P -el héroe no cambia de color al mudar de comarca-;
//  todo el decorado lee T.
// ============================================================
let BIOMA = null;                       // la ficha de biomas.js, tal cual
let T = Object.assign({}, P);           // sus colores, ya fusionados

// lo que se usa sin biomas.js cargado: la mansión de siempre
const AIRE_BASE = { forma: 'petalo', cuantas: 34, color: P.sakuraLuz, vel: [14, 34],
                    luciernagas: 16, oscuridad: 0.82, velo: '14, 22, 54' };

function aplicarTema() {
    const antes = BIOMA;
    BIOMA = (typeof Biomas !== 'undefined') ? Biomas.deNivel(J.nivel) : null;
    T = Object.assign({}, P, BIOMA && BIOMA.paleta);
    // la viñeta se tiñe del velo de la comarca: al cambiar hay que rehacerla
    if (!antes || !BIOMA || antes.id !== BIOMA.id) capaVineta = null;
}

const aire = () => (BIOMA && BIOMA.ambiente) || AIRE_BASE;

const cam = { x: 0, y: 0 };   // en píxeles de mundo
let sacudida = 0;             // temblor de pantalla al recibir daño
let flash = 0;
let dtVista = 0.016;         // el último paso de tiempo, para lo que se atenúa por fotograma

function lienzoOculto(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
}

// ============================================================
//  Piezas de cel-shading: primero la mancha de tinta que hace de contorno,
//  luego el color plano, y encima sombra y luz recortadas a la propia silueta.
// ============================================================
function pieza(g, cx, cy, rx, ry, base, luz, sombra, giro = 0, grosor = 2.4) {
    g.save();
    if (grosor) {
        g.fillStyle = P.tinta;
        g.beginPath(); g.ellipse(cx, cy, rx + grosor, ry + grosor, giro, 0, 6.2832); g.fill();
    }
    g.beginPath(); g.ellipse(cx, cy, rx, ry, giro, 0, 6.2832);
    g.fillStyle = base; g.fill();
    g.clip();
    if (sombra) {
        g.fillStyle = sombra;
        g.beginPath(); g.ellipse(cx + rx * 0.45, cy + ry * 0.5, rx, ry, giro, 0, 6.2832); g.fill();
    }
    if (luz) {
        g.fillStyle = luz;
        g.beginPath(); g.ellipse(cx - rx * 0.36, cy - ry * 0.48, rx * 0.62, ry * 0.54, giro, 0, 6.2832); g.fill();
    }
    g.restore();
}

// Brillo especular: la pincelada blanca que remata cada superficie
function brillo(g, cx, cy, rx, ry, giro = 0, alfa = 0.8) {
    g.save();
    g.globalAlpha = alfa;
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(cx, cy, rx, ry, giro, 0, 6.2832); g.fill();
    g.restore();
}

// Y para lo que no es un bulto sino un miembro -brazos, piernas, la bufanda-,
// el pincel que ya usan las bestias: una curva recorrida a discos, del gordo al
// fino, primero en tinta y luego en color. Está aquí otra vez y no compartido
// porque bestias.js lo tiene guardado dentro de su propio ámbito; sacarlo fuera
// para que lo vieran los dos chocaría con estos nombres, que son globales.
const punto = (x, y) => ({ x, y });
const disco = (g, x, y, r) => { g.beginPath(); g.arc(x, y, Math.max(r, 0.15), 0, 6.2832); g.fill(); };

function enCurva(p, t) {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return { x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x,
             y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y };
}

function apendice(g, p, base, r0, r1, filo = 1.2, luz) {
    const largo = Math.hypot(p[3].x - p[0].x, p[3].y - p[0].y) +
                  Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y);
    const n = Math.max(16, Math.ceil(largo / Math.max(r1, 0.25) * 1.6));
    for (let paso = 0; paso < (luz ? 3 : 2); paso++)
        for (let i = 0; i <= n; i++) {
            const t = i / n, q = enCurva(p, t), r = r0 + (r1 - r0) * t;
            if (paso === 0) { g.fillStyle = P.tinta; disco(g, q.x, q.y, r + filo); }
            else if (paso === 1) { g.fillStyle = base; disco(g, q.x, q.y, r); }
            else if (t < 0.7) { g.fillStyle = luz; disco(g, q.x - r * 0.3, q.y - r * 0.35, r * 0.42); }
        }
}

// ============================================================
//  Composición del nivel: se hace una vez por recinto
// ============================================================
let lienzoNivel = null;
let adornos = [];             // farolillos, tinajas y demás detalle del interior
let luces = [];               // focos fijos que iluminan la noche

// Distancia en casillas de cada celda al suelo transitable más cercano: dice
// cuánto sitio hay fuera del recinto antes de plantar un árbol o una casa.
function distanciasAlSuelo() {
    const d = new Int16Array(ANCHO * ALTO).fill(999);
    const cola = [];
    for (let y = 0; y < ALTO; y++)
        for (let x = 0; x < ANCHO; x++)
            if (J.mapa[y][x] === 0) { d[y * ANCHO + x] = 0; cola.push(y * ANCHO + x); }

    for (let p = 0; p < cola.length; p++) {
        const i = cola[p], x = i % ANCHO, y = (i / ANCHO) | 0;
        const paso = d[i] + 1;
        if (x > 0 && d[i - 1] > paso) { d[i - 1] = paso; cola.push(i - 1); }
        if (x < ANCHO - 1 && d[i + 1] > paso) { d[i + 1] = paso; cola.push(i + 1); }
        if (y > 0 && d[i - ANCHO] > paso) { d[i - ANCHO] = paso; cola.push(i - ANCHO); }
        if (y < ALTO - 1 && d[i + ANCHO] > paso) { d[i + ANCHO] = paso; cola.push(i + ANCHO); }
    }
    return d;
}

// Las afueras no son un fondo aparte: van en el mismo lienzo del nivel, así que
// se mueven con él sin costura. Cuánto bosque pintar de más depende de la
// ventana: lo justo para que su borde no llegue a verse.
let MARGEN = 0;               // casillas de afueras a cada lado
let OFF = 0;                  // esas mismas casillas, en píxeles

function margenAfueras() {
    const sobraX = Math.max(0, (AN - ANCHO * TILE) / 2);
    const sobraY = Math.max(0, (AL - ALTO * TILE) / 2);
    return Math.ceil((Math.max(sobraX, sobraY) + TILE * 2) / TILE);
}

// Todo borde entre suelo y muro, en un camino y a la escala que se pida: con él
// se entinta el recinto en la vista y se perfila la planta en el minimapa.
function caminoDeBordes(paso) {
    const p = new Path2D();
    for (let y = 0; y < ALTO; y++)
        for (let x = 0; x < ANCHO; x++) {
            if (J.mapa[y][x] !== 0) continue;
            const px = x * paso, py = y * paso;
            if (esMuro(x, y - 1)) { p.moveTo(px, py); p.lineTo(px + paso, py); }
            if (esMuro(x, y + 1)) { p.moveTo(px, py + paso); p.lineTo(px + paso, py + paso); }
            if (esMuro(x - 1, y)) { p.moveTo(px, py); p.lineTo(px, py + paso); }
            if (esMuro(x + 1, y)) { p.moveTo(px + paso, py); p.lineTo(px + paso, py + paso); }
        }
    return p;
}

function construirLienzoNivel() {
    // lo primero es saber en qué comarca se anda: de ahí salen los colores, el
    // suelo, el remate de los muros y lo que se ve más allá
    aplicarTema();

    const W = ANCHO * TILE, H = ALTO * TILE;
    MARGEN = margenAfueras();
    OFF = MARGEN * TILE;
    const WT = W + OFF * 2, HT = H + OFF * 2;   // el lienzo entero, afueras incluidas
    const dist = distanciasAlSuelo();

    // 1) Silueta del recinto: el suelo tal cual, con el filo intacto. Estas
    //    capas solo cubren el recinto; el margen es afueras y nada más
    const silueta = lienzoOculto(W, H), sg = silueta.getContext('2d');
    sg.fillStyle = '#fff';
    for (let y = 0; y < ALTO; y++)
        for (let x = 0; x < ANCHO; x++)
            if (J.mapa[y][x] === 0) sg.fillRect(x * TILE, y * TILE, TILE, TILE);

    // 2) El camino de todo borde suelo/muro: con él se trazan el remate de
    //    fuera, el zócalo de dentro y la línea de tinta
    const bordes = caminoDeBordes(TILE);

    const nivel = lienzoOculto(WT, HT), ng = nivel.getContext('2d');
    pintarExterior(ng, WT, HT, dist);                  // lo que hay más allá del recinto
    ng.drawImage(capaBorde(W, H, silueta, bordes), OFF, OFF);
    ng.drawImage(capaSuelo(W, H, silueta, bordes), OFF, OFF);

    // 3) Línea de tinta que cierra el recinto, como el entintado de un cel
    ng.save();
    ng.translate(OFF, OFF);
    ng.lineCap = 'square';
    ng.strokeStyle = T.tinta;
    ng.lineWidth = 3.5;
    ng.stroke(bordes);
    ng.restore();

    lienzoNivel = nivel;
    sembrarAdornos();
    prepararMinimapa();
    prepararAmbiente();          // el aire también cambia con la comarca
}

// ============================================================
//  Fuera del recinto: cada comarca tiene lo suyo -roca, cañaveral, jardín,
//  pueblo, el vacío del foso o el mar de nubes del santuario- y todas se pintan
//  sobre el mismo lienzo del nivel. Las casillas del recinto viven desplazadas
//  OFF píxeles; todo lo que cae fuera es campo libre.
// ============================================================
function pintarExterior(g, W, H, dist) {
    const fondo = g.createLinearGradient(0, 0, W * 0.4, H);
    fondo.addColorStop(0, T.fondoAlto || P.nocheAlta);
    fondo.addColorStop(1, T.fondoBajo || P.nocheBaja);
    g.fillStyle = fondo;
    g.fillRect(0, 0, W, H);

    // de píxel del lienzo a casilla del recinto, que empieza en OFF
    const casillaX = px => Math.floor((px - OFF) / TILE);
    const casillaY = py => Math.floor((py - OFF) / TILE);

    // fuera del recinto siempre hay sitio: allí no hay muros de los que guardar
    // distancia
    const hueco = (cx, cy, min) =>
        cx < 0 || cy < 0 || cx >= ANCHO || cy >= ALTO || dist[cy * ANCHO + cx] >= min;

    // el cuaderno que se pasan los pintores de afueras: lienzo, mapa de
    // distancias y cuánto multiplicar una cantidad pensada solo para el recinto
    const A = {
        g, W, H, dist, hueco,
        despejado: (px, py, min) => hueco(casillaX(px), casillaY(py), min),
        escala: (W * H) / (ANCHO * TILE * ALTO * TILE)
    };

    switch ((BIOMA && BIOMA.afueras) || 'arboleda') {
        case 'roca':      afuerasRoca(A); break;
        case 'canaveral': afuerasCanaveral(A); break;
        case 'jardin':    afuerasJardin(A); break;
        case 'pueblo':    afuerasPueblo(A); break;
        case 'vacio':     afuerasVacio(A); break;
        case 'nubes':     afuerasNubes(A); break;
        default:          afuerasArboleda(A);
    }
}

// ---------- Herramientas que comparten todas las afueras ----------

// Sembrar es lo que hacen todas las comarcas: se tantean tantos sitios como
// pida la densidad -ajustada al tamaño del lienzo-, se descartan los que caen
// sobre el recinto o demasiado cerca, y en los que quedan se llama al pintor.
// Lo único propio de cada comarca es ese pintor.
function sembrar(A, densidad, holgura, pintar) {
    const veces = Math.round(densidad * A.escala);
    for (let i = 0; i < veces; i++) {
        const x = azar(0, A.W), y = azar(0, A.H);
        if (!A.despejado(x, y, holgura)) continue;
        A.g.save();
        pintar(x, y, A.g);
        A.g.restore();
    }
}

// Copas por todo el margen, más cerradas cuanto más lejos queda el recinto y
// nunca sobre un solar tomado. Bosque y jardín se diferencian solo en lo
// tupido, el tamaño y lo deprisa que se cierra el monte.
function arbolado(A, s, espesura, tamano, cierre) {
    for (let y = -MARGEN; y < ALTO + MARGEN; y++)
        for (let x = -MARGEN; x < ANCHO + MARGEN; x++) {
            const dentro = x >= 0 && y >= 0 && x < ANCHO && y < ALTO;
            const d = dentro ? A.dist[y * ANCHO + x] : 999;
            if (d < 3 || !s.libre(x, y) || Math.random() > espesura) continue;
            copaDeArbol(A.g, OFF + x * TILE + azar(3, TILE - 3),
                        OFF + y * TILE + azar(3, TILE - 3),
                        azar(TILE * tamano[0], TILE * tamano[1]), Math.min(1, (d - 3) / cierre));
        }
}

// Manchas amplias y blandas, para que el fondo no quede liso
function manchones(A, densidad, color, rx, ry, alfa) {
    sembrar(A, densidad, 2, (x, y, g) => {
        g.globalAlpha = azar(alfa[0], alfa[1]);
        g.fillStyle = color;
        g.beginPath();
        g.ellipse(x, y, azar(rx[0], rx[1]), azar(ry[0], ry[1]), azar(0, 3.14), 0, 6.2832);
        g.fill();
    });
}

// Solares tomados. Las claves se corren para que las casillas de las afueras,
// que son negativas, no se pisen con las de dentro
function solares() {
    const clave = (cx, cy) => (cy + 2048) * 8192 + (cx + 2048);
    const tomados = new Set();
    return {
        libre: (cx, cy) => !tomados.has(clave(cx, cy)),
        tomar(cx, cy, w, h) {
            for (let y = cy - 1; y <= cy + h; y++)
                for (let x = cx - 1; x <= cx + w; x++) tomados.add(clave(x, y));
        }
    };
}

// Tejados sueltos donde el recinto deja sitio de sobra. Devuelve el registro de
// solares para que quien siembre después no plante encima.
function sembrarCasas(A, intentos, separacion) {
    const s = solares();
    for (let i = 0; i < intentos; i++) {
        const cx = azarEnt(-MARGEN + 1, ANCHO + MARGEN - 6);
        const cy = azarEnt(-MARGEN + 1, ALTO + MARGEN - 7);
        let cabe = true;
        for (let y = cy; y < cy + 6 && cabe; y++)
            for (let x = cx; x < cx + 5 && cabe; x++)
                cabe = A.hueco(x, y, separacion) && s.libre(x, y);
        if (!cabe) continue;
        casaDeAldea(A.g, OFF + cx * TILE + TILE, OFF + cy * TILE + TILE, TILE * 3, TILE * 4);
        s.tomar(cx, cy, 5, 6);
        for (let y = cy - 1; y < cy + 7; y++)          // el solar deja de ser hueco
            for (let x = cx - 1; x < cx + 6; x++)
                if (x >= 0 && y >= 0 && x < ANCHO && y < ALTO) A.dist[y * ANCHO + x] = 1;
    }
    return s;
}

// Helechos y piedras sueltas: el menudeo que llena los claros
function sotobosque(A, densidad) {
    sembrar(A, densidad, 2, (x, y, g) => {
        if (Math.random() >= 0.62)                     // una de cada tres es piedra
            return pieza(g, x, y, azar(3, 7), azar(2.5, 5), T.zocaloSombra, null, null, azar(0, 3), 1.6);
        g.globalAlpha = azar(0.12, 0.3);
        g.strokeStyle = T.mota || P.hojaFriaLuz;
        g.lineWidth = 1.6; g.lineCap = 'round';
        const a = azar(0, 6.28), l = azar(6, 14);
        g.beginPath(); g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 - 4, y + Math.sin(a) * l * 0.5,
                           x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
    });
}

// ---------- Bosque nocturno: pinos en masa y algún tejado de aldea ----------
function afuerasArboleda(A) {
    manchones(A, 300, T.hoja, [30, 90], [20, 60], [0.05, 0.14]);
    // copas apretadas, más cerradas cuanto más lejos del recinto: en las
    // afueras la distancia es la que hay hasta el borde, así que el monte acaba
    // tapándolo todo según se aleja
    arbolado(A, sembrarCasas(A, 220, 4), 0.45, [0.6, 1.15], 7);
    sotobosque(A, 460);
}

// ---------- Roca maciza: no hay afueras, hay montaña ----------
// Bajo tierra lo que rodea los muros es piedra sin excavar; lo único que la
// rompe son sus propias vetas.
function afuerasRoca(A) {
    const { g, W, H } = A;
    manchones(A, 380, T.bordeSombra, [40, 110], [26, 70], [0.3, 0.7]);
    manchones(A, 260, T.bordeBase, [24, 70], [16, 44], [0.18, 0.45]);

    // caras de roca: polígonos angulosos, que es como se rompe la piedra
    sembrar(A, 300, 2, (x, y, g) => {
        const r = azar(TILE * 0.35, TILE * 1.1);
        g.translate(x, y);
        g.rotate(azar(0, 3.14));
        g.globalAlpha = azar(0.2, 0.5);
        g.fillStyle = Math.random() < 0.6 ? T.bordeSombra : T.bordeLuz;
        g.beginPath();
        for (let k = 0; k < 6; k++) {
            const a = k / 6 * 6.2832, rr = r * azar(0.6, 1);
            const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.72;
            k ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.closePath(); g.fill();
    });

    // grietas y algún filón que devuelve un poco de luz
    sembrar(A, 420, 2, (x, y, g) => {
        const mineral = Math.random() < 0.18;
        g.lineCap = 'round';
        g.globalAlpha = mineral ? azar(0.18, 0.4) : azar(0.2, 0.45);
        g.strokeStyle = mineral ? (T.mota || P.piedraLuz) : T.tinta;
        g.lineWidth = mineral ? 1.4 : azar(1.6, 3);
        const a = azar(0, 6.28), l = azar(10, 34);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5);
        g.lineTo(x + Math.cos(a + azar(-0.7, 0.7)) * l, y + Math.sin(a + azar(-0.7, 0.7)) * l);
        g.stroke();
    });
}

// ---------- Cañaveral: bambú tan cerrado que no se ve el suelo ----------
function afuerasCanaveral(A) {
    manchones(A, 340, T.hojaSombra || T.bordeSombra, [34, 96], [24, 64], [0.12, 0.3]);
    sembrar(A, 1200, 2, (x, y, g) =>
        matoDeCanas(g, x, y, azar(TILE * 0.35, TILE * 0.8), azar(0, 6.28)));
    sotobosque(A, 300);
}

// Un puñado de cañas vistas desde arriba: los cortes redondos del tronco y las
// hojas en abanico. Todo lo que varía sale del giro que se le pasa y no de un
// sorteo, así el mismo mato sale idéntico cuadro tras cuadro.
function matoDeCanas(g, cx, cy, r, giro) {
    g.save();
    g.translate(cx, cy);
    g.rotate(giro);
    g.lineCap = 'round';

    g.globalAlpha = 0.75;
    g.strokeStyle = T.bordeSombra;
    g.lineWidth = 2.6;
    for (let i = 0; i < 5; i++) {                      // las hojas, en abanico
        const a = (i / 5) * 6.2832 + Math.sin(giro * 3 + i) * 0.3;
        const l = r * (1.7 + Math.sin(giro * 2 + i * 1.7) * 0.4);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(Math.cos(a) * l * 0.5 - 3, Math.sin(a) * l * 0.5,
                           Math.cos(a) * l, Math.sin(a) * l);
        g.stroke();
    }
    g.strokeStyle = T.bordeLuz;
    g.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * 6.2832 + 0.6;
        const l = r * (1.4 + Math.cos(giro + i * 2.1) * 0.3);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(Math.cos(a) * l * 0.5, Math.sin(a) * l * 0.5 - 3,
                           Math.cos(a) * l, Math.sin(a) * l);
        g.stroke();
    }

    g.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {                      // los cortes de la caña
        const a = giro * 1.7 + i * 2.094;
        const d = r * (0.25 + Math.sin(giro + i) * 0.2);
        pieza(g, Math.cos(a) * d, Math.sin(a) * d, r * 0.24, r * 0.24,
              T.zocalo, T.zocaloLuz, T.zocaloSombra, 0, 1.8);
    }
    g.restore();
}

// ---------- Jardín: musgo, setos, estanques y algún tejado ----------
function afuerasJardin(A) {
    manchones(A, 320, T.hoja || T.bordeBase, [40, 110], [26, 68], [0.1, 0.26]);

    // estanques: lámina oscura con su orilla de piedra y un brillo encima
    sembrar(A, 26, 4, (x, y, g) => {
        const rx = azar(TILE * 0.9, TILE * 2.2), ry = rx * azar(0.5, 0.8);
        pieza(g, x, y, rx, ry, T.zocaloSombra, null, null, azar(0, 3), 3);
        pieza(g, x, y, rx * 0.86, ry * 0.86, '#1e3a5c', '#2f5c86', '#12243c', 0, 0);
        brillo(g, x - rx * 0.3, y - ry * 0.3, rx * 0.28, ry * 0.16, -0.5, 0.2);
    });

    // setos y arbolillos: la vegetación cuidada del jardín, más suelta y menuda
    // que el monte cerrado de la arboleda
    arbolado(A, sembrarCasas(A, 60, 5), 0.3, [0.5, 0.95], 8);
    sotobosque(A, 520);
}

// ---------- Pueblo: tejados apretados hasta donde alcanza la vista ----------
function afuerasPueblo(A) {
    manchones(A, 240, T.bordeSombra, [40, 120], [26, 70], [0.15, 0.35]);
    // dos pasadas: la primera deja las casas holgadas, la segunda las aprieta
    sembrarCasas(A, 400, 4);
    sembrarCasas(A, 320, 3);
    sotobosque(A, 260);
}

// ---------- El vacío: bajo el puente no hay suelo, hay noche ----------
function afuerasVacio(A) {
    // el fondo ya viene oscuro; aquí solo se hunde más según se aleja del borde
    manchones(A, 300, '#04060c', [60, 160], [40, 100], [0.25, 0.55]);

    // espolones de roca que asoman del barranco y se pierden abajo
    sembrar(A, 90, 3, (x, y, g) => {
        const r = azar(TILE * 0.6, TILE * 1.8);
        g.globalAlpha = azar(0.25, 0.6);
        g.fillStyle = T.bordeSombra;
        g.beginPath();
        g.moveTo(x, y - r);
        g.lineTo(x + r * azar(0.4, 0.8), y + r * 0.7);
        g.lineTo(x - r * azar(0.4, 0.8), y + r * 0.6);
        g.closePath(); g.fill();
    });

    // jirones de niebla cruzando el foso, que es lo que da la altura
    sembrar(A, 70, 2, (x, y, g) => {
        g.globalAlpha = azar(0.05, 0.14);
        g.fillStyle = T.mota || '#8f9bb0';
        g.beginPath();
        g.ellipse(x, y, azar(TILE * 2, TILE * 5), azar(TILE * 0.25, TILE * 0.7),
                  azar(-0.2, 0.2), 0, 6.2832);
        g.fill();
    });
}

// ---------- Mar de nubes: se ha subido por encima del tiempo ----------
function afuerasNubes(A) {
    // las crestas lejanas, antes que las nubes: quedan detrás
    sembrar(A, 40, 4, (x, y, g) => {
        const r = azar(TILE * 1.2, TILE * 3);
        g.globalAlpha = azar(0.2, 0.4);
        g.fillStyle = T.bordeSombra;
        g.beginPath();
        g.moveTo(x, y - r);
        g.lineTo(x + r * 0.9, y + r * 0.5);
        g.lineTo(x - r * 0.9, y + r * 0.5);
        g.closePath(); g.fill();
        g.fillStyle = T.mota;                          // la nieve de la cumbre
        g.globalAlpha = azar(0.25, 0.5);
        g.beginPath();
        g.moveTo(x, y - r);
        g.lineTo(x + r * 0.3, y - r * 0.4);
        g.lineTo(x - r * 0.3, y - r * 0.4);
        g.closePath(); g.fill();
    });

    // y encima el algodón: lóbulos claros, apilados sin prisa
    sembrar(A, 260, 2, (x, y, g) => {
        const r = azar(TILE * 0.8, TILE * 2.4);
        g.globalAlpha = azar(0.08, 0.22);
        g.fillStyle = Math.random() < 0.65 ? '#e8eefc' : (T.mota || '#ffe8b0');
        g.beginPath();
        for (let k = 0; k < 4; k++) {
            const a = azar(0, 6.28), d = r * azar(0, 0.6);
            g.moveTo(x + Math.cos(a) * d + r * 0.6, y + Math.sin(a) * d);
            g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * azar(0.4, 0.7), 0, 6.2832);
        }
        g.fill();
    });
}

// ============================================================

// Copa vista desde arriba: lóbulos de un mismo trazo, tinta debajo y una media
// luna de luz arriba a la izquierda. Cel puro, sin degradados.
function copaDeArbol(g, cx, cy, r, lejos) {
    const lobulos = 6, giro = azar(0, 6.28);
    const camino = escala => {
        g.beginPath();
        for (let i = 0; i < lobulos; i++) {
            const a = giro + (i / lobulos) * 6.2832;
            const lx = cx + Math.cos(a) * r * 0.55, ly = cy + Math.sin(a) * r * 0.55;
            g.moveTo(lx + r * 0.5 * escala, ly);
            g.arc(lx, ly, r * 0.5 * escala, 0, 6.2832);
        }
        g.moveTo(cx + r * 0.62 * escala, cy);
        g.arc(cx, cy, r * 0.62 * escala, 0, 6.2832);
    };

    g.fillStyle = T.tinta;
    camino(1.14); g.fill();
    g.fillStyle = lejos > 0.55 ? T.hojaFria : T.hoja;
    camino(1); g.fill();

    g.save();
    camino(1); g.clip();
    g.fillStyle = T.hojaSombra;                        // el lado de sombra
    g.beginPath(); g.ellipse(cx + r * 0.45, cy + r * 0.5, r, r * 0.9, 0, 0, 6.2832); g.fill();
    g.fillStyle = lejos > 0.55 ? T.hojaFriaLuz : T.hojaLuz;
    g.beginPath(); g.ellipse(cx - r * 0.33, cy - r * 0.4, r * 0.6, r * 0.5, -0.5, 0, 6.2832); g.fill();
    g.globalAlpha = 0.45;                              // dos o tres hojas sueltas
    for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.ellipse(cx + azar(-r * 0.6, r * 0.2), cy + azar(-r * 0.6, r * 0.2),
                  r * 0.16, r * 0.1, azar(0, 3), 0, 6.2832);
        g.fill();
    }
    g.restore();
}

// Casa de aldea a vuelo de pájaro: tejado a dos aguas, caballete claro y aleros
// entintados, con su sombra sobre la maleza
function casaDeAldea(g, x, y, w, h) {
    g.save();
    g.fillStyle = 'rgba(9, 13, 32, 0.5)';
    g.beginPath(); g.ellipse(x + w / 2 + 9, y + h / 2 + 11, w * 0.78, h * 0.62, 0, 0, 6.2832); g.fill();

    g.fillStyle = T.tinta;
    g.fillRect(x - 5, y - 5, w + 10, h + 10);
    g.fillStyle = T.bordeBase;
    g.fillRect(x, y, w, h);
    g.fillStyle = T.bordeSombra;                       // el faldón de la derecha
    g.fillRect(x + w * 0.52, y, w * 0.48, h);
    g.fillStyle = T.bordeLuz;                          // caballete iluminado
    g.fillRect(x + w * 0.4, y, w * 0.14, h);

    g.strokeStyle = T.junta;                           // hiladas de teja
    g.lineWidth = 1.4;
    for (let ty = y + 7; ty < y + h; ty += 7) {
        g.beginPath(); g.moveTo(x, ty); g.lineTo(x + w, ty); g.stroke();
    }
    g.fillStyle = T.tinta;                             // remate del caballete
    g.fillRect(x + w * 0.47, y - 3, 3, h + 6);
    g.restore();
}

// ============================================================
//  Lo que corona los muros del recinto: una banda que corre por fuera de todos
//  ellos y cambia con la comarca -teja, roca viva, cañaveral, sillería,
//  parapeto, almenas o talud-. El gesto es siempre el mismo: cuatro trazos cada
//  vez más finos siguiendo el borde, y encima el relieve que le toque.
// ============================================================
function capaBorde(W, H, silueta, bordes) {
    const c = lienzoOculto(W, H), g = c.getContext('2d');
    g.lineJoin = 'round'; g.lineCap = 'round';

    const remate = (BIOMA && BIOMA.remate) || 'teja';
    // la roca come más sitio que un alero; el cañaveral, bastante menos
    const grueso = remate === 'roca' ? 3.1 : remate === 'canaveral' ? 2.0 : 2.5;

    g.strokeStyle = T.tinta;       g.lineWidth = TILE * grueso + 9;    g.stroke(bordes);
    g.strokeStyle = T.bordeSombra; g.lineWidth = TILE * grueso;        g.stroke(bordes);
    g.strokeStyle = T.bordeBase;   g.lineWidth = TILE * grueso * 0.68; g.stroke(bordes);
    g.strokeStyle = T.bordeLuz;    g.lineWidth = TILE * 0.45;          g.stroke(bordes);

    // los dos hilos que marcan el canto: el de abajo y el de la cumbre
    g.strokeStyle = T.junta;
    g.lineWidth = 2;
    g.save(); g.translate(0, 5); g.stroke(bordes); g.restore();
    g.save(); g.translate(0, -TILE * 0.34 * grueso); g.stroke(bordes); g.restore();

    // el relieve del remate, pero solo sobre la banda ya pintada
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = g.createPattern(tileRemate(remate), 'repeat');
    g.fillRect(0, 0, W, H);

    // y nada de esto puede invadir el interior
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(silueta, 0, 0);
    return c;
}

// Los relieves se pintan en blanco y negro translúcido: así valen para
// cualquier color de banda sin repetir la paleta en cada uno.
function tileRemate(remate) {
    switch (remate) {
        case 'roca':      return tileRoca();
        case 'canaveral': return tileCanas();
        case 'muro':      return tileSillar(TILE * 1.1, TILE * 0.55);
        case 'almenado':  return tileAlmenado();
        case 'parapeto':  return tileParapeto();
        case 'talud':     return tileTalud();
        default:          return tileTeja();
    }
}

// Hiladas de teja: la media caña vista desde arriba, dos por baldosa
function tileTeja() {
    const L = 18;
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.globalAlpha = 0.32;
    g.strokeStyle = '#000';
    g.lineWidth = 1.6;
    for (let i = 0; i <= 1; i++) {
        g.beginPath();
        g.arc(L * 0.25 + i * L * 0.5, L * 0.5, L * 0.26, 0, Math.PI);
        g.stroke();
    }
    g.globalAlpha = 0.14;
    g.strokeStyle = '#fff';
    g.beginPath(); g.moveTo(0, 1); g.lineTo(L, 1); g.stroke();
    return c;
}

// Manchas al azar por toda la baldosa, que es como casi todas las texturas
// rompen su color liso. El color se pasa como función porque casi siempre se
// sortea entre dos; los radios son tramos [de, a] para el ancho y el alto.
function motas(g, L, cuantas, alfa, color, ancho, alto) {
    for (let i = 0; i < cuantas; i++) {
        g.globalAlpha = azar(alfa[0], alfa[1]);
        g.fillStyle = color();
        g.beginPath();
        g.ellipse(azar(0, L), azar(0, L), azar(ancho[0], ancho[1]), azar(alto[0], alto[1]),
                  azar(0, 3), 0, 6.2832);
        g.fill();
    }
}

// Y grietas: rayas cortas y sueltas, la otra manera de gastar una baldosa. Con
// un tramo de alfa cada raya se apaga por su cuenta.
function grietas(g, L, cuantas, largo, alfa) {
    g.lineCap = 'round';
    for (let i = 0; i < cuantas; i++) {
        if (alfa) g.globalAlpha = azar(alfa[0], alfa[1]);
        const x = azar(0, L), y = azar(0, L), a = azar(0, 6.28), l = azar(largo[0], largo[1]);
        g.beginPath(); g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
    }
}

// Roca viva: manchas irregulares y grietas, sin una sola línea recta
function tileRoca() {
    const L = 64;
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    motas(g, L, 16, [0.05, 0.2], () => Math.random() < 0.55 ? '#000' : '#fff', [4, 15], [3, 11]);
    g.globalAlpha = 0.26;
    g.strokeStyle = '#000'; g.lineWidth = 1.4;
    grietas(g, L, 7, [8, 20]);
    return c;
}

// Cañas apretadas: tallos verticales con sus nudos cruzándolos
function tileCanas() {
    const L = 26;
    const c = lienzoOculto(L, L * 2), g = c.getContext('2d');
    g.globalAlpha = 0.3;
    g.strokeStyle = '#000'; g.lineWidth = 3;
    for (const x of [L * 0.2, L * 0.62]) {
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, L * 2); g.stroke();
    }
    g.globalAlpha = 0.2;
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    for (const x of [L * 0.38, L * 0.82]) {
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, L * 2); g.stroke();
    }
    g.globalAlpha = 0.32;                              // los nudos de la caña
    g.strokeStyle = '#000'; g.lineWidth = 2;
    for (let y = L * 0.5; y < L * 2; y += L * 0.9) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(L, y); g.stroke();
    }
    return c;
}

// Sillares trabados: hiladas corridas media pieza, como se levanta un muro
function tileSillar(w, h) {
    const bw = Math.max(8, Math.round(w)), bh = Math.max(6, Math.round(h));
    const c = lienzoOculto(bw * 2, bh * 2), g = c.getContext('2d');

    g.globalAlpha = 0.38;
    g.strokeStyle = '#000'; g.lineWidth = 2;
    for (let f = 0; f < 2; f++) {
        const y = f * bh, off = (f % 2) * bw / 2;
        g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(bw * 2, y + 0.5); g.stroke();
        for (let k = 0; k <= 2; k++) {
            const x = off + k * bw + 0.5;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + bh); g.stroke();
        }
    }
    g.globalAlpha = 0.12;                              // el canto que da la luz
    g.strokeStyle = '#fff'; g.lineWidth = 1.4;
    for (let f = 0; f < 2; f++) {
        g.beginPath(); g.moveTo(0, f * bh + 2.5); g.lineTo(bw * 2, f * bh + 2.5); g.stroke();
    }
    return c;
}

// Almenas: merlón, hueco, merlón. Desde arriba se leen como bloques sueltos
function tileAlmenado() {
    const L = Math.round(TILE * 0.9);
    const c = lienzoOculto(L * 2, L), g = c.getContext('2d');
    g.globalAlpha = 0.42;                              // el vano entre merlones
    g.fillStyle = '#000';
    g.fillRect(L + 2, 0, L * 0.7, L);
    g.globalAlpha = 0.18;                              // y el merlón, más claro
    g.fillStyle = '#fff';
    g.fillRect(2, 2, L - 4, L - 4);
    g.globalAlpha = 0.35;
    g.strokeStyle = '#000'; g.lineWidth = 2;
    g.strokeRect(1, 1, L - 2, L - 2);
    return c;
}

// Parapeto de puente: tablones cruzados y los pernos que los sujetan
function tileParapeto() {
    const L = Math.round(TILE * 0.75);
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.globalAlpha = 0.4;
    g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 1); g.lineTo(L, 1); g.stroke();
    g.beginPath(); g.moveTo(L - 1, 0); g.lineTo(L - 1, L); g.stroke();
    g.globalAlpha = 0.15;
    g.strokeStyle = '#fff'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(0, 4.5); g.lineTo(L, 4.5); g.stroke();
    g.globalAlpha = 0.45;                              // los pernos
    g.fillStyle = '#000';
    for (const x of [L * 0.25, L * 0.75]) {
        g.beginPath(); g.arc(x, L * 0.5, 2, 0, 6.2832); g.fill();
    }
    return c;
}

// Talud: matojos sueltos aferrados a la tierra de la ladera
function tileTalud() {
    const L = 30;
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
        const x = azar(0, L), y = azar(0, L), a = azar(-0.6, 0.6), l = azar(4, 9);
        g.globalAlpha = azar(0.1, 0.3);
        g.strokeStyle = Math.random() < 0.5 ? '#000' : '#fff';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l);
        g.stroke();
    }
    return c;
}

// ============================================================
//  Dentro: el piso de la comarca, el zócalo pegado a los muros y la sombra dura
//  que el muro echa sobre el suelo
// ============================================================
function capaSuelo(W, H, silueta, bordes) {
    const c = lienzoOculto(W, H), g = c.getContext('2d');

    g.fillStyle = g.createPattern(tileSuelo(), 'repeat');
    g.fillRect(0, 0, W, H);

    // zócalo perimetral: tarima en la mansión, bordillo en la muralla, canto de
    // tierra en el bosque. Cambia el color, nunca el gesto.
    g.lineCap = 'butt'; g.lineJoin = 'miter';
    g.strokeStyle = T.zocalo;    g.lineWidth = TILE * 1.05; g.stroke(bordes);
    g.strokeStyle = T.zocaloLuz; g.lineWidth = TILE * 0.2;
    g.save(); g.translate(0, 3); g.stroke(bordes); g.restore();
    g.strokeStyle = T.zocaloSombra; g.lineWidth = 3;
    g.save(); g.translate(0, TILE * 0.52); g.stroke(bordes); g.restore();

    // sombra del muro corrida hacia dentro: el recurso de cel para levantarlo
    // sin un solo degradado
    g.strokeStyle = 'rgba(20, 26, 60, 0.4)';
    g.lineWidth = TILE * 0.55;
    g.save(); g.translate(4, 7); g.stroke(bordes); g.restore();

    g.globalCompositeOperation = 'destination-in';
    g.drawImage(silueta, 0, 0);
    return c;
}

// Cada comarca pisa lo suyo, pero todos los pisos se pintan igual: una baldosa
// que encaja consigo misma y se repite por todo el recinto.
function tileSuelo() {
    switch ((BIOMA && BIOMA.piso) || 'tatami') {
        case 'losa':      return tileBloques(TILE * 1.0, TILE * 1.0, 0.5);
        case 'ladrillo':  return tileBloques(TILE * 0.62, TILE * 0.3, 0.5);
        case 'adoquin':   return tileBloques(TILE * 0.44, TILE * 0.44, 0.5);
        case 'silleria':  return tileBloques(TILE * 1.3, TILE * 0.65, 0.5);
        case 'tablon':    return tileFranjas(TILE * 0.55, false, false);
        case 'escalones': return tileFranjas(TILE * 0.9, true, false);
        case 'sagrado':   return tileFranjas(TILE * 0.7, false, true);
        case 'grava':     return tileGrava();
        case 'tierra':    return tileTierra();
        default:          return tileTatami();
    }
}

// Piezas rectangulares trabadas -losa, ladrillo, adoquín, sillería-, que solo
// se diferencian en la medida. Lo que asoma por la derecha vuelve a entrar por
// la izquierda, que es lo que hace que la baldosa encaje consigo misma.
function tileBloques(w, h, desfase) {
    const cols = 3, filas = 4;
    const L = Math.max(6, Math.round(w * cols));
    const A = Math.max(6, Math.round(h * filas));
    const bw = L / cols, bh = A / filas;
    const c = lienzoOculto(L, A), g = c.getContext('2d');

    g.fillStyle = T.junta;                             // el mortero, debajo de todo
    g.fillRect(0, 0, L, A);

    const tonos = [T.suelo, T.suelo, T.sueloLuz, T.sueloSombra];
    for (let f = 0; f < filas; f++) {
        const y = f * bh, off = (f % 2) * desfase * bw;
        for (let k = 0; k < cols; k++) {
            const x = off + k * bw;
            g.fillStyle = tonos[azarEnt(0, tonos.length - 1)];
            g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
            if (x + bw > L) g.fillRect(x - L + 1, y + 1, bw - 2, bh - 2);
        }
    }

    // el desgaste: unas pocas grietas y algún canto iluminado
    g.strokeStyle = T.tinta; g.lineWidth = 1.2;
    grietas(g, L, 5, [4, 12], [0.1, 0.25]);
    return c;
}

// Franjas tendidas: tablas de tarima, peldaños de escalera o las tablas doradas
// del santuario, según cómo se rematen
function tileFranjas(paso, escalon, dorado) {
    const p = Math.max(5, Math.round(paso));
    const L = Math.round(TILE * 2), A = p * 4;
    const c = lienzoOculto(L, A), g = c.getContext('2d');
    const tonos = [T.suelo, T.sueloLuz, T.suelo, T.sueloSombra];

    for (let i = 0; i < 4; i++) {
        const y = i * p;
        g.fillStyle = tonos[i];
        g.fillRect(0, y, L, p);

        if (escalon) {                                 // el canto del peldaño
            g.globalAlpha = 0.16;
            g.fillStyle = '#fff';
            g.fillRect(0, y, L, 2.5);
            g.globalAlpha = 1;
            g.fillStyle = T.junta;
            g.fillRect(0, y + p - 3, L, 3);
        } else {                                       // la veta de la madera
            g.globalAlpha = 0.06;
            g.strokeStyle = '#fff';
            g.lineWidth = 1;
            for (let v = 4; v < p - 2; v += 4) {
                g.beginPath(); g.moveTo(0, y + v); g.lineTo(L, y + v); g.stroke();
            }
            g.globalAlpha = 1;
            g.fillStyle = T.junta;
            g.fillRect(0, y + p - 1.5, L, 1.5);
            // la testa de una tabla, para que no parezcan infinitas
            g.fillRect(azar(L * 0.2, L * 0.7), y, 1.5, p);
        }

        if (dorado && i % 2 === 0) {                   // el hilo de oro del santuario
            g.globalAlpha = 0.35;
            g.fillStyle = P.oroLuz;
            g.fillRect(0, y + p * 0.5, L, 1.5);
            g.globalAlpha = 1;
        }
    }
    return c;
}

// Grava rastrillada del jardín seco: fondo, menudo y las ondas del rastrillo,
// que van en periodo entero para que cierren solas.
function tileGrava() {
    const L = Math.round(TILE * 3);
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.fillStyle = T.suelo;
    g.fillRect(0, 0, L, L);

    // el chinarro suelto
    motas(g, L, 420, [0.1, 0.35], () => Math.random() < 0.5 ? T.sueloLuz : T.sueloSombra,
          [0.7, 1.8], [0.7, 1.8]);

    g.globalAlpha = 0.2;
    g.lineWidth = 2;
    for (let y = 5; y < L; y += 11) {
        g.strokeStyle = (y / 11) % 2 ? T.sueloSombra : T.sueloLuz;
        g.beginPath();
        for (let x = 0; x <= L; x += 4)
            g.lineTo(x, y + Math.sin(x / L * 6.2832 * 2) * 3);
        g.stroke();
    }
    return c;
}

// Tierra apisonada con hojarasca: el suelo del bosque, sin una sola recta
function tileTierra() {
    const L = Math.round(TILE * 3);
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.fillStyle = T.suelo;
    g.fillRect(0, 0, L, L);

    // el calvero y su sombra, y encima las hojas caídas
    motas(g, L, 60, [0.06, 0.2], () => Math.random() < 0.5 ? T.sueloLuz : T.sueloSombra,
          [6, 20], [4, 14]);
    motas(g, L, 34, [0.12, 0.32], () => T.mota, [2.5, 5], [1, 2]);
    return c;
}

// Esteras cruzadas a la manera de las salas de té: dos tendidas arriba, dos de
// canto abajo, y el patrón encaja consigo mismo al repetirse
function tileTatami() {
    const M = TILE * 2, L = M * 2;
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.fillStyle = T.suelo;
    g.fillRect(0, 0, L, L);

    let alterna = 0;
    const estera = (x, y, w, h) => {
        g.fillStyle = (alterna++ % 2) ? T.suelo : T.sueloLuz;
        g.fillRect(x, y, w, h);
        g.strokeStyle = T.junta;                       // ribete de tela
        g.lineWidth = 2.5;
        g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
        g.strokeStyle = 'rgba(255, 255, 255, 0.045)';  // veta del junco
        g.lineWidth = 1;
        if (w > h) for (let i = 6; i < h - 4; i += 5) {
            g.beginPath(); g.moveTo(x + 4, y + i); g.lineTo(x + w - 4, y + i); g.stroke();
        } else for (let i = 6; i < w - 4; i += 5) {
            g.beginPath(); g.moveTo(x + i, y + 4); g.lineTo(x + i, y + h - 4); g.stroke();
        }
    };

    estera(0, 0, M, M / 2);
    estera(0, M / 2, M, M / 2);
    estera(M, 0, M, M / 2);
    estera(M, M / 2, M, M / 2);
    estera(0, M, M / 2, M);
    estera(M / 2, M, M / 2, M);
    estera(M, M, M / 2, M);
    estera(M * 1.5, M, M / 2, M);
    return c;
}

// ============================================================
//  Adornos del interior: se colocan pegados a los muros, donde no estorban el
//  paso. Los que llevan llama se apuntan además como focos.
// ============================================================
function sembrarAdornos() {
    adornos = [];
    luces = [];
    // qué se planta y con qué frecuencia lo dice la comarca, no este archivo
    const tabla = (BIOMA && BIOMA.adornos) || [];
    if (!tabla.length) return;

    // cada clase de adorno guarda su propia separación: que haya una rocalla al
    // lado no debe impedir colgar un farolillo, ni al revés
    const puestos = {};
    const lejosDe = (x, y, d, tipo) =>
        (puestos[tipo] || []).every(p => Math.hypot(p.x - x, p.y - y) > d);

    for (let y = 1; y < ALTO - 1; y++)
        for (let x = 1; x < ANCHO - 1; x++) {
            if (J.mapa[y][x] !== 0) continue;
            const contra = (esMuro(x, y - 1) ? 1 : 0) + (esMuro(x, y + 1) ? 1 : 0)
                         + (esMuro(x - 1, y) ? 1 : 0) + (esMuro(x + 1, y) ? 1 : 0);
            if (!contra) continue;

            const cx = x + 0.5, cy = y + 0.5;
            if (Math.hypot(cx - J.puerta.x, cy - J.puerta.y) < 2.5) continue;
            if (Math.hypot(cx - J.jugador.x, cy - J.jugador.y) < 2.5) continue;
            // ni encima de una trampa: el hierro tiene que verse limpio
            if (J.trampas.some(t => Math.hypot(cx - t.x, cy - t.y) < 1.4)) continue;

            // arrimado al muro: así el adorno queda fuera de la línea de paso
            let ox = 0, oy = 0;
            if (esMuro(x, y - 1)) oy = -0.22; else if (esMuro(x, y + 1)) oy = 0.22;
            if (esMuro(x - 1, y)) ox = -0.22; else if (esMuro(x + 1, y)) ox = 0.22;

            // se echa un dado y se mira en qué franja de la tabla del bioma cae:
            // la primera que lo recoge es la que se planta, si hay sitio y si el
            // adorno admite ese rincón
            const r = Math.random();
            let acumulado = 0, ficha = null;
            for (const f of tabla) {
                acumulado += f.prob;
                if (r >= acumulado) continue;
                if (f.esquina && contra < 2) break;    // este solo va en rincón
                if (lejosDe(cx, cy, f.sep, f.tipo)) ficha = f;
                break;
            }
            if (!ficha) continue;

            const a = { x: cx + ox, y: cy + oy, tipo: ficha.tipo,
                        fase: azar(0, 6.28), giro: azar(0, 6.28) };
            adornos.push(a);
            (puestos[ficha.tipo] ||= []).push(a);

            // los que llevan llama alumbran, y con la fuerza que diga su ficha
            if (ficha.luz)
                luces.push({ x: a.x, y: a.y, r: TILE * ficha.luz.r, color: ficha.luz.color,
                             fuerza: ficha.luz.fuerza, fase: a.fase, mez: 0, enPantalla: false });
        }
}

// Los adornos a ras de suelo no echan sombra: no hay nada levantado que la
// proyecte, y ponérsela los haría flotar
const ADORNOS_RASOS = new Set(['rejilla', 'musgo', 'estanque', 'cadena',
                               'huesos', 'shimenawa', 'banderola', 'nicho']);

// Un cráneo, que sale en más de un sitio bajo tierra
function craneo(px, py, r) {
    pieza(ctx, px, py, r, r * 0.85, '#ddd3bc', '#fff8e8', '#9c9280', 0, 1.8);
    ctx.fillStyle = P.tinta;
    ctx.beginPath(); ctx.arc(px - r * 0.35, py - r * 0.12, r * 0.24, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(px + r * 0.35, py - r * 0.12, r * 0.24, 0, 6.2832); ctx.fill();
}

// ============================================================
//  El repertorio de adornos. Ninguno sortea nada al dibujarse: todo lo que varía
//  sale del giro y la fase que se le apuntaron al sembrarlo, o del reloj de la
//  partida. Con un azar() aquí, el adorno temblaría en cada fotograma.
// ============================================================
const ADORNO = {

    // ---- luz y ceremonia ----
    farol(px, py, a, parpadeo) {                   // chōchin colgado de su vara
        pieza(ctx, px, py, 12, 12, P.papel, P.papelLuz, '#e09a3c', 0, 3);
        ctx.save();
        ctx.strokeStyle = 'rgba(120, 60, 20, 0.5)'; ctx.lineWidth = 1.4;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.ellipse(px, py, 11.4, Math.max(1.5, 11.4 - Math.abs(i) * 3.4), 0, 0, 6.2832);
            ctx.stroke();
        }
        ctx.restore();
        pieza(ctx, px, py, 3.4, 3.4, P.bermellon, null, null, 0, 1.6);
        brillo(ctx, px - 4, py - 5, 3, 2, -0.6, 0.55 * parpadeo);
    },

    toro(px, py, a, parpadeo) {                    // linterna de piedra del jardín
        pieza(ctx, px, py, 13, 12, T.zocalo, T.zocaloLuz, T.zocaloSombra, 0, 2.6);
        ctx.fillStyle = P.tinta;
        ctx.fillRect(px - 14, py - 3, 28, 2.5);
        pieza(ctx, px, py, 5.5, 5, P.papelLuz, null, null, 0, 2);
        brillo(ctx, px, py, 3.4, 3, 0, 0.5 + parpadeo * 0.35);
    },

    velon(px, py, a, parpadeo) {                   // cirio sobre su repisa
        pieza(ctx, px, py + 3, 9, 6, T.zocalo, T.zocaloLuz, T.zocaloSombra, 0, 2.4);
        pieza(ctx, px, py - 2, 4.5, 4.5, '#efe4c8', '#fffaf0', '#b8a882', 0, 2);
        ctx.save();
        ctx.globalAlpha = parpadeo;
        pieza(ctx, px, py - 7, 3, 5 * parpadeo, '#ff9c3c', P.papelLuz, null, 0, 0);
        ctx.restore();
        brillo(ctx, px, py - 8, 1.4, 2.2, 0, 0.7 * parpadeo);
    },

    antorcha(px, py, a, parpadeo) {                // hachón clavado en el muro
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 5.5;
        ctx.beginPath(); ctx.moveTo(px - 7, py + 9); ctx.lineTo(px + 2, py - 2); ctx.stroke();
        ctx.strokeStyle = T.zocaloSombra; ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.moveTo(px - 7, py + 9); ctx.lineTo(px + 2, py - 2); ctx.stroke();
        ctx.restore();
        const f = 1 + Math.sin(J.tiempo * 9 + a.fase) * 0.18;
        pieza(ctx, px + 3, py - 5, 6 * f, 8 * f, T.tinte, P.papelLuz, null, 0, 0);
        brillo(ctx, px + 3, py - 7, 2.4, 3.4, 0, 0.55 * parpadeo);
    },

    brasero(px, py, a, parpadeo) {                 // pebetero de tres pies
        pieza(ctx, px, py + 3, 12, 7, T.zocaloSombra, T.zocalo, null, 0, 2.4);
        pieza(ctx, px, py, 11, 9, '#3a3a44', '#5c5c68', '#22222a', 0, 2.6);
        pieza(ctx, px, py, 7, 5.5, '#8a2b18', '#ff8a3c', null, 0, 0);
        ctx.save();
        ctx.globalAlpha = parpadeo;
        pieza(ctx, px, py - 2, 4.5 * parpadeo, 5 * parpadeo, T.tinte, P.papelLuz, null, 0, 0);
        ctx.restore();
    },

    // ---- lo que dejaron los muertos ----
    urna(px, py) {                                 // urna funeraria
        pieza(ctx, px, py + 2, 10, 8, T.zocaloSombra, T.zocalo, null, 0, 2.6);
        pieza(ctx, px, py - 5, 6, 4, T.zocalo, T.zocaloLuz, T.zocaloSombra, 0, 2.2);
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(px, py + 2, 6.5, 5, 0, 0, 6.2832); ctx.stroke();
        ctx.restore();
        brillo(ctx, px - 3, py, 2.2, 1.6, -0.5, 0.35);
    },

    nicho(px, py) {                                // hornacina abierta en la pared
        ctx.fillStyle = P.tinta;
        ctx.fillRect(px - 13, py - 11, 26, 22);
        ctx.fillStyle = '#0b0913';
        ctx.fillRect(px - 10, py - 8, 20, 16);
        craneo(px, py + 1, 5);
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = T.zocaloLuz; ctx.lineWidth = 1.6;
        ctx.strokeRect(px - 12.5, py - 10.5, 25, 21);
        ctx.restore();
    },

    huesos(px, py, a) {                            // osamenta suelta en el suelo
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const ang = a.giro + i * 1.1, l = 7 + i;
            const dx = Math.cos(ang) * l, dy = Math.sin(ang) * l * 0.8;
            ctx.strokeStyle = P.tinta; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(px - dx, py - dy); ctx.lineTo(px + dx, py + dy); ctx.stroke();
            ctx.strokeStyle = '#ddd3bc'; ctx.lineWidth = 2.6;
            ctx.beginPath(); ctx.moveTo(px - dx, py - dy); ctx.lineTo(px + dx, py + dy); ctx.stroke();
        }
        ctx.restore();
        craneo(px + 5, py + 3, 4.5);
    },

    // ---- el hierro y la mugre de las galerías ----
    tuberia(px, py, a) {                           // tubo con sus bridas, goteando
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a.giro < 3.14 ? 0 : 1.5708);
        ctx.fillStyle = P.tinta;        ctx.fillRect(-17, -9, 34, 18);
        ctx.fillStyle = T.zocalo;       ctx.fillRect(-15, -7, 30, 14);
        ctx.fillStyle = T.zocaloLuz;    ctx.fillRect(-15, -7, 30, 3.5);
        ctx.fillStyle = T.zocaloSombra; ctx.fillRect(-15, 3.5, 30, 3.5);
        ctx.fillStyle = P.tinta;
        ctx.fillRect(-11, -10, 3, 20);
        ctx.fillRect(8, -10, 3, 20);
        ctx.restore();
        pieza(ctx, px, py, 4.5, 4.5, '#0c1410', null, null, 0, 2);
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(J.tiempo * 2 + a.fase) * 0.35;
        ctx.fillStyle = T.tinte;
        ctx.beginPath(); ctx.arc(px, py + 9, 1.8, 0, 6.2832); ctx.fill();
        ctx.restore();
    },

    rejilla(px, py) {                              // sumidero enrejado
        ctx.fillStyle = P.tinta;
        ctx.fillRect(px - 13, py - 10, 26, 20);
        ctx.fillStyle = '#0a1210';
        ctx.fillRect(px - 11, py - 8, 22, 16);
        ctx.strokeStyle = T.zocaloLuz; ctx.lineWidth = 2.4;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(px + i * 7, py - 8); ctx.lineTo(px + i * 7, py + 8);
            ctx.stroke();
        }
        ctx.strokeStyle = T.zocaloSombra; ctx.lineWidth = 1.4;
        ctx.strokeRect(px - 11, py - 8, 22, 16);
    },

    musgo(px, py, a) {                             // el verdín de las paredes
        ctx.save();
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 5; i++) {
            const ang = a.giro + i * 1.256;
            ctx.fillStyle = i % 2 ? T.mota : T.bordeLuz;
            ctx.beginPath();
            ctx.ellipse(px + Math.cos(ang) * 6, py + Math.sin(ang) * 4.5,
                        4.5 + (i % 3), 3 + (i % 2), ang, 0, 6.2832);
            ctx.fill();
        }
        ctx.restore();
    },

    barril(px, py) {                               // barrica con sus aros
        pieza(ctx, px, py, 10, 10, T.zocalo, T.zocaloLuz, T.zocaloSombra, 0, 2.6);
        ctx.save();
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, 6.5, 0, 6.2832); ctx.stroke();
        ctx.beginPath(); ctx.arc(px, py, 3, 0, 6.2832); ctx.stroke();
        ctx.restore();
        brillo(ctx, px - 3.5, py - 4, 2.6, 1.8, -0.5, 0.4);
    },

    // ---- lo que crece ----
    cana(px, py, a) { matoDeCanas(ctx, px, py, 11, a.giro); },

    matorral(px, py, a) {
        for (let i = 0; i < 5; i++) {
            const ang = a.giro + i * 1.256;
            pieza(ctx, px + Math.cos(ang) * 5, py + Math.sin(ang) * 4, 6.5, 5.5,
                  T.hoja, T.hojaLuz, T.hojaSombra, ang, 2);
        }
    },

    pino(px, py, a) {
        for (let i = 0; i < 6; i++) {
            const ang = a.giro + i * 1.047;
            pieza(ctx, px + Math.cos(ang) * 7, py + Math.sin(ang) * 6, 8, 7,
                  T.hoja, T.hojaLuz, T.hojaSombra, ang, 2.4);
        }
        pieza(ctx, px, py, 6, 5.5, T.hojaLuz, null, null, 0, 2);
    },

    sakura(px, py, a) {                            // cerezo enano en su macetón
        pieza(ctx, px, py + 2, 11, 9, P.maderaSombra, P.madera, null, 0, 2.4);
        ctx.save();
        ctx.translate(px, py);
        for (let i = 0; i < 5; i++) {
            const ang = a.giro + i * 1.256;
            pieza(ctx, Math.cos(ang) * 7, Math.sin(ang) * 6, 7.5, 6.5,
                  T.sakura, T.sakuraLuz, '#d07ca2', ang, 2.2);
        }
        ctx.restore();
        pieza(ctx, px, py, 5, 4.5, T.sakuraLuz, null, null, 0, 1.8);
    },

    // ---- agua y vasija ----
    tinaja(px, py) {                               // tinaja de agua, con reflejo
        pieza(ctx, px, py, 10, 9, '#4b5a72', '#6d7f9c', '#2e3a4e', 0, 2.6);
        pieza(ctx, px, py, 6.5, 5.8, '#2b527a', '#3f7aa8', null, 0, 1.6);
        brillo(ctx, px - 2, py - 2, 2.6, 1.6, -0.5, 0.5);
    },

    estanque(px, py, a) {                          // charca del jardín, con su onda
        pieza(ctx, px, py, 16, 11, T.zocaloSombra, null, null, 0, 3);
        pieza(ctx, px, py, 13, 8.5, '#1e3a5c', '#2f5c86', '#12243c', 0, 0);
        const k = (J.tiempo * 0.5 + a.fase) % 1;
        ctx.save();
        ctx.globalAlpha = 0.45 * (1 - k);
        ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(px, py, 3 + k * 9, (3 + k * 9) * 0.62, 0, 0, 6.2832);
        ctx.stroke();
        ctx.restore();
        pieza(ctx, px + 5, py - 2, 4, 2.6, T.hoja, T.hojaLuz, null, 0.4, 1.6);
    },

    // ---- lo que dejó la gente ----
    biombo(px, py, a) {                            // byōbu de tres hojas
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a.giro < 3.14 ? 0 : 1.5708);
        ctx.fillStyle = P.tinta; ctx.fillRect(-18, -7, 36, 14);
        for (let i = 0; i < 3; i++) {
            const x = -16 + i * 11;
            ctx.fillStyle = i === 1 ? '#e8dfc4' : '#d8cfb0';
            ctx.fillRect(x, -5, 10, 10);
            ctx.strokeStyle = P.maderaSombra; ctx.lineWidth = 1.4;
            ctx.strokeRect(x, -5, 10, 10);
        }
        ctx.globalAlpha = 0.55;                    // la pincelada del biombo
        ctx.fillStyle = P.tinta;
        ctx.beginPath(); ctx.ellipse(-2, 0, 7, 3, -0.4, 0, 6.2832); ctx.fill();
        ctx.restore();
    },

    puesto(px, py, a) {                            // tenderete de mercado
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a.giro < 3.14 ? 0 : 1.5708);
        ctx.fillStyle = P.tinta; ctx.fillRect(-20, -13, 40, 26);
        ctx.fillStyle = P.bermellon; ctx.fillRect(-18, -11, 36, 22);
        ctx.fillStyle = '#e8dfc4';                 // las franjas del toldo
        for (let i = 0; i < 3; i++) ctx.fillRect(-18 + i * 12, -11, 6, 22);
        ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
        ctx.fillRect(-18, 3, 36, 8);               // la sombra del mostrador
        ctx.restore();
    },

    cajas(px, py, a) {                             // dos cajones apilados
        const caja = (x, y, s, giro) => {
            ctx.save();
            ctx.translate(x, y); ctx.rotate(giro);
            ctx.fillStyle = P.tinta;        ctx.fillRect(-s - 2, -s - 2, s * 2 + 4, s * 2 + 4);
            ctx.fillStyle = P.madera;       ctx.fillRect(-s, -s, s * 2, s * 2);
            ctx.fillStyle = P.maderaSombra; ctx.fillRect(0, -s, s, s * 2);
            ctx.strokeStyle = P.maderaLuz; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(s, s); ctx.stroke();
            ctx.restore();
        };
        caja(px - 4, py + 3, 7, a.giro * 0.12);
        caja(px + 5, py - 3, 5.5, -a.giro * 0.12);
    },

    cartel(px, py) {                               // rótulo de madera en su poste
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(px, py + 10); ctx.lineTo(px, py - 4); ctx.stroke();
        ctx.strokeStyle = P.maderaSombra; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(px, py + 10); ctx.lineTo(px, py - 4); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = P.tinta;   ctx.fillRect(px - 9, py - 14, 18, 14);
        ctx.fillStyle = '#e8dfc4'; ctx.fillRect(px - 7, py - 12, 14, 10);
        ctx.save();
        ctx.globalAlpha = 0.6; ctx.fillStyle = P.tinta;   // los trazos del rótulo
        ctx.fillRect(px - 4, py - 10, 8, 1.6);
        ctx.fillRect(px - 4, py - 7.5, 8, 1.6);
        ctx.fillRect(px - 4, py - 5, 5, 1.6);
        ctx.restore();
    },

    // ---- la guerra ----
    cadena(px, py, a) {                            // eslabones tirados en el tablón
        ctx.save();
        ctx.translate(px, py); ctx.rotate(a.giro);
        for (let i = -2; i <= 2; i++) {
            ctx.strokeStyle = P.tinta; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.ellipse(i * 7, 0, 4, 2.6, 0, 0, 6.2832); ctx.stroke();
            ctx.strokeStyle = '#8a90a0'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(i * 7, 0, 4, 2.6, 0, 0, 6.2832); ctx.stroke();
        }
        ctx.restore();
    },

    banderola(px, py, a) {                         // estandarte que ondea en su vara
        const onda = Math.sin(J.tiempo * 2 + a.fase) * 2.5;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(px - 11, py - 12); ctx.lineTo(px + 11, py - 12); ctx.stroke();
        ctx.restore();
        const pano = (w, h, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(px - w, py - 12); ctx.lineTo(px + w, py - 12);
            ctx.lineTo(px + w + onda, py + h); ctx.lineTo(px - w + onda, py + h);
            ctx.closePath(); ctx.fill();
        };
        pano(9, 12, P.tinta);
        pano(7, 10, P.bermellon);
        ctx.save();
        ctx.globalAlpha = 0.75; ctx.fillStyle = P.oroLuz;
        ctx.beginPath(); ctx.arc(px + onda * 0.5, py - 1, 3.2, 0, 6.2832); ctx.fill();
        ctx.restore();
    },

    almena(px, py) {                               // merlón con su aspillera
        ctx.fillStyle = P.tinta;      ctx.fillRect(px - 12, py - 10, 24, 20);
        ctx.fillStyle = T.bordeBase;  ctx.fillRect(px - 10, py - 8, 20, 16);
        ctx.fillStyle = T.bordeLuz;   ctx.fillRect(px - 10, py - 8, 20, 4);
        ctx.fillStyle = T.bordeSombra; ctx.fillRect(px - 10, py + 4, 20, 4);
        ctx.fillStyle = '#0b0e18';    ctx.fillRect(px - 2, py - 5, 4, 10);
    },

    // ---- lo sagrado ----
    torii(px, py, a) {                             // pórtico bermellón, visto de arriba
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a.giro < 3.14 ? 0 : 1.5708);
        ctx.fillStyle = P.tinta;     ctx.fillRect(-17, -12, 34, 6);
        ctx.fillStyle = P.bermellon; ctx.fillRect(-16, -11, 32, 4);
        ctx.fillStyle = P.tinta;     ctx.fillRect(-14, -3, 28, 5);
        ctx.fillStyle = '#e8583f';   ctx.fillRect(-13, -2, 26, 3);
        for (const x of [-13, 13])
            pieza(ctx, x, 7, 4.5, 4.5, P.bermellon, '#ff8a70', '#8d2517', 0, 2.2);
        ctx.restore();
    },

    estela(px, py, a) {                            // estela de piedra con inscripción
        ctx.save();
        ctx.translate(px, py); ctx.rotate((a.giro - 3.14) * 0.03);
        ctx.fillStyle = P.tinta;     ctx.fillRect(-8, -12, 16, 24);
        ctx.fillStyle = T.zocalo;    ctx.fillRect(-6, -10, 12, 20);
        ctx.fillStyle = T.zocaloLuz; ctx.fillRect(-6, -10, 4, 20);
        ctx.globalAlpha = 0.5; ctx.fillStyle = P.tinta;
        for (let i = 0; i < 3; i++) ctx.fillRect(-2.5, -7 + i * 6, 5, 1.8);
        ctx.restore();
    },

    shimenawa(px, py, a) {                         // la soga sagrada y sus papeles
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a.giro < 3.14 ? 0 : 1.5708);
        ctx.lineCap = 'round';
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke();
        ctx.strokeStyle = '#e8dfc4'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke();
        ctx.strokeStyle = '#b8a882'; ctx.lineWidth = 1.4;      // el trenzado
        for (let i = -3; i <= 3; i++) {
            ctx.beginPath(); ctx.moveTo(i * 5 - 2, -3); ctx.lineTo(i * 5 + 2, 3); ctx.stroke();
        }
        ctx.fillStyle = '#fffaf0';                             // los shide de papel
        for (const x of [-9, 0, 9]) {
            ctx.beginPath();
            ctx.moveTo(x - 3, 3); ctx.lineTo(x + 3, 3);
            ctx.lineTo(x + 1, 12); ctx.lineTo(x - 4, 10);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    },

    campana(px, py, a) {                           // campana de bronce, balanceándose
        const balanceo = Math.sin(J.tiempo * 1.3 + a.fase) * 0.12;
        ctx.save();
        ctx.translate(px, py); ctx.rotate(balanceo);
        pieza(ctx, 0, 0, 12, 11, '#5a5a3c', '#8a8a5c', '#33331f', 0, 3);
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 1.6;
        for (let i = 1; i <= 2; i++) {
            ctx.beginPath(); ctx.arc(0, 0, 4 * i, 0, 6.2832); ctx.stroke();
        }
        pieza(ctx, 0, 0, 3, 3, P.oro, P.oroLuz, P.oroSombra, 0, 1.6);
        ctx.restore();
        brillo(ctx, px - 4, py - 5, 2.6, 1.8, -0.5, 0.4);
    },

    ofrenda(px, py, a) {                           // bandeja con arroz, fruta e incienso
        pieza(ctx, px, py, 10, 7, P.madera, P.maderaLuz, P.maderaSombra, 0, 2.4);
        pieza(ctx, px - 3, py - 1, 3.4, 2.6, '#fffaf0', null, '#d8cfb0', 0, 1.6);
        pieza(ctx, px + 3, py, 3, 2.6, P.elixir, P.elixirLuz, null, 0, 1.6);
        ctx.save();
        ctx.globalAlpha = 0.22 + Math.sin(J.tiempo * 1.6 + a.fase) * 0.14;
        ctx.fillStyle = T.mota;
        ctx.beginPath(); ctx.ellipse(px, py - 9, 3, 6, 0, 0, 6.2832); ctx.fill();
        ctx.restore();
    },

    rocalla(px, py, a) {                           // piedra suelta del jardín seco
        pieza(ctx, px, py, 8, 6, T.zocalo, T.zocaloLuz, T.zocaloSombra, a.giro, 2.2);
    }
};

function dibujarAdornos() {
    for (const a of adornos) {
        const px = aPantallaX(a.x), py = aPantallaY(a.y);
        if (px < -60 || py < -60 || px > AN + 60 || py > AL + 60) continue;
        const parpadeo = 0.85 + Math.sin(J.tiempo * 6 + a.fase) * 0.15;
        if (!ADORNOS_RASOS.has(a.tipo)) sombraElipse(px, py + 6, 13, 6, 0.32);
        (ADORNO[a.tipo] || ADORNO.rocalla)(px, py, a, parpadeo);
    }
}

// ============================================================
//  Trampas: el hierro que sube del suelo. La boca se ve siempre, para que se
//  pueda esquivar; lo que cambia es cuánto asoma el diente, y eso lo lleva la
//  propia trampa en mazmorra.js.
// ============================================================

// Cuánto sobresale el hierro, de 0 a 1, según la vuelta que lleve dada
function alturaTrampa(fase) {
    if (fase < TRAMPA_AVISO) return 0;
    if (fase < TRAMPA_FUERA) return (fase - TRAMPA_AVISO) / (TRAMPA_FUERA - TRAMPA_AVISO);
    if (fase < TRAMPA_VUELVE) return 1;
    return 1 - (fase - TRAMPA_VUELVE) / (1 - TRAMPA_VUELVE);
}

function dibujarTrampas() {
    for (const t of J.trampas) {
        const px = aPantallaX(t.x), py = aPantallaY(t.y);
        if (px < -60 || py < -60 || px > AN + 60 || py > AL + 60) continue;

        const r = t.r * TILE;
        // la boca: una placa de hierro embutida en el suelo, con sus ranuras
        ctx.fillStyle = P.tinta;
        ctx.beginPath(); ctx.ellipse(px, py, r + 3, r * 0.72 + 3, 0, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#0a0f0c';
        ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.72, 0, 0, 6.2832); ctx.fill();
        ctx.save();
        ctx.strokeStyle = T.zocaloSombra; ctx.lineWidth = 1.6;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(px + i * r * 0.5, py - r * 0.6);
            ctx.lineTo(px + i * r * 0.5, py + r * 0.6);
            ctx.stroke();
        }
        ctx.restore();

        const salida = alturaTrampa(t.fase);

        // mientras se prepara, la boca se enciende: el aviso que da tiempo a
        // quitarse de encima
        if (t.fase >= TRAMPA_AVISO && t.fase < TRAMPA_FUERA) {
            ctx.save();
            ctx.globalAlpha = 0.5 * (1 - salida) + 0.2;
            ctx.strokeStyle = '#ff5a48'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.ellipse(px, py, r + 2, r * 0.72 + 2, 0, 0, 6.2832); ctx.stroke();
            ctx.restore();
        }

        if (salida <= 0.01) continue;

        // los dientes, que crecen del centro hacia fuera
        const alto = 16 * salida;
        for (let i = 0; i < 5; i++) {
            const ang = i * 1.2566 + t.fase * 0.4;
            const dx = Math.cos(ang) * r * 0.5, dy = Math.sin(ang) * r * 0.35;
            ctx.fillStyle = P.tinta;
            ctx.beginPath();
            ctx.moveTo(px + dx - 4, py + dy + 2);
            ctx.lineTo(px + dx + 4, py + dy + 2);
            ctx.lineTo(px + dx, py + dy - alto);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#9aa4b4';
            ctx.beginPath();
            ctx.moveTo(px + dx - 2.4, py + dy + 1);
            ctx.lineTo(px + dx + 2.4, py + dy + 1);
            ctx.lineTo(px + dx, py + dy - alto + 2);
            ctx.closePath(); ctx.fill();
        }
        brillo(ctx, px, py - alto * 0.6, 3.4, 2, 0, 0.35 * salida);
    }
}

// ============================================================
//  Sprites: figuras de animación, entintadas y con dos tonos
// ============================================================
let sprites;

// El lienzo se hace del tamaño con que va a verse y el dibujo se escala
// dentro: así las figuras salen nítidas por grande que sea la casilla, sin
// tocar una sola de las coordenadas con que están dibujadas
function nuevoSprite(pintar) {
    const lado = Math.ceil(SPR * ESCALA_SPR);
    const c = lienzoOculto(lado, lado);
    const g = c.getContext('2d');
    g.scale(lado / SPR, lado / SPR);
    pintar(g, SPR / 2);
    return c;
}

function prepararSprites() {
    sprites = {
        // Todas las figuras miran a la derecha; se rotan al dibujarlas.
        // Las armas se dibujan en aceros.js, que es de donde las saca también
        // la armería: así lo que se ve en el panel es lo que se lleva en la mano
        katana: nuevoSprite(ACEROS.dibujos.katana),
        tanto: nuevoSprite(ACEROS.dibujos.tanto),
        yari: nuevoSprite(ACEROS.dibujos.yari),
        tetsubo: nuevoSprite(ACEROS.dibujos.tetsubo),
        nodachi: nuevoSprite(ACEROS.dibujos.nodachi),
        kusarigama: nuevoSprite(ACEROS.dibujos.kusarigama),

        // Va a juego con la armadura, y no en laca roja como antes: rojo era el
        // casco del héroe de entonces, y ahora lo rojo suyo son los cuernos del
        // kabuto. Dos rojos encimados delante de la cara no dejaban ver ninguno.
        escudo: nuevoSprite((g, c) => {
            pieza(g, c, c, 7, 14, P.laca, P.lacaLuz, P.lacaSombra, 0, 2.6);       // laca azul
            g.strokeStyle = P.oro; g.lineWidth = 1.8;                             // filete dorado
            g.beginPath(); g.ellipse(c, c, 4.6, 11, 0, 0, 6.2832); g.stroke();
            pieza(g, c, c, 3.2, 3.2, P.cordon, P.cordonLuz, null, 0, 1.6);        // el mon, en rojo
            pieza(g, c, c, 1.3, 1.3, P.oro, P.oroLuz, null, 0, 0.8);
            brillo(g, c - 2, c - 5, 1.8, 4.5, 0, 0.45);
        }),

        elixir: nuevoSprite((g, c) => {
            pieza(g, c, c + 1, 8.5, 8.5, P.elixir, P.elixirLuz, '#a83458', 0, 2.6);
            pieza(g, c, c - 7, 3.2, 2.6, P.piedra, P.piedraLuz, null, 0, 2);      // tapón
            brillo(g, c - 3, c - 2, 2.6, 1.8, -0.6, 0.75);
        })
    };

    // Aquí solo queda lo que no cambia de forma: lo que se empuña y lo que se
    // bebe. Ni las bestias ni el héroe se hornean, que los tres tienen pose y
    // paso y se dibujan a código en cada cuadro; el trazo de cada bestia vive
    // en su ficha, y el del héroe, unas líneas más abajo.
}

// ============================================================
//  El héroe
// ============================================================
// Se dibuja a código en cada cuadro, igual que las bestias y por lo mismo: un
// muñeco horneado una sola vez no sabe más que botar, y lo que hace falta es
// verle dar la zancada, tirar el tajo, plantarse detrás del escudo y encogerse
// cuando le entran. Va trazado sobre el mismo cuadro de 56 y mirando a la
// derecha, como todas las figuras de la casa.
//
// Las manos no las decide la figura: se las pasa quien la pinta, que es el que
// sabe por dónde va la hoja y dónde está el escudo en este fotograma. Así el
// brazo y el acero no se despegan nunca, por mucho que barra el tajo.

// Manda lo recibido sobre todo lo demás -si te entran mientras descargas, lo
// que hay que ver es que te han acertado-, y cubrirse sobre atacar, que con el
// escudo alzado no se pega.
function poseDeHeroe(j) {
    if (j.herido > 0) return 'dano';
    if (j.cubriendo) return 'cubierto';
    if (j.golpe > 0) return 'ataque';
    return j.andando ? 'andar' : 'quieto';
}

// La misma cuenta que la de las bestias y con las mismas medidas: una vuelta
// entera de piernas cada cuatro zancadas de su propio bulto. Como se cuenta por
// camino andado y no por tiempo, correr acelera el paso él solo.
function faseDeHeroe(j) {
    return j.andado / (j.r * ZANCADA * PASOS_POR_VUELTA) * 6.2832;
}

// Dónde caen las manos, en el cuadro de 56. La diestra va sobre el puño del
// acero, así que gira y se adelanta exactamente igual que él; la zurda, detrás
// del escudo, esté al costado o alzado de frente.
function manosDelHeroe(j, barrido, empuje) {
    const c = SPR / 2;
    const s = Math.sin(barrido), k = Math.cos(barrido);
    const gx = 2.5, gy = 11.5;              // el puño con la hoja en reposo
    const e = empuje / ESCALA_SPR;          // lo que la adelanta el tajo, en el cuadro
    return {
        mano: punto(c + gx * k - gy * s + e * k, c + gx * s + gy * k + e * s),
        escudo: j.cubriendo ? punto(c + 9.5, c - 1.5) : punto(c + 2, c - 7)
    };
}

// La marcha va aparte de la pose porque son dos cosas distintas: se anda
// mientras se descarga el tajo y mientras se aguanta el escudo, y el cuerpo
// tiene que seguir yendo aunque de cintura para arriba esté en otra cosa. Trae
// las dos: si anda -que es lo que le da el vaivén- y si corre, que es lo único
// que le saca los pies.
function figuraHeroe(g, c, pose, fase, marcha, manos) {
    const ataca = pose === 'ataque', cubierto = pose === 'cubierto';
    const herido = pose === 'dano';
    const vaiven = marcha.anda ? Math.sin(fase) : 0;
    const paso = marcha.anda ? Math.cos(fase) : 0;
    // se echa adelante al descargar, atrás al recibir, y cubierto se planta un
    // paso por detrás del escudo
    const cx = c + (ataca ? 2 : herido ? -2.6 : cubierto ? -1.2 : 0);
    const cy = c + vaiven * 0.5;

    // ---------- la segunda espada, envainada ----------
    // El daishō: la larga va en la mano y la corta se queda en la cadera. Cruza
    // por detrás, que es donde no estorba, y bailotea con el paso. Hace lo que
    // antes hacía la bufanda -decir hacia dónde mira y ponerle aire- pero es lo
    // que un samurái lleva de verdad encima.
    const saya = [punto(cx - 2, cy - 4), punto(cx - 9, cy - 7 - vaiven * 0.9),
                  punto(cx - 16, cy - 10 - vaiven * 1.6), punto(cx - 22, cy - 12 - vaiven * 2.2)];
    apendice(g, saya, P.lacaSombra, 2, 1.5, 1.3, P.laca);
    const boca = enCurva(saya, 0.12);
    pieza(g, boca.x, boca.y, 1.7, 1.5, P.oro, P.oroLuz, P.oroSombra, 0, 1.1);   // la boca de la vaina
    const lazo = enCurva(saya, 0.34);
    g.strokeStyle = P.cordon; g.lineWidth = 1.4;                                // el sageo
    g.beginPath(); g.moveTo(lazo.x, lazo.y - 1.6); g.lineTo(lazo.x + 1.4, lazo.y + 2.2); g.stroke();

    // ---------- las piernas ----------
    // Solo a la carrera. Ni plantado ni andando se le ven: desde arriba, a un
    // samurái que va a su paso se los come la faldilla del dō, y unos pies ahí
    // detrás yendo despacio parecían un trozo suelto de la figura. Corriendo sí
    // salen, y salir es medio decir que corre.
    //
    // Salen por detrás y no por el costado, que el costado se lo comen la coraza
    // y las hombreras. El hakama va de la laca de la armadura y solo la bota
    // levanta el tono, que es lo que hace visible la zancada.
    //
    // Cubriéndose no hay carrera que valga -la mazmorra apaga una con la otra-,
    // así que aquí dentro no hay que mirarlo.
    if (marcha.corre) {
        const zancada = paso * (ataca ? 1.5 : 4);
        for (const lado of [-1, 1]) {
            const d = lado > 0 ? zancada : -zancada;
            const pie = punto(cx - 14 + d, cy + lado * 10);
            apendice(g, [punto(cx - 6, cy + lado * 4), punto(cx - 10, cy + lado * 7.5),
                         punto(cx - 12.5 + d * 0.6, cy + lado * 9.2), pie],
                     P.laca, 2.5, 2, 1.4, P.lacaLuz);
            pieza(g, pie.x, pie.y, 3.2, 2.3, P.bota, P.botaLuz, null, lado * 0.3, 1.5);
        }
    }

    // ---------- el dō ----------
    // Laca azul noche por fuera y cuero crudo el peto, con las hiladas de cordón
    // rojo cruzándolo: es el lamelar, y a tamaño de juego es lo único que se le
    // ve del despiece, así que va marcado sin miedo.
    pieza(g, cx - 4, cy, 13, 11.5, P.laca, P.lacaLuz, P.lacaSombra);
    g.save();
    g.beginPath(); g.ellipse(cx - 4, cy, 13, 11.5, 0, 0, 6.2832); g.clip();
    g.strokeStyle = P.cordon; g.lineWidth = 1.5; g.lineCap = 'butt';            // las hiladas
    for (let i = -2; i <= 2; i++) {
        const y = cy + i * 3.7;
        g.beginPath(); g.moveTo(cx - 17, y); g.lineTo(cx + 9, y); g.stroke();
    }
    g.strokeStyle = P.cuero; g.lineWidth = 2.8;                                 // el obi, dando la vuelta
    g.beginPath(); g.ellipse(cx - 4, cy, 10.4, 9.1, 0, 0, 6.2832); g.stroke();
    g.strokeStyle = P.cueroLuz; g.lineWidth = 0.9;
    g.beginPath(); g.ellipse(cx - 4, cy, 11.1, 9.7, 0, -2.5, -0.7); g.stroke();
    g.restore();
    g.strokeStyle = P.oro; g.lineWidth = 1.3;                                   // el filete del canto
    g.beginPath(); g.ellipse(cx - 4, cy, 12.4, 10.9, 0, -1.15, 1.15); g.stroke();

    // ---------- los brazos ----------
    // Cada uno acaba donde le han dicho: el diestro en el puño del acero y el
    // zurdo detrás del escudo. El codo se comba hacia fuera, que un brazo recto
    // de hombro a mano no parece un brazo.
    const brazo = (m, lado) => {
        const hx = cx - 3, hy = cy + lado * 8;
        const dx = m.x - hx, dy = m.y - hy;
        const codo = punto((hx + m.x) / 2 - dy * 0.18 * lado,
                           (hy + m.y) / 2 + dx * 0.18 * lado);
        apendice(g, [punto(hx, hy), codo, codo, m], P.laca, 2.4, 1.9, 1.4, P.lacaLuz);
        pieza(g, m.x, m.y, 2.3, 2, P.cuero, P.cueroLuz, P.cueroSombra, 0, 1.3);  // el puño
    };
    brazo(manos.escudo, -1);
    brazo(manos.mano, 1);

    // ---------- las sode ----------
    // Las paletas de los hombros, que son lo que más ancho le hace desde arriba.
    // Van con su hilada de cordón y su canto de oro, como el dō.
    for (const lado of [-1, 1]) {
        const oy = cy + lado * 10.5;
        pieza(g, cx - 4, oy, 6.5, 5, P.laca, P.lacaLuz, P.lacaSombra, lado * 0.4, 2.4);
        g.save();
        g.beginPath(); g.ellipse(cx - 4, oy, 6.5, 5, lado * 0.4, 0, 6.2832); g.clip();
        g.strokeStyle = P.cordon; g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(cx - 11, oy - lado * 1.4); g.lineTo(cx + 3, oy - lado * 2.6); g.stroke();
        g.restore();
        // un remache de oro y nada más: el oro de la figura es la media luna del
        // casco, y tres medias lunas doradas no dejan ver ninguna
        pieza(g, cx - 7.5, oy + lado * 3, 1.2, 1.1, P.oro, P.oroLuz, null, 0, 0.9);
    }

    // ---------- el kabuto ----------
    const giroCabeza = herido ? -0.3 : vaiven * 0.06;
    g.save();
    g.translate(cx + 5, cy); g.rotate(giroCabeza); g.translate(-(cx + 5), -cy);
    // el shikoro, la faldilla que le cubre la nuca, asomando por detrás
    pieza(g, cx + 2.5, cy, 9.6, 9.8, P.lacaSombra, P.laca, null, 0, 2.6);
    // la cazuela y su arandela de oro
    pieza(g, cx + 6, cy, 7.8, 7.4, P.laca, P.lacaLuz, P.lacaSombra, 0, 2.4);
    pieza(g, cx + 5, cy, 1.8, 1.7, P.oro, P.oroLuz, P.oroSombra, 0, 1.1);
    // el menpo, la careta, que asoma por delante de todo
    pieza(g, cx + 13.5, cy, 3.8, 3.3, P.menpo, P.menpoLuz, null, 0, 2);
    // los kuwagata: los dos cuernos rojos, saliendo por detrás de la media luna
    for (const lado of [-1, 1]) {
        const r0 = punto(cx + 8, cy + lado * 4.5);
        apendice(g, [r0, punto(r0.x + 5, r0.y + lado * 3.5),
                     punto(r0.x + 9, r0.y + lado * 4.5), punto(r0.x + 12, r0.y + lado * 3)],
                 P.cordon, 1.9, 0.5, 1.2, P.cordonLuz);
    }
    // el maedate: la media luna de oro sobre la frente, que es lo que se le ve
    // antes que nada desde arriba y lo que lo separa de cualquier otro bulto
    g.lineCap = 'round';
    g.strokeStyle = P.tinta; g.lineWidth = 5.4;
    g.beginPath(); g.arc(cx + 5, cy, 8.2, -1.3, 1.3); g.stroke();
    g.strokeStyle = P.oro; g.lineWidth = 3.2;
    g.beginPath(); g.arc(cx + 5, cy, 8.2, -1.3, 1.3); g.stroke();
    g.strokeStyle = P.oroLuz; g.lineWidth = 1.1;
    g.beginPath(); g.arc(cx + 5, cy, 8.9, -1.15, -0.1); g.stroke();
    brillo(g, cx + 3.5, cy - 4.5, 2.6, 1.8, -0.6, 0.5);
    g.restore();
}

// La figura, puesta a su tamaño. Se pinta derecha sobre la senda y no en un
// lienzo aparte -que es lo que sí hacen las bestias- porque aquí no hay nada
// que recortar a la silueta ya hecha: al héroe lo que lo aclara al recibir es
// el velo de toda la pantalla, no una mano de blanco suya.
//
// Va dentro del ctx ya llevado a su sitio y girado a lo que mira, que es donde
// antes se plantaba la lámina.
function pintarHeroe(j, barrido, empuje) {
    const s = SPR * ESCALA_SPR;
    ctx.save();
    ctx.scale(s / SPR, s / SPR);
    ctx.translate(-SPR / 2, -SPR / 2);
    figuraHeroe(ctx, SPR / 2, poseDeHeroe(j), faseDeHeroe(j),
                { anda: j.andando, corre: j.corriendo },
                manosDelHeroe(j, barrido, empuje));
    ctx.restore();
}

// ============================================================
//  Las bestias
// ============================================================
// No vienen de ningún archivo: se dibujan a código, y el trazo de cada una
// está en su ficha de bestias.js -que es donde vive todo lo suyo- junto a sus
// cifras. Aquí solo se dice cuándo y dónde.
//
// Se pintan en un lienzo aparte y no directamente sobre la senda por dos
// cosas: el blanqueo del golpe recibido tiene que recortarse a la figura ya
// hecha, y así lo que mira el bicho se gira una vez para todo el conjunto.

// Un lienzo por tamaño -uno por talla, en realidad-, que se reaprovechan en
// cada cuadro y para todas las bestias. Uno nuevo por bicho y por cuadro sería
// tirar lienzos a puñados.
const talleres = {};
function tallerDe(lado) {
    if (!talleres[lado]) talleres[lado] = lienzoOculto(lado, lado);
    return talleres[lado];
}

// Lo que anda entre paso y paso, en partes de lo que abulta el bicho. Va atado
// a su tamaño y no a un número suelto porque la zancada de una rata no es la
// de un ciempiés: el grande da el paso más largo y mueve las suyas más despacio
// aunque los dos anden a la misma velocidad.
//
// Y se cuenta por camino andado, no por tiempo: así las patas van al paso que
// va el bicho, y quien se queda atascado contra un muro no patina en el sitio.
const ZANCADA = 1.6;
const PASOS_POR_VUELTA = 4;

// Manda lo recibido sobre lo dado, y lo dado sobre andar: si le entra un tajo
// mientras descarga, lo que hay que ver es que le has acertado.
function poseDeBestia(e) {
    if (e.herido > 0) return 'dano';
    if (e.golpe > 0) return 'ataque';
    return e.andando ? 'andar' : 'quieto';
}

// en qué punto del ciclo va el paso: una vuelta entera cada cuatro zancadas
function faseDeBestia(e) {
    return e.andado / (e.r * ZANCADA * PASOS_POR_VUELTA) * 6.2832;
}

// Y en qué punto va el golpe, de cero a uno. Las figuras que barren algo -la
// hoja del esqueleto- lo necesitan: la pose dice que está pegando, pero no
// cuánto le queda.
function avanceDeGolpe(e) {
    return Math.min(1, Math.max(0, 1 - e.golpe / GOLPE_ENEMIGO));
}

// La sangre se le va de golpe al recibir. Una mano de blanco recortada a lo ya
// pintado: recortada, que si se echara encima del lienzo entero se le pintaría
// también el aire de alrededor.
function blanquearFigura(g, lado, cuanto) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(255, 255, 255, ' + cuanto + ')';
    g.fillRect(0, 0, lado, lado);
    g.restore();
}

// el arco pálido del golpe, el mismo que lleva el héroe
function estelaGolpe(g, cx, cy, r, desde, hasta, grosor, alfa) {
    g.save();
    g.globalAlpha = alfa;
    g.strokeStyle = '#ffffff'; g.lineWidth = grosor; g.lineCap = 'round';
    g.beginPath(); g.arc(cx, cy, r, desde, hasta); g.stroke();
    g.restore();
}

function dibujarBestia(e, px, py) {
    const talla = e.talla || 1;
    const lado = Math.ceil(SPR * ESCALA_SPR * talla);
    const taller = tallerDe(lado);
    const g = taller.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, lado, lado);

    const pose = poseDeBestia(e);
    // la fase que se le pasa: andando es por dónde va el paso, y pegando por
    // dónde va el golpe, que es lo que hace que la hoja barra
    const fase = pose === 'ataque' ? avanceDeGolpe(e)
               : pose === 'andar' ? faseDeBestia(e) : 0;
    if (!BESTIAS.pintar(g, lado, e.tipo, pose, fase)) return;

    if (pose === 'dano') blanquearFigura(g, lado, 0.34);
    if (pose === 'ataque')
        estelaGolpe(g, lado / 2 - lado * 0.06, lado / 2, lado * 0.42,
                    -0.6, 0.6, lado * 0.018, 0.45);

    // ya hecha, se planta girada a lo que mira. El tamaño en pantalla es el de
    // siempre -SPR por la escala-, no el del lienzo, que va redondeado hacia
    // arriba al píxel entero.
    const s = SPR * ESCALA_SPR * talla;
    ctx.save();
    ctx.translate(px, py);
    if (e.mira) ctx.rotate(e.mira);
    ctx.drawImage(taller, -s / 2, -s / 2, s, s);
    ctx.restore();
}

// ============================================================
//  La puerta de la senda
//
//  No es un agujero redondo: es un vano con sus jambas, su solera y su
//  remate, y ese remate cambia con la comarca -la cripta lo apunta, la
//  alcantarilla lo rebaja, el bosque lo levanta como un torii-. Todo
//  sale de la ficha del bioma: los colores son los suyos, y la tabla de
//  aquí abajo solo dice qué forma toma la piedra en cada tramo.
//
//  Y al otro lado no hay negro: hay comarca. La que viene, no la que se
//  deja, porque una puerta enseña a dónde lleva y no de dónde vienes.
//  Ese asomo se pinta una vez en su propio lienzo y se guarda mientras
//  el destino no cambie; lo único que se mueve por encima es el menudeo
//  del aire, que es lo que impide que parezca una lámina pegada.
// ============================================================
const PORTAL_ANCHO = TILE * 1.62;    // el hueco, de jamba a jamba
const PORTAL_ALTO = TILE * 2.05;     // de la solera a la clave
const PORTAL_BASE = TILE * 0.62;     // lo que cae la solera bajo el centro de la casilla

// Qué forma toma el vano y de qué está hecho en cada comarca. El color no
// se escribe aquí salvo cuando la comarca lo pide a gritos -el bermellón
// de los torii, el oro del santuario-: para el resto se toma el del zócalo
// del bioma, que es la piedra que ya se está pisando.
const PORTALES = {
    catacumbas:    { arco: 'apuntado', hoja: 'losa',   clave: 'calavera' },
    alcantarillas: { arco: 'rebajado', hoja: 'reja',   clave: 'goteron' },
    bambu:         { arco: 'torii',    hoja: 'canas',  clave: 'hoja',
                     marco: '#9a7b46', luz: '#c4a066', sombra: '#5e4a28' },
    patios:        { arco: 'medio',    hoja: 'shoji',  clave: 'sol' },
    mansion:       { arco: 'dintel',   hoja: 'shoji',  clave: 'teja' },
    plaza:         { arco: 'medio',    hoja: 'tablas', clave: 'grieta' },
    foso:          { arco: 'dintel',   hoja: 'reja',   clave: 'hierro' },
    torreones:     { arco: 'apuntado', hoja: 'tablas', clave: 'almena' },
    torii:         { arco: 'torii',    hoja: 'noren',  clave: 'shimenawa',
                     marco: '#c8402f', luz: '#e8705a', sombra: '#7d2419' },
    santuario:     { arco: 'torii',    hoja: 'velo',   clave: 'espejo',
                     marco: '#c89a3e', luz: '#ffd784', sombra: '#7d5c1e' }
};

// la de siempre, por si se juega sin biomas o llega una ficha sin portal
const PORTAL_DE_SERIE = { arco: 'medio', hoja: 'shoji', clave: 'sol' };

function fichaPortal() {
    const base = (BIOMA && PORTALES[BIOMA.id]) || PORTAL_DE_SERIE;
    return {
        arco: base.arco, hoja: base.hoja, clave: base.clave,
        marco: base.marco || T.zocalo || P.piedra,
        luz: base.luz || T.zocaloLuz || P.piedraLuz,
        sombra: base.sombra || T.zocaloSombra || P.piedraSombra
    };
}

// El hueco por el que se pasa, como trazado cerrado. Sirve de recorte para
// el asomo y las hojas, y de guía para el marco: uno y otro no pueden
// desdecirse, así que salen los dos de aquí.
function trazarVano(g, cx, cy, tipo, escala = 1) {
    const an = PORTAL_ANCHO * escala, al = PORTAL_ALTO * escala;
    const izq = cx - an / 2, der = cx + an / 2;
    const base = cy + PORTAL_BASE * escala, techo = base - al;

    g.beginPath();
    if (tipo === 'torii' || tipo === 'dintel') {
        // aquí el hueco es limpio: lo que lo corona va por encima, no dentro
        g.rect(izq, techo, an, al);
    } else if (tipo === 'apuntado') {
        const arranque = techo + an * 0.42;
        g.moveTo(izq, base);
        g.lineTo(izq, arranque);
        g.quadraticCurveTo(izq + an * 0.16, techo + an * 0.06, cx, techo);
        g.quadraticCurveTo(der - an * 0.16, techo + an * 0.06, der, arranque);
        g.lineTo(der, base);
    } else if (tipo === 'rebajado') {
        // la bóveda de la alcantarilla: ancha y aplastada, como un caño
        const arranque = techo + an * 0.28;
        g.moveTo(izq, base);
        g.lineTo(izq, arranque);
        g.quadraticCurveTo(izq, techo, cx, techo);
        g.quadraticCurveTo(der, techo, der, arranque);
        g.lineTo(der, base);
    } else {
        // medio punto: el arranque queda a un radio de la clave
        const arranque = techo + an / 2;
        g.moveTo(izq, base);
        g.lineTo(izq, arranque);
        g.arc(cx, arranque, an / 2, Math.PI, 0);
        g.lineTo(der, base);
    }
    g.closePath();
    return { izq, der, base, techo, an, al };
}

function dibujarPuerta(cx, cy) {
    const a = J.puerta.apertura;
    const pulso = 0.85 + Math.sin(J.tiempo * 2.5) * 0.15;
    const f = fichaPortal();

    // el halo que la anuncia cuando ya deja pasar
    if (a > 0) {
        const hy = cy + PORTAL_BASE - PORTAL_ALTO * 0.5;
        const alcance = PORTAL_ALTO * 1.25;
        const halo = ctx.createRadialGradient(cx, hy, alcance * 0.1, cx, hy, alcance);
        halo.addColorStop(0, `rgba(150, 210, 255, ${0.38 * a * pulso})`);
        halo.addColorStop(1, 'rgba(150, 210, 255, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(cx, hy, alcance, 0, 6.2832); ctx.fill();
    }

    // ---- el otro lado, recortado al hueco ----
    ctx.save();
    const v = trazarVano(ctx, cx, cy, f.arco);
    ctx.clip();
    dibujarAsomo(v);
    hojasDelPortal(v, f, a, pulso);
    ctx.restore();

    // ---- la obra: jambas, solera y remate ----
    marcoDelPortal(cx, cy, v, f, a, pulso);
}

// ------------------------------------------------------------
//  Lo que se ve al otro lado: la comarca siguiente, no la de ahora.
//  Se guarda pintado y solo se rehace cuando cambia el destino, que es
//  una vez cada diez sendas; repintarlo por fotograma sería tirar el
//  tiempo en algo que no cambia.
// ------------------------------------------------------------
let asomoLienzo = null;
let asomoClave = '';

// El bioma al que lleva esta puerta. La última no lleva a ninguno: detrás
// está la salida, y esa tiene cielo propio.
function destinoDeLaPuerta() {
    if (typeof Biomas === 'undefined') return null;
    if (Biomas.ultima(J.nivel)) return 'salida';
    return Biomas.deNivel(J.nivel + 1);
}

function dibujarAsomo(v) {
    const destino = destinoDeLaPuerta();
    const id = destino === 'salida' ? 'salida' : (destino ? destino.id : 'nada');
    const an = Math.ceil(v.an), al = Math.ceil(v.al);

    if (asomoClave !== `${id}:${an}x${al}`) {
        asomoLienzo = pintarAsomo(destino, an, al);
        asomoClave = `${id}:${an}x${al}`;
    }
    ctx.drawImage(asomoLienzo, v.izq, v.techo);

    // el menudeo del aire de allá, que es lo único que se mueve: sin esto el
    // asomo se lee como una lámina clavada detrás del hueco
    const color = destino === 'salida'
        ? '#ffd784'
        : ((destino && destino.ambiente && destino.ambiente.color) || T.mota);
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < 7; i++) {
        const fase = i * 1.7;
        const mx = v.izq + ((i * 0.37 + Math.sin(J.tiempo * 0.3 + fase) * 0.12 + 1) % 1) * v.an;
        const my = v.base - ((J.tiempo * 0.09 + i * 0.21) % 1) * v.al;
        ctx.globalAlpha = 0.12 + Math.sin(J.tiempo * 1.4 + fase) * 0.1;
        ctx.beginPath(); ctx.arc(mx, my, 1.6, 0, 6.2832); ctx.fill();
    }
    ctx.restore();
}

// El retrato de la comarca de al lado: su cielo, su horizonte y su suelo,
// con la silueta que le toque según lo que tenga de afueras. Ni detalle ni
// falta: se mira por un hueco de metro y medio y desde lejos.
function pintarAsomo(destino, an, al) {
    const c = lienzoOculto(an, al), g = c.getContext('2d');
    const finalDelCamino = destino === 'salida';
    const q = finalDelCamino
        ? { fondoAlto: '#3d4a7a', fondoBajo: '#e8a15c', suelo: '#c8b98f',
            sueloSombra: '#8a7a5a', bordeSombra: '#5a4a6a', mota: '#ffe8b0' }
        : Object.assign({}, P, destino && destino.paleta);
    const horizonte = al * 0.72;

    const cielo = g.createLinearGradient(0, 0, 0, horizonte);
    cielo.addColorStop(0, q.fondoAlto || P.nocheAlta);
    cielo.addColorStop(1, q.fondoBajo || P.nocheBaja);
    g.fillStyle = cielo;
    g.fillRect(0, 0, an, al);

    const tipo = finalDelCamino ? 'salida' : ((destino && destino.afueras) || 'jardin');
    siluetaDeAsomo(g, an, al, horizonte, tipo, q);

    // el suelo de allá, que arranca donde acaba la silueta y se aclara al
    // acercarse al umbral: es lo que hace que el camino parezca seguir
    const piso = g.createLinearGradient(0, horizonte, 0, al);
    piso.addColorStop(0, q.sueloSombra || '#2a2a34');
    piso.addColorStop(1, q.suelo || '#4a4657');
    g.fillStyle = piso;
    g.fillRect(0, horizonte, an, al - horizonte);

    // la penumbra de los cantos: por un vano se ve el centro, no las esquinas
    const velo = g.createRadialGradient(an / 2, al * 0.55, an * 0.12, an / 2, al * 0.55, an * 0.95);
    velo.addColorStop(0, 'rgba(0, 0, 0, 0)');
    velo.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    g.fillStyle = velo;
    g.fillRect(0, 0, an, al);

    return c;
}

// Las siluetas van sorteadas con senos y módulos en vez de con azar: así el
// asomo de una comarca sale siempre igual y no cambia de casa cada vez que
// hay que rehacer el lienzo.
function siluetaDeAsomo(g, an, al, horizonte, tipo, q) {
    const oscuro = q.bordeSombra || '#20242e';
    const claro = q.mota || '#8f9bb0';

    // una luna o un sol bajos para los que tienen cielo: dan fondo y dicen de
    // un vistazo que aquello es aire libre y no otra sala
    const astro = (color, x, y, r) => {
        const halo = g.createRadialGradient(x, y, 1, x, y, r * 3.4);
        halo.addColorStop(0, color);
        halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        g.globalAlpha = 0.5; g.fillStyle = halo;
        g.beginPath(); g.arc(x, y, r * 3.4, 0, 6.2832); g.fill();
        g.globalAlpha = 0.9; g.fillStyle = color;
        g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
        g.globalAlpha = 1;
    };

    if (tipo === 'roca') {
        // no hay cielo: hay más piedra, y la galería que se pierde al fondo
        g.fillStyle = oscuro;
        g.fillRect(0, 0, an, horizonte);
        g.globalAlpha = 0.5; g.fillStyle = claro;
        for (let i = 0; i < 9; i++) {
            const x = ((i * 37) % 100) / 100 * an, y = ((i * 61) % 100) / 100 * horizonte;
            g.beginPath();
            g.ellipse(x, y, an * 0.1, al * 0.03, i * 0.7, 0, 6.2832);
            g.fill();
        }
        g.globalAlpha = 1;
        const hondo = g.createRadialGradient(an / 2, horizonte * 0.62, 2,
                                             an / 2, horizonte * 0.62, an * 0.42);
        hondo.addColorStop(0, `${claro}66`);
        hondo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        g.fillStyle = hondo;
        g.fillRect(0, 0, an, horizonte);

    } else if (tipo === 'canaveral') {
        astro(claro, an * 0.7, horizonte * 0.3, an * 0.07);
        g.strokeStyle = oscuro; g.lineCap = 'round';
        for (let i = 0; i < 11; i++) {
            const x = (i + 0.5) / 11 * an + Math.sin(i * 2.3) * 4;
            g.lineWidth = 3 + (i % 3);
            g.globalAlpha = 0.55 + (i % 3) * 0.15;
            g.beginPath();
            g.moveTo(x, al);
            g.lineTo(x + Math.sin(i) * 6, horizonte * (0.1 + (i % 4) * 0.12));
            g.stroke();
        }
        g.globalAlpha = 1;

    } else if (tipo === 'jardin' || tipo === 'arboleda') {
        astro('#ffe8c0', an * 0.72, horizonte * 0.26, an * 0.06);
        g.fillStyle = oscuro;
        for (let i = 0; i < 6; i++) {
            const x = (i + 0.5) / 6 * an, r = an * (0.16 + (i % 3) * 0.05);
            g.globalAlpha = 0.65 + (i % 2) * 0.25;
            g.beginPath();
            g.ellipse(x, horizonte - r * 0.35, r, r * 0.8, 0, 0, 6.2832);
            g.fill();
        }
        g.globalAlpha = 1;
        if (tipo === 'arboleda') {
            // y los torii de la senda, uno detrás de otro, encogiendo
            g.strokeStyle = '#a8382c';
            for (let i = 0; i < 3; i++) {
                const e = 1 - i * 0.26, w = an * 0.3 * e, h = al * 0.2 * e;
                const x = an / 2, y = horizonte + al * 0.04;
                g.globalAlpha = 0.75 - i * 0.2;
                g.lineWidth = 3 * e;
                g.beginPath();
                g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y - h);
                g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y - h);
                g.moveTo(x - w * 0.62, y - h); g.lineTo(x + w * 0.62, y - h);
                g.moveTo(x - w * 0.52, y - h * 0.82); g.lineTo(x + w * 0.52, y - h * 0.82);
                g.stroke();
            }
            g.globalAlpha = 1;
        }

    } else if (tipo === 'pueblo') {
        astro('#ffd8a0', an * 0.24, horizonte * 0.24, an * 0.055);
        // tejados a dos aguas, escalonados, con alguna ventana encendida
        for (let i = 0; i < 5; i++) {
            const w = an * (0.3 + (i % 3) * 0.08);
            const x = ((i * 0.27) % 1) * an - w * 0.2;
            const h = al * (0.16 + (i % 2) * 0.07);
            const y = horizonte - h * (0.2 + (i % 3) * 0.15);
            g.globalAlpha = 0.75 + (i % 2) * 0.2;
            g.fillStyle = oscuro;
            g.fillRect(x, y, w, horizonte - y + al * 0.1);
            g.beginPath();                                  // el alero, en punta
            g.moveTo(x - w * 0.12, y);
            g.lineTo(x + w / 2, y - h * 0.42);
            g.lineTo(x + w * 1.12, y);
            g.closePath(); g.fill();
            g.fillStyle = '#ffc46a';
            g.globalAlpha = 0.35 + (i % 2) * 0.35;
            g.fillRect(x + w * 0.35, y + h * 0.35, w * 0.22, h * 0.28);
        }
        g.globalAlpha = 1;

    } else if (tipo === 'vacio') {
        // bajo el puente no hay comarca: hay noche, jirones y ningún fondo
        g.fillStyle = 'rgba(4, 6, 12, 0.75)';
        g.fillRect(0, 0, an, al);
        g.globalAlpha = 0.5; g.fillStyle = claro;
        for (let i = 0; i < 16; i++) {
            const x = ((i * 53) % 100) / 100 * an, y = ((i * 29) % 100) / 100 * al;
            g.beginPath(); g.arc(x, y, 0.9, 0, 6.2832); g.fill();
        }
        g.globalAlpha = 0.12;
        for (let i = 0; i < 4; i++) {
            g.beginPath();
            g.ellipse(an / 2, al * (0.3 + i * 0.18), an * 0.75, al * 0.05, 0, 0, 6.2832);
            g.fill();
        }
        g.globalAlpha = 1;

    } else if (tipo === 'nubes' || tipo === 'salida') {
        astro(tipo === 'salida' ? '#fff0c4' : '#e8eeff', an * 0.62, horizonte * 0.24, an * 0.08);
        g.fillStyle = oscuro; g.globalAlpha = 0.6;
        for (let i = 0; i < 4; i++) {
            const x = (i + 0.5) / 4 * an, r = an * 0.22;
            g.beginPath();
            g.moveTo(x, horizonte - r);
            g.lineTo(x + r * 0.8, horizonte);
            g.lineTo(x - r * 0.8, horizonte);
            g.closePath(); g.fill();
        }
        g.fillStyle = tipo === 'salida' ? '#ffe0b0' : '#cddcf0';
        for (let i = 0; i < 5; i++) {
            g.globalAlpha = 0.18 + (i % 3) * 0.1;
            g.beginPath();
            g.ellipse(an * (0.2 + (i * 0.23) % 0.8), horizonte + al * (0.02 + i * 0.05),
                      an * 0.42, al * 0.035, 0, 0, 6.2832);
            g.fill();
        }
        g.globalAlpha = 1;

    } else {
        astro('#e8eeff', an * 0.7, horizonte * 0.28, an * 0.06);
        g.fillStyle = oscuro; g.globalAlpha = 0.7;
        g.fillRect(0, horizonte - al * 0.1, an, al * 0.1);
        g.globalAlpha = 1;
    }
}

// ------------------------------------------------------------
//  Las hojas: lo que cierra el vano y se corre a los lados conforme
//  el sello cede. Cada comarca cierra con lo suyo.
// ------------------------------------------------------------
function hojasDelPortal(v, f, a, pulso) {
    // 'canto' es por donde se juntan las dos, que es lo que se separa: cerradas
    // coinciden en el centro y de ahí cada una tira para su lado
    const cx = (v.izq + v.der) / 2;
    const corrida = a * (v.an / 2 + 4);
    hojaPortal(v, f, cx - corrida, -1);
    hojaPortal(v, f, cx + corrida, 1);

    if (a < 1) {                                       // el sello, mientras aguanta
        const cy = v.base - v.al * 0.5;
        const alto = v.al * 0.34;
        ctx.save();
        ctx.globalAlpha = 1 - a;
        ctx.translate(cx, cy); ctx.rotate(0.2);
        ctx.fillStyle = '#f2e4c8';
        ctx.fillRect(-6, -alto / 2, 12, alto);
        ctx.strokeStyle = P.bermellon; ctx.lineWidth = 1.6;
        ctx.strokeRect(-6, -alto / 2, 12, alto);
        ctx.fillStyle = `rgba(210, 70, 55, ${pulso})`;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath(); ctx.arc(0, i * alto * 0.26, 2.2, 0, 6.2832); ctx.fill();
        }
        ctx.restore();
    }
}

// Media hoja, pegada al canto que le toca. Todas ocupan lo mismo y se mueven
// igual: lo que cambia de una comarca a otra es de qué están hechas.
function hojaPortal(v, f, canto, lado) {
    const w = v.an / 2 + 4;
    const x0 = lado < 0 ? canto - w : canto;
    const y0 = v.techo, h = v.base - v.techo;

    ctx.save();
    if (f.hoja === 'reja') {
        // rastrillo: barrotes y noche entre ellos, que deja ver lo de detrás
        ctx.fillStyle = 'rgba(10, 14, 20, 0.55)';
        ctx.fillRect(x0, y0, w, h);
        ctx.strokeStyle = '#4a4e58'; ctx.lineWidth = 3.4;
        for (let i = 0; i < 4; i++) {
            const bx = x0 + (i + 0.5) * w / 4;
            ctx.beginPath(); ctx.moveTo(bx, y0); ctx.lineTo(bx, v.base); ctx.stroke();
        }
        ctx.strokeStyle = '#5e636e'; ctx.lineWidth = 4;
        for (let i = 0; i < 4; i++) {
            const by = y0 + (i + 0.5) * h / 4;
            ctx.beginPath(); ctx.moveTo(x0, by); ctx.lineTo(x0 + w, by); ctx.stroke();
        }

    } else if (f.hoja === 'losa') {
        // la losa de la cripta: piedra maciza, sin gracia y con una grieta
        ctx.fillStyle = f.marco; ctx.fillRect(x0, y0, w, h);
        ctx.fillStyle = f.sombra; ctx.fillRect(x0, y0 + h * 0.5, w, h * 0.5);
        ctx.globalAlpha = 0.45; ctx.fillStyle = f.luz;
        ctx.fillRect(x0, y0, w, h * 0.16);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(12, 10, 20, 0.7)'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 + w * 0.5, y0);
        ctx.lineTo(x0 + w * 0.32, y0 + h * 0.42);
        ctx.lineTo(x0 + w * 0.58, v.base);
        ctx.stroke();

    } else if (f.hoja === 'tablas') {
        // portón de tablones claveteados
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i % 2 ? (T.zocaloSombra || P.maderaSombra) : (T.zocalo || P.madera);
            ctx.fillRect(x0 + i * w / 3, y0, w / 3 + 0.5, h);
        }
        ctx.strokeStyle = 'rgba(20, 16, 12, 0.55)'; ctx.lineWidth = 1.4;
        for (let i = 1; i < 3; i++) {
            const vx = x0 + i * w / 3;
            ctx.beginPath(); ctx.moveTo(vx, y0); ctx.lineTo(vx, v.base); ctx.stroke();
        }
        ctx.fillStyle = '#4a4e58';                       // los herrajes
        ctx.fillRect(x0, y0 + h * 0.2, w, 5);
        ctx.fillRect(x0, y0 + h * 0.72, w, 5);
        ctx.fillStyle = '#7e838e';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(x0 + (i + 0.5) * w / 3, y0 + h * 0.2 + 2.5, 2, 0, 6.2832);
            ctx.fill();
        }

    } else if (f.hoja === 'canas') {
        // cortina de cañas atadas: se cuela algo de luz entre ellas
        ctx.fillStyle = 'rgba(30, 40, 26, 0.55)';
        ctx.fillRect(x0, y0, w, h);
        for (let i = 0; i < 7; i++) {
            const bx = x0 + (i + 0.5) * w / 7;
            ctx.fillStyle = i % 2 ? '#a88f52' : '#8d7742';
            ctx.fillRect(bx - 2.4, y0, 4.8, h);
            ctx.fillStyle = 'rgba(60, 48, 24, 0.6)';
            for (let k = 1; k < 5; k++) ctx.fillRect(bx - 2.4, y0 + k * h / 5, 4.8, 1.6);
        }
        ctx.strokeStyle = '#6b5a30'; ctx.lineWidth = 2;
        for (const ky of [0.24, 0.72]) {
            ctx.beginPath();
            ctx.moveTo(x0, y0 + h * ky); ctx.lineTo(x0 + w, y0 + h * ky);
            ctx.stroke();
        }

    } else if (f.hoja === 'noren') {
        // el paño corto de tela que cuelga: no llega al suelo y ondea
        ctx.fillStyle = 'rgba(10, 14, 24, 0.5)';
        ctx.fillRect(x0, y0, w, h);
        const largo = h * 0.62;
        ctx.fillStyle = f.marco;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + w, y0);
        ctx.lineTo(x0 + w, y0 + largo);
        for (let i = 4; i >= 0; i--) {
            const px = x0 + i * w / 4;
            ctx.lineTo(px, y0 + largo + Math.sin(J.tiempo * 1.6 + i) * 3);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255, 240, 200, 0.35)';
        ctx.fillRect(x0, y0 + largo * 0.42, w, 3);

    } else if (f.hoja === 'velo') {
        // el velo del santuario: luz cuajada, apenas materia
        const gl = ctx.createLinearGradient(x0, y0, x0, v.base);
        gl.addColorStop(0, 'rgba(255, 240, 196, 0.75)');
        gl.addColorStop(1, 'rgba(255, 215, 132, 0.35)');
        ctx.fillStyle = gl;
        ctx.fillRect(x0, y0, w, h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 1.2;
        for (let i = 0; i < 4; i++) {
            const vx = x0 + (i + 0.5) * w / 4;
            ctx.globalAlpha = 0.3 + Math.sin(J.tiempo * 2 + i) * 0.25;
            ctx.beginPath(); ctx.moveTo(vx, y0); ctx.lineTo(vx, v.base); ctx.stroke();
        }
        ctx.globalAlpha = 1;

    } else {
        // shoji: el papel cuadriculado de siempre
        ctx.fillStyle = '#e8dfc4';
        ctx.fillRect(x0, y0, w, h);
        ctx.fillStyle = 'rgba(255, 235, 180, 0.35)';
        ctx.fillRect(x0, y0, w, h * 0.5);
        ctx.strokeStyle = 'rgba(90, 60, 45, 0.55)'; ctx.lineWidth = 1.4;
        for (let i = 1; i < 3; i++) {
            const vx = x0 + i * w / 3;
            ctx.beginPath(); ctx.moveTo(vx, y0); ctx.lineTo(vx, v.base); ctx.stroke();
        }
        for (let i = 1; i < 5; i++) {
            const vy = y0 + i * h / 5;
            ctx.beginPath(); ctx.moveTo(x0, vy); ctx.lineTo(x0 + w, vy); ctx.stroke();
        }
    }

    ctx.fillStyle = P.tinta;                           // el canto por donde se juntan
    ctx.fillRect(lado < 0 ? canto - 2.5 : canto, y0, 2.5, h);
    ctx.restore();
}

// ------------------------------------------------------------
//  La obra de fábrica: jambas, solera y el remate de la comarca. Va por
//  fuera del recorte, así que puede sobresalir del hueco: es justo lo
//  que hace que se lea como puerta y no como agujero.
// ------------------------------------------------------------
function marcoDelPortal(cx, cy, v, f, a, pulso) {
    const grueso = TILE * 0.2;
    const alto = v.base - v.techo;

    if (f.arco === 'torii') {
        // los dos postes y, encima, el dintel que vuela por los lados
        const vuelo = v.an * 0.34;
        ctx.fillStyle = P.tinta;
        ctx.fillRect(v.izq - grueso - 2, v.techo, grueso + 4, alto + 3);
        ctx.fillRect(v.der - 2, v.techo, grueso + 4, alto + 3);
        ctx.fillStyle = f.marco;
        ctx.fillRect(v.izq - grueso, v.techo, grueso, alto);
        ctx.fillRect(v.der, v.techo, grueso, alto);
        ctx.fillStyle = f.sombra;
        ctx.fillRect(v.izq - grueso * 0.35, v.techo, grueso * 0.35, alto);
        ctx.fillRect(v.der + grueso * 0.65, v.techo, grueso * 0.35, alto);

        // el travesaño de abajo, recto, y el de arriba, con su alero curvado
        ctx.fillStyle = f.marco;
        ctx.fillRect(v.izq - grueso * 1.6, v.techo + v.al * 0.13, v.an + grueso * 3.2, grueso * 0.7);
        ctx.fillStyle = P.tinta;
        ctx.beginPath();
        ctx.moveTo(v.izq - vuelo, v.techo - grueso * 0.2);
        ctx.quadraticCurveTo(cx, v.techo - grueso * 1.5, v.der + vuelo, v.techo - grueso * 0.2);
        ctx.lineTo(v.der + vuelo * 0.9, v.techo + grueso * 0.9);
        ctx.quadraticCurveTo(cx, v.techo - grueso * 0.2, v.izq - vuelo * 0.9, v.techo + grueso * 0.9);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = f.marco;
        ctx.beginPath();
        ctx.moveTo(v.izq - vuelo * 0.94, v.techo);
        ctx.quadraticCurveTo(cx, v.techo - grueso * 1.2, v.der + vuelo * 0.94, v.techo);
        ctx.lineTo(v.der + vuelo * 0.86, v.techo + grueso * 0.66);
        ctx.quadraticCurveTo(cx, v.techo + grueso * 0.1, v.izq - vuelo * 0.86, v.techo + grueso * 0.66);
        ctx.closePath(); ctx.fill();

    } else {
        // marco corrido: se entinta primero grueso y se rellena de color
        ctx.save();
        ctx.lineJoin = 'round';
        trazarVano(ctx, cx, cy, f.arco);
        ctx.strokeStyle = P.tinta; ctx.lineWidth = grueso + 7;
        ctx.stroke();
        ctx.strokeStyle = f.marco; ctx.lineWidth = grueso;
        ctx.stroke();
        // una luz por el canto de dentro, que le da bulto a la piedra
        ctx.strokeStyle = f.luz; ctx.lineWidth = 2.4;
        ctx.globalAlpha = 0.5;
        trazarVano(ctx, cx, cy, f.arco, 0.965);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();

        if (f.arco === 'dintel') {
            // una viga que sobresale a los dos lados
            ctx.fillStyle = P.tinta;
            ctx.fillRect(v.izq - grueso * 1.4, v.techo - grueso * 1.5, v.an + grueso * 2.8, grueso * 1.5);
            ctx.fillStyle = f.marco;
            ctx.fillRect(v.izq - grueso * 1.2, v.techo - grueso * 1.3, v.an + grueso * 2.4, grueso * 1.1);
            ctx.fillStyle = f.sombra;
            ctx.fillRect(v.izq - grueso * 1.2, v.techo - grueso * 0.3, v.an + grueso * 2.4, grueso * 0.3);
        } else if (f.arco === 'medio') {
            // las dovelas: las juntas radiales que se le ven a un arco de piedra.
            // Solo en el de medio punto: son radios de una circunferencia, y en
            // uno apuntado o rebajado no caerían donde toca
            ctx.save();
            ctx.strokeStyle = f.sombra; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.65;
            const ejeY = v.techo + v.an * 0.45;
            for (let i = 1; i < 6; i++) {
                const ang = Math.PI + i * Math.PI / 6;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(ang) * v.an * 0.5, ejeY + Math.sin(ang) * v.an * 0.45);
                ctx.lineTo(cx + Math.cos(ang) * v.an * 0.62, ejeY + Math.sin(ang) * v.an * 0.58);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    // la solera, que es lo que asienta la puerta en el suelo
    ctx.fillStyle = P.tinta;
    ctx.fillRect(v.izq - grueso * 1.3, v.base, v.an + grueso * 2.6, 5);
    ctx.fillStyle = f.sombra;
    ctx.fillRect(v.izq - grueso * 1.1, v.base, v.an + grueso * 2.2, 3.5);

    adornoDeClave(cx, v, f, pulso);

    // el filo que avisa: rojo mientras el sello aguanta, azul al ceder
    ctx.save();
    ctx.lineJoin = 'round';
    trazarVano(ctx, cx, cy, f.arco, 1.075);
    ctx.strokeStyle = a >= 1
        ? `rgba(170, 220, 255, ${0.7 * pulso})`
        : `rgba(230, 120, 100, ${0.45 * pulso})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

// El detalle que firma la comarca, en la clave del arco o colgando del
// dintel: es lo que impide que dos puertas de la misma forma se confundan.
function adornoDeClave(cx, v, f, pulso) {
    const y = v.techo;
    ctx.save();

    if (f.clave === 'calavera') {
        ctx.fillStyle = '#d8d2c0';
        ctx.beginPath(); ctx.arc(cx, y - 8, 7, 0, 6.2832); ctx.fill();
        ctx.fillRect(cx - 4, y - 4, 8, 6);
        ctx.fillStyle = '#1c1826';
        ctx.beginPath(); ctx.arc(cx - 2.6, y - 9, 2, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 2.6, y - 9, 2, 0, 6.2832); ctx.fill();

    } else if (f.clave === 'goteron') {
        // el agua que rezuma la bóveda: cae, y vuelve a caer
        ctx.fillStyle = 'rgba(168, 196, 138, 0.8)';
        for (let i = 0; i < 3; i++) {
            const t = (J.tiempo * 0.6 + i * 0.33) % 1;
            ctx.globalAlpha = 0.7 * (1 - t);
            ctx.beginPath();
            ctx.ellipse(cx + (i - 1) * 11, y + 6 + t * v.al * 0.5, 1.6, 3, 0, 0, 6.2832);
            ctx.fill();
        }

    } else if (f.clave === 'hoja') {
        ctx.fillStyle = T.hoja || '#2b6b3e';
        for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(cx + s * 13, y - 10, 11, 4, s * 0.5, 0, 6.2832);
            ctx.fill();
        }

    } else if (f.clave === 'sol') {
        ctx.strokeStyle = `rgba(255, 215, 132, ${0.5 + pulso * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, y - 9, 5.5, 0, 6.2832); ctx.stroke();
        for (let i = 0; i < 8; i++) {
            const ang = i * 0.7854;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(ang) * 7.5, y - 9 + Math.sin(ang) * 7.5);
            ctx.lineTo(cx + Math.cos(ang) * 10.5, y - 9 + Math.sin(ang) * 10.5);
            ctx.stroke();
        }

    } else if (f.clave === 'teja') {
        // un tejadillo sobre el dintel, como los portalones de la mansión
        ctx.fillStyle = P.tinta;
        ctx.beginPath();
        ctx.moveTo(cx - v.an * 0.68, y - 12);
        ctx.lineTo(cx, y - 26);
        ctx.lineTo(cx + v.an * 0.68, y - 12);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = T.bordeBase || P.teja;
        ctx.beginPath();
        ctx.moveTo(cx - v.an * 0.6, y - 13);
        ctx.lineTo(cx, y - 24);
        ctx.lineTo(cx + v.an * 0.6, y - 13);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = T.bordeSombra || P.tejaSombra; ctx.lineWidth = 1.2;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * v.an * 0.22, y - 13);
            ctx.lineTo(cx + i * v.an * 0.09, y - 22);
            ctx.stroke();
        }

    } else if (f.clave === 'grieta') {
        ctx.strokeStyle = 'rgba(20, 16, 24, 0.7)'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 3, y - 2);
        ctx.lineTo(cx + 4, y - 11);
        ctx.lineTo(cx - 2, y - 18);
        ctx.lineTo(cx + 6, y - 26);
        ctx.stroke();

    } else if (f.clave === 'hierro') {
        // las cadenas del puente levadizo, tirantes a los dos lados
        ctx.strokeStyle = '#5e636e'; ctx.lineWidth = 3;
        for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(cx + s * v.an * 0.5, y - 8);
            ctx.lineTo(cx + s * v.an * 0.78, y - v.al * 0.18);
            ctx.stroke();
        }

    } else if (f.clave === 'almena') {
        ctx.fillStyle = f.marco;
        for (let i = -2; i <= 2; i++) ctx.fillRect(cx + i * 13 - 5, y - 20, 10, 12);
        ctx.fillStyle = P.tinta;
        for (let i = -2; i <= 2; i++) ctx.fillRect(cx + i * 13 - 5, y - 20, 10, 2.5);

    } else if (f.clave === 'shimenawa') {
        // la maroma sagrada, con sus tiras de papel colgando
        ctx.strokeStyle = '#d8cfa8'; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - v.an * 0.48, y + 14);
        ctx.quadraticCurveTo(cx, y + 26, cx + v.an * 0.48, y + 14);
        ctx.stroke();
        ctx.fillStyle = '#f4efe0';
        for (let i = -1; i <= 1; i++) {
            const px = cx + i * v.an * 0.26;
            const py = y + 20 - Math.abs(i) * 3;
            ctx.beginPath();
            ctx.moveTo(px - 4, py);
            ctx.lineTo(px + 4, py);
            ctx.lineTo(px + 2, py + 14 + Math.sin(J.tiempo * 1.5 + i) * 2);
            ctx.lineTo(px - 2, py + 13);
            ctx.closePath(); ctx.fill();
        }

    } else if (f.clave === 'espejo') {
        // el espejo del santuario: lo que se ve al final del camino
        const r = 9 + pulso * 2;
        const gl = ctx.createRadialGradient(cx, y - 4, 1, cx, y - 4, r * 2.2);
        gl.addColorStop(0, `rgba(255, 240, 196, ${0.85 * pulso})`);
        gl.addColorStop(1, 'rgba(255, 215, 132, 0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(cx, y - 4, r * 2.2, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = '#ffe8b0'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(cx, y - 4, r * 0.7, 0, 6.2832); ctx.stroke();
    }

    ctx.restore();
}

// ============================================================
//  Ambiente: lo que flota en el aire de cada comarca. Pétalos en el
//  jardín, polvo bajo tierra, goterones en las galerías, hojas en el
//  bambú, pavesas en la plaza. Todas se mueven igual; lo que cambia es
//  la forma, el color, cuántas hay y hacia dónde van.
// ============================================================
const petalos = [];
const luciernagas = [];

function prepararAmbiente() {
    const amb = aire();
    petalos.length = 0;
    luciernagas.length = 0;
    for (let i = 0; i < amb.cuantas; i++)
        petalos.push({ x: azar(0, AN), y: azar(0, AL), v: azar(amb.vel[0], amb.vel[1]),
                       giro: azar(0, 6.28), vGiro: azar(-1.6, 1.6), t: azar(6, 15),
                       tam: azar(0.75, 1.35) });
    for (let i = 0; i < (amb.luciernagas || 0); i++)
        luciernagas.push({ x: azar(0, AN), y: azar(0, AL), fase: azar(0, 6.28),
                           vx: azar(-9, 9), vy: azar(-9, 9) });
}

function actualizarAmbiente(dt) {
    for (const p of petalos) {
        p.y += p.v * dt;
        p.x += Math.sin(J.tiempo * 1.4 + p.giro) * 16 * dt - 8 * dt;
        p.giro += p.vGiro * dt;
        // lo que cae vuelve por arriba y lo que sube vuelve por abajo
        if (p.y > AL + 12) { p.y = -12; p.x = azar(-20, AN); }
        else if (p.y < -12) { p.y = AL + 12; p.x = azar(-20, AN); }
        if (p.x < -20) p.x = AN + 10;
    }
    for (const l of luciernagas) {
        l.x += l.vx * dt; l.y += l.vy * dt;
        l.vx += azar(-16, 16) * dt; l.vy += azar(-16, 16) * dt;
        l.vx = Math.max(-14, Math.min(14, l.vx));
        l.vy = Math.max(-14, Math.min(14, l.vy));
        if (l.x < 0 || l.x > AN) l.vx *= -1;
        if (l.y < 0 || l.y > AL) l.vy *= -1;
    }
}

function dibujarParticulas() {
    const amb = aire();
    ctx.save();
    ctx.fillStyle = amb.color;
    for (const p of petalos) {
        ctx.save();
        ctx.translate(p.x, p.y);
        switch (amb.forma) {
            case 'mota':                               // polvo suspendido
                ctx.globalAlpha = 0.2 + Math.abs(Math.sin(J.tiempo * 1.2 + p.t)) * 0.3;
                ctx.beginPath(); ctx.arc(0, 0, 1.6 * p.tam, 0, 6.2832); ctx.fill();
                break;
            case 'gota':                               // goterón que se despeña
                ctx.globalAlpha = 0.45;
                ctx.beginPath();
                ctx.ellipse(0, 0, 1.1 * p.tam, 6 * p.tam, 0, 0, 6.2832);
                ctx.fill();
                break;
            case 'hoja':                               // hoja alargada, dando vueltas
                ctx.rotate(p.giro);
                ctx.globalAlpha = 0.42;
                ctx.beginPath();
                ctx.ellipse(0, 0, 6 * p.tam,
                            1.8 * p.tam * Math.abs(Math.cos(J.tiempo * 2.4 + p.t)),
                            0, 0, 6.2832);
                ctx.fill();
                break;
            case 'ceniza':                             // pavesa que se apaga y se enciende
                ctx.globalAlpha = 0.15 + Math.abs(Math.sin(J.tiempo * 2.6 + p.t)) * 0.4;
                ctx.beginPath(); ctx.arc(0, 0, 1.3 * p.tam, 0, 6.2832); ctx.fill();
                break;
            default:                                   // pétalo, que respira al girar
                ctx.rotate(p.giro);
                ctx.globalAlpha = 0.42;
                ctx.beginPath();
                ctx.ellipse(0, 0, 4.2 * p.tam,
                            2.2 * p.tam * Math.abs(Math.cos(J.tiempo * 3 + p.t)),
                            0, 0, 6.2832);
                ctx.fill();
        }
        ctx.restore();
    }
    ctx.restore();
}

// ============================================================
//  Dibujado por fotograma
// ============================================================
const aPantallaX = x => x * TILE - cam.x;
const aPantallaY = y => y * TILE - cam.y;

function pintar() {
    const j = J.jugador;

    // cámara: sigue al héroe y se queda dentro de los límites del recinto. Si la
    // ventana es más ancha que el propio recinto, este se planta en el centro
    const objX = j.x * TILE - AN / 2, objY = j.y * TILE - AL / 2;
    const topeX = ANCHO * TILE - AN, topeY = ALTO * TILE - AL;
    cam.x = topeX > 0 ? Math.max(0, Math.min(topeX, objX)) : topeX / 2;
    cam.y = topeY > 0 ? Math.max(0, Math.min(topeY, objY)) : topeY / 2;

    ctx.save();
    if (sacudida > 0) ctx.translate(azar(-sacudida, sacudida), azar(-sacudida, sacudida));

    // el lienzo del nivel trae ya sus afueras alrededor, así que basta con
    // recortarle la ventana: bosque y recinto se mueven a una, sin costura
    ctx.drawImage(lienzoNivel, cam.x + OFF, cam.y + OFF, AN, AL, 0, 0, AN, AL);

    dibujarAdornos();
    dibujarTrampas();
    dibujarPuerta(aPantallaX(J.puerta.x), aPantallaY(J.puerta.y));
    dibujarCharcos();

    for (const o of J.objetos) {
        const flot = Math.sin(J.tiempo * 3 + o.giro) * 2.5;
        const px = aPantallaX(o.x), py = aPantallaY(o.y);
        auraDeElixir(px, py + flot, o.giro);
        sombraElipse(px, py + 7, 11, 5, 0.3);
        dibujarSprite(sprites.elixir, px, py + flot, 0);
    }

    for (const e of J.enemigos) {
        const v = visibilidadEnemigo(e, j);
        if (v < 0.02) continue;                         // tapado por un muro
        const px = aPantallaX(e.x), py = aPantallaY(e.y);
        ctx.globalAlpha = v;
        sombra(px, py, e.r);
        dibujarBestia(e, px, py);
        barraEnemigo(e, px, py);
        ctx.globalAlpha = 1;
    }

    dibujarOrbes();
    dibujarHeroe(j);
    dibujarEfectos();
    sombrasDeGeometria(j);
    pintarLuces(j);
    dibujarParticulas();
    dibujarCercos(j);

    if (flash > 0) {
        ctx.fillStyle = `rgba(200, 40, 60, ${flash * 0.35})`;
        ctx.fillRect(0, 0, AN, AL);
    }
    ctx.restore();
    vinetear();
}

// Viñeta: el borde se apaga en azul, como el encuadre de un fotograma
let capaVineta = null;
function vinetear() {
    if (!capaVineta) {
        capaVineta = lienzoOculto(AN, AL);
        const g = capaVineta.getContext('2d');
        const velo = aire().velo;
        const v = g.createRadialGradient(AN / 2, AL / 2, AL * 0.4, AN / 2, AL / 2, AL * 0.95);
        v.addColorStop(0, `rgba(${velo}, 0)`);
        v.addColorStop(1, `rgba(${velo}, 0.6)`);
        g.fillStyle = v;
        g.fillRect(0, 0, AN, AL);
    }
    ctx.drawImage(capaVineta, 0, 0);
}

// ============================================================
//  El elixir derramado. La mancha se traza con los radios que el charco
//  trae sorteados desde que se rompió la botella, unidos por curvas para
//  que el contorno sea irregular pero blando: nada de picos, que esto es
//  un líquido y no una mancha de tinta.
//
//  Y se lee de un vistazo lo que le queda: pierde cuerpo según se bebe
//  -el brillo interior se apaga con lo que va quedando- y al agotarse se
//  encoge y se aclara hasta desaparecer, como secándose en la piedra.
// ============================================================
function trazarMancha(px, py, rx, ry, forma, giro) {
    const n = forma.length;
    const punto = i => {
        const a = giro + i / n * 6.2832;
        return [px + Math.cos(a) * rx * forma[i % n], py + Math.sin(a) * ry * forma[i % n]];
    };
    // se pasa por los medios de cada par y el vértice queda de tirador de la
    // curva: es la forma corriente de cerrar un contorno redondeado sin costura
    ctx.beginPath();
    let [ax, ay] = punto(0);
    let [bx, by] = punto(1);
    ctx.moveTo((ax + bx) / 2, (ay + by) / 2);
    for (let i = 1; i <= n; i++) {
        const [cx, cy] = punto(i);
        const [dx, dy] = punto(i + 1);
        ctx.quadraticCurveTo(cx, cy, (cx + dx) / 2, (cy + dy) / 2);
    }
    ctx.closePath();
}

function dibujarCharcos() {
    for (const c of J.charcos) {
        const px = aPantallaX(c.x), py = aPantallaY(c.y);
        // el secado: mengua y se va en lo que dura CHARCO_SECADO
        const seco = c.secando > 0 ? Math.min(1, c.secando / CHARCO_SECADO) : 0;
        const k = 1 - seco;
        if (k <= 0.01) continue;
        const jugo = Math.max(0, c.queda / CHARCO_CURA);   // lo que aún da, de 1 a 0

        // se aplasta en vertical: el suelo se mira de refilón, no desde arriba
        const rx = TILE * c.r * (0.92 + jugo * 0.08) * (1 - seco * 0.25);
        const ry = rx * 0.62;

        ctx.save();
        ctx.globalAlpha = 0.85 * k;

        // el cuerpo, más claro en el centro y más oscuro en el filo
        trazarMancha(px, py, rx, ry, c.forma, c.giro);
        const g = ctx.createRadialGradient(px, py - ry * 0.15, rx * 0.05, px, py, rx);
        g.addColorStop(0, `rgba(255, 156, 186, ${0.55 + jugo * 0.35})`);
        g.addColorStop(0.55, `rgba(224, 79, 122, ${0.45 + jugo * 0.3})`);
        g.addColorStop(1, 'rgba(120, 32, 62, 0.55)');
        ctx.fillStyle = g;
        ctx.fill();

        // el borde: la orilla siempre queda más subida de color que el centro
        ctx.strokeStyle = `rgba(168, 52, 88, ${0.55 * k})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // el reflejo, que es lo que lo delata como líquido y no como pintura.
        // Late despacio, y va perdiendo fuerza a la vez que el charco
        const brillo = (0.5 + Math.sin(J.tiempo * 2.6 + c.giro) * 0.5) * jugo;
        ctx.globalAlpha = (0.15 + 0.3 * brillo) * k;
        ctx.fillStyle = '#ffe2f0';
        ctx.beginPath();
        ctx.ellipse(px - rx * 0.28, py - ry * 0.3, rx * 0.3, ry * 0.26, -0.5, 0, 6.2832);
        ctx.fill();

        // y unas gotas sueltas alrededor, las que saltaron al romperse
        ctx.globalAlpha = 0.4 * k * jugo;
        ctx.fillStyle = '#e04f7a';
        for (let i = 0; i < 3; i++) {
            const a = c.giro + i * 2.0944;
            ctx.beginPath();
            ctx.ellipse(px + Math.cos(a) * rx * 1.25, py + Math.sin(a) * ry * 1.25,
                        2.4 - i * 0.5, 1.6 - i * 0.3, 0, 0, 6.2832);
            ctx.fill();
        }
        ctx.restore();
    }
}

// El aura que delata un elixir: un halo que late, el anillo que se abre y se
// desvanece -el recurso de siempre para señalar un objeto en escena- y unas
// motas que le dan vueltas en órbita achatada, como si flotase.
function auraDeElixir(px, py, fase) {
    const pulso = 0.72 + Math.sin(J.tiempo * 3.4 + fase) * 0.28;
    const r = TILE * 0.95 * (0.88 + pulso * 0.2);

    const halo = ctx.createRadialGradient(px, py, r * 0.12, px, py, r);
    halo.addColorStop(0, `rgba(255, 156, 186, ${0.45 * pulso})`);
    halo.addColorStop(0.5, `rgba(224, 79, 122, ${0.22 * pulso})`);
    halo.addColorStop(1, 'rgba(224, 79, 122, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill();

    const k = ((J.tiempo * 0.6 + fase) % 1);          // el anillo, una vez por vuelta
    ctx.strokeStyle = `rgba(255, 205, 228, ${0.55 * (1 - k)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(px, py, TILE * 0.3 + k * TILE * 0.62,
                (TILE * 0.3 + k * TILE * 0.62) * 0.55, 0, 0, 6.2832);
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
        const a = J.tiempo * 1.7 + fase + i * 2.0944;
        const mx = px + Math.cos(a) * TILE * 0.46;
        const my = py + Math.sin(a) * TILE * 0.2 - 3;
        ctx.fillStyle = `rgba(255, 226, 240, ${0.35 + Math.sin(a) * 0.35})`;
        ctx.beginPath(); ctx.arc(mx, my, 2.2, 0, 6.2832); ctx.fill();
    }
}

// talla: lo que se agranda esta figura sobre la medida de la casa. Todas
// valían 1 mientras todas eran del mismo tamaño; el ciempiés no lo es, y su
// lámina llena el cuadro igual que las demás -más no cabe-, así que lo único
// que puede hacerlo mayor en pantalla es dibujarlo mayor.
function dibujarSprite(sprite, px, py, angulo, talla = 1) {
    const s = SPR * ESCALA_SPR * talla;
    ctx.save();
    ctx.translate(px, py);
    if (angulo) ctx.rotate(angulo);
    ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
    ctx.restore();
}

// ============================================================
//  Los cercos, cuando se piden
// ============================================================
// Los enciende y los apaga la consola, con «hitbox» y «unhitbox», y se pintan
// los últimos de todo: por encima de la oscuridad y de las luces, que un cerco
// que se apaga con la penumbra no sirve para lo que se pide.
//
// Lo que de verdad choca es un círculo -el juego mide siempre con hypot, nunca
// por esquinas-, pero se pide un cuadrado y un cuadrado se pinta: es su caja,
// y el lado son dos radios. Dentro va además el círculo en fino, para que no
// se lea que las esquinas también golpean, que es justo lo que uno concluiría
// mirando solo el cuadrado.
let verCercos = false;

function mostrarCercos(si) { verCercos = !!si; return verCercos; }

// El cerco se pinta tumbado a lo que mira el bicho: la caja mide su largo por
// su ancho, y dentro va la cápsula -el palo con el radio alrededor-, que es la
// forma con la que de verdad se mide. Quien no es largo tiene el palo a cero y
// le sale el cuadrado con su círculo de siempre.
function dibujarCerco(px, py, r, largo, mira, color) {
    const R = r * TILE;
    const m = R * ((largo || 1) - 1);        // medio palo, en píxeles
    ctx.save();
    ctx.translate(px, py);
    if (mira) ctx.rotate(mira);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = color;
    ctx.strokeRect(-m - R, -R, (m + R) * 2, R * 2);

    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(m, 0, R, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-m, R);
    ctx.arc(-m, 0, R, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

// el héroe el último, que es el que se mira: así ningún enemigo encima le tapa
// el suyo cuando están pegados
function dibujarCercos(j) {
    if (!verCercos) return;
    for (const e of J.enemigos)
        dibujarCerco(aPantallaX(e.x), aPantallaY(e.y), e.r, e.largo, e.mira, '#ff3b30');
    dibujarCerco(aPantallaX(j.x), aPantallaY(j.y), j.r, 1, 0, '#00e5ff');
}

function sombraElipse(px, py, rx, ry, alfa) {
    ctx.fillStyle = `rgba(12, 18, 45, ${alfa})`;
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, 0, 0, 6.2832);
    ctx.fill();
}

function sombra(px, py, r) {
    sombraElipse(px, py + r * TILE * 0.55, r * TILE * 1.05, r * TILE * 0.5, 0.38);
}

function dibujarHeroe(j) {
    const px = aPantallaX(j.x), py = aPantallaY(j.y);
    sombra(px, py, j.r);

    // la katana acompaña al golpe: sale por delante y vuelve
    const prog = j.golpe > 0 ? 1 - j.golpe / 0.18 : 0;
    const barrido = j.golpe > 0 ? (prog - 0.5) * j.arco * 2 : Math.sin(J.tiempo * 2) * 0.06;
    const s = SPR * ESCALA_SPR;
    // los apartes de la hoja y el escudo van en partes del propio muñeco, no
    // en píxeles sueltos: si la figura crece, crecen con ella
    const empuje = j.golpe > 0 ? Math.sin(prog * Math.PI) * s * 0.138 : 0;

    if (j.dash > 0) estelaDeImpulso(px, py, j);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(j.mira);

    if (j.golpe > 0) {                                  // estela del tajo, en dos capas
        const arco = (radio, alfa, ancho) => {
            ctx.fillStyle = `rgba(235, 245, 255, ${alfa})`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radio, barrido - ancho, barrido + ancho);
            ctx.closePath();
            ctx.fill();
        };
        arco(j.alcance * TILE, 0.3 * (1 - prog), 0.55);
        arco(j.alcance * TILE * 0.92, 0.5 * (1 - prog), 0.22);
    }

    if (j.cubriendo) {                                  // el arco que para los golpes
        ctx.strokeStyle = `rgba(150, 210, 255, 0.5)`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, TILE * 0.78, -ARCO_GUARDIA, ARCO_GUARDIA);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, TILE * 0.86, -ARCO_GUARDIA * 0.9, ARCO_GUARDIA * 0.9);
        ctx.stroke();
    }

    if (!j.cubriendo) {                                 // cubierto, la hoja baja
        ctx.save();
        ctx.rotate(barrido);
        ctx.translate(empuje, 0);
        ctx.drawImage(sprites[j.armaId] || sprites.katana, -s / 2 + s * 0.123, -s / 2 + s * 0.185, s, s);
        ctx.restore();
    }

    // El bote de antes no hace falta: ahora el paso se ve en las piernas, y
    // el cuerpo lo acompaña desde dentro de la propia figura.
    ctx.globalAlpha = J.muerto ? 0.35 : (j.invulnerable > 0 ? 0.55 : 1);
    pintarHeroe(j, barrido, empuje);

    // el escudo va en el brazo contrario a la hoja; al cubrirse se alza de frente
    ctx.translate(j.cubriendo ? s * 0.231 : s * 0.046, j.cubriendo ? 0 : -s * 0.169);
    ctx.drawImage(sprites.escudo, -s / 2, -s / 2, s, s);

    ctx.restore();
    ctx.globalAlpha = 1;
}

// Rastro de siluetas detrás del héroe mientras dura el impulso
function estelaDeImpulso(px, py, j) {
    const k = j.dash / DURACION_DASH;
    const s = SPR * ESCALA_SPR;
    for (let i = 1; i <= 3; i++) {
        ctx.save();
        ctx.globalAlpha = 0.22 * k * (1 - i / 4);
        ctx.translate(px - Math.cos(j.mira) * i * s * 0.138, py - Math.sin(j.mira) * i * s * 0.138);
        ctx.rotate(j.mira);
        // con la hoja en reposo: lo que se deja atrás es el cuerpo, no el tajo
        pintarHeroe(j, 0, 0);
        ctx.restore();
    }
    // líneas de velocidad, marca de la casa en la animación japonesa
    ctx.save();
    ctx.globalAlpha = 0.3 * k;
    ctx.strokeStyle = '#dff0ff';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
        const desv = (i - 2) * 5;
        const a = j.mira + Math.PI;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * 14 - Math.sin(a) * desv, py + Math.sin(a) * 14 + Math.cos(a) * desv);
        ctx.lineTo(px + Math.cos(a) * (34 + i * 5) - Math.sin(a) * desv,
                   py + Math.sin(a) * (34 + i * 5) + Math.cos(a) * desv);
        ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
}

function barraEnemigo(e, px, py) {
    if (e.hp >= e.hpMax) return;
    const w = TILE * 0.82, x = px - w / 2, y = py - e.r * TILE - 13;
    ctx.fillStyle = P.tinta;
    ctx.fillRect(x - 2, y - 2, w + 4, 7);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = '#ff5c6e';
    ctx.fillRect(x, y, w * (e.hp / e.hpMax), 3);
}

// La esquirla del umbral: un cristal de jade que gira y crece de golpe al
// aparecer, con su resplandor y un destello en cruz encima
function dibujarEsquirla(px, py, f, k) {
    const brote = Math.min(1, f.t / 0.16);              // el estirón inicial
    const s = (12 + 4 * Math.sin(f.t * 5)) * brote;
    const giro = f.giro + f.t * 1.6;

    ctx.save();
    ctx.translate(px, py);

    ctx.globalAlpha = 0.30 * k;
    ctx.fillStyle = P.papel;
    ctx.beginPath(); ctx.arc(0, 0, s * 2.1, 0, 6.2832); ctx.fill();

    ctx.globalAlpha = k;
    ctx.rotate(giro);
    ctx.strokeStyle = P.tinta; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.fillStyle = f.cara || '#2f7a76';
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.72, -s * 0.28);
    ctx.lineTo(s * 0.30, s);
    ctx.lineTo(-s * 0.62, s * 0.42);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // la cara iluminada, plana como en las láminas
    ctx.fillStyle = f.luz || '#7fd6c4';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.82);
    ctx.lineTo(s * 0.34, -s * 0.06);
    ctx.lineTo(-s * 0.30, s * 0.34);
    ctx.closePath(); ctx.fill();

    // destello en cruz, más vivo al principio
    ctx.rotate(-giro);
    const d = s * 2.4 * (1 - f.t / f.vida);
    ctx.globalAlpha = k * k;
    ctx.strokeStyle = P.papelLuz; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-d, 0); ctx.lineTo(d, 0);
    ctx.moveTo(0, -d); ctx.lineTo(0, d);
    ctx.stroke();
    ctx.restore();
}

// ============================================================
//  El tañido del orbe: uno de los mp3 de musica/orbe, al azar.
//
//  La lista va escrita a mano y no leída de la carpeta porque no hay
//  forma de que el navegador la lea: desde file:// no se puede pedir
//  el índice de un directorio, y fetch está cerrado por origen. Para
//  añadir un tañido, se deja el mp3 en musica/orbe y se apunta aquí
//  su nombre; nada más.
//
//  Y la escalerilla: mientras no se pare de recoger, cada orbe suena
//  un semitono por encima del anterior y con un pelo más de brío, así
//  que llevarse un puñado entero se siente como algo que sube y no
//  como doce veces lo mismo. En un archivo eso se consigue acelerando
//  la reproducción, que es lo mismo que subirlo de tono -como la cinta
//  corrida-, y por eso hay que apagar preservesPitch: viene puesto de
//  serie justo para impedirlo.
// ============================================================
const ORBE_CARPETA = '../musica/orbe/';   // relativo a html/game.html, que es quien carga esto
const ORBE_SONIDOS = ['orbe 1.mp3', 'orbe 2.mp3', 'orbe 3.mp3'];
const ORBE_COPIAS = 4;                    // de cada archivo, para que se solapen

const ORBE_ESCALON = 1.0595;     // lo que sube cada peldaño de la tanda: un semitono
const ORBE_TANDA_TOPE = 12;      // hasta una octava; de ahí para arriba chilla
const ORBE_TANDA_CORTA = 0.65;   // sin recoger nada durante esto, la tanda se cierra
const ORBE_BRIO = 0.18;          // lo que gana de volumen de un extremo a otro

// Cada archivo con sus copias. Un <audio> solo suena una vez a la vez y
// los orbes llegan a puñados, así que con uno de cada el segundo cortaría
// al primero; se van turnando las copias y ninguno pisa al anterior.
let orbeVoces = null;
let tanidoAnterior = -1;         // qué archivo sonó el último, para no repetirlo
let orbesSeguidos = 0;           // por qué peldaño va la tanda
let instanteAnterior = -9;       // cuándo cayó el último orbe, en segundos

function prepararTanidos() {
    orbeVoces = ORBE_SONIDOS.map(nombre => {
        const copias = [];
        for (let i = 0; i < ORBE_COPIAS; i++) {
            // encodeURI porque los nombres llevan espacios
            const a = new Audio(encodeURI(ORBE_CARPETA + nombre));
            a.preload = 'auto';
            // que acelerar suba el tono, en vez de solo correr más deprisa
            a.preservesPitch = false;
            if ('mozPreservesPitch' in a) a.mozPreservesPitch = false;
            if ('webkitPreservesPitch' in a) a.webkitPreservesPitch = false;
            copias.push(a);
        }
        return { copias, turno: 0 };
    });
}

// se preparan al cargar y no al primer orbe: montarlas en el momento de
// sonar deja mudo justo al primero, que es el que se oye con la senda en
// silencio y el que peor disimula la falta
prepararTanidos();

function sonarOrbe() {
    const alto = (typeof Ajustes !== 'undefined') ? Ajustes.volumen('efectos') : 0.5;
    if (alto <= 0) return;
    if (!orbeVoces) prepararTanidos();
    if (!orbeVoces.length) return;

    // ¿seguimos en la misma tanda o esta empieza de cero?
    const ahora = performance.now() / 1000;
    orbesSeguidos = (ahora - instanteAnterior > ORBE_TANDA_CORTA)
                  ? 0 : Math.min(ORBE_TANDA_TOPE, orbesSeguidos + 1);
    instanteAnterior = ahora;
    const subida = orbesSeguidos / ORBE_TANDA_TOPE;   // 0 al empezar, 1 en lo alto

    // al azar, pero nunca el mismo dos veces seguidas: la repetición se oye
    // más que el propio tañido
    let cual = Math.floor(Math.random() * orbeVoces.length);
    if (orbeVoces.length > 1 && cual === tanidoAnterior)
        cual = (cual + 1 + Math.floor(Math.random() * (orbeVoces.length - 1))) % orbeVoces.length;
    tanidoAnterior = cual;

    const voz = orbeVoces[cual];
    const a = voz.copias[voz.turno];
    voz.turno = (voz.turno + 1) % voz.copias.length;

    // el peldaño de la tanda: más agudo y un punto más fuerte cuanto más
    // arriba. El volumen se pone aquí y no en Ajustes.aplicarValores porque
    // estas cajas no cuelgan del documento y su querySelectorAll no las ve;
    // leerlo en cada tañido tiene además su ventaja, y es que la regla de
    // Efectos se nota según se arrastra, sin esperar a la siguiente senda.
    a.playbackRate = Math.pow(ORBE_ESCALON, orbesSeguidos);
    a.volume = Math.min(1, alto * (1 + ORBE_BRIO * subida));
    try { a.currentTime = 0; } catch (e) { /* aún no ha cargado: sonará desde el principio igual */ }

    // el navegador se niega a sonar hasta que el jugador toca algo, y al
    // entrar a la senda ya ha tocado; si aun así se niega, no es cosa que
    // haya que contarle a nadie
    const suena = a.play();
    if (suena && suena.catch) suena.catch(() => { /* nada */ });
}

// ============================================================
//  Los otros sonidos de la senda: el sello de la puerta al deshacerse,
//  la puerta al cruzarla y el vidrio de la botella al saltar en pedazos. Van por el mismo camino que los tañidos del
//  orbe -lista escrita a mano, porque desde file:// no hay forma de
//  leer una carpeta- pero sin escalerilla: estos no llegan a puñados
//  ni suben de tono, suenan sueltos y se acabó.
//
//  Para añadir variantes se deja el mp3 en su carpeta y se apunta el
//  nombre en la lista; si hay varios, cada vez sale uno al azar sin
//  repetir el anterior. Con las listas vacías, o con los archivos sin
//  poner, el juego sigue igual y calla: no se rompe nada por faltar
//  un sonido.
// ============================================================
// la puerta suena dos veces y por motivos distintos: una al deshacerse el
// sello, que es un aviso -ya puedes irte-, y otra al cruzarla de verdad
const PUERTA_CARPETA = '../musica/puerta/';
const ABRIR_SONIDOS = ['abrir_puerta.mp3'];
const CRUZAR_SONIDOS = ['cruzar_puerta.mp3'];

const CRISTAL_CARPETA = '../musica/cristal/';
const CRISTAL_SONIDOS = ['cristal.mp3'];

const VOZ_COPIAS = 2;   // menos que los orbes: estos rara vez se solapan

// Un banco de voces: cada archivo con sus copias, para que dos seguidos
// no se corten el uno al otro, y la memoria de cuál sonó el último.
function nuevoBanco(carpeta, nombres, cuantasCopias = VOZ_COPIAS) {
    return {
        voces: nombres.map(nombre => {
            const copias = [];
            for (let i = 0; i < cuantasCopias; i++) {
                const a = new Audio(encodeURI(carpeta + nombre));  // encodeURI: los nombres pueden llevar espacios
                a.preload = 'auto';
                copias.push(a);
            }
            return { copias, turno: 0 };
        }),
        anterior: -1
    };
}

// se montan al cargar por lo mismo que los tañidos: hacerlo en el momento
// de sonar deja mudo justo al primero
const bancoAbrir = nuevoBanco(PUERTA_CARPETA, ABRIR_SONIDOS);
const bancoCruzar = nuevoBanco(PUERTA_CARPETA, CRUZAR_SONIDOS);
const bancoCristal = nuevoBanco(CRISTAL_CARPETA, CRISTAL_SONIDOS);

function sonarBanco(banco, canal = 'efectos') {
    if (!banco || !banco.voces.length) return;
    // el volumen se lee en cada golpe y no se guarda: así la regla se nota
    // según se arrastra, y estas cajas no cuelgan del documento, de modo que
    // Ajustes.aplicarValores no las alcanza
    const alto = (typeof Ajustes !== 'undefined') ? Ajustes.volumen(canal) : 0.5;
    if (alto <= 0) return;

    let cual = Math.floor(Math.random() * banco.voces.length);
    if (banco.voces.length > 1 && cual === banco.anterior)
        cual = (cual + 1 + Math.floor(Math.random() * (banco.voces.length - 1))) % banco.voces.length;
    banco.anterior = cual;

    const voz = banco.voces[cual];
    const a = voz.copias[voz.turno];
    voz.turno = (voz.turno + 1) % voz.copias.length;

    a.volume = Math.min(1, alto);
    try { a.currentTime = 0; } catch (e) { /* aún no ha cargado: sonará desde el principio igual */ }
    const suena = a.play();
    if (suena && suena.catch) suena.catch(() => { /* falta el archivo o el navegador se niega: se calla y ya */ });
}

function sonarAbrirPuerta() { sonarBanco(bancoAbrir); }
function sonarCruzarPuerta() { sonarBanco(bancoCruzar); }
function sonarCristal() { sonarBanco(bancoCristal); }

// ------------------------------------------------------------
//  El acero al cortar, uno por arma
//
//  Cada arma tiene su voz: no suena igual una hoja corta que un asta
//  larga ni que una barra de hierro. La lista se escribe a mano por lo
//  de siempre -desde file:// no hay forma de leer una carpeta-, y basta
//  con dejar el mp3 en musica/ataque/ y apuntarlo aquí.
//
//  Si de un arma se ponen varios nombres, cada tajo saca uno al azar sin
//  repetir el anterior, que es lo que evita que golpear sin parar suene
//  a metrónomo. Y con la lista vacía o el archivo sin poner, esa arma
//  simplemente corta en silencio: no se rompe nada por faltar un sonido.
//
//  Van por el canal 'jugador' y no por 'efectos' porque suenan en cada
//  golpe, que es muchas veces por senda: quien lo encuentre machacón lo
//  baja sin quedarse sin orbes, sin vidrios y sin puertas.
// ------------------------------------------------------------
const ATAQUE_CARPETA = '../musica/ataque/';
const ATAQUE_SONIDOS = {
    tanto: ['tanto.mp3'],
    katana: ['katana.mp3'],
    yari: ['yari.mp3'],
    tetsubo: ['tetsubo.mp3'],
    nodachi: ['nodachi.mp3'],
    kusarigama: ['kusarigama.mp3']
};

// más copias que los otros bancos: el tantō y el kusarigama pegan tan
// seguido que con dos el golpe nuevo cortaría al anterior a media hoja
const ATAQUE_COPIAS = 4;

const bancosAtaque = {};
for (const id in ATAQUE_SONIDOS) {
    bancosAtaque[id] = nuevoBanco(ATAQUE_CARPETA, ATAQUE_SONIDOS[id], ATAQUE_COPIAS);
}

function sonarAtaque(id) {
    sonarBanco(bancosAtaque[id], 'jugador');
}

// ------------------------------------------------------------
//  Beber del charco no es un golpe, es un rato: mientras se está
//  encima suena en bucle y calla al salir. Por eso no va por el banco
//  de arriba, que dispara y se olvida; aquí hace falta una sola voz a
//  la que se le pueda decir cuándo parar.
//
//  Se le pide sonar en cada fotograma que cura, así que lo primero es
//  mirar si ya sonaba: volver a llamar a play() sobre algo que ya está
//  sonando no lo reinicia, pero devuelve promesas que nadie recoge.
// ------------------------------------------------------------
const CURAR_SONIDO = '../musica/cristal/curar.mp3';
let vozCurar = null;
let curando = false;

function sonarCurando(activo) {
    const alto = (typeof Ajustes !== 'undefined') ? Ajustes.volumen('efectos') : 0.5;

    if (!activo || alto <= 0) {
        if (curando && vozCurar) { vozCurar.pause(); vozCurar.currentTime = 0; }
        curando = false;
        return;
    }

    if (!vozCurar) {
        vozCurar = new Audio(encodeURI(CURAR_SONIDO));
        vozCurar.loop = true;      // el charco se bebe despacio: lo corto se repite
        vozCurar.preload = 'auto';
    }
    vozCurar.volume = Math.min(1, alto);   // por si se mueve la regla mientras dura
    if (curando) return;

    curando = true;
    try { vozCurar.currentTime = 0; } catch (e) { /* aún no ha cargado: da igual */ }
    const suena = vozCurar.play();
    if (suena && suena.catch) suena.catch(() => { curando = false; });
}

// ------------------------------------------------------------
//  El resuello: cuando el aliento baja del umbral de la esquiva, el
//  héroe jadea hasta reponerse. Va en bucle y con apagado, como beber,
//  y no por el banco de golpes, que dispara y se olvida.
//
//  Arranca al quedarse sin aliento para esquivar, antes de que la barra
//  llegue a apagarse -que eso pasa más abajo, cuando no da ni para un
//  tajo-. Son dos avisos escalonados a propósito: primero el oído dice
//  que ya no puedes salir de un apuro, y después el ojo, que estás seco.
// ------------------------------------------------------------
const AGOTAMIENTO_SONIDO = '../musica/jugador/agotamiento.mp3';

// El archivo viene bajo de suyo, así que se le da brío aparte del resto del
// canal: la regla de Jugador sigue mandando, pero este sonido sale más alto
// que sus vecinos. Ojo con subirlo mucho, que hay techo -un <audio> no pasa
// de 1- y cuanto mayor sea el brío antes se llega a ese tope; a partir de
// ahí la regla deja de notarse porque ya no queda a dónde subir.
const AGOTAMIENTO_BRIO = 2.4;

let vozAgotado = null;
let agotado = false;

function sonarAgotado(activo) {
    const alto = (typeof Ajustes !== 'undefined') ? Ajustes.volumen('jugador') : 0.5;

    if (!activo || alto <= 0) {
        if (agotado && vozAgotado) { vozAgotado.pause(); vozAgotado.currentTime = 0; }
        agotado = false;
        return;
    }

    if (!vozAgotado) {
        vozAgotado = new Audio(encodeURI(AGOTAMIENTO_SONIDO));
        vozAgotado.loop = true;    // el resuello dura lo que tarde en reponerse
        vozAgotado.preload = 'auto';
    }
    // se recalcula en cada fotograma por si se mueve la regla mientras dura
    vozAgotado.volume = Math.min(1, alto * AGOTAMIENTO_BRIO);
    if (agotado) return;

    agotado = true;
    try { vozAgotado.currentTime = 0; } catch (e) { /* aún no ha cargado: da igual */ }
    const suena = vozAgotado.play();
    if (suena && suena.catch) suena.catch(() => { agotado = false; });
}

// ============================================================
//  Los orbes azules en vuelo: una esfera con su halo y una estela que
//  se estira en la dirección en que va. Cuanto más corre -y corre al
//  volverse hacia el héroe-, más larga la cola, que es lo que hace que
//  el tirón se vea además de notarse.
// ============================================================
function dibujarOrbes() {
    for (const o of J.orbesSueltos) {
        const px = aPantallaX(o.x), py = aPantallaY(o.y);
        const v = Math.hypot(o.vx, o.vy);
        // late despacio mientras flota; al venir disparado se aquieta
        const r = TILE * 0.17 * (1 + Math.sin(J.tiempo * 9 + o.fase) * 0.09);

        // la cola, hacia atrás: unos cuantos fantasmas cada vez más tenues
        const cola = Math.min(1, v / ORBE_TOPE);
        if (cola > 0.1) {
            const ux = -o.vx / (v || 1), uy = -o.vy / (v || 1);
            for (let i = 1; i <= 4; i++) {
                const k = i / 4;
                ctx.globalAlpha = 0.4 * cola * (1 - k);
                ctx.fillStyle = ORBE_LUZ;
                ctx.beginPath();
                ctx.arc(px + ux * i * 7 * cola, py + uy * i * 7 * cola, r * (1 - k * 0.7), 0, 6.2832);
                ctx.fill();
            }
        }

        // el halo, que es lo que lo hace luz y no canica
        ctx.globalAlpha = 1;
        const halo = ctx.createRadialGradient(px, py, 0, px, py, r * 3.2);
        halo.addColorStop(0, 'rgba(168, 196, 255, 0.55)');
        halo.addColorStop(1, 'rgba(107, 156, 242, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(px, py, r * 3.2, 0, 6.2832); ctx.fill();

        // y la esfera: contorno de tinta, cuerpo y corazón encendido, los
        // mismos tres planos que el resto de las figuras
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 2.4;
        ctx.fillStyle = ORBE_CARA;
        ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ORBE_LUZ;
        ctx.beginPath(); ctx.arc(px, py + r * 0.06, r * 0.6, 0, 6.2832); ctx.fill();
        ctx.fillStyle = ORBE_NUCLEO;
        ctx.beginPath(); ctx.arc(px - r * 0.3, py - r * 0.32, r * 0.26, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// el anillo que se abre al metérselo dentro: dura un suspiro y es lo que
// remata el sonido
function dibujarDestelloOrbe(px, py, k) {
    const abre = 1 - k;
    ctx.globalAlpha = k * 0.9;
    ctx.strokeStyle = ORBE_NUCLEO;
    ctx.lineWidth = 3.5 * k + 0.6;
    ctx.beginPath();
    ctx.arc(px, py, TILE * (0.12 + abre * 0.42), 0, 6.2832);
    ctx.stroke();
}

function dibujarEfectos() {
    for (const f of J.efectos) {
        const k = 1 - f.t / f.vida;
        const px = aPantallaX(f.x), py = aPantallaY(f.y);
        if (f.tipo === 'chispa') {
            ctx.globalAlpha = k;
            ctx.fillStyle = f.color;
            ctx.beginPath(); ctx.arc(px, py, 2.8 * k + 0.9, 0, 6.2832); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(px, py, 1.2 * k, 0, 6.2832); ctx.fill();
        } else if (f.tipo === 'destelloOrbe') {
            dibujarDestelloOrbe(px, py, k);
        } else if (f.tipo === 'esquirla') {
            dibujarEsquirla(px, py, f, k);
        } else {
            ctx.globalAlpha = k;
            ctx.fillStyle = f.color;
            ctx.font = 'bold 17px "Trebuchet MS", "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = P.tinta; ctx.lineWidth = 4;
            ctx.strokeText(f.texto, px, py);
            ctx.fillText(f.texto, px, py);
        }
    }
    ctx.globalAlpha = 1;
}

// ============================================================
//  Sombras proyectadas: lo que tapa un muro, no se ve
// ============================================================
// Recorre la rejilla casilla a casilla en la dirección dada (el mismo paseo
// que usan los motores de raycasting) y devuelve a qué distancia topa con
// muro. Barato: avanza de borde en borde, no muestreando el trayecto.
function distanciaHastaRoca(ox, oy, dx, dy, tope, mordida = MORDIDA_PARED) {
    let cx = Math.floor(ox), cy = Math.floor(oy);
    const pasoX = dx > 0 ? 1 : -1, pasoY = dy > 0 ? 1 : -1;
    const saltoX = Math.abs(1 / (dx || 1e-9)), saltoY = Math.abs(1 / (dy || 1e-9));
    let bordeX = (dx > 0 ? cx + 1 - ox : ox - cx) * saltoX;
    let bordeY = (dy > 0 ? cy + 1 - oy : oy - cy) * saltoY;

    let t = 0;
    while (t < tope) {
        if (bordeX < bordeY) { t = bordeX; bordeX += saltoX; cx += pasoX; }
        else { t = bordeY; bordeY += saltoY; cy += pasoY; }
        // el rayo entra un poco en el muro: así su cara queda iluminada en vez
        // de quedarse en el filo de la sombra
        if (esMuro(cx, cy)) return Math.min(t + mordida, tope);
    }
    return tope;
}

// ¿Hay línea franca entre dos puntos? Con esto un farolillo alumbra solo si
// se le ve: su claro no se cuela al otro lado del muro.
// La mordida por omisión es indulgente, que es lo que quieren los farolillos
// arrimados al muro; para decidir si se ve a alguien se pide mordida 0, o el
// rayo se comería la pared que lo tapa.
function hayVision(ox, oy, tx, ty, mordida = MORDIDA_PARED) {
    const dx = tx - ox, dy = ty - oy;
    const d = Math.hypot(dx, dy);
    if (d < 0.01) return true;
    return distanciaHastaRoca(ox, oy, dx / d, dy / d, d, mordida) >= d - 0.05;
}

// Cuánto se ve a un enemigo: nada si media un muro, y menguando en las dos
// últimas casillas de alcance. El valor se suaviza por fotograma para que al
// asomar por una esquina aparezca con un fundido, no de golpe.
function visibilidadEnemigo(e, j) {
    const dx = e.x - j.x, dy = e.y - j.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    let meta = 0;

    if (d <= ALCANCE_LUZ) {
        // se tantean tres puntos de su cuerpo: así asoma en cuanto se le ve un
        // costado, en vez de esperar a que el centro salga del muro
        const ex = (-dy / d) * e.r, ey = (dx / d) * e.r;
        const visto = hayVision(j.x, j.y, e.x, e.y, 0)
    || hayVision(j.x, j.y, e.x + ex, e.y + ey, 0)
    || hayVision(j.x, j.y, e.x - ex, e.y - ey, 0);
        if (visto) meta = Math.min(1, (ALCANCE_LUZ - d) / 2);
    }

    if (e.vis === undefined) e.vis = meta;
    e.vis += (meta - e.vis) * Math.min(1, dtVista * 12);
    return e.vis;
}

// Silueta de todo lo que el héroe alcanza a ver desde donde está
function siluetaVisible(ox, oy) {
    const puntos = [];
    for (let i = 0; i < RAYOS_LUZ; i++) {
        const a = (i / RAYOS_LUZ) * Math.PI * 2;
        const dx = Math.cos(a), dy = Math.sin(a);
        const d = distanciaHastaRoca(ox, oy, dx, dy, ALCANCE_LUZ);
        puntos.push(aPantallaX(ox + dx * d), aPantallaY(oy + dy * d));
    }
    return puntos;
}

// El manto de noche se compone aparte y luego se posa encima de la escena.
// Hacerlo directamente sobre el lienzo principal no vale: al recortar la
// silueta con destination-out se borraría también el recinto que hay debajo.
let lienzoSombra = null, sctx = null;

function sombrasDeGeometria(j) {
    if (!lienzoSombra) {
        lienzoSombra = lienzoOculto(AN + MARGEN_SOMBRA * 2, AL + MARGEN_SOMBRA * 2);
        sctx = lienzoSombra.getContext('2d');
        // se trabaja en coordenadas de pantalla; el margen absorbe el temblor
        sctx.setTransform(1, 0, 0, 1, MARGEN_SOMBRA, MARGEN_SOMBRA);
    }
    const puntos = siluetaVisible(j.x, j.y);
    const px = aPantallaX(j.x), py = aPantallaY(j.y);
    const m = MARGEN_SOMBRA;

    // el manto se tiñe del velo de la comarca, y cala más o menos según lo
    // cerrada que sea: la cripta es casi negra y el santuario, casi de día
    const amb = aire();
    sctx.globalCompositeOperation = 'source-over';
    sctx.clearRect(-m, -m, AN + m * 2, AL + m * 2);
    sctx.fillStyle = `rgba(${amb.velo}, ${amb.oscuridad !== undefined ? amb.oscuridad : OSCURIDAD})`;
    sctx.fillRect(-m, -m, AN + m * 2, AL + m * 2);

    // destination-out abre el hueco según el alfa: el degradado solo sirve para
    // que el farol se apague en su último tramo y no corte en círculo
    sctx.globalCompositeOperation = 'destination-out';
    const r = ALCANCE_LUZ * TILE;
    const g = sctx.createRadialGradient(px, py, r * 0.55, px, py, r);
    g.addColorStop(0, 'rgba(0, 0, 0, 1)');
    g.addColorStop(0.78, 'rgba(0, 0, 0, 0.94)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = g;

    sctx.beginPath();
    sctx.moveTo(puntos[0], puntos[1]);
    for (let i = 2; i < puntos.length; i += 2) sctx.lineTo(puntos[i], puntos[i + 1]);
    sctx.closePath();
    sctx.fill();

    // los farolillos abren su propio claro, pero solo los que se ven: el claro
    // se va encendiendo al doblar la esquina en vez de aparecer de golpe
    for (const L of luces) {
        const lx = aPantallaX(L.x), ly = aPantallaY(L.y);
        L.enPantalla = !(lx < -L.r || ly < -L.r || lx > AN + L.r || ly > AL + L.r);
        if (!L.enPantalla) { L.mez = 0; continue; }

        const meta = hayVision(j.x, j.y, L.x, L.y) ? 1 : 0;
        L.mez += (meta - L.mez) * Math.min(1, dtVista * 5);
        if (L.mez < 0.02) continue;

        const titileo = 0.9 + Math.sin(J.tiempo * 5 + L.fase) * 0.1;
        const alcance = L.r * titileo;
        abrirClaro(sctx, lx, ly, alcance, L.fuerza * L.mez);
    }

    // los elixires se anuncian igual: su aura despeja la penumbra lo justo
    // para que se distingan de lejos y no se pasen de largo
    for (const o of J.objetos) {
        const lx = aPantallaX(o.x), ly = aPantallaY(o.y);
        const alcance = TILE * 2.6;
        o.enPantalla = !(lx < -alcance || ly < -alcance || lx > AN + alcance || ly > AL + alcance);
        if (!o.enPantalla) { o.mezLuz = 0; continue; }

        const meta = hayVision(j.x, j.y, o.x, o.y) ? 1 : 0;
        o.mezLuz = (o.mezLuz || 0) + (meta - (o.mezLuz || 0)) * Math.min(1, dtVista * 5);
        if (o.mezLuz < 0.02) continue;
        abrirClaro(sctx, lx, ly, alcance, 0.62 * o.mezLuz);
    }

    // lo derramado alumbra menos que la botella entera, pero alumbra: sin esto
    // un charco en un rincón oscuro no se encuentra ni sabiendo que está
    for (const c of J.charcos) {
        const k = c.secando > 0 ? 1 - Math.min(1, c.secando / CHARCO_SECADO) : 1;
        abrirClaro(sctx, aPantallaX(c.x), aPantallaY(c.y), TILE * 1.5, 0.4 * k);
    }

    ctx.drawImage(lienzoSombra, -m, -m);
}

// Un hueco redondo en el manto de noche, más abierto en el centro que en
// el filo: sirve lo mismo para un farolillo que para el aura de un elixir
function abrirClaro(g, lx, ly, radio, fuerza) {
    const cl = g.createRadialGradient(lx, ly, 2, lx, ly, radio);
    cl.addColorStop(0, `rgba(0, 0, 0, ${0.9 * fuerza})`);
    cl.addColorStop(0.5, `rgba(0, 0, 0, ${0.45 * fuerza})`);
    cl.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = cl;
    g.beginPath(); g.arc(lx, ly, radio, 0, 6.2832); g.fill();
}

// Halos: se suman a lo ya pintado, de modo que la luz se ve pasar por
// encima de la noche en vez de limitarse a destaparla
function pintarLuces(j) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const L of luces) {
        if (!L.enPantalla || L.mez < 0.02) continue;
        const lx = aPantallaX(L.x), ly = aPantallaY(L.y);
        const titileo = 0.88 + Math.sin(J.tiempo * 5.5 + L.fase) * 0.12;
        const [r, v, a] = L.color;
        const fuerza = L.fuerza * L.mez;
        const halo = ctx.createRadialGradient(lx, ly, 1, lx, ly, L.r * titileo);
        halo.addColorStop(0, `rgba(${r}, ${v}, ${a}, ${0.5 * fuerza})`);
        halo.addColorStop(0.35, `rgba(${r}, ${v}, ${a}, ${0.16 * fuerza})`);
        halo.addColorStop(1, `rgba(${r}, ${v}, ${a}, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(lx, ly, L.r * titileo, 0, 6.2832); ctx.fill();
    }

    // el aura del elixir también suma su color: así se ve rosada incluso
    // desde el otro extremo de la sala, por encima de la penumbra
    for (const o of J.objetos) {
        if (!o.enPantalla || !o.mezLuz || o.mezLuz < 0.02) continue;
        const lx = aPantallaX(o.x), ly = aPantallaY(o.y);
        const pulso = 0.72 + Math.sin(J.tiempo * 3.4 + o.giro) * 0.28;
        const alcance = TILE * 2.6;
        const halo = ctx.createRadialGradient(lx, ly, 1, lx, ly, alcance);
        halo.addColorStop(0, `rgba(255, 130, 175, ${0.34 * pulso * o.mezLuz})`);
        halo.addColorStop(0.4, `rgba(224, 79, 122, ${0.12 * pulso * o.mezLuz})`);
        halo.addColorStop(1, 'rgba(224, 79, 122, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(lx, ly, alcance, 0, 6.2832); ctx.fill();
    }

    for (const c of J.charcos) {
        const k = c.secando > 0 ? 1 - Math.min(1, c.secando / CHARCO_SECADO) : 1;
        const jugo = Math.max(0, c.queda / CHARCO_CURA);
        const lx = aPantallaX(c.x), ly = aPantallaY(c.y);
        const alcance = TILE * 1.5;
        const halo = ctx.createRadialGradient(lx, ly, 1, lx, ly, alcance);
        halo.addColorStop(0, `rgba(255, 130, 175, ${0.2 * k * (0.5 + jugo * 0.5)})`);
        halo.addColorStop(1, 'rgba(224, 79, 122, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(lx, ly, alcance, 0, 6.2832); ctx.fill();
    }

    // el propio héroe lleva luz: cálida de cerca, y azul mientras se cubre
    const px = aPantallaX(j.x), py = aPantallaY(j.y);
    const rH = TILE * 3.4;
    const propio = ctx.createRadialGradient(px, py, 1, px, py, rH);
    const tono = j.cubriendo ? '130, 190, 255' : '255, 205, 140';
    propio.addColorStop(0, `rgba(${tono}, 0.3)`);
    propio.addColorStop(1, `rgba(${tono}, 0)`);
    ctx.fillStyle = propio;
    ctx.beginPath(); ctx.arc(px, py, rH, 0, 6.2832); ctx.fill();

    // luciérnagas, puntos de luz que rondan el encuadre
    for (const l of luciernagas) {
        const brilloL = 0.35 + Math.sin(J.tiempo * 3 + l.fase) * 0.35;
        if (brilloL <= 0) continue;
        const gl = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 9);
        gl.addColorStop(0, `rgba(210, 255, 170, ${0.8 * brilloL})`);
        gl.addColorStop(1, 'rgba(210, 255, 170, 0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(l.x, l.y, 9, 0, 6.2832); ctx.fill();
    }

    ctx.restore();
}

// los iconos de los contadores son los mismos dibujos de los paneles
document.getElementById('jadeIcono').innerHTML =
    (typeof ESQUIRLA_SVG !== 'undefined') ? ESQUIRLA_SVG : '';
document.getElementById('orbesIcono').innerHTML =
    (typeof ORBE_SVG !== 'undefined') ? ORBE_SVG : '';

// saldos ya pintados, para saber cuándo hay que celebrar el cambio
let jadeMostrado = -1, orbesMostrado = -1;

// el contador solo se toca cuando cambia, y al subir da un brinco
function contador(caja, cifra, valor, mostrado) {
    if (valor === mostrado) return mostrado;
    document.getElementById(cifra).textContent = valor;
    if (valor > mostrado && mostrado >= 0) {
        const c = document.getElementById(caja);
        c.classList.remove('gana');
        void c.offsetWidth;                 // reinicia la animación en seco
        c.classList.add('gana');
    }
    return valor;
}

// La tablilla del centro. Al revés que los saldos, esta cuenta baja: el
// destello va cuando cae uno, no cuando se gana algo. Y cuando no queda
// ninguno deja de ser una cuenta y pasa a ser el aviso de que la puerta
// cede, que es lo que de verdad importa de este número.
let enemigosMostrado = -1;

function pintarEnemigos() {
    const quedan = J.enemigos.length;
    if (quedan === enemigosMostrado) return;
    const caja = document.getElementById('enemigos');
    const cifra = document.getElementById('enemigosCifra');

    if (quedan) {
        cifra.textContent = quedan;
        caja.querySelector('.rotulo').textContent =
            TR(quedan === 1 ? 'hud.enemigo1' : 'hud.enemigos');
    } else {
        cifra.textContent = '—';
        caja.querySelector('.rotulo').textContent = TR('hud.despejada');
    }
    caja.classList.toggle('limpia', !quedan);

    // el destello solo al bajar, y no al entrar en una senda nueva, que
    // sube de golpe y no es cosa de celebrar
    if (enemigosMostrado > 0 && quedan < enemigosMostrado) {
        caja.classList.remove('cae');
        void caja.offsetWidth;              // reinicia la animación en seco
        caja.classList.add('cae');
    }
    enemigosMostrado = quedan;
}

// si ya está escrita la cuenta de la caída de ahora
let caidaEscrita = false;
// lo último que se escribió en el rótulo de la senda, para no rehacerlo cada cuadro
let rotuloNivel = '';

// Lo que se quedó en el suelo de la senda por no llegar a la puerta. Se pone
// entre el rótulo y los botones, con los mismos iconos que el HUD.
function pintarCaida() {
    const caja = document.getElementById('muertePerdido');
    const { jade, orbes } = J.perdido;
    if (!jade && !orbes) { caja.hidden = true; return; }

    const iconoJade = (typeof ESQUIRLA_SVG !== 'undefined') ? ESQUIRLA_SVG : '';
    const iconoOrbe = (typeof ORBE_SVG !== 'undefined') ? ORBE_SVG : '';
    const cuentas = [];
    if (jade) cuentas.push(`<span class="jade">${jade}${iconoJade}</span>`);
    if (orbes) cuentas.push(`<span class="orbes">${orbes}${iconoOrbe}</span>`);

    caja.innerHTML =
        `<span class="rotulo">${TR('juego.perdiste')}</span>
         <span class="cuentas">${cuentas.join('')}</span>`;
    caja.hidden = false;
}

function pintarHud() {
    const p = J.jugador;
    // dos cajas y no una: así solo se reescribe la cifra que cambia, y el
    // rótulo «PV» y el tope se quedan con su propio trazo en la hoja de estilo
    document.getElementById('pvAhora').textContent = Math.ceil(p.hp);
    document.getElementById('pvTope').textContent = '/' + p.hpMax;
    document.getElementById('vida').style.width = Math.max(0, (p.hp / p.hpMax) * 100) + '%';

    // La barra de debajo era la espera del impulso; ahora es el aliento, que
    // dice más: la espera del dash se adivina igual, porque una esquiva se
    // lleva media barra de golpe.
    //
    // Dos avisos escalonados, y cada uno tiñe una pieza distinta de la barra:
    // 'esquiva' manda en el hueco de detrás -rojo al bajar de una esquiva- y
    // 'lista' en el relleno, que solo pierde el oro al quedarse seco. Van en
    // dos clases sueltas porque cada una la lee un trozo del estilo.
    const aliento = p.estaminaMax > 0 ? p.estamina / p.estaminaMax : 0;
    const barra = document.getElementById('dash');
    barra.style.width = Math.max(0, aliento * 100) + '%';
    const marcas = barra.parentElement.classList;
    marcas.toggle('lista', p.estamina >= COSTE_GOLPE);
    marcas.toggle('esquiva', p.estamina >= COSTE_DASH);

    jadeMostrado = contador('jade', 'jadeCifra', J.esquirlas, jadeMostrado);
    orbesMostrado = contador('orbes', 'orbesCifra', J.orbes, orbesMostrado);

    // El rótulo solo se reescribe cuando dice algo distinto. Lleva tres cosas:
    // el emblema de la comarca a la izquierda, en el hueco que dejaban las dos
    // líneas de texto, y a la derecha el nombre arriba en pequeño y la senda
    // debajo en grande. Todo lo de la comarca -dibujo, nombre y color- sale de
    // su ficha en biomas.js y de ningún otro sitio.
    const rotulo = `<span class="emblema" style="color:${tinteDelBioma()}">${emblemaDelBioma()}</span>`
                 + `<span class="letras">`
                 +   `<span class="comarca">${nombreDelBioma()}</span>`
                 +   `<span class="senda">Senda ${String(J.nivel).padStart(3, "0")}</span>`
                 + `</span>`;
    if (rotulo !== rotuloNivel) {
        rotuloNivel = rotulo;
        document.getElementById('estadoNivel').innerHTML = rotulo;
    }
    pintarEnemigos();
    document.getElementById('muerte').style.display = J.muerto ? 'flex' : 'none';
    // la cuenta de lo dejado atrás se escribe una sola vez, al caer, no en
    // cada cuadro que el velo pasa por delante
    if (J.muerto !== caidaEscrita) {
        caidaEscrita = J.muerto;
        // al caer se recoge todo lo que hubiera abierto: la caída manda
        if (J.muerto) { pintarCaida(); alternarMenu(false); }
    }

    const aviso = document.getElementById('aviso');
    const cerca = !J.muerto && cercaDePuerta();
    aviso.style.opacity = cerca ? 1 : 0;
    if (cerca) {
        const n = J.enemigos.length;
        aviso.textContent = puertaAbierta() ? TR('aviso.cruzar')
                          : !n ? TR('aviso.selloCede')
                          : n === 1 ? TR('aviso.sello1')
                          : TR('aviso.sello', n);
        aviso.classList.toggle('trabado', !puertaAbierta());
    }
}

// ============================================================
//  El plano de la senda
//
//  No hay niebla que levantar: el plano se ve entero desde el primer
//  paso, con la puerta, los elixires y todo lo que anda suelto marcado
//  siempre, esté o no a la vista. Lo que se pierde de misterio se gana
//  en decisión: se ve dónde está lo que queda y se elige por dónde ir,
//  que es lo que este juego le pide al jugador.
//
//  El trazo es el mismo del resto del marcador: laca de ciruela debajo,
//  los materiales de la comarca apagados contra ella, el filo del recinto
//  entintado en oro viejo -como el juego entinta sus bordes- y las
//  señales en rombo, que es la firma de la casa, en vez de en punto.
// ============================================================
const MINI = 4;                     // píxeles por casilla
const LACA_MINI = '#150b13';        // la laca sobre la que se dibuja todo
const ORO_MINI = '232, 180, 79';    // el oro viejo del marcador, para teñirlo a voluntad

// A cada adversario, el color con que se le reconoce en la senda: el pardo
// rosado de la rata y el rojo del ciempiés, aclarados lo justo para salir
// de la laca. La forma es la misma para todos -el rombo pequeño-, así que el
// color es lo único que los separa, y por eso tiene que ser el suyo. El de red
// es la brasa: un tipo nuevo sin ficha sigue leyéndose como lo que es, peligro.
const TINTA_ENEMIGO = { rata: '#c39a92', esqueleto: '#e2dccb', ciempies: '#d94b33',
                        otro: '#d94b33' };

const mini = document.getElementById('minimapa');
const mctx = mini.getContext('2d');

let terrenoMini = null;             // la senda entera, dibujada una sola vez por nivel

function prepararMinimapa() {
    mini.width = ANCHO * MINI;
    mini.height = ALTO * MINI;
    if (!terrenoMini) terrenoMini = lienzoOculto(mini.width, mini.height);
    volcarTerreno();
}

// La planta de la senda, de una tacada. Antes se iba destapando casilla a
// casilla según se andaba; ahora no hay nada que destapar, así que se pinta
// al entrar en el nivel y no se vuelve a tocar hasta el siguiente.
function volcarTerreno() {
    const g = terrenoMini.getContext('2d');
    const tinta = (BIOMA && BIOMA.minimapa) || { suelo: '#6f9a63', muro: '#1b2c4e' };

    g.clearRect(0, 0, mini.width, mini.height);
    g.fillStyle = LACA_MINI;
    g.fillRect(0, 0, mini.width, mini.height);

    // Los dos materiales son los de la comarca, pero apagados contra la laca:
    // el plano es marcador antes que estampa, y lo que tiene que resaltar son
    // las señales de encima, no la roca.
    for (let y = 0; y < ALTO; y++)
        for (let x = 0; x < ANCHO; x++) {
            const muro = J.mapa[y][x] === 1;
            g.globalAlpha = muro ? 0.42 : 0.72;
            g.fillStyle = muro ? tinta.muro : tinta.suelo;
            g.fillRect(x * MINI, y * MINI, MINI, MINI);
        }
    g.globalAlpha = 1;

    // El filo del recinto, entintado en oro tenue: es lo que hace legible la
    // planta de un vistazo -pasillos, salas y recodos- sin tener que subirle
    // el contraste a los materiales. El medio píxel es para que la línea caiga
    // entera dentro de una columna y no repartida entre dos.
    g.save();
    g.translate(0.5, 0.5);
    g.strokeStyle = 'rgba(' + ORO_MINI + ', 0.3)';
    g.lineWidth = 1;
    g.stroke(caminoDeBordes(MINI));
    g.restore();
}

// ============================================================
//  Las señales, todas del mismo juego de formas
// ============================================================

// El rombo del marcador: el mismo que flanquea los rótulos del hud y el «del»
// de la portada. Aquí es el cuerpo de casi todo lo que se señala.
function romboMini(x, y, r, relleno, filo) {
    const cx = x * MINI, cy = y * MINI;
    mctx.beginPath();
    mctx.moveTo(cx, cy - r); mctx.lineTo(cx + r, cy);
    mctx.lineTo(cx, cy + r); mctx.lineTo(cx - r, cy);
    mctx.closePath();
    mctx.fillStyle = relleno;
    mctx.fill();
    if (filo) { mctx.strokeStyle = filo; mctx.lineWidth = 1; mctx.stroke(); }
}

function puntoMini(x, y, color, r) {
    mctx.fillStyle = color;
    mctx.beginPath();
    mctx.arc(x * MINI, y * MINI, r, 0, 6.2832);
    mctx.fill();
}

// La puerta no se marca con un punto: se marca con el torii que es, en
// pequeño. Es lo único del plano que va a trazo y no a mancha, y por eso no se
// confunde con nada aunque el mapa esté lleno.
function toriiMini(x, y, color, brillo) {
    const a = 5, h = 5.6;                  // medio ancho del dintel y lo que levanta
    mctx.save();
    mctx.translate(x * MINI, y * MINI + h * 0.4);
    mctx.strokeStyle = color;
    mctx.lineWidth = 1.6;
    mctx.lineCap = 'round';
    if (brillo) { mctx.shadowColor = color; mctx.shadowBlur = brillo; }
    mctx.beginPath();
    mctx.moveTo(-a, -h);             mctx.lineTo(a, -h);                // el kasagi
    mctx.moveTo(-a * 0.7, -h * 0.6); mctx.lineTo(a * 0.7, -h * 0.6);    // el nuki
    mctx.moveTo(-a * 0.62, -h + 1);  mctx.lineTo(-a * 0.74, 0);         // las jambas, abiertas de pie
    mctx.moveTo(a * 0.62, -h + 1);   mctx.lineTo(a * 0.74, 0);
    mctx.stroke();
    mctx.restore();
}

// Lo que se está viendo en pantalla, marcado solo por las esquinas: un
// rectángulo entero le hacía sombra al filo dorado de las salas.
function encuadreMini() {
    const x0 = cam.x / TILE * MINI, y0 = cam.y / TILE * MINI;
    const x1 = x0 + AN / TILE * MINI, y1 = y0 + AL / TILE * MINI;
    const c = Math.min(7, (x1 - x0) / 3, (y1 - y0) / 3);

    mctx.strokeStyle = 'rgba(' + ORO_MINI + ', 0.5)';
    mctx.lineWidth = 1;
    mctx.beginPath();
    mctx.moveTo(x0, y0 + c); mctx.lineTo(x0, y0); mctx.lineTo(x0 + c, y0);
    mctx.moveTo(x1 - c, y0); mctx.lineTo(x1, y0); mctx.lineTo(x1, y0 + c);
    mctx.moveTo(x1, y1 - c); mctx.lineTo(x1, y1); mctx.lineTo(x1 - c, y1);
    mctx.moveTo(x0 + c, y1); mctx.lineTo(x0, y1); mctx.lineTo(x0, y1 - c);
    mctx.stroke();
}

// Sigue habiendo diferencia entre lo que se ve con los ojos y lo que solo
// consta en el plano; ya no es esconder o enseñar, sino un punto de brillo.
const aLaVista = e => Math.hypot(e.x - J.jugador.x, e.y - J.jugador.y) <= RADIO_VISION;

function pintarMinimapa() {
    const j = J.jugador;

    mctx.clearRect(0, 0, mini.width, mini.height);
    mctx.drawImage(terrenoMini, 0, 0);
    encuadreMini();

    // los farolillos, muy tenues: son sitio, no aviso, y con el plano entero a
    // la vista desde el primer paso taparían lo que sí hay que mirar
    for (const L of luces) puntoMini(L.x, L.y, 'rgba(' + ORO_MINI + ', 0.4)', 1.2);

    // el hierro del suelo: apagado mientras duerme, encendido cuando asoma
    for (const t of J.trampas)
        romboMini(t.x, t.y, 2.2,
                  alturaTrampa(t.fase) > 0.5 ? '#ff5a48' : 'rgba(122, 80, 96, 0.75)');

    // los elixires y lo que se derramó de ellos, en el rosa que tienen en la
    // senda; el aura late aquí igual que la botella late en el suelo
    for (const o of J.objetos) {
        const pulso = 0.72 + Math.sin(J.tiempo * 3.4 + o.giro) * 0.28;
        mctx.globalAlpha = 0.3 * pulso;
        puntoMini(o.x, o.y, P.elixirLuz, 4.5);
        mctx.globalAlpha = 1;
        romboMini(o.x, o.y, 2.6, P.elixir, 'rgba(255, 156, 186, 0.85)');
    }
    for (const c of J.charcos) {
        mctx.globalAlpha = c.secando > 0 ? 0.28 : 0.6;
        puntoMini(c.x, c.y, P.elixirLuz, 3.4);
        mctx.globalAlpha = 1;
    }

    // Todo lo que anda suelto, esté a la vista o no. Todos llevan el mismo
    // rombo, del mismo tamaño y con el mismo filo de tinta: lo que los
    // distingue es el color, y cada cual lleva el suyo -el de su traje en la
    // senda-, no un tamaño distinto que obligue a comparar unos con otros.
    for (const e of J.enemigos) {
        mctx.globalAlpha = aLaVista(e) ? 1 : 0.78;
        romboMini(e.x, e.y, 2.4, TINTA_ENEMIGO[e.tipo] || TINTA_ENEMIGO.otro,
                  'rgba(26, 15, 22, 0.8)');
        mctx.globalAlpha = 1;
    }

    // La puerta preside el plano: sellada arde en brasa y quieta; suelta, late
    // en oro, que es lo que el juego enciende cuando algo cede.
    const abierta = puertaAbierta();
    if (abierta) mctx.globalAlpha = 0.6 + Math.sin(J.tiempo * 2.5) * 0.4;
    toriiMini(J.puerta.x, J.puerta.y, abierta ? '#ffd784' : '#d94b33', abierta ? 9 : 0);
    mctx.globalAlpha = 1;

    // el héroe: un punto blanco cercado de negro. Es lo único blanco del plano,
    // así que se encuentra solo por mucho que se llene el mapa alrededor
    mctx.beginPath();
    mctx.arc(j.x * MINI, j.y * MINI, 3.2, 0, 6.2832);
    mctx.fillStyle = J.muerto ? '#8a6a6a' : '#ffffff';
    mctx.fill();
    mctx.strokeStyle = '#1a0f16';
    mctx.lineWidth = 1.4;
    mctx.stroke();
}

// ============================================================
//  Entrada
// ============================================================
const teclas = new Set();
const raton = { x: AN / 2, y: AL / 2, izq: false, der: false };
let dashPedido = false;          // el impulso se pide una vez por pulsación

// ---------- Menú de Esc ----------
// No detiene nada: el santuario sigue vivo detrás, así que abrirlo en mitad de
// una pelea sale caro. Por eso ocupa solo el centro y deja ver el resto.
const menuJuego = document.getElementById('menuJuego');

function alternarMenu(abrir) {
    menuJuego.hidden = abrir === undefined ? !menuJuego.hidden : !abrir;
    // los ajustes se piden aparte: el menú siempre se abre recogido
    ventanaAjustes(false);
    // el héroe no se queda corriendo ni cubriéndose por tener el menú delante
    teclas.clear();
    raton.izq = raton.der = false;
}

document.getElementById('mjCerrar').addEventListener('click', () => alternarMenu(false));

// ---------- La ventana de los ajustes ----------
// ajustes.html asomada encima de la partida en vez de una pantalla aparte:
// salir del santuario costaría la senda empezada. La página se carga la
// primera vez que se pide, y no antes.
const cajaAjustes = document.getElementById('ventanaAjustes');
const marcoAjustes = document.getElementById('marcoAjustes');

function ventanaAjustes(abrir) {
    if (abrir && !marcoAjustes.dataset.puesta) {
        // el ?marco=1 no es adorno: es como ajustes.html distingue esta
        // ventanita del marco del armazón, donde va entera y con música
        marcoAjustes.src = 'ajustes.html?marco=1';
        marcoAjustes.dataset.puesta = '1';
    }
    cajaAjustes.hidden = !abrir;
    if (!abrir) return;
    // el menú se aparta mientras dura la ventana y vuelve al cerrarla
    menuJuego.hidden = true;
    // el héroe no se queda corriendo ni cubriéndose por tener la ventana delante
    teclas.clear();
    raton.izq = raton.der = false;
}

document.getElementById('mjAjustes').addEventListener('click', () => ventanaAjustes(true));

// pinchar en la penumbra de alrededor también la cierra
cajaAjustes.addEventListener('mousedown', ev => {
    if (ev.target === cajaAjustes) alternarMenu(true);
});

// Lo que se toca dentro de la ventana llega por aquí: el marco puede no
// compartir almacén con la partida (según el navegador, y desde file:// casi
// nunca), así que sus cambios se anotan y se aplican de este lado también.
addEventListener('message', ev => {
    const aviso = ev.data;
    if (!aviso || aviso.tipo !== 'ajustes') return;
    if (aviso.cerrar) { alternarMenu(true); return; }
    // Se copian todos, no unos cuantos: lo que no venga en el aviso llega
    // como undefined y al guardarse pisa lo que hubiera, así que olvidar uno
    // no es que no se actualice -es que se le borra el suyo y vuelve al de
    // fábrica-. El idioma viaja también: cuando el marco no comparte almacén,
    // esta es la única copia que la partida verá al reiniciar.
    Ajustes.guardar({ volumen: aviso.volumen, musica: aviso.musica,
                      efectos: aviso.efectos, jugador: aviso.jugador,
                      hud: aviso.hud, juego: aviso.juego, fps: aviso.fps,
                      idioma: aviso.idioma });
    aplicarVistaFps();
    // El tamaño del juego se ve al momento. No se compara con lo que había
    // guardado -cuando el marco sí comparte almacén, para cuando llega el
    // aviso ya lo ha pisado él y parecerían iguales-, sino con el lienzo que
    // tenemos delante, que es lo único que no miente.
    aplicarZoomJuego();
});

// no hay nada que anotar al salir: el arma y las esquirlas se guardan solas
// en cuanto se ganan o se cambian
document.getElementById('mjInicio').addEventListener('click', () => {
    location.href = '../index.html';
});

// el mismo cierre que usa el botón de la portada, en ajustes.js: así los dos
// hacen exactamente lo mismo y no hay dos maneras de cerrar el juego
document.getElementById('mjSalir').addEventListener('click', () => cerrarJuego('mjNota'));

// ---------- El final del camino ----------
// Cruzada la última puerta se deja anotado el recuento de la partida y se
// pasa a la pantalla de despedida. Si el navegador no deja guardar, la
// pantalla sale igual, solo que sin las cifras.
function irAlFinal() {
    try {
        sessionStorage.setItem('sendas.final', JSON.stringify({
            arma: J.arma,
            jade: J.esquirlas,
            orbes: J.orbes,
            sendas: J.nivel,
            tiempo: Math.round(J.tiempo)
        }));
    } catch (e) { /* nada: la despedida no depende de esto */ }
    volverAlMenu('final.html');
}

// La partida vive fuera del marco, así que salir de ella es volver al armazón
// y decirle con qué pantalla abrirse. Se podría ir derecho a html/final.html y
// dejar que menu.js la mandara para acá, pero entonces se cargaría dos veces, y
// la despedida lee su recuento una sola vez y lo borra: la primera carga se lo
// llevaría por delante.
function volverAlMenu(pantalla) {
    location.href = '../index.html?ir=' + encodeURIComponent(pantalla);
}

// ---------- La pantalla de caída ----------
// Ya no se reinicia en el sitio: continuar deja al héroe otra vez en el zaguán,
// donde puede rehacerse en la armería antes de volver a entrar.
document.getElementById('mtContinuar').addEventListener('click', () => {
    volverAlMenu('prev.html');
});

document.getElementById('mtSalir').addEventListener('click', () => {
    location.href = '../index.html';
});

addEventListener('keydown', ev => {
    // mientras se teclea en la consola las letras son suyas, no del héroe
    if (ev.target.tagName === 'INPUT') return;
    const k = ev.key.toLowerCase();
    if (k === 'escape') { alternarMenu(); return; }
    if (k === 'e') {
        if (!ev.repeat && cruzar()) {
            // tras la última puerta no hay senda que trazar: hay final
            if (J.completado) irAlFinal(); else construirLienzoNivel();
        }
        return;
    }
    if (k === ' ' && !ev.repeat) dashPedido = true;
    teclas.add(k);
    if ([' ', 'w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k))
        ev.preventDefault();
});
addEventListener('keyup', ev => teclas.delete(ev.key.toLowerCase()));

lienzo.addEventListener('mousemove', ev => {
    const c = lienzo.getBoundingClientRect();
    raton.x = (ev.clientX - c.left) * (AN / c.width);
    raton.y = (ev.clientY - c.top) * (AL / c.height);
});
lienzo.addEventListener('mousedown', ev => {
    if (ev.button === 0) raton.izq = true;
    if (ev.button === 2) raton.der = true;
});
addEventListener('mouseup', ev => {
    if (ev.button === 0) raton.izq = false;
    if (ev.button === 2) raton.der = false;
});
// sin el menú contextual, el botón derecho queda libre para la guardia
lienzo.addEventListener('contextmenu', ev => ev.preventDefault());
addEventListener('blur', () => { teclas.clear(); raton.izq = raton.der = false; });

function leerEntrada() {
    const t = k => teclas.has(k);
    const dx = (t('d') || t('arrowright') ? 1 : 0) - (t('a') || t('arrowleft') ? 1 : 0);
    const dy = (t('s') || t('arrowdown') ? 1 : 0) - (t('w') || t('arrowup') ? 1 : 0);

    // se apunta con el ratón; si no se ha movido, hacia donde se anda
    const j = J.jugador;
    let mira = j.mira;
    const rx = raton.x + cam.x - j.x * TILE;
    const ry = raton.y + cam.y - j.y * TILE;
    if (Math.hypot(rx, ry) > 6) mira = Math.atan2(ry, rx);
    else if (dx || dy) mira = Math.atan2(dy, dx);

    const dash = dashPedido;
    dashPedido = false;
    return { dx, dy, mira, atacar: raton.izq, cubrir: raton.der, correr: t('shift'), dash };
}

// ============================================================
//  Bucle principal
// ============================================================
// El techo de la senda: 144 cuadros por segundo y ni uno más. No es un ajuste
// ni se toca desde ninguna parte -por eso es una constante y no una preferencia-:
// por encima de ahí no se gana nada que el ojo alcance a ver y sí se calienta
// la máquina de balde. En pantallas de 144 o menos no se nota, que ya no daban
// para más; en las de 240 es donde se pone el freno.
const FPS_TOPE = 144;
const PULSO_TOPE = 1000 / FPS_TOPE;

let ultimo = performance.now();
let proximoCuadro = 0;        // cuándo toca el siguiente, en el reloj del navegador
let hpPrevio = 0;

function bucle(ahora) {
    // se pide el siguiente lo primero: aunque este cuadro se deje pasar, la
    // cadena no puede romperse
    requestAnimationFrame(bucle);

    // ¿todavía no toca? Ni se mueve nada ni se pinta: eso es el tope.
    if (ahora < proximoCuadro) return;
    // La cita siguiente se cuenta desde la que tocaba y no desde ahora, que si
    // no el tope se iría quedando corto cuadro a cuadro. Tras un parón -pestaña
    // dormida, ventana escondida- se vuelve a poner en hora.
    proximoCuadro += PULSO_TOPE;
    if (proximoCuadro < ahora) proximoCuadro = ahora + PULSO_TOPE;

    const hueco = ahora - ultimo;                         // lo que tardó este cuadro, en ms
    const dt = Math.min(0.05, hueco / 1000);              // sin saltos si se pierde el foco
    ultimo = ahora;
    contarFotograma(ahora);
    dtVista = dt;

    actualizar(dt, leerEntrada());
    actualizarAmbiente(dt);

    if (J.jugador.hp < hpPrevio) { flash = 1; sacudida = 5; }
    hpPrevio = J.jugador.hp;
    flash = Math.max(0, flash - dt * 3);
    sacudida = Math.max(0, sacudida - dt * 22);

    pintar();
    pintarHud();
    pintarMinimapa();
}

function comenzar() {
    iniciarPartida();
    construirLienzoNivel();
    prepararAmbiente();
    hpPrevio = J.jugador.hp;
    flash = 0; sacudida = 0;
}

// Cuánto acerca la cámara el ajuste de tamaño del juego, de 0.9 a 1.1. Se
// pregunta cada vez y no se guarda: la ventana de ajustes puede cambiarlo en
// mitad de la partida.
function zoomJuego() {
    const z = (typeof Ajustes !== 'undefined') ? Number(Ajustes.leer().juego) : 100;
    return (Number.isFinite(z) ? Math.min(110, Math.max(90, z)) : 100) / 100;
}

// Qué lienzo pide ese zoom. Al revés de lo que parece: a más zoom, menos
// lienzo, que luego se estira igual hasta tapar la pantalla y todo sale mayor.
const anchoConZoom = z => Math.round(ANCHO_JUEGO / z);
const altoConZoom  = z => Math.round(ALTO_JUEGO / z);

// Pone el lienzo al zoom que toque, si no lo está ya. Se mira el lienzo y no
// el ajuste porque el ajuste puede haberse guardado antes de que nos avisen.
function aplicarZoomJuego() {
    if (anchoConZoom(zoomJuego()) === AN) return;
    ajustarLienzo();
    ajustarEscalaLienzo();
}

// ============================================================
//  El contador de fotogramas
//  Una cifra: a cuántos cuadros por segundo va yendo la partida. Lo que da la
//  pantalla no se enseña, que ni el navegador lo dice ni se puede adivinar
//  cuando el juego no llega a seguirle el paso.
// ============================================================
const cajaFps = document.getElementById('fps');

let fpsAhora = 0;               // a lo que va la partida ahora mismo
let fpsCuadros = 0, fpsDesde = 0;
let fpsVisible = false;

const rotuloFps = () => 'fps: ' + fpsAhora;

// Se repinta dos veces por segundo: cuadro a cuadro la cifra sería ilegible.
// Solo cuenta los cuadros que de verdad se pintan, no los que el tope deja pasar.
function contarFotograma(ahora) {
    if (!fpsVisible) return;

    fpsCuadros++;
    if (!fpsDesde) { fpsDesde = ahora; return; }
    if (ahora - fpsDesde < 500) return;

    // La cuenta se cierra contra el tope: en una pantalla muy rápida un
    // medio segundo puede pillar un cuadro de más y sacar un 145 que no
    // existe, y el techo de la senda son 144.
    fpsAhora = Math.min(FPS_TOPE, Math.round(fpsCuadros * 1000 / (ahora - fpsDesde)));
    fpsCuadros = 0; fpsDesde = ahora;
    if (cajaFps) cajaFps.textContent = rotuloFps();
}

// Encender o apagar el rótulo según lo que digan los ajustes.
function aplicarVistaFps() {
    fpsVisible = !!(typeof Ajustes !== 'undefined' && Ajustes.leer().fps);
    if (!cajaFps) return;
    cajaFps.hidden = !fpsVisible;
    // se estrena con la última cuenta buena, no con el 0 del html
    if (fpsVisible) cajaFps.textContent = rotuloFps();
    else { fpsCuadros = 0; fpsDesde = 0; }
}

// El lienzo tiene siempre la misma resolución (ANCHO_JUEGO x ALTO_JUEGO): así
// se ve igual de grande sin importar la pantalla. Lo único que la mueve es el
// zoom del jugador, y al revés de lo que parece: a más zoom, menos lienzo, que
// luego se estira hasta tapar la pantalla igual y todo sale más grande.
// Se llama al arrancar y cada vez que ese ajuste cambia; lo que cambia con la
// ventana es la escala visual, ver abajo.
function ajustarLienzo() {
    const z = zoomJuego();
    AN = lienzo.width = anchoConZoom(z);
    AL = lienzo.height = altoConZoom(z);
    capaVineta = null;
    lienzoSombra = null; sctx = null;
    raton.x = AN / 2; raton.y = AL / 2;
    if (petalos.length) prepararAmbiente();
    if (lienzoNivel && margenAfueras() > MARGEN) construirLienzoNivel();
}

// Esto sí reacciona a la ventana: agranda el lienzo lo justo para tapar toda
// la pantalla sin deformarse (de sobra se recorta un poco de arriba/abajo o
// de los lados, según la forma de la ventana, en vez de dejar bandas negras).
// El hud, en cambio, es dom normal y se acomoda solo al tamaño real de la pantalla.
function ajustarEscalaLienzo() {
    const escala = Math.max(innerWidth / AN, innerHeight / AL);
    lienzo.style.width = Math.round(AN * escala) + 'px';
    lienzo.style.height = Math.round(AL * escala) + 'px';
}
addEventListener('resize', ajustarEscalaLienzo);

// ============================================================
//  El telón de carga
//  Levantar la senda no es instantáneo: hay que hornear las figuras, tallar el
//  recinto entero en su lienzo y sembrar el ambiente, y todo eso va en el mismo
//  hilo. Antes ese rato se pasaba mirando un marcador a cero sobre negro; ahora
//  lo tapa el telón que html/game.html trae puesto desde el primer instante.
//
//  Dos reglas lo gobiernan: no se retira hasta que todo está en pie, y no se
//  retira antes de la espera mínima, para que en una máquina que carga en un
//  suspiro no dé un tirón. La espera se cuenta desde que se abrió la página
//  -que es lo que performance.now() mide-, no desde aquí: lo que el jugador
//  aguanta es la pantalla entera, no el último tramo.
// ============================================================
const ESPERA_CARGA = 5000;        // lo menos que dura el telón, en ms desde que se abrió la página
const ESPERA_LETRA = 3000;        // lo más que se le espera a la letra de fuera

const telon = document.getElementById('cargando');
const telonCinta = document.getElementById('cargandoAvance');
const telonPaso = document.getElementById('cargandoPaso');

// Cada tramo dice en qué anda -el rótulo lo traduce idiomas.js- y lo hace. El
// último pinta el primer cuadro: así, cuando el telón se va, debajo ya está la
// senda y no el lienzo en negro.
const TRAMOS_CARGA = [
    ['carga.aceros',     () => { prepararSprites(); }],
    ['carga.marco',      () => { aplicarVistaFps(); ajustarLienzo(); ajustarEscalaLienzo(); }],
    ['carga.senda',      () => { comenzar(); }],
    ['carga.farolillos', () => { pintar(); pintarHud(); pintarMinimapa(); }]
];

let tramosHechos = 0;

// La cinta no enseña lo hecho, sino lo que de verdad falta: lo más lento de las
// dos cuentas, el trabajo y la espera. Así llega al final justo cuando el telón
// se va, en vez de quedarse clavada en el 100 % esperando a la otra.
function pintarCinta() {
    if (!telonCinta) return;
    const porTrabajo = tramosHechos / TRAMOS_CARGA.length;
    const porTiempo = performance.now() / ESPERA_CARGA;
    telonCinta.style.width = Math.round(Math.min(1, porTrabajo, porTiempo) * 100) + '%';
}

function decirTramo(clave) {
    if (telonPaso) telonPaso.textContent = TR(clave);
}

// Un respiro para que el navegador llegue a pintar. Sin esto el telón no se
// vería: el hilo es uno solo, y todo el trabajo iría en la misma tanda.
//
// Se espera al cuadro, pero con el reloj de relevo: en una pestaña de fondo no
// hay cuadros que esperar -el navegador no pinta lo que nadie mira- y sin ese
// relevo la carga se quedaría parada hasta que el jugador volviera.
const RELEVO_CUADRO = 120;        // ms que se le dan al cuadro antes de seguir sin él

const respirar = () => new Promise(seguir => {
    let soltado = false;
    const soltar = () => { if (!soltado) { soltado = true; seguir(); } };
    requestAnimationFrame(() => setTimeout(soltar, 0));
    setTimeout(soltar, RELEVO_CUADRO);
});

async function arrancar() {
    // Si algo de esto se tuerce, el telón no se queda puesto: un tropiezo aquí
    // dejaría al jugador mirando el farolillo para siempre y sin saber por qué.
    // Se apunta en la consola, se levanta el telón igual y que el bucle diga.
    try {
        for (const [clave, tarea] of TRAMOS_CARGA) {
            decirTramo(clave);
            pintarCinta();
            await respirar();      // que se vea el rótulo antes de que el tramo bloquee
            tarea();
            tramosHechos++;
            pintarCinta();
        }

        // La letra de la casa viene de fuera. Se la espera aquí, tapada, y no
        // con el marcador ya puesto; pero con tope, que si no llega la partida
        // no se queda esperándola para siempre. Su tropiezo se recoge aparte:
        // un navegador que no sepa de document.fonts no puede llevarse por
        // delante la espera mínima, que va justo debajo.
        try {
            await Promise.race([document.fonts.ready,
                new Promise(seguir => setTimeout(seguir, ESPERA_LETRA))]);
        } catch (e) { /* sin letra de fuera se sigue igual */ }

        // lo que falte de la espera mínima
        while (performance.now() < ESPERA_CARGA) {
            pintarCinta();
            await respirar();
        }
        decirTramo('carga.listo');
        pintarCinta();
    } catch (e) {
        console.error('la carga se torció:', e);
    }

    if (telon) {
        telon.classList.add('yendose');
        // se retira del todo cuando acaba el fundido (.5s en el css)
        setTimeout(() => { telon.hidden = true; }, 600);
    }

    // El reloj se pone en hora ahora mismo: si no, el primer cuadro llegaría
    // con todo el rato de la carga a cuestas y el mundo daría un salto.
    ultimo = performance.now();
    proximoCuadro = 0;
    requestAnimationFrame(bucle);
}

arrancar();
