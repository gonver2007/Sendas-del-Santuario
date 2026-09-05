/* ajustes.js - las preferencias del jugador: cuánto suena, cuánto ocupa el
   hud y qué tecla hace qué. No van en la ranura: son de quien juega y valen
   para las cinco.
   ============================================================ */
'use strict';

const CLAVE_AJUSTES = 'sendas.ajustes';
// el hud se mide en tantos por ciento de su tamaño de siempre
const HUD_MIN = 60, HUD_MAX = 160;
// y el juego igual, pero con muy poca cuerda: pasado de ahí se ve demasiado
// poca senda por delante (o demasiada, y las figuras quedan de hormiga)
const JUEGO_MIN = 90, JUEGO_MAX = 110;

// Los valores de casa, los que la regla marca con una muesca. El del hud va un
// punto crecido (a tamaño exacto el marcador se queda corto) y el maestro a
// media asta, para dejar sitio a subirlo tanto como a bajarlo.
const HUD_DE_SERIE = 110;
const JUEGO_DE_SERIE = 100;
const VOLUMEN_DE_SERIE = 50;

function ajustesNuevos() {
    return {
        volumen: VOLUMEN_DE_SERIE,  // 0..100, el maestro: de él cuelga todo lo que suena
        musica: 70,     // 0..100, y este solo la música, colgando del maestro
        efectos: 80,    // 0..100, y este los orbes, el vidrio y las puertas
        // lo que hace el héroe con sus manos (por ahora, el acero al cortar).
        // Aparte de Efectos porque suena en cada golpe
        jugador: 80,    // 0..100, también colgando del maestro
        hud: HUD_DE_SERIE, // 60..160, el tamaño del marcador dentro de la partida
        // 90..110, cuánto se acerca la cámara: a más, todo más grande y menos
        // senda a la vista; a menos, al revés
        juego: JUEGO_DE_SERIE,
        fps: false,     // el contador de fotogramas, apagado hasta que se pida
        idioma: 'es'    // la lengua en que habla el juego; la lista, en idiomas.js
    };
}

// entre 'a' y 'b' no se sale ni con un valor a mano en el almacén
function acotar(n, a, b) {
    n = Number(n);
    return Number.isFinite(n) ? Math.min(b, Math.max(a, Math.round(n))) : null;
}

// Lo que le toca sonar a un canal, de 0 a 1. Va suelto porque aplicarValores
// recibe sus ajustes de fuera y no puede releerlos.
function volumenDeCanal(a, canal) {
    const maestro = a.volumen / 100;
    if (canal === 'musica') return maestro * (a.musica / 100);
    if (canal === 'efectos') return maestro * (a.efectos / 100);
    if (canal === 'jugador') return maestro * (a.jugador / 100);
    return maestro;
}

const Ajustes = {

    // el navegador puede negarse a recordar; entonces se juega con lo de fábrica
    leer() {
        const base = ajustesNuevos();
        let guardado = null;
        try { guardado = JSON.parse(localStorage.getItem(CLAVE_AJUSTES)); } catch (e) { /* nada */ }
        if (!guardado) return base;
        return {
            volumen: acotar(guardado.volumen, 0, 100) ?? base.volumen,
            musica: acotar(guardado.musica, 0, 100) ?? base.musica,
            efectos: acotar(guardado.efectos, 0, 100) ?? base.efectos,
            jugador: acotar(guardado.jugador, 0, 100) ?? base.jugador,
            hud: acotar(guardado.hud, HUD_MIN, HUD_MAX) ?? base.hud,
            juego: acotar(guardado.juego, JUEGO_MIN, JUEGO_MAX) ?? base.juego,
            // un sí o un no: cualquier otra cosa en el almacén es que no
            fps: typeof guardado.fps === 'boolean' ? guardado.fps : base.fps,
            // una lengua inexistente no puede dejar el juego mudo
            idioma: (typeof TEXTOS !== 'undefined' && TEXTOS[guardado.idioma])
                ? guardado.idioma : base.idioma
        };
    },

    guardar(cambios) {
        const nuevos = Object.assign(this.leer(), cambios);
        try { localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(nuevos)); } catch (e) { /* nada */ }
        this.aplicar();
        return nuevos;
    },

    // 0..1, como lo quieren los elementos de audio. Los canales cuelgan del
    // maestro, pero no al revés; sin canal, solo el maestro.
    volumen(canal) { return volumenDeCanal(this.leer(), canal); },

    // El hud se agranda con zoom y no con scale: así el marcador sigue pegado
    // a sus esquinas en vez de encogerse hacia el centro.
    aplicar() { this.aplicarValores(this.leer()); },

    // Aparte porque la partida los recibe ya medidos de su ventana de ajustes,
    // que no siempre comparte almacén. Cada caja de sonido dice su data-canal.
    aplicarValores(a) {
        document.documentElement.style.setProperty('--escalaHud', a.hud / 100);
        // el zoom del juego no es css: lo recoge vista.js al medir su lienzo,
        // que la senda se dibuja a mano y no se deja escalar por fuera
        for (const sonido of document.querySelectorAll('audio, video'))
            sonido.volume = volumenDeCanal(a, sonido.dataset.canal);
    }
};

