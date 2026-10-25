"use client";

import { useEffect, useState } from "react";

// Avance del recorrido de la portada: que pasos ya se completaron (sacar el
// celular del locker, desbloquearlo...). Se guarda en localStorage, como el
// resto del progreso local, y avisa con un evento para que las secciones que
// esperan ese paso aparezcan en el momento.
const STORAGE_KEY = "senal-perdida-recorrido";
const EVENT = "senal-perdida-recorrido";

function readSteps() {
  try {
    const steps = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(steps) ? steps : [];
  } catch {
    return [];
  }
}

export function hasStep(step) {
  return readSteps().includes(step);
}

export function markStep(step) {
  const steps = readSteps();
  if (!steps.includes(step)) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...steps, step]));
    } catch {
      // Sin almacenamiento el avance vale solo para esta visita (via el evento).
    }
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: step }));
}

// true cuando el paso ya se completo (en esta visita o en una anterior).
export function useStep(step) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const update = (event) => {
      if (event?.detail === step || hasStep(step)) setDone(true);
    };
    const initial = window.setTimeout(update, 0);
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [step]);

  return done;
}
