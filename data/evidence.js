// Video del noticiero que abre la experiencia. Por defecto se sirve desde
// /public; para usar una URL publica (CDN, Firebase Storage, etc.) definir
// NEXT_PUBLIC_INTRO_VIDEO_URL en .env.local.
export const INTRO_VIDEO_SRC =
  process.env.NEXT_PUBLIC_INTRO_VIDEO_URL || "/video-inicial.mp4";

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
    desktop: { x: 50, y: 50, w: 44, depth: 0 },
    mobile: { x: 50, y: 78, w: 86, depth: -3 },
  },
];
