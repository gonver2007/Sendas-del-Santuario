/* idiomas.js - lo que dice el juego, en cada lengua. Las claves se leen solas
   (pantalla.cosa) y se usan de dos maneras: data-t="clave" en el HTML, que se
   reescribe al cargar y al cambiar de lengua, y TR('clave') en el guion.
   No se traducen, a propósito: los nombres de armas y bichos, y la consola.
   La lengua se lee de la memoria directamente y no por Ajustes, para que este
   archivo pueda ir el primero de todos.
   ============================================================ */
'use strict';

const IDIOMAS = [
    { id: 'es', nombre: 'Español' },
    { id: 'en', nombre: 'English' }
];

const TEXTOS = {

es: {
    // ---------- lo que sale en más de una pantalla ----------
    'comun.volver': 'VOLVER',
    'comun.cerrar': 'CERRAR',
    'comun.inicio': 'VOLVER AL INICIO',
    'comun.ajustes': 'AJUSTES',
    'comun.continuar': 'CONTINUAR',
    'comun.cerrarJuego': 'CERRAR JUEGO',
    'comun.notaPestana': 'El navegador no deja cerrar esta pestaña: ciérrala tú.',

    // ---------- portada ----------
    'portada.creditos': 'CRÉDITOS',

    // ---------- elegir ranura ----------
    'ranura.t1': 'ELIGE',
    'ranura.t2': 'TU',
    'ranura.t3': 'RANURA',
    'ranura.lema': 'Cinco senderos: cada uno recuerda el suyo.',
    'ranura.numero': 'RANURA',
    'ranura.vacia': '— sin partida —',
    'ranura.empezar': 'Empezar una nueva aquí',
    'ranura.ultima': 'Última vez:',
    'ranura.senda': 'senda',
    'ranura.borrar': 'BORRAR',
    'ranura.seguro': '¿SEGURO?',
    'ranura.selloConsola': 'Consola en la partida',
    'ranura.selloDios': 'Inmortal',
    'ranura.nota': 'Cada ranura guarda su arma y sus esquirlas. El santuario se recorre siempre desde la primera senda.',

    // ---------- antes de partir ----------
    'prev.t1': 'ANTES',
    'prev.t2': 'DE',
    'prev.t3': 'PARTIR',
    'prev.lema': 'El farolillo está encendido. Cruza cuando quieras.',
    'prev.entrar': 'ENTRAR A LA SENDA',
    'prev.armeria': 'ARMERÍA',
    'prev.personaje': 'PERSONAJE',
    'prev.habilidades': 'HABILIDADES',
    'prev.pergaminos': 'PERGAMINOS',
    'prev.amuletos': 'AMULETOS',
    'prev.bestiario': 'BESTIARIO',
    'prev.notaHabilidades': 'El pergamino sigue en blanco. Aquí se anotarán las artes que se aprendan dentro del santuario.',
    'prev.notaPergaminos': 'Ninguno desenrollado todavía. Aquí irán los que se encuentren en las sendas.',
    'prev.notaAmuletos': 'Todavía no cuelga ninguno del cinto. Aquí se guardarán los que el santuario conceda.',

    // ---------- bestiario ----------
    // los nombres de los bichos no se traducen: el bicho es el mismo en todas
    // partes. Lo que cambia de lengua es lo que se cuenta de él
    'bestiario.titulo': 'BESTIARIO',
    'bestiario.lema': 'Lo que sale al paso, medido y contado.',
    'bestiario.enemigos': 'ENEMIGOS',
    'bestiario.jefes': 'JEFES',
    'bestiario.sinJefes': 'Ninguno se ha dejado ver todavía.',
    // los dos rangos con que se organiza la pestaña de jefes, uno por
    // columna y por zona: el que la abre a media comarca y el que la cierra
    'bestiario.semijefe': 'Semijefe',
    'bestiario.jefeDeZona': 'Jefe',
    'bestiario.pv': 'PV',
    'bestiario.dano': 'Daño',
    'bestiario.golpes': 'Golpes/s',
    'bestiario.velocidad': 'Velocidad',
    'bestiario.vista': 'Visión',
    'bestiario.caidos': 'Eliminados',
    'bestiario.caidas': 'Te ha eliminado',
    'bestiario.hueco': 'Sin descubrir',
    'bestiario.comarca': 'Aparece en',
    'bestiario.nota': 'Pulsa una bestia para abrir su hoja.',
    'bestia.rata.pie': 'Bicho de alcantarilla, flaca y rápida, con la piel a jirones de tanto pelearse por lo que hay. Muerde y se aparta, y rara vez viene sola.',
    'bestia.esqueleto.pie': 'Lo que quedó de un centinela al que nadie relevó: el hueso pelado, sin una hilacha encima, y una hoja mellada que todavía sabe lo suyo. Alcanza desde más lejos que nada de aquí abajo, y no tiene ninguna prisa.',
    'bestia.ciempies.pie': 'Una ristra de anillos acorazados sobre cien patas. Va pegado al suelo, encaja lo que le eches y se cuela por donde no cabe nada; lo primero que te alcanza son las pinzas.',

    // ---------- armería ----------
    'armeria.titulo': 'ARMERÍA',
    'armeria.saldo': 'Esquirlas de jade:',
    'armeria.enVenta': 'EN VENTA',
    'armeria.sellada': 'SELLADA',
    'armeria.exige': 'EXIGE',
    'armeria.enMano': 'EN MANO',
    'armeria.comprar': 'COMPRAR',
    'armeria.forjar': 'FORJAR',
    'armeria.alMaximo': 'AL MÁXIMO',
    'armeria.dano': 'Daño',
    'armeria.alcance': 'Alcance',
    'armeria.golpes': 'Golpes/s',
    'armeria.nota': 'Cruzar la puerta de una senda a la siguiente deja una esquirla una de cada dos veces: el santuario no siempre paga. Un arma comprada se empuña al momento y ya se puede forjar.',

    // ---------- personaje ----------
    'personaje.titulo': 'PERSONAJE',
    'personaje.saldo': 'Orbes azules:',
    'personaje.siguiente': 'Siguiente',
    'personaje.subir': 'SUBIR',
    'personaje.nota': 'Cada enemigo caído suelta un orbe azul, que vuela solo hacia ti. Lo que compra queda en el héroe, no en el arma.',
    'mejora.vida': 'VIDA',
    'mejora.vida.pie': 'Un aliento más largo: el héroe aguanta más golpes antes de caer.',
    'mejora.vida.efecto': 'PV máximos',
    'mejora.dano': 'DAÑO',
    'mejora.dano.pie': 'La mano que empuña: cada tajo entra más hondo, lleves lo que lleves.',
    'mejora.dano.efecto': 'Daño',
    'mejora.energia': 'ENERGÍA',
    'mejora.energia.pie': 'El fuelle: más esquivas seguidas y más tajos antes de quedarse sin aire.',
    'mejora.energia.efecto': 'Estamina',

    // ---------- ajustes ----------
    'ajustes.titulo': 'AJUSTES',
    'ajustes.lema': 'Lo que se oye, lo que se ve y lo que hace cada tecla.',
    'ajustes.general': 'GENERAL',
    'ajustes.sonido': 'SONIDO',
    'ajustes.controles': 'CONTROLES',
    'ajustes.hud': 'Tamaño del HUD',
    'ajustes.juego': 'Tamaño del juego',
    'ajustes.fps': 'Ver FPS',
    'ajustes.idioma': 'Idioma',
    'ajustes.volumen': 'Volumen maestro',
    'ajustes.musica': 'Música',
    'ajustes.efectos': 'Efectos',
    'ajustes.jugador': 'Jugador',
    'ajustes.aplicar': 'APLICAR',
    'ajustes.restablecer': 'RESTABLECER',
    // No es un aviso de que algo haya ido mal: el cambio ya está guardado. Lo
    // que dice es hasta dónde llega sin reiniciar, que dentro de una senda ya
    // empezada no es hasta todo.
    'ajustes.reinicio': 'Idioma guardado · reinicia la partida para aplicarlo del todo',
    'control.andar': 'Andar',
    'control.apuntar': 'Apuntar',
    'control.atacar': 'Atacar',
    'control.cubrirse': 'Cubrirse',
    'control.correr': 'Correr',
    'control.esquiva': 'Esquiva',
    'control.cruzar': 'Cruzar puerta',
    'control.menu': 'Menú del santuario',
    'tecla.raton': 'ratón',
    'tecla.clicIzq': 'clic izquierdo',
    'tecla.clicDer': 'clic derecho',
    'tecla.mayus': 'Mayús',
    'tecla.espacio': 'Espacio',

    // ---------- el telón de carga ----------
    'carga.titulo': 'CARGANDO',
    'carga.lema': 'El farolillo se enciende. Aguarda un momento.',
    'carga.aceros': 'Afilando los aceros',
    'carga.marco': 'Tendiendo el lienzo',
    'carga.senda': 'Levantando la senda',
    'carga.farolillos': 'Encendiendo los farolillos',
    'carga.listo': 'La puerta se abre',

    // ---------- la senda ----------
    'hud.pv': 'PV',
    'hud.enemigos': 'ENEMIGOS RESTANTES',
    'hud.enemigo1': 'ENEMIGO RESTANTE',
    'hud.despejada': 'SENDA DESPEJADA',
    'hud.senda': 'Senda',
    'juego.caido': 'HAS CAÍDO',
    'juego.perdiste': 'Perdiste',
    'juego.seguir': 'SEGUIR JUGANDO',
    'aviso.cruzar': '[E] cruzar la puerta',
    'aviso.sello1': 'El sello aguanta · queda 1 enemigo',
    'aviso.sello': 'El sello aguanta · quedan %s enemigos',
    'aviso.selloCede': 'El sello se deshace…',

    // ---------- lo que se cuenta en el registro ----------
    'msg.pinchos': 'Los pinchos del suelo te alcanzan.',
    'msg.selloRoto': 'Cae el último enemigo: el sello se deshace y la puerta se abre.',
    'msg.muere': '%s muere.',
    'msg.hasMuerto': 'Has muerto.',
    'msg.puertaSellada1': 'La puerta sigue sellada. Aún queda 1 enemigo.',
    'msg.puertaSellada': 'La puerta sigue sellada. Aún quedan %s enemigos.',
    'msg.puertaAbriendo': 'La puerta todavía se está abriendo.',
    'msg.ultimoUmbral': 'Cruzas el último umbral. El santuario queda atrás.',
    'msg.jade': 'Una esquirla de jade se desprende del umbral.',
    'msg.botella': 'La botella salta en pedazos y el elixir se derrama. Ponte encima.',
    'msg.charcoSeco': 'El elixir derramado se seca en la piedra sin que lo aproveches.',
    'msg.charcoApurado': 'Apuras el elixir derramado: %s PV.',
    'msg.charcoResto': 'El elixir derramado te devuelve %s PV; el resto se seca en la piedra.',
    'msg.botinPerdido': 'Se quedan en la senda %s de jade y %s orbes azules.',
    'msg.portal': 'Cruzas el portal del santuario.',
    'msg.articuloEl': 'El',
    'msg.articuloLa': 'La',

    // ---------- final ----------
    'final.t1': 'HAS LLEGADO',
    'final.t2': 'AL',
    'final.t3': 'SANTUARIO',
    'final.lema': 'Cien sendas, y al final del camino la puerta se abrió sola. Descansa: el santuario ya no te espera, te reconoce.',
    'final.camino': 'EL CAMINO ANDADO',
    'final.sendas': 'sendas',
    'final.tiempo': 'de camino',
    'final.arma': 'en la mano',
    'final.otraVez': 'RECORRERLO DE NUEVO',
    'final.registros': 'SALA DE REGISTROS',

    // ---------- comarcas ----------
    'bioma.catacumbas': 'Catacumbas',
    'bioma.alcantarillas': 'Alcantarillas',
    'bioma.bambu':'Bosque de bambú',
    'bioma.patios': 'Patios exteriores',
    'bioma.mansion': 'Mansión señorial',
    'bioma.plaza': 'Plaza abandonada',
    'bioma.foso': 'Foso del castillo',
    'bioma.torreones': 'Torreones',
    'bioma.torii': 'Senda de torii',
    'bioma.santuario': 'Santuario'
},

en: {
    'comun.volver': 'BACK',
    'comun.cerrar': 'CLOSE',
    'comun.inicio': 'BACK TO START',
    'comun.ajustes': 'SETTINGS',
    'comun.continuar': 'CONTINUE',
    'comun.cerrarJuego': 'QUIT GAME',
    'comun.notaPestana': 'The browser will not let this tab close: close it yourself.',

    'portada.creditos': 'CREDITS',

    'ranura.t1': 'CHOOSE',
    'ranura.t2': 'YOUR',
    'ranura.t3': 'SLOT',
    'ranura.lema': 'Five paths: each one remembers its own.',
    'ranura.numero': 'SLOT',
    'ranura.vacia': '— no game —',
    'ranura.empezar': 'Start a new one here',
    'ranura.ultima': 'Last played:',
    'ranura.senda': 'path',
    'ranura.borrar': 'DELETE',
    'ranura.seguro': 'SURE?',
    'ranura.selloConsola': 'Console in this game',
    'ranura.selloDios': 'Immortal',
    'ranura.nota': 'Each slot keeps its own weapon and shards. The sanctuary is always walked from the first path.',

    'prev.t1': 'BEFORE',
    'prev.t2': 'YOU',
    'prev.t3': 'DEPART',
    'prev.lema': 'The lantern is lit. Cross whenever you please.',
    'prev.entrar': 'ENTER THE PATH',
    'prev.armeria': 'ARMOURY',
    'prev.personaje': 'CHARACTER',
    'prev.habilidades': 'SKILLS',
    'prev.pergaminos': 'SCROLLS',
    'prev.amuletos': 'CHARMS',
    'prev.bestiario': 'BESTIARY',
    'prev.notaHabilidades': 'The scroll is still blank. The arts learned inside the sanctuary will be written here.',
    'prev.notaPergaminos': 'None unrolled yet. The ones found along the paths will go here.',
    'prev.notaAmuletos': 'Nothing hangs from your belt yet. Whatever the sanctuary grants will be kept here.',

    // ---------- bestiary ----------
    'bestiario.titulo': 'BESTIARY',
    'bestiario.lema': 'What comes at you, measured and counted.',
    'bestiario.enemigos': 'ENEMIES',
    'bestiario.jefes': 'BOSSES',
    'bestiario.sinJefes': 'None has shown itself yet.',
    'bestiario.semijefe': 'Mini-boss',
    'bestiario.jefeDeZona': 'Boss',
    'bestiario.pv': 'HP',
    'bestiario.dano': 'Damage',
    'bestiario.golpes': 'Hits/s',
    'bestiario.velocidad': 'Speed',
    'bestiario.vista': 'Sight',
    'bestiario.caidos': 'Slain',
    'bestiario.caidas': 'Has slain you',
    'bestiario.hueco': 'Undiscovered',
    'bestiario.comarca': 'Found in',
    'bestiario.nota': 'Click a beast to open its sheet.',
    'bestia.rata.pie': 'A sewer creature, lean and quick, its hide in tatters from fighting over what little there is. It bites and backs away, and it rarely comes alone.',
    'bestia.esqueleto.pie': 'What is left of a sentry nobody ever came to relieve: bare bone, not a thread left on it, and a notched blade that still knows its trade. It reaches further than anything else down here, and it is in no hurry.',
    'bestia.ciempies.pie': 'A string of armoured rings on a hundred legs. It hugs the ground, soaks up whatever you throw and slips through gaps that fit nothing; the first thing to reach you is its pincers.',

    'armeria.titulo': 'ARMOURY',
    'armeria.saldo': 'Jade shards:',
    'armeria.enVenta': 'FOR SALE',
    'armeria.sellada': 'SEALED',
    'armeria.exige': 'NEEDS',
    'armeria.enMano': 'IN HAND',
    'armeria.comprar': 'BUY',
    'armeria.forjar': 'FORGE',
    'armeria.alMaximo': 'MAXED',
    'armeria.dano': 'Damage',
    'armeria.alcance': 'Reach',
    'armeria.golpes': 'Hits/s',
    'armeria.nota': 'Crossing from one path to the next leaves a shard one time in two: the sanctuary does not always pay. A weapon bought is wielded at once, and can be forged right away.',

    'personaje.titulo': 'CHARACTER',
    'personaje.saldo': 'Blue orbs:',
    'personaje.siguiente': 'Next',
    'personaje.subir': 'RAISE',
    'personaje.nota': 'Every fallen enemy drops a blue orb that flies to you on its own. What it buys stays with the hero, not with the weapon.',
    'mejora.vida': 'LIFE',
    'mejora.vida.pie': 'A longer breath: the hero takes more blows before falling.',
    'mejora.vida.efecto': 'Max HP',
    'mejora.dano': 'DAMAGE',
    'mejora.dano.pie': 'The hand that grips: every cut bites deeper, whatever you carry.',
    'mejora.dano.efecto': 'Damage',
    'mejora.energia': 'ENERGY',
    'mejora.energia.pie': 'The bellows: more dodges in a row and more cuts before running out of air.',
    'mejora.energia.efecto': 'Stamina',

    'ajustes.titulo': 'SETTINGS',
    'ajustes.lema': 'What you hear, what you see and what each key does.',
    'ajustes.general': 'GENERAL',
    'ajustes.sonido': 'SOUND',
    'ajustes.controles': 'CONTROLS',
    'ajustes.hud': 'HUD size',
    'ajustes.juego': 'Game size',
    'ajustes.fps': 'Show FPS',
    'ajustes.idioma': 'Language',
    'ajustes.volumen': 'Master volume',
    'ajustes.musica': 'Music',
    'ajustes.efectos': 'Effects',
    'ajustes.jugador': 'Player',
    'ajustes.aplicar': 'APPLY',
    'ajustes.restablecer': 'RESET',
    'ajustes.reinicio': 'Language saved · restart the run to apply it fully',
    'control.andar': 'Walk',
    'control.apuntar': 'Aim',
    'control.atacar': 'Attack',
    'control.cubrirse': 'Guard',
    'control.correr': 'Run',
    'control.esquiva': 'Dodge',
    'control.cruzar': 'Cross door',
    'control.menu': 'Sanctuary menu',
    'tecla.raton': 'mouse',
    'tecla.clicIzq': 'left click',
    'tecla.clicDer': 'right click',
    'tecla.mayus': 'Shift',
    'tecla.espacio': 'Space',

    // ---------- the loading curtain ----------
    'carga.titulo': 'LOADING',
    'carga.lema': 'The lantern is being lit. Wait a moment.',
    'carga.aceros': 'Sharpening the blades',
    'carga.marco': 'Stretching the canvas',
    'carga.senda': 'Raising the path',
    'carga.farolillos': 'Lighting the lanterns',
    'carga.listo': 'The door opens',

    'hud.pv': 'HP',
    'hud.enemigos': 'ENEMIES REMAINING',
    'hud.enemigo1': 'ENEMY REMAINING',
    'hud.despejada': 'PATH CLEARED',
    'hud.senda': 'Path',
    'juego.caido': 'YOU HAVE FALLEN',
    'juego.perdiste': 'You lost',
    'juego.seguir': 'KEEP PLAYING',
    'aviso.cruzar': '[E] cross the door',
    'aviso.sello1': 'The seal holds · 1 enemy left',
    'aviso.sello': 'The seal holds · %s enemies left',
    'aviso.selloCede': 'The seal is breaking…',

    'msg.pinchos': 'The spikes in the floor catch you.',
    'msg.selloRoto': 'The last enemy falls: the seal breaks and the door opens.',
    'msg.muere': '%s dies.',
    'msg.hasMuerto': 'You have died.',
    'msg.puertaSellada1': 'The door is still sealed. 1 enemy remains.',
    'msg.puertaSellada': 'The door is still sealed. %s enemies remain.',
    'msg.puertaAbriendo': 'The door is still opening.',
    'msg.ultimoUmbral': 'You cross the last threshold. The sanctuary is behind you.',
    'msg.jade': 'A shard of jade comes loose from the threshold.',
    'msg.botella': 'The bottle bursts and the elixir spills. Stand on it.',
    'msg.charcoSeco': 'The spilled elixir dries on the stone without you taking any of it.',
    'msg.charcoApurado': 'You drain the spilled elixir: %s HP.',
    'msg.charcoResto': 'The spilled elixir gives you back %s HP; the rest dries on the stone.',
    'msg.botinPerdido': 'You leave %s jade and %s blue orbs behind on the path.',
    'msg.portal': 'You cross the sanctuary gate.',
    'msg.articuloEl': 'The',
    'msg.articuloLa': 'The',

    'final.t1': 'YOU HAVE REACHED',
    'final.t2': 'THE',
    'final.t3': 'SANCTUARY',
    'final.lema': 'A hundred paths, and at the end of the road the door opened on its own. Rest: the sanctuary no longer awaits you, it knows you.',
    'final.camino': 'THE ROAD WALKED',
    'final.sendas': 'paths',
    'final.tiempo': 'on the road',
    'final.arma': 'in hand',
    'final.otraVez': 'WALK IT AGAIN',
    'final.registros': 'HALL OF RECORDS',

    'bioma.catacumbas': 'Catacombs',
    'bioma.alcantarillas': 'Sewers',
    'bioma.bambu':'Bamboo forest',
    'bioma.patios': 'Outer courtyards',
    'bioma.mansion': 'Lordly manor',
    'bioma.plaza': 'Abandoned square',
    'bioma.foso': 'Castle moat',
    'bioma.torreones': 'Keeps',
    'bioma.torii': 'Path of torii',
    'bioma.santuario': 'Sanctuary'
}

};

