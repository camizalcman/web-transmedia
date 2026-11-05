"use client";

import { useEffect, useState } from "react";
import { clearCloudChat, recordStep } from "@/lib/cloudSave";

// Avance del recorrido de la portada: que pasos ya se completaron (sacar el
// celular del locker, desbloquearlo...). Vive solo en memoria: al recargar el
// recorrido empieza de nuevo, igual que el candado y el celular, que tambien
// vuelven a estar cerrados. Si se guardara, despues de jugarlo una vez la
// pagina quedaria abierta de punta a punta sin los topes de cada tramo.
// Cada paso nuevo se registra en Firebase como logro (ver cloudSave), pero
// eso no cambia lo de arriba: la nube no reabre el recorrido.
// Avisa con un evento para que las secciones que esperan un paso aparezcan
// en el momento.
const EVENT = "senal-perdida-recorrido";
const completed = new Set();

// Unico dato del juego que se guarda en el navegador: el chat con el número
// desconocido (ver useUnknownContact; tambien se sube a la nube). Todo lo
// demas vive en memoria.
export const UNKNOWN_CONTACT_STORAGE_KEY = "senal-perdida:numero-desconocido";
const GAME_STORAGE_KEYS = [UNKNOWN_CONTACT_STORAGE_KEY];

// Reinicia la experiencia como si se entrara por primera vez: borra solo los
// datos guardados del juego (no el resto del almacenamiento del navegador) y
// vuelve a cargar la pagina desde arriba, sin parametros en la direccion. Al recargar, todo lo que vive en memoria
// (pasos del recorrido, fotos, candado, celular, pizarron, videos) vuelve a
// su estado inicial. Tambien se borra el chat guardado en la nube (si no, al
// recargar volveria); los logros y la cantidad de partidas se conservan.
export async function resetGame() {
  await clearCloudChat();
  GAME_STORAGE_KEYS.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Sin acceso al almacenamiento no hay nada guardado que borrar.
    }
  });
  completed.clear();
  if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  // Se carga la direccion limpia (sin parametros como el atajo ?final).
  window.location.replace(window.location.pathname);
}

export function hasStep(step) {
  return completed.has(step);
}

export function markStep(step) {
  if (!completed.has(step)) recordStep(step);
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
