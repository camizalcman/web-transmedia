// Conversación con el «Número desconocido»: alguien atrapado en la dimensión
// paralela escribe al celular de Mica. Todo es local: se reconoce la intención
// del mensaje del jugador por palabras clave y se elige una respuesta según lo
// que ya se habló (pistas dadas) y si el acertijo ya se resolvió.
// El contacto orienta hacia el acertijo (símbolos del pasillo → pizarrón del
// 2° E) pero nunca dice cuáles son los símbolos ni su orden.

export const UNKNOWN_ID = "desconocido";
export const UNKNOWN_NAME = "Número desconocido";
export const FIRST_MESSAGE = "¿Quién está usando el teléfono de Mica?";
// Lo que escribe la primera vez que se abre el chat, si el jugador todavía no contestó.
export const FIRST_OPEN_MESSAGES = ["sé que estás leyendo.", "contestame. no hay mucho tiempo."];


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
    [/\b(la|una|esa|su) (chica|alumna|estudiante|piba|nena|duena|amiga|companera)\b/, 3],
    [/\b(chica|alumna|estudiante|piba|nena)\b/, 2],
    [/\bdesaparec/, 2],
    [/\bella\b/, 1],
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
// las que el jugador ya conoce. El chat ocurre antes de entrar al pasillo,
// así que las pistas avanzan por lo que se habló, no por lo que se hizo.
// `ctx`:
// - asked: cuántas veces se preguntó antes por esta intención.
// - clues: Set de pistas dadas ("dimension", "salida", "pasillo", "pizarron", "orden").
// Después de resolver el pizarrón quedan libres los dos (el contacto y Mica):
// cualquier mensaje recibe una respuesta de LIBERADO (ver replyTo).
const cycle = (variants, n) => ({ messages: variants[n % variants.length], clues: [] });
const say = (messages, clues = []) => ({ messages, clues });