const Idioma = {

    // se lee de la memoria a pelo: así este archivo no depende de nadie
    actual() {
        try {
            const a = JSON.parse(localStorage.getItem('sendas.ajustes'));
            if (a && TEXTOS[a.idioma]) return a.idioma;
        } catch (e) { /* sin memoria: el de casa */ }
        return 'es';
    },

    // El texto de una clave, con los %s rellenados por orden. Sin traducir cae
    // al español, y sin existir devuelve la propia clave: un olvido se ve.
    t(clave, ...trozos) {
        const libro = TEXTOS[this.actual()] || TEXTOS.es;
        let texto = libro[clave];
        if (texto === undefined) texto = TEXTOS.es[clave];
        if (texto === undefined) return clave;
        for (const trozo of trozos) texto = texto.replace('%s', trozo);
        return texto;
    },

    lista() { return IDIOMAS; },

    // Repasa la pantalla: data-t pone el contenido y data-t-attr un atributo
    // suelto, con la forma "atributo:clave".
    aplicar(raiz) {
        const donde = raiz || document;
        for (const nodo of donde.querySelectorAll('[data-t]'))
            nodo.textContent = this.t(nodo.dataset.t);
        for (const nodo of donde.querySelectorAll('[data-t-attr]')) {
            const [attr, clave] = nodo.dataset.tAttr.split(':');
            nodo.setAttribute(attr, this.t(clave));
        }
        // el idioma declarado importa para lectores de pantalla y guionado
        document.documentElement.lang = this.actual();
    }
};

// Atajo. Se llama TR y no T porque vista.js ya tiene una T suya (la paleta del
// bioma), y dos const con el mismo nombre en el ámbito global tumban el archivo.
const TR = (clave, ...trozos) => Idioma.t(clave, ...trozos);

// se aplica en cuanto la pantalla existe, sin esperar a nadie más
if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => Idioma.aplicar());
else Idioma.aplicar();
