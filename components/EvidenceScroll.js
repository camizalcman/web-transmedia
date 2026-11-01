"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { EVIDENCE_ORDER, ROW, evidence, exitEvidence } from "@/data/evidence";
import { markStep, useStep } from "@/lib/storyProgress";

const clamp = (value) => Math.min(Math.max(value, 0), 1);
const range = (progress, start, end) => clamp((progress - start) / (end - start));
const easeOut = (value) => 1 - (1 - value) ** 3;
const easeInOut = (value) => (value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2);
// Mismo corte que el CSS para la version angosta.
const NARROW = "(max-width: 900px)";

// Espacio reservado arriba (barra del expediente) y abajo, epigrafe de cada
// foto y separacion entre fotos (px).
const GRID = { top: 78, bottom: 36, caption: 26, gapY: 26, ratio: 9 / 16 };

// Lugar de cada posicion de la grilla dentro del tablero: centro (x, y) y
// ancho de la foto, en px.
function gridLayout(width, height, count) {
  const { cols } = window.matchMedia(NARROW).matches ? ROW.narrow : ROW.wide;
  const rows = Math.ceil(count / cols);
  const gapX = Math.max(width * 0.025, 10);
  const byWidth = (width * 0.92 - (cols - 1) * gapX) / cols;
  const usable = height - GRID.top - GRID.bottom - (rows - 1) * GRID.gapY;
  const byHeight = (usable / rows - GRID.caption) / GRID.ratio;
  const photo = Math.max(Math.min(byWidth, byHeight), 60);
  const pitchX = photo + gapX;
  const pitchY = photo * GRID.ratio + GRID.caption + GRID.gapY;
  const middle = GRID.top + (height - GRID.top - GRID.bottom) / 2;
  return {
    cols,
    rows,
    photo,
    slot: (index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        col,
        row,
        x: width / 2 + (col - (cols - 1) / 2) * pitchX,
        y: middle + (row - (rows - 1) / 2) * pitchY,
      };
    },
  };
}

// Mueve `id` a la posicion `index` dentro de `order`.
function moveTo(order, id, index) {
  const rest = order.filter((item) => item !== id);
  return [...rest.slice(0, index), id, ...rest.slice(index)];
}