const REPLIES = {
  identidad: ({ asked }) => {
    return cycle(
      [
        ["no importa quién soy.", "importa que vos todavía podés salir."],
        ["alguien que bajó las mismas escaleras que ella.", "hace mucho más tiempo."],
        ["tenía un nombre.", "acá adentro los nombres se gastan."],
        ["dejá de preguntar eso.", "cada vez que intento recordarlo, la señal se corta."],
      ],
      asked,
    );
  },

  ubicacion: ({ asked }) => {
    if (asked === 0) return say(["en el colegio.", "del otro lado."]);
    if (asked === 1) {
      return say(["en el pasillo de las aulas.", "las luces son rojas y no se apagan nunca."], ["dimension"]);
    }
    return cycle(
      [
        ["a veces los lugares se ven iguales.", "pero tienen más de una dimensión."],
        ["las realidades paralelas existen.", "lo difícil es no quedarse atrapado en ellas."],
        ["no sé si es un lugar.", "a veces escucho pasos arriba. creo que son los tuyos."],
      ],
      asked - 2,
    );
  },

  mica: ({ asked }) => {
    return cycle(
      [
        ["está acá. de este lado.", "el mismo colegio, el mismo pasillo. otro universo."],
        ["la vi bajar las escaleras.", "bajaba y bajaba y nunca llegaba."],
        ["no está muerta.", "pero cada vez se escucha más lejos."],
        ["su teléfono te encontró a vos.", "por algo abriste ese locker."],
        ["a veces la escucho llamar a su mamá.", "después, silencio."],
      ],
      asked,
    );
  },

  peligro: ({ asked, clues }) => {
    if (!clues.has("dimension")) {
      return say(["estamos en el mismo colegio.", "pero del otro lado."], ["dimension"]);
    }
    return cycle(
      [
        // La primera pregunta casi siempre da la pista de arriba: así esta
        // es la que suele salir después.
        ["las luces rojas no son luces."],
        ["no te quedes quieto mucho tiempo en el mismo lugar."],
        ["hay algo que camina cuando no mirás."],
        ["si escuchás pasos detrás tuyo, no te des vuelta."],
        ["anoche el pasillo era más corto.", "cada noche crece un poco."],
      ],
      asked,
    );
  },

  salida: ({ asked, clues }) => {
    if (!clues.has("salida") && !clues.has("pasillo")) {
      return say(
        ["las puertas no sirven.", "todas te devuelven al mismo pasillo.", "la salida no se abre. se escribe."],
        ["salida", "dimension"],
      );
    }
    if (!clues.has("pasillo")) return say(["buscá en el pasillo.", "prestá atención a los símbolos."], ["pasillo"]);
    if (!clues.has("pizarron")) return say(["entrá al aula.", "prestá atención al pizarrón."], ["pizarron"]);
    if (!clues.has("orden")) return say(["dibujá en el pizarrón.", "respetá el orden de los símbolos."], ["orden"]);
    return cycle(
      [
        ["no puedo decirte más.", "si el pizarrón no responde, borrá y volvé a intentar."],
        ["ya sabés lo que tenés que hacer.", "no pierdas más tiempo."],
      ],
      asked,
    );
  },

  simbolos: ({ asked, clues }) => {
    if (!clues.has("pasillo")) {
      return say(["están en el pasillo.", "prestá atención a las paredes.", "no todo se ve con la luz de siempre."], ["pasillo"]);
    }
    if (!clues.has("pizarron")) return say(["no alcanza con verlos.", "entrá al aula.", "el pizarrón."], ["pizarron"]);
    if (!clues.has("orden")) return say(["dibujalos.", "respetá el orden.", "el orden es todo."], ["orden"]);
    return cycle(
      [
        ["no voy a decirte cuáles son.", "si los digo yo, no cuentan."],
        ["no puedo decirte más.", "si el pizarrón no responde, borrá y volvé a intentar."],
      ],
      asked,
    );
  },

  solucion: ({ asked }) => {
    return cycle(
      [
        ["no.", "si te lo digo, se borra. así funciona acá."],
        ["no voy a confirmarte nada.", "el pizarrón sabe si tenés razón. yo no."],
        ["lo tenés que ver con tus propios ojos."],
        ["no insistas.", "caminá el pasillo y mirá las paredes."],
      ],
      asked,
    );
  },

  presentacion: ({ asked }) =>
    cycle(
      [
        ["no sos ella. ella escribe distinto.", "no importa quién seas. ahora este teléfono es tuyo."],
        ["ya sé.", "lo que no sé es cuánto tiempo te queda."],
      ],
      asked,
    ),

  gracias: ({ asked }) =>
    cycle([["no me agradezcas todavía."], ["agradeceme cuando salgamos."]], asked),

  saludo: ({ asked }) =>
    cycle([["no hay tiempo para saludos."], ["seguís ahí. bien."], ["..."]], asked),

  // Cualquier otra cosa: serio, apurado, con algo de miedo.
  desconocido: ({ asked }) =>
    cycle(
      [
        ["no tengo tiempo para esto."],
        ["no tengo tiempo para hablar de cualquier cosa.", "vamos a lo importante."],
        ["eso no importa ahora."],
        ["no hay tiempo para eso.", "algo se está acercando."],
        ["concentrate.", "cada minuto que perdés, el pasillo se hace más largo."],
        ["...", "la señal se corta. no la desperdicies."],
      ],
      asked,
    ),
};

// Si el jugador no logra hacer una pregunta que se entienda, el contacto lo
// encauza hacia lo importante.
const NUDGE = ["escuchame.", "centrate en lo importante."];

// Después del pizarrón: ya salieron, no quiere que lo sigan buscando.
const LIBERADO = [
  ["ya está.", "ya te liberaste. no me sigas escribiendo."],
  ["no me sigas molestando."],
  ["saliste. salimos.", "no vuelvas a buscarme."],
  ["dejá este teléfono.", "hay puertas que es mejor no volver a abrir."],
  ["no insistas.", "si seguís escribiendo, el pasillo te va a escuchar."],
  ["..."],
];

// `solved`: el acertijo ya se resolvió. `liberado` cuenta las respuestas
// dadas desde entonces (para no repetir).
export function replyTo(intent, { asked, clues, solved, liberado = 0, misses }) {
  if (solved) return cycle(LIBERADO, liberado);
  if (intent === "desconocido" && misses >= 2) return say(NUDGE);
  return REPLIES[intent]({ asked, clues });
}
