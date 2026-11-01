// Video del noticiero que abre la experiencia. Por defecto se sirve desde
// /public; para usar una URL publica (CDN, Firebase Storage, etc.) definir
// NEXT_PUBLIC_INTRO_VIDEO_URL en .env.local.
export const INTRO_VIDEO_SRC =
  process.env.NEXT_PUBLIC_INTRO_VIDEO_URL || "/videos/VideoIntro.mp4";

// Video del final, arriba de las evidencias después de resolver el pizarrón.
export const END_VIDEO_SRC = process.env.NEXT_PUBLIC_END_VIDEO_URL || "/videos/VideoFin.mp4";

// Evidencias que ingresan en escena durante el scroll: capturas de las
// cámaras del colegio (fotos en /public/img).
//
// - image: ruta de la foto. Si es null se muestra un bloque del color indicado.
// - enter: tramo del scroll (0 a 1) en el que la evidencia entra en escena.
// - exit:  punto desde el que retrocede para dejar lugar a las siguientes.
// - effect: "left" | "right" | "focus" | "mask" | "iris" | "drop".
// - desktop / mobile: centro (x, y en %), ancho (w) y profundidad de parallax.
export const evidence = [
  {
    id: "ev-01",
    label: "CÁMARA DEL PATIO",
    image: "/img/ev-patio.jpg",
    color: "#111",
    ratio: "16 / 9",
    rotate: -2,
    effect: "focus",
    enter: [0.03, 0.15],
    exit: 0.3,
    desktop: { x: 50, y: 45, w: 30, depth: -6 },
    mobile: { x: 27, y: 20, w: 43, depth: -3 },
  },
  {
    id: "ev-02",
    label: "CÁMARA PASILLO CENTRAL",
    image: "/img/ev-pasillo.jpg",
    color: "#111",
    ratio: "16 / 9",
    rotate: -5,
    effect: "left",
    enter: [0.13, 0.25],
    exit: 0.62,
    desktop: { x: 22, y: 29, w: 26, depth: -10 },
    mobile: { x: 73, y: 20, w: 43, depth: -3 },
  },
  {
    id: "ev-03",
    label: "CÁMARA AULA 2° E",
    // El archivo ev-lab.jpg es el que muestra el aula (CAM 12 AULA).
    image: "/img/ev-lab.jpg",
    color: "#111",
    ratio: "16 / 9",
    rotate: 4,
    effect: "right",
    enter: [0.23, 0.36],
    exit: 0.62,
    desktop: { x: 78, y: 33, w: 26, depth: -14 },
    mobile: { x: 27, y: 37, w: 43, depth: -3 },
  },
  {
    id: "ev-04",
    label: "CÁMARA LABORATORIO",
    // El archivo ev-aula.jpg es el que muestra el laboratorio (CAM 09 LAB).
    image: "/img/ev-aula.jpg",
    color: "#111",
    ratio: "16 / 9",
    rotate: 2,
    effect: "mask",
    enter: [0.34, 0.47],
    exit: 0.62,
    desktop: { x: 30, y: 72, w: 28, depth: -4 },
    mobile: { x: 73, y: 37, w: 43, depth: -3 },
  },
  {
    id: "ev-05",
    label: "CÁMARA ESCALERAS",
    image: "/img/ev-escaleras.jpg",
    color: "#111",
    ratio: "16 / 9",
    rotate: -6,
    effect: "drop",
    enter: [0.45, 0.58],
    exit: 0.62,
    desktop: { x: 71, y: 70, w: 25, depth: -12 },
    mobile: { x: 50, y: 55, w: 43, depth: -3 },
  },
  {
    id: "ev-06",
    label: "CÁMARA ASCENSOR",
    image: "/img/ev-ascensor.jpg",
    color: "#111",
    ratio: "16 / 9",
    rotate: 0,
    effect: "focus",
    enter: [0.62, 0.8],
    exit: null,
    desktop: { x: 50, y: 50, w: 34, depth: 0 },
    mobile: { x: 50, y: 78, w: 70, depth: -3 },
  },
];

// Desafío: al final del scroll las evidencias se acomodan en una grilla (en
// el orden de arriba, leída de izquierda a derecha y de arriba hacia abajo) y
// hay que arrastrarlas hasta dejarlas en orden por la hora de cada cámara:
// ev-02 ACCESO 07:45:12 · ev-06 ASCENSOR 07:48:05 · ev-05 ESCALERAS 07:51:24
// ev-03 AULA 08:35:14 · ev-01 PATIO 09:12:45 · ev-04 LAB 10:25:34
export const EVIDENCE_ORDER = ["ev-02", "ev-06", "ev-05", "ev-03", "ev-01", "ev-04"];

// Grilla del desafío: tramo del scroll en el que se forma y columnas en
// pantallas anchas y angostas (el tamaño de las fotos se calcula para que
// entren lo más grandes posible).
export const ROW = {
  start: 0.82,
  end: 0.95,
  wide: { cols: 3 },
  narrow: { cols: 2 },
};

// Evidencia del final: la cámara del acceso muestra a Mica saliendo. Aparece
// recién después de resolver el pizarrón, cuando el jugador vuelve a subir
// hasta las evidencias. `appear` es el tramo de la subida (cuánto se volvió
// desde el final de la sección, de 0 a 1) en el que entra en escena.
export const exitEvidence = {
  id: "ev-07",
  label: "CÁMARA ACCESO · SALIDA",
  image: "/img/salida.png",
  color: "#111",
  ratio: "1678 / 937",
  rotate: -1.5,
  effect: "drop",
  appear: [0.06, 0.3],
  desktop: { x: 50, y: 50, w: 52, depth: 0 },
  mobile: { x: 50, y: 50, w: 92, depth: 0 },
};