// Las evidencias entran con el scroll y, en el ultimo tramo, se acomodan en
// una grilla. Ahi empieza el desafio: se pueden arrastrar (mouse o dedo) para
// ordenarlas por la hora de cada camara. Cuando quedan en el orden correcto
// se marca "photos-ordered" y aparecen los lockers. Despues quedan fijas en
// ese orden (tambien al volver al final del recorrido).
export default function EvidenceScroll({ id }) {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const boardRef = useRef(null);
  const itemRefs = useRef([]);
  const exitRef = useRef(null);
  const [found, setFound] = useState(0);
  const [order, setOrder] = useState(() => evidence.map((item) => item.id));
  const orderRef = useRef(order);
  const [rowReady, setRowReady] = useState(false);
  // Flecha para seguir bajando, hasta que las fotos forman la grilla.
  const [scrollCue, setScrollCue] = useState(true);
  const dragRef = useRef(null);
  // Después del pizarrón se suma la foto de la salida.
  const escaped = useStep("school-solved");
  const ordered = useStep("photos-ordered");
  const sortable = rowReady && !ordered;
  const sortableRef = useRef(sortable);
  const items = escaped ? [...evidence, exitEvidence] : evidence;

  useEffect(() => {
    sortableRef.current = sortable;
  });

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let target = 0;
    let current = 0;
    let frame = 0;

    function measure() {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      target = clamp(-rect.top / Math.max(total, 1));
    }

    // El scroll solo actualiza variables CSS: las transformaciones las
    // resuelve el navegador sin re-renderizar React en cada cuadro.
    function render(progress) {
      stage.style.setProperty("--p", progress.toFixed(4));
      // De la disposicion suelta a la fila del desafio.
      const row = easeInOut(range(progress, ROW.start, ROW.end));
      // En la grilla la viñeta de los bordes se va (taparia la hora de las fotos).
      stage.style.setProperty("--row", row.toFixed(4));

      let count = 0;
      evidence.forEach((item, index) => {
        const enter = easeOut(range(progress, item.enter[0], item.enter[1]));
        const exit = item.exit === null ? 0 : range(progress, item.exit, item.exit + 0.1);
        const node = itemRefs.current[index];
        node.style.setProperty("--t", enter.toFixed(4));
        // En la fila ninguna queda atras ni oscurecida.
        node.style.setProperty("--o", (exit * (1 - row)).toFixed(4));
        node.style.setProperty("--r", row.toFixed(4));
        if (enter > 0.9) count += 1;
      });

      // La foto de la salida entra a medida que se sube desde el final.
      const exitNode = exitRef.current;
      if (exitNode) {
        const [from, to] = exitEvidence.appear;
        const enter = easeOut(range(1 - progress, from, to));
        exitNode.style.setProperty("--t", enter.toFixed(4));
        // La flecha para seguir subiendo aparece con la foto.
        stage.style.setProperty("--exit", enter.toFixed(4));
        stage.dataset.exit = enter > 0.5 ? "on" : "";
        if (enter > 0.9) count += 1;
      }

      setFound(count);
      setRowReady(row > 0.999);
      setScrollCue(progress < ROW.end - 0.01);
    }

    // Interpolacion suave hacia el valor real del scroll (efecto de camara).
    function tick() {
      current += (target - current) * 0.12;
      if (Math.abs(target - current) < 0.0005) current = target;
      render(current);
      frame = current === target ? 0 : requestAnimationFrame(tick);
    }

    function handleScroll() {
      measure();
      if (reduceMotion) {
        current = target;
        render(current);
        return;
      }
      if (!frame) frame = requestAnimationFrame(tick);
    }

    measure();
    current = target;
    render(current);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  // --- Grilla ---------------------------------------------------------------
  // Ubica cada foto en su lugar de la grilla (variables CSS en px). Las de los
  // bordes se agrandan hacia adentro al pasar el mouse.
  function placeInGrid(node, slot, layout) {
    const { x, y, col, row } = layout.slot(slot);
    node.style.setProperty("--rx", `${x}px`);
    node.style.setProperty("--ry", `${y}px`);
    node.style.setProperty("--rw", `${layout.photo}px`);
    const originX = layout.cols > 1 ? (col / (layout.cols - 1)) * 100 - 50 : 0;
    const originY = layout.rows > 1 ? (row / (layout.rows - 1)) * 100 - 50 : 0;
    node.style.setProperty("--ox", `${originX}%`);
    node.style.setProperty("--oy", `${originY}%`);
  }

  function currentLayout() {
    const board = boardRef.current;
    return gridLayout(board.clientWidth, board.clientHeight, evidence.length);
  }

  function layoutGrid() {
    const layout = currentLayout();
    evidence.forEach((item, index) => {
      const node = itemRefs.current[index];
      if (node) placeInGrid(node, orderRef.current.indexOf(item.id), layout);
    });
  }

  useLayoutEffect(() => {
    orderRef.current = order;
    layoutGrid();
  });

  useEffect(() => {
    window.addEventListener("resize", layoutGrid);
    return () => window.removeEventListener("resize", layoutGrid);
  });

  // --- Arrastre -------------------------------------------------------------
  // Posicion de cada lugar de la grilla en px de pantalla.
  function slotGeometry() {
    const rect = boardRef.current.getBoundingClientRect();
    const layout = currentLayout();
    const count = orderRef.current.length;
    const centerOf = (slot) => {
      const { x, y } = layout.slot(slot);
      return { x: rect.left + x, y: rect.top + y };
    };
    return {
      layout,
      centerOf,
      nearest: (point) => {
        let best = 0;
        let bestDistance = Infinity;
        for (let slot = 0; slot < count; slot += 1) {
          const center = centerOf(slot);
          const distance = Math.hypot(point.x - center.x, point.y - center.y);
          if (distance < bestDistance) {
            best = slot;
            bestDistance = distance;
          }
        }
        return best;
      },
    };
  }

  function startDrag(event, itemId) {
    if (!sortableRef.current || dragRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    const node = event.currentTarget;
    node.setPointerCapture(event.pointerId);
    const geometry = slotGeometry();
    const center = geometry.centerOf(orderRef.current.indexOf(itemId));
    dragRef.current = {
      id: itemId,
      node,
      pointerId: event.pointerId,
      grab: { x: event.clientX - center.x, y: event.clientY - center.y },
    };
    node.classList.add("is-dragging");
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const geometry = slotGeometry();
    const point = { x: event.clientX - drag.grab.x, y: event.clientY - drag.grab.y };
    const slot = geometry.nearest(point);
    if (orderRef.current.indexOf(drag.id) !== slot) {
      const next = moveTo(orderRef.current, drag.id, slot);
      orderRef.current = next;
      // El lugar de la foto que se arrastra se actualiza ya (el resto, en el
      // proximo render) para que no salte bajo el puntero.
      placeInGrid(drag.node, slot, geometry.layout);
      setOrder(next);
    }
    const target = geometry.centerOf(slot);
    drag.node.style.setProperty("--dx", `${point.x - target.x}px`);
    drag.node.style.setProperty("--dy", `${point.y - target.y}px`);
  }

  function endDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    drag.node.classList.remove("is-dragging");
    drag.node.style.setProperty("--dx", "0px");
    drag.node.style.setProperty("--dy", "0px");
    // Validacion automatica despues de cada movimiento, por identificador.
    if (orderRef.current.every((itemId, index) => itemId === EVIDENCE_ORDER[index])) {
      markStep("photos-ordered");
    }
  }

  const boardClass = ["evidence-board", sortable && "is-sortable", ordered && "is-ordered"].filter(Boolean).join(" ");

  return (
    <section ref={sectionRef} id={id} className="evidence-scroll" aria-label="Evidencias de la desaparición">
      <div ref={stageRef} className="evidence-stage">
        <div className="evidence-grid" aria-hidden="true" />

        <header className="evidence-hud">
          <span>EXPEDIENTE N.º 0613 / DESAPARICIÓN</span>
          <span>
            EVIDENCIAS <b>{String(found).padStart(2, "0")}</b>/{String(items.length).padStart(2, "0")}
          </span>
        </header>

        <div ref={boardRef} className={boardClass}>
          {items.map((item, index) => {
            const isExit = item === exitEvidence;
            return (
              <figure
                key={item.id}
                ref={(node) => {
                  if (isExit) exitRef.current = node;
                  else itemRefs.current[index] = node;
                }}
                className={`evidence evidence--${item.effect} ${isExit ? "evidence--exit" : ""}`}
                style={{
                  "--x": `${item.desktop.x}%`,
                  "--y": `${item.desktop.y}%`,
                  "--w": `${item.desktop.w}vw`,
                  "--depth": `${item.desktop.depth}vh`,
                  "--mx": `${item.mobile.x}%`,
                  "--my": `${item.mobile.y}%`,
                  "--mw": `${item.mobile.w}vw`,
                  "--mdepth": `${item.mobile.depth}vh`,
                  "--ratio": item.ratio,
                  "--rot": `${item.rotate}deg`,
                  "--tone": item.color,
                  zIndex: isExit ? 11 : index + 1,
                }}
                onPointerDown={isExit ? undefined : (event) => startDrag(event, item.id)}
                onPointerMove={isExit ? undefined : moveDrag}
                onPointerUp={isExit ? undefined : endDrag}
                onPointerCancel={isExit ? undefined : endDrag}
              >
                <div className="evidence-media">
                  {item.image ? (
                    <Image src={item.image} alt={item.label} fill sizes="(max-width: 900px) 90vw, 40vw" draggable={false} />
                  ) : (
                    <span className="evidence-placeholder" aria-hidden="true">
                      <b>{String(index + 1).padStart(2, "0")}</b>
                      <small>PLACEHOLDER · {item.id}</small>
                    </span>
                  )}
                </div>
                <figcaption>
                  <span>{item.id.toUpperCase()}</span> {item.label}
                </figcaption>
              </figure>
            );
          })}
        </div>

        {/* La misma flecha del video del comienzo: hay que seguir bajando. */}
        <button
          className={`scroll-cue evidence-down ${scrollCue && !escaped ? "is-visible" : ""}`}
          onClick={() => {
            const section = sectionRef.current;
            const total = section.offsetHeight - window.innerHeight;
            window.scrollTo({ top: section.offsetTop + total * ROW.end, behavior: "smooth" });
          }}
          aria-label="Seguir bajando"
          tabIndex={scrollCue && !escaped ? 0 : -1}
        >
          <svg viewBox="0 0 24 36" aria-hidden="true">
            <path d="M12 2v30M3 23l9 9 9-9" />
          </svg>
        </button>

        {escaped && (
          <button
            className="evidence-up"
            onClick={() => document.querySelector(".end-video")?.scrollIntoView({ behavior: "smooth" })}
            aria-label="Seguir subiendo"
          >
            <svg viewBox="0 0 24 36" aria-hidden="true">
              <path d="M12 34V4M3 13l9-9 9 9" />
            </svg>
          </button>
        )}

        <div className="evidence-progress" aria-hidden="true" />
      </div>
    </section>
  );
}
