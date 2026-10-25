"use client";

import { useEffect, useRef, useState } from "react";
import SchoolScene from "@/components/SchoolScene";

const clamp = (value) => Math.min(Math.max(value, 0), 1);

// Continuacion del recorrido despues del celular: el colegio en la dimension
// paralela. La escena entra con el scroll y, cuando ocupa la pantalla, ya se
// puede recorrer con las flechas (o los botones tactiles). Sin carteles: solo
// un dibujo de las flechas hasta el primer paso, y el puntero cambia sobre lo
// que se puede usar. El acertijo resuelto vale mientras la pagina esta
// abierta: al recargar, el colegio vuelve a la dimension paralela.
export default function SchoolScroll({ handFont }) {
  const sectionRef = useRef(null);
  const entranceRef = useRef(0);
  const fadeRef = useRef(null);
  const moveRef = useRef({ forward: 0, turn: 0 });
  const apiRef = useRef(null);
  const [near, setNear] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [moved, setMoved] = useState(false);
  const [solved, setSolved] = useState(false);
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;

    // La escena se crea cuando la seccion se acerca, como el celular.
    const proximity = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: "100% 0px" },
    );
    proximity.observe(section);

    // 0 cuando la seccion asoma por abajo, 1 cuando ocupa toda la pantalla.
    function handleScroll() {
      const rect = section.getBoundingClientRect();
      entranceRef.current = clamp((window.innerHeight - rect.top) / window.innerHeight);
      setArrived(entranceRef.current > 0.96 && rect.bottom > window.innerHeight * 0.5);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      proximity.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  function handleSolved() {
    setSolved(true);
  }

  // Botones tactiles: mientras se mantienen apretados mueven o giran.
  const hold = (axis, value) => ({
    onPointerDown: (event) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      moveRef.current[axis] = value;
    },
    onPointerUp: () => {
      moveRef.current[axis] = 0;
    },
    onPointerCancel: () => {
      moveRef.current[axis] = 0;
    },
  });

  const placeLabel = place === "classroom" ? "AULA 2° E" : "PASILLO";
  const stageClass = [
    "school-stage",
    solved && "is-normal",
    arrived && "is-active",
    drawing && "is-drawing",
  ].filter(Boolean).join(" ");

  return (
    <section
      ref={sectionRef}
      className={`school-scroll ${solved ? "is-normal" : ""}`}
      aria-label="El colegio en una dimensión paralela"
    >
      <div className={stageClass}>
        {near && (
          <SchoolScene
            entranceRef={entranceRef}
            fadeRef={fadeRef}
            moveRef={moveRef}
            apiRef={apiRef}
            exploring={arrived}
            solved={solved}
            handFont={handFont}
            onPlace={setPlace}
            onLoading={setLoading}
            onMoved={() => setMoved(true)}
            onDrawing={setDrawing}
            onSolved={handleSolved}
          />
        )}
        <div className="school-vignette" aria-hidden="true" />
        <div ref={fadeRef} className="school-fade" aria-hidden="true" />

        <header className="school-hud">
          <span>
            <i>●</i> {placeLabel} · {solved ? "REALIDAD" : "DIMENSIÓN PARALELA"}
          </span>
        </header>

        {loading && <p className="school-loading" role="status">{loading}</p>}

        {/* Las flechas del teclado, dibujadas, hasta que se da el primer paso. */}
        {arrived && !moved && !loading && place !== "classroom" && (
          <div className="school-keys" aria-label="Usá las flechas del teclado para moverte">
            <span>↑</span>
            <span>←</span>
            <span>↓</span>
            <span>→</span>
          </div>
        )}

        {arrived && !drawing && (
          <div className="school-pad" aria-label="Controles de movimiento">
            <button {...hold("forward", 1)} aria-label="Avanzar">▲</button>
            <button {...hold("turn", -1)} aria-label="Girar a la izquierda">◀</button>
            <button {...hold("forward", -1)} aria-label="Retroceder">▼</button>
            <button {...hold("turn", 1)} aria-label="Girar a la derecha">▶</button>
          </div>
        )}

        {/* Borrador: lo unico que aparece mientras se dibuja. */}
        {drawing && (
          <button className="school-eraser" onClick={() => apiRef.current?.clear()} aria-label="Borrar el pizarrón">
            <svg viewBox="0 0 48 28" aria-hidden="true">
              <rect x="2" y="2" width="44" height="12" rx="2" />
              <rect x="2" y="14" width="44" height="12" rx="1" />
            </svg>
          </button>
        )}

        {!arrived && (
          <p className="school-credit">
            Modelos de Sketchfab (CC BY 4.0): “School_[hallway]” por yuuuusukeeee · “Japanese Classroom” por T I A N
          </p>
        )}
      </div>
    </section>
  );
}