Ajustes.aplicar();

// ---------- Quién nos tiene enmarcados ----------
// Hay dos marcos distintos y no significan lo mismo:
//   hayPadre - cualquiera de los dos; sirve para avisar de los cambios.
//   enMarco  - solo la ventanita que la partida abre sobre la senda: recortada,
//              sin música y con un VOLVER que cierra. Se reconoce por el
//              ?marco=1 que le pone vista.js, no por estar enmarcada (desde el
//              armazón, todas las pantallas del menú lo están).
// Desde file:// el origen es «null» para todas, así que no hay a quién acotar
// el postMessage.
const hayPadre = window.self !== window.top;
const enMarco = new URLSearchParams(location.search).has('marco');

function avisarAlPadre(mensaje) {
    if (hayPadre) parent.postMessage(Object.assign({ tipo: 'ajustes' }, mensaje), '*');
}

function cerrarMarco() { avisarAlPadre({ cerrar: true }); }

// ---------- Cerrar el juego ----------
// Lo piden el botón de la portada y el del menú de la partida, y comparten
// esta función para comportarse igual. Cerrar la ventana solo puede el
// documento de arriba: la partida lo es y se cierra sola; la portada vive
// dentro del marco y se lo pide al armazón. Si un cuarto de segundo después
// seguimos vivos, el navegador no ha dejado cerrar y se le dice al jugador.
function cerrarJuego(idNota) {
    const enArmazon = hayPadre && !enMarco;
    if (enArmazon) parent.postMessage({ tipo: 'armazon', cerrarJuego: true }, '*');
    else window.close();

    setTimeout(() => {
        const nota = document.getElementById(idNota);
        if (nota) nota.hidden = false;
    }, 250);
}

// la marca la lleva el <html>: dentro del marco hay mucho menos alto
if (enMarco) document.documentElement.classList.add('enMarco');

// ---------- La hoja de ajustes ----------
// Se monta sola donde esté la caja; la única que la pone es ajustes.html.
// La tecla se escribe tal cual donde es tecla (W A S D, E, Esc) y por clave
// donde es palabra, que esa sí cambia de lengua.
const CONTROLES = [
    ['control.andar', 'W A S D'],
    ['control.apuntar', 'tecla.raton'],
    ['control.atacar', 'tecla.clicIzq'],
    ['control.cubrirse', 'tecla.clicDer'],
    ['control.correr', 'tecla.mayus'],
    ['control.esquiva', 'tecla.espacio'],
    ['control.cruzar', 'E'],
    ['control.menu', 'Esc']
];

// Las reglas de cada sección, en tres columnas: pantalla, sonido y controles.
// Cada una: [clave, mínimo, máximo, paso] y, opcional, el valor con muesca.
// El nombre sale del diccionario con 'ajustes.' + la clave.
const SECCIONES = [
    ['ajustes.general', [['hud', HUD_MIN, HUD_MAX, 5, HUD_DE_SERIE],
                         ['juego', JUEGO_MIN, JUEGO_MAX, 5, JUEGO_DE_SERIE]]],
    ['ajustes.sonido',  [['volumen', 0, 100, 1, VOLUMEN_DE_SERIE],
                         ['musica', 0, 100, 1],
                         ['efectos', 0, 100, 1],
                         ['jugador', 0, 100, 1]]]
];

