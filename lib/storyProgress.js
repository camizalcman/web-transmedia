"use client";

import { useEffect, useState } from "react";

// Avance del recorrido de la portada: que pasos ya se completaron (sacar el
// celular del locker, desbloquearlo...). Vive solo en memoria: al recargar el
// recorrido empieza de nuevo, igual que el candado y el celular, que tambien
// vuelven a estar cerrados. Si se guardara, despues de jugarlo una vez la
// pagina quedaria abierta de punta a punta sin los topes de cada tramo.
// Avisa con un evento para que las secciones que esperan un paso aparezcan
// en el momento.
const EVENT = "senal-perdida-recorrido";
const completed = new Set();

export function hasStep(step) {
  return completed.has(step);
}

export function markStep(step) {
  completed.add(step);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: step }));
}

// true cuando el paso ya se completo en esta visita.
export function useStep(step) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const update = () => {
      if (hasStep(step)) setDone(true);
    };
    const initial = window.setTimeout(update, 0);
    window.addEventListener(EVENT, update);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener(EVENT, update);
    };
  }, [step]);

  return done;
}
