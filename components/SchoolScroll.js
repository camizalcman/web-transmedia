"use client";

import { useEffect, useRef, useState } from "react";
import SchoolScene from "@/components/SchoolScene";
import { markStep, useStep } from "@/lib/storyProgress";

const clamp = (value) => Math.min(Math.max(value, 0), 1);
// Despues de resolver: espera hasta que el mensaje del pizarron termino de
// escribirse y unos segundos mas antes de avisar que hay mensajes (ms).
const RETURN_NOTICE_DELAY = 8000;

// Continuacion del recorrido despues del celular: el colegio en la dimension
// paralela. La escena entra con el scroll y, cuando ocupa la pantalla, ya se
// puede recorrer con las flechas (o los botones tactiles). Sin carteles: solo
// un dibujo de las flechas hasta el primer paso, y el puntero cambia sobre lo
// que se puede usar. El acertijo resuelto vale mientras la pagina esta
// abierta: al recargar, el colegio vuelve a la dimension paralela.
export default function SchoolScroll({ handFont, boardFont }) {
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
  const [returnNotice, setReturnNotice] = useState(false);
  // El aviso queda hasta que el jugador vuelve al celular.
  const returned = useStep("phone-returned");

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

  useEffect(() => {
    if (!solved) return;
    const timer = window.setTimeout(() => setReturnNotice(true), RETURN_NOTICE_DELAY);
    return () => window.clearTimeout(timer);
  }, [solved]);

  // Resolver el acertijo queda marcado en el recorrido: el número
  // desconocido deja de estar atrapado, el celular recibe los mensajes de
  // Mica y los lockers vuelven a tener luz normal.
  function handleSolved() {
    markStep("school-solved");
    setSolved(true);
    lockAbove();
  }

  // Tocar el aviso sube hasta el celular (tambien se puede scrollear).
  function goToPhone() {
    const phone = document.querySelector(".phone-scroll");
    if (!phone) return;
    window.scrollTo({ top: phone.offsetTop + phone.offsetHeight * 0.8 - window.innerHeight, behavior: "smooth" });
  }

  // Al resolver el acertijo el recorrido vuelve hacia arriba: celular,
  // lockers y evidencias (con la foto de la salida). Se oculta el video del
  // comienzo, así las evidencias son el tope, sin que la vista salte.
  function lockAbove() {
    const section = sectionRef.current;
    const landing = section?.closest(".landing");
    if (!landing) return;
    const offset = window.scrollY - section.offsetTop;
    landing.classList.add("is-finished");
    window.scrollTo({ top: section.offsetTop + offset, behavior: "instant" });
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
            boardFont={boardFont}
            onPlace={setPlace}
            onLoading={setLoading}
            onMoved={() => setMoved(true)}
            onDrawing={setDrawing}
            onSolved={handleSolved}
          />
        )}
        <div className="school-vignette" aria-hidden="true" />
        <div ref={fadeRef} className="school-fade" aria-hidden="true" />

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

        {returnNotice && !returned && (
          <button className="school-return" onClick={goToPhone} aria-label="Hay mensajes sin leer. Volver al celular">
            <span className="school-return-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3a6 6 0 0 0-6 6v3.6L4.3 15.5A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.5L18 12.6V9a6 6 0 0 0-6-6z" fill="currentColor" />
                <path d="M9.5 19a2.5 2.5 0 0 0 5 0z" fill="currentColor" />
              </svg>
              <b />
            </span>
            <strong>Hay mensajes sin leer</strong>
            <span className="school-return-arrow" aria-hidden="true">↑</span>
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