// ---------- Lo que espera a que digas cuándo ----------
// Nada se aplica solo: se toca lo que se quiera y hasta pulsar APLICAR el juego
// sigue igual, así que volver sin pulsarlo lo deja todo intacto. El precio es
// que el volumen ya no se afina de oído mientras se arrastra.
// Aquí vive solo lo tocado y sin guardar; vacío = nada que aplicar, que es la
// condición que apaga el botón.
const pendientes = {};
let notaReinicio = false;   // si toca enseñar la nota tras repintar la hoja

// Lo de fábrica, menos la lengua: quien juega en inglés y quiere el sonido de
// siempre no está pidiendo que el juego vuelva a hablarle en español.
function deFabrica() {
    const base = ajustesNuevos();
    delete base.idioma;
    return base;
}

// Cada botón se enciende por su motivo: aplicar, si hay algo esperando;
// restablecer, si algo se aparta de lo de fábrica (mirando lo pendiente antes
// que lo guardado, que es lo que el jugador tiene delante).
function refrescarBotones() {
    const a = Ajustes.leer();
    const efectivo = clave => (clave in pendientes ? pendientes[clave] : a[clave]);
    const base = deFabrica();

    const aplicar = document.getElementById('axAplicar');
    if (aplicar) aplicar.disabled = !Object.keys(pendientes).length;

    const reset = document.getElementById('axReset');
    if (reset) reset.disabled = Object.keys(base).every(c => efectivo(c) === base[c]);
}

// Anota un cambio... o lo borra: devolver una regla a donde estaba no es un
// cambio pendiente, y el botón tiene que apagarse igual.
function anotar(clave, valor, guardado) {
    if (valor === guardado) delete pendientes[clave];
    else pendientes[clave] = valor;
    refrescarBotones();
}

