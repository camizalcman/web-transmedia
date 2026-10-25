// Reconocimiento de simbolos dibujados a mano: circulo, cruz, cuadrado (o
// cualquier figura de cuatro lados, como un rombo) y triangulo. Trabaja solo
// con los puntos de los trazos (sin servicios externos) usando rasgos
// geometricos que toleran dibujos imperfectos:
//
// - Los trazos se agrupan en simbolos segun se superponen en horizontal (la
//   secuencia se dibuja de izquierda a derecha).
// - Una cruz son dos trazos casi rectos que se cortan cerca de su mitad.
// - Para las figuras cerradas se usa la envolvente convexa de todos sus
//   puntos y se compara su area con la del mayor triangulo y el mayor
//   cuadrilatero inscriptos en ella: en un triangulo el mayor triangulo
//   ocupa casi todo; en un cuadrado, el mayor cuadrilatero; en un circulo
//   ninguno de los dos (≈ 41 % y ≈ 64 %), y ademas su contorno es "redondo"
//   (perimetro² / area cerca de 4π).
//
// Un trazo es un array de puntos { x, y } en pixeles.

export const SHAPES = ["circle", "cross", "square", "triangle"];

// Separa los trazos en simbolos, ordenados de izquierda a derecha.
export function groupStrokes(strokes, gap = 0) {
  const items = strokes
    .filter((stroke) => stroke.length > 1)
    .map((stroke) => ({ strokes: [stroke], ...bounds(stroke) }))
    .sort((a, b) => a.minX - b.minX);
  const groups = [];
  for (const item of items) {
    const last = groups.at(-1);
    // Se une al simbolo anterior si se superponen en X (con algo de margen,
    // proporcional al tamaño del trazo mas chico).
    const margin = gap + Math.min(item.maxX - item.minX, last ? last.maxX - last.minX : 0) * 0.15;
    if (last && item.minX <= last.maxX + margin) {
      last.strokes.push(...item.strokes);
      last.minX = Math.min(last.minX, item.minX);
      last.maxX = Math.max(last.maxX, item.maxX);
      last.minY = Math.min(last.minY, item.minY);
      last.maxY = Math.max(last.maxY, item.maxY);
    } else {
      groups.push({ ...item });
    }
  }
  return groups.map((group) => group.strokes);
}

// Clasifica un simbolo (sus trazos). Devuelve { shape, ...rasgos } con
// shape = "circle" | "cross" | "square" | "triangle" | null.
export function classifySymbol(strokes) {
  const points = strokes.flat();
  const box = bounds(points);
  const size = Math.max(box.maxX - box.minX, box.maxY - box.minY);
  if (points.length < 4 || size < 8) return { shape: null, reason: "muy chico" };

  if (isCross(strokes, size)) return { shape: "cross" };

  const hull = convexHull(resample(points, 160));
  const area = polygonArea(hull);
  if (area < size * size * 0.05) return { shape: null, reason: "no es una figura cerrada" };
  const perimeter = polygonPerimeter(hull);
  const roundness = (perimeter * perimeter) / area; // circulo 12.6, cuadrado 16, triangulo 20.8
  const reduced = reduceHull(hull, 28);
  const triangle = largestTriangle(reduced) / area;
  const quad = largestQuad(reduced) / area;
  const features = { roundness, triangle, quad };

  if (triangle > 0.78) return { shape: "triangle", ...features };
  if (quad > 0.84 && triangle < 0.72) return { shape: "square", ...features };
  if (quad < 0.82 && roundness < 14.6) return { shape: "circle", ...features };
  // Casos dudosos: se decide por el rasgo mas claro.
  if (roundness < 13.6) return { shape: "circle", ...features };
  if (triangle > 0.7) return { shape: "triangle", ...features };
  if (quad > 0.8) return { shape: "square", ...features };
  return { shape: null, reason: "forma no reconocida", ...features };
}

