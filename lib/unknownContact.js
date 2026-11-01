// Conversación con el «Número desconocido»: alguien atrapado en la dimensión
// paralela escribe al celular de Mica. Todo es local: se reconoce la intención
// del mensaje del jugador por palabras clave y se elige una respuesta según lo
// que ya se habló (pistas dadas) y lo que el jugador ya hizo en el colegio.
// El contacto orienta hacia el acertijo (símbolos del pasillo → pizarrón del
// 2° E) pero nunca dice cuáles son los símbolos ni su orden.

import { SYMBOL_SEQUENCE } from "@/data/dimension";

export const UNKNOWN_ID = "desconocido";
export const UNKNOWN_NAME = "Número desconocido";
export const FIRST_MESSAGE = "¿Quién está usando el teléfono de Mica?";
// Lo que escribe la primera vez que se abre el chat, si el jugador todavía no contestó.
export const FIRST_OPEN_MESSAGES = ["sé que estás leyendo.", "contestame. no hay mucho tiempo."];

const NUMBERS = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis"];
const SYMBOL_COUNT = NUMBERS[SYMBOL_SEQUENCE.length] ?? String(SYMBOL_SEQUENCE.length);

// Minúsculas, sin tildes ni signos, letras repetidas de más reducidas
// ("holaaa" → "hola") y algunas abreviaturas de chat expandidas.
export function normalize(text) {
  return ` ${text} `
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]+/g, " ")
    .replace(/([a-z])\1{2,}/g, "$1")
    .replace(/ (q|k|ke) /g, " que ")
    .replace(/ dnd /g, " donde ")
    .replace(/ (xq|pq|porq) /g, " por que ")
    .replace(/ celu /g, " celular ")
    .replace(/\s+/g, " ")
    .trim();
}

// Cada intención suma el peso de los patrones que coinciden; gana la de mayor
// puntaje (en empate, la que aparece primero en esta lista).
const INTENTS = {
  solucion: [
    [/\b(respuesta|solucion|resultado)\b/, 4],
    [/\b(circulo|cuadrado|triangulo|cruz|estrella|rombo|rectangulo)s?\b/, 4],
    [/\b(que|cual) (es el )?orden\b|\ben que orden\b/, 4],
    [/\bque (dibujo|tengo que dibujar|escribo|tengo que escribir)\b/, 4],
    [/\bcuales son\b/, 2],
    [/\b(codigo|contrasena|clave)\b/, 2],
    [/\b(decime|decimelo|dame) (la|el|cuales|que)\b/, 2],
  ],
  salida: [
    [/\bsal(go|gamos|ir|ida|e|imos|irme|irnos)\b/, 3],
    [/\bescap/, 3],
    [/\b(huir|huyo|huimos)\b/, 3],
    [/\b(volver|vuelvo|regreso|regresar)\b/, 2],
    [/\bque (hago|tengo que hacer|hay que hacer|hacemos)\b/, 2],
    [/\bcomo (hago|sigo|termino|lo logro)\b/, 2],
    [/\b(ayuda|ayudame|ayudarme|socorro)\b/, 2],
    [/\b(puerta|siguiente|paso)\b/, 1],
  ],
  simbolos: [
    [/\bsimbol/, 4],
    [/\bque tengo que (buscar|encontrar|ver|mirar)\b/, 4],
    [/\bbusc(ar|o|amos|as)\b/, 3],
    [/\bsign(o|os)\b/, 3],
    [/\bpizarr/, 3],
    [/\bpistas?\b/, 3],
    [/\b(acertijo|enigma|puzzle|desafio|juego)\b/, 3],
    [/\b(marcas?|dibujos?|figuras?)\b/, 2],
    [/\b(formas?|pared|paredes)\b/, 1],
    [/\b(pasillo|aula|2 e|segundo e)\b/, 1],
  ],
  mica: [
    [/\bmica(ela)?\b/, 3],
    [/\bque le paso\b/, 3],
    [/\b(esta|sigue) viva\b/, 3],
    [/\bdesaparec/, 2],
    [/\b(la duena|su duena|la chica)\b/, 2],
  ],
  ubicacion: [
    [/\bdonde (estas|andas|te encuentro|te metiste|vivis|queda|estan)\b/, 3],
    [/\bdesde donde\b/, 3],
    [/\b(en )?que (parte|lugar|piso|aula|sector|lado)\b/, 3],
    [/\bestas en el colegio\b/, 3],
    [/\bubica/, 2],
    [/\bdonde\b/, 1],
  ],
  identidad: [
    [/\bquien (sos|eres|es|sois|habla|me habla|me escribe|carajo|mierda)\b/, 3],
    [/\bcomo te (llamas|dicen)\b/, 3],
    [/\b(tu|su) nombre\b/, 3],
    [/\bsos (real|humano|humana|una persona|un fantasma|un espiritu|mica|un bot|una ia|vivo|viva)\b/, 3],
    [/\bque (sos|eres)\b/, 2],
    [/\bidentific/, 2],
    [/\b(quien|nombre|fantasma|espiritu)\b/, 1],
  ],
  peligro: [
    [/\b(hay )?alguien mas\b|\bhay alguien\b|\bhay otr/, 3],
    [/\bque (esta pasando|pasa|es esto|es este lugar|paso aca|onda)\b/, 3],
    [/\bpeligr/, 3],
    [/\bdimension/, 3],
    [/\b(monstruo|criatura|demonio|ente|sombra)s?\b/, 3],
    [/\bme (sigue|persigue|mira|observa)\b/, 3],
    [/\b(seguro|segura|a salvo)\b/, 2],
    [/\bmiedo\b/, 2],
    [/\b(luz|luces) roja|\brojo\b/, 2],
    [/\b(solo|sola|solos|raro|rara)\b/, 1],
  ],
  presentacion: [
    [/\b(me llamo|mi nombre es)\b/, 4],
    [/^soy\b|\bsoy (yo|un|una|amig|el|la)\b/, 3],
    [/\b(encontre|tengo|agarre) (el|su|este|tu) (celular|telefono)\b/, 3],
  ],
  gracias: [[/\b(gracias|grax|graciass|thanks)\b/, 2]],
  saludo: [[/\b(hola|holis|buenas|buen dia|hey|ey|alo|hello)\b/, 1]],
};