function montarAjustes() {
    const caja = document.getElementById('ajustes');
    if (!caja) return;

    const a = Ajustes.leer();
    // Lo pendiente manda sobre lo guardado al pintar: un riel movido y sin
    // aplicar tiene que seguir donde lo dejaron.
    const enEspera = clave => clave in pendientes;
    const valor = clave => (enEspera(clave) ? pendientes[clave] : a[clave]);

    // La cifra va antes que el riel: la regla es una rejilla de dos columnas y
    // el riel las cruza enteras por debajo.
    const regla = ([clave, min, max, paso, muesca]) => {
        // La muesca se le da al css como fracción de 0 a 1 del recorrido, así
        // no necesita saber nada de mínimos ni de máximos.
        const marcada = muesca !== undefined;
        const clases = ['regla'];
        if (marcada) clases.push('marcada');
        if (enEspera(clave)) clases.push('pendiente');
        const sitio = marcada ? ` style="--muesca: ${(muesca - min) / (max - min)}"` : '';
        return `
        <div class="${clases.join(' ')}"${sitio}>
            <label for="ax_${clave}">${TR('ajustes.' + clave)}</label>
            <output for="ax_${clave}">${valor(clave)}%</output>
            <input id="ax_${clave}" type="range" data-clave="${clave}"
                   min="${min}" max="${max}" step="${paso}" value="${valor(clave)}">
        </div>`;
    };

    // Un sí o un no. Misma rejilla que las demás, con la casilla donde las
    // reglas ponen su cifra; el cuadro lo dibuja el css, que el de serie trae
    // la carpintería del sistema y aquí desafinaría.
    const casilla = clave => `
        <div class="regla marca${enEspera(clave) ? ' pendiente' : ''}">
            <label for="ax_${clave}">${TR('ajustes.' + clave)}</label>
            <input id="ax_${clave}" type="checkbox" data-clave="${clave}"${valor(clave) ? ' checked' : ''}>
        </div>`;

    // El idioma es una lista cerrada, no un recorrido: misma rejilla de dos
    // columnas que las reglas, pero sin riel y sin cifra.
    const desplegable = () => `
        <div class="regla lista${enEspera('idioma') ? ' pendiente' : ''}">
            <label for="ax_idioma">${TR('ajustes.idioma')}</label>
            <select id="ax_idioma">
                ${Idioma.lista().map(i =>
                    `<option value="${i.id}"${i.id === valor('idioma') ? ' selected' : ''}>${i.nombre}</option>`
                ).join('')}
            </select>
        </div>`;

    // tres columnas y debajo el pie: la nota a la izquierda y los dos botones a
    // la derecha, restablecer primero y aplicar el último
    caja.innerHTML = `<div class="secciones">` +
        SECCIONES.map(([titulo, reglas]) => `
            <section class="seccion">
                <h2>${TR(titulo)}</h2>
                ${reglas.map(regla).join('')}
                ${titulo === 'ajustes.general' ? desplegable() + casilla('fps') : ''}
            </section>`).join('') + `
            <section class="seccion">
                <h2>${TR('ajustes.controles')}</h2>
                <ul class="controles">
                    ${CONTROLES.map(([que, como]) =>
                        `<li><span>${TR(que)}</span><b>${TR(como)}</b></li>`).join('')}
                </ul>
            </section>
        </div>
        <div class="cierre">
            <p class="nota"${notaReinicio ? '' : ' hidden'}>${TR('ajustes.reinicio')}</p>
            <button id="axReset" type="button" class="boton reset">${TR('ajustes.restablecer')}</button>
            <button id="axAplicar" type="button" class="boton aplicar">${TR('ajustes.aplicar')}</button>
        </div>`;

    // Los botones se pintan encendidos y esto los apaga si toca: un solo sitio
    // sabe cuándo va apagado cada uno.
    refrescarBotones();

    // Arrastrar mueve la cifra pero no toca el juego. La fila se marca aparte
    // para ver de un vistazo cuáles quedan por aplicar.
    for (const riel of caja.querySelectorAll('input[type="range"][data-clave]')) {
        const clave = riel.dataset.clave;
        const cifra = caja.querySelector(`output[for="${riel.id}"]`);
        riel.addEventListener('input', () => {
            if (cifra) cifra.textContent = riel.value + '%';
            anotar(clave, +riel.value, a[clave]);
            const fila = riel.parentElement;
            if (fila) fila.classList.toggle('pendiente', enEspera(clave));
        });
    }

    const menu = document.getElementById('ax_idioma');
    if (menu) menu.addEventListener('change', () => {
        anotar('idioma', menu.value, a.idioma);
        const fila = menu.parentElement;
        if (fila) fila.classList.toggle('pendiente', enEspera('idioma'));
    });

    // Las casillas no se arrastran: se marcan y basta, pero se anotan igual
    // que un riel y esperan al APLICAR como todo lo demás.
    for (const marca of caja.querySelectorAll('input[type="checkbox"][data-clave]')) {
        const clave = marca.dataset.clave;
        marca.addEventListener('change', () => {
            anotar(clave, marca.checked, a[clave]);
            const fila = marca.parentElement;
            if (fila) fila.classList.toggle('pendiente', enEspera(clave));
        });
    }

    const aplicar = document.getElementById('axAplicar');
    if (aplicar) aplicar.addEventListener('click', aplicarPendientes);

    const reset = document.getElementById('axReset');
    if (reset) reset.addEventListener('click', restablecer);
}

// Repinta la hoja dejándola donde estaba: dentro de la partida va enmarcada y
// puede quedar scrolleada.
function repintar() {
    const altura = window.scrollY || 0;
    montarAjustes();
    if (altura) window.scrollTo(0, altura);
}

// Restablecer no guarda: deja lo de fábrica esperando, como si lo hubieras
// puesto tú riel por riel. Volver sin aplicar lo deja todo como estaba.
function restablecer() {
    const a = Ajustes.leer();
    const base = deFabrica();
    for (const clave of Object.keys(base)) anotar(clave, base[clave], a[clave]);
    repintar();
}

// Guarda de una vez lo que esperaba y repinta, para que lo que se ve sea lo
// guardado. El repintado hace falta además al cambiar de lengua, que es la
// única forma de poner al día estos rótulos sin recargar.
// La nota de reinicio solo dentro de la partida: en el menú cada pantalla se
// traduce sola al abrirse.
function aplicarPendientes() {
    const cambios = Object.keys(pendientes);
    if (!cambios.length) return;

    const cambioLaLengua = 'idioma' in pendientes;
    // se copia antes de vaciar: guardar recibe su propio objeto
    avisarAlPadre(Ajustes.guardar(Object.assign({}, pendientes)));
    for (const clave of cambios) delete pendientes[clave];

    if (cambioLaLengua) {
        notaReinicio = enMarco;
        Idioma.aplicar();   // el HTML de alrededor: título, lema y VOLVER
    }
    repintar();
}

montarAjustes();