// Reconoce una secuencia completa. Devuelve los simbolos detectados y si
// coincide con la esperada.
export function recognizeSequence(strokes, expected) {
  const groups = groupStrokes(strokes);
  const symbols = groups.map(classifySymbol);
  const shapes = symbols.map((symbol) => symbol.shape);
  const correct =
    shapes.length === expected.length && shapes.every((shape, index) => shape === expected[index]);
  return { correct, shapes, symbols };
}

// --- Cruz -------------------------------------------------------------------

function isCross(strokes, size) {
  const straight = strokes.filter((stroke) => pathLength(stroke) > size * 0.35);
  if (straight.length < 2) return false;
  // Los dos trazos mas largos tienen que ser casi rectos y cortarse cerca de
  // su mitad (en un triangulo de tres trazos se tocan en las puntas).
  const [a, b] = [...straight].sort((x, y) => pathLength(y) - pathLength(x));
  if (straightness(a) < 0.75 || straightness(b) < 0.75) return false;
  const hit = segmentIntersection(a[0], a.at(-1), b[0], b.at(-1));
  if (!hit) return false;
  const inner = (t) => t > 0.2 && t < 0.8;
  if (!inner(hit.t) || !inner(hit.u)) return false;
  // Que no sean casi paralelos.
  const angle = Math.abs(direction(a) - direction(b)) % Math.PI;
  return Math.min(angle, Math.PI - angle) > 0.6;
}

function straightness(stroke) {
  return distance(stroke[0], stroke.at(-1)) / Math.max(pathLength(stroke), 1e-6);
}

function direction(stroke) {
  return Math.atan2(stroke.at(-1).y - stroke[0].y, stroke.at(-1).x - stroke[0].x);
}

function segmentIntersection(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { t, u } : null;
}

// --- Geometria --------------------------------------------------------------

function bounds(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pathLength(stroke) {
  let length = 0;
  for (let i = 1; i < stroke.length; i += 1) length += distance(stroke[i - 1], stroke[i]);
  return length;
}

// Toma como mucho `count` puntos repartidos (para acotar el calculo).
function resample(points, count) {
  if (points.length <= count) return points;
  const step = points.length / count;
  return Array.from({ length: count }, (_, i) => points[Math.floor(i * step)]);
}

// Envolvente convexa (monotone chain), en sentido antihorario.
function convexHull(points) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function polygonArea(polygon) {
  let area = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

function polygonPerimeter(polygon) {
  let length = 0;
  for (let i = 0; i < polygon.length; i += 1) length += distance(polygon[i], polygon[(i + 1) % polygon.length]);
  return length;
}

// Deja la envolvente con a lo sumo `count` vertices (los mas alejados entre si
// a lo largo del contorno), suficiente para buscar los poligonos inscriptos.
function reduceHull(hull, count) {
  if (hull.length <= count) return hull;
  const perimeter = polygonPerimeter(hull);
  const step = perimeter / count;
  const result = [hull[0]];
  let travelled = 0;
  let next = step;
  for (let i = 1; i < hull.length; i += 1) {
    travelled += distance(hull[i - 1], hull[i]);
    if (travelled >= next) {
      result.push(hull[i]);
      next += step;
    }
  }
  return result;
}

function triangleArea(a, b, c) {
  return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
}

function largestTriangle(points) {
  let best = 0;
  const n = points.length;
  for (let i = 0; i < n; i += 1)
    for (let j = i + 1; j < n; j += 1)
      for (let k = j + 1; k < n; k += 1) best = Math.max(best, triangleArea(points[i], points[j], points[k]));
  return best;
}

// Los vertices estan en orden convexo, asi que el cuadrilatero i-j-k-l es la
// suma de dos triangulos.
function largestQuad(points) {
  let best = 0;
  const n = points.length;
  for (let i = 0; i < n; i += 1)
    for (let j = i + 1; j < n; j += 1)
      for (let k = j + 1; k < n; k += 1)
        for (let l = k + 1; l < n; l += 1) {
          const area = triangleArea(points[i], points[j], points[k]) + triangleArea(points[i], points[k], points[l]);
          if (area > best) best = area;
        }
  return best;
}