export function detectIntent(text) {
  const normalized = normalize(text);
  let best = null;
  let bestScore = 0;
  for (const [intent, patterns] of Object.entries(INTENTS)) {
    const score = patterns.reduce((sum, [pattern, weight]) => sum + (pattern.test(normalized) ? weight : 0), 0);
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }
  return best ?? "desconocido";
}

// Respuestas. Cada una devuelve { messages, clues }: los mensajes se envían
// de a uno (con «escribiendo…» antes de cada uno) y las pistas se agregan a
// las que el jugador ya conoce. `ctx`:
// - asked: cuántas veces se preguntó antes por esta intención.
// - clues: Set de pistas dadas ("dimension", "salida", "pasillo", "pizarron", "orden").
// - progress: { explored, classroom, solved } según lo que hizo en el colegio.
const cycle = (variants, n) => ({ messages: variants[n % variants.length], clues: [] });
const say = (messages, clues = []) => ({ messages, clues });

const REPLIES = {
  identidad: ({ asked }) =>
    cycle(
      [
        ["no importa quién soy.", "importa que vos todavía podés salir."],
        ["alguien que bajó las mismas escaleras que ella.", "hace mucho más tiempo."],
        ["tenía un nombre.", "acá adentro los nombres se gastan."],
        ["dejá de preguntar eso.", "cada vez que intento recordarlo, la señal se corta."],
      ],
      asked,
    ),

  ubicacion: ({ asked, progress }) => {
    if (progress.solved) return say(["sigo acá.", "la luz volvió para vos. para mí no."]);
    if (asked === 0) return say(["en el colegio.", "en el mismo que vos, pero del otro lado."]);
    if (asked === 1) {
      return say(["en el pasillo de las aulas.", "las luces son rojas y no se apagan nunca."], ["dimension"]);
    }
    return cycle(
      [
        ["no sé si es un lugar.", "a veces escucho pasos arriba. creo que son los tuyos."],
        ["cerca de la última puerta del pasillo.", "no me busques. no me vas a ver."],
      ],
      asked - 2,
    );
  },

  mica: ({ asked, progress }) => {
    if (progress.solved) return say(["si vos pudiste salir, ella también puede.", "no dejes de buscarla."]);
    return cycle(
      [
        ["la vi bajar las escaleras.", "bajaba y bajaba y nunca llegaba."],
        ["no está muerta.", "está acá. pero cada vez se escucha más lejos."],
        ["su teléfono te encontró a vos.", "por algo abriste ese locker."],
        ["no pierdas tiempo leyendo sus chats.", "ella necesita que salgas."],
      ],
      asked,
    );
  },

  peligro: ({ asked, clues, progress }) => {
    if (progress.solved) return say(["ahora estás a salvo.", "por ahora."]);
    if (!clues.has("dimension")) {
      return say(["el colegio que conocés ya no está.", "esto es una copia. torcida. roja."], ["dimension"]);
    }
    return cycle(
      [
        ["no sos lo único que se mueve acá.", "hay algo que camina cuando no mirás."],
        ["no te quedes quieto mucho tiempo en el mismo lugar."],
        ["las luces rojas no son luces."],
        ["cuanto más tardes, más se parece este lugar al de verdad.", "y menos ganas vas a tener de irte."],
      ],
      asked,
    );
  },

  salida: ({ asked, clues, progress }) => {
    if (progress.solved) return say(["ya saliste.", "no vuelvas a bajar esas escaleras."]);
    if (!clues.has("salida") && !clues.has("pasillo")) {
      return say(
        ["las puertas no sirven. todas te devuelven al mismo pasillo.", "la salida no se abre. se escribe."],
        ["salida", "dimension"],
      );
    }
    if (!clues.has("pasillo")) {
      return say(
        ["buscá en el pasillo.", `hay ${SYMBOL_COUNT} símbolos pintados en las paredes. solo se ven con esta luz.`],
        ["pasillo"],
      );
    }
    if (!clues.has("pizarron")) {
      return say(
        ["cuando los tengas, andá al aula del fondo. 2° E.", "el pizarrón te está esperando."],
        ["pizarron"],
      );
    }
    if (!clues.has("orden")) {
      return say(
        ["ya sabés el camino.", "lo que viste en el pasillo, dibujalo en el pizarrón. en el orden en que apareció."],
        ["orden"],
      );
    }
    return cycle(
      [
        ["no puedo decirte más.", "si el pizarrón no responde, borrá y volvé a intentar."],
        ["la salida está en tus manos. literalmente.", "tiza y pizarrón."],
      ],
      asked,
    );
  },

  simbolos: ({ asked, clues, progress }) => {
    if (progress.solved) return say(["los símbolos se apagaron cuando volvió la luz.", "ya no los vas a necesitar."]);
    if (!clues.has("pasillo")) {
      return say(
        ["están en el pasillo.", `${SYMBOL_COUNT}. pintados en la pared de las aulas.`, "brillan en rojo. si no los ves, caminá más."],
        ["pasillo"],
      );
    }
    if (!clues.has("pizarron")) {
      if (!progress.explored && asked < 2) {
        return say(["todavía no los viste, ¿no?", "seguí bajando. el pasillo está debajo de vos."]);
      }
      return say(
        [progress.explored ? "¿los viste? bien." : "no alcanza con verlos.", "hay que escribirlos.", "en el pizarrón del 2° E. la última puerta del pasillo."],
        ["pizarron"],
      );
    }
    if (!clues.has("orden")) {
      return say(
        ["el orden importa.", "dibujalos en el pizarrón uno al lado del otro, como fueron apareciendo mientras caminabas."],
        ["orden"],
      );
    }
    if (progress.classroom) {
      return cycle(
        [
          ["si el pizarrón no responde, borrá y empezá de nuevo.", "con calma. las formas tienen que entenderse."],
          ["no voy a decirte cuáles son.", "si los digo yo, no cuentan."],
        ],
        asked,
      );
    }
    return cycle(
      [
        ["no voy a decirte cuáles son.", "si los digo yo, no cuentan."],
        ["recorré el pasillo de punta a punta.", "y después, el 2° E."],
      ],
      asked,
    );
  },

  solucion: ({ asked }) =>
    cycle(
      [
        ["no.", "si te lo digo, se borra. así funciona acá."],
        ["no voy a confirmarte nada.", "el pizarrón sabe si tenés razón. yo no."],
        ["lo tenés que ver con tus propios ojos."],
        ["no insistas.", "caminá el pasillo y mirá las paredes."],
      ],
      asked,
    ),

  presentacion: ({ asked }) =>
    cycle(
      [
        ["no sos ella. ella escribe distinto.", "no importa quién seas. ahora este teléfono es tuyo."],
        ["ya sé.", "lo que no sé es cuánto tiempo te queda."],
      ],
      asked,
    ),

  gracias: ({ asked }) =>
    cycle([["no me agradezcas todavía."], ["agradeceme cuando salgas."]], asked),

  saludo: ({ asked }) =>
    cycle([["no hay tiempo para saludos."], ["seguís ahí. bien."], ["..."]], asked),

  desconocido: ({ asked }) =>
    cycle(
      [
        ["no te entiendo.", "acá adentro las palabras llegan rotas."],
        ["...", "la señal se corta. preguntame otra cosa."],
        ["no tengo tiempo para eso."],
        ["¿qué?"],
      ],
      asked,
    ),
};

// Si el jugador no logra hacer una pregunta que se entienda, el contacto lo
// encauza hacia lo importante.
const NUDGE = ["escuchame.", "preguntame cómo salir. es lo único que importa."];

export function replyTo(intent, { asked, clues, progress, misses }) {
  if (intent === "desconocido" && misses >= 2) return say(NUDGE);
  return REPLIES[intent]({ asked, clues, progress });
}
