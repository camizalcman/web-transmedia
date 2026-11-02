"use client";

import { useEffect } from "react";
import { markStep } from "@/lib/storyProgress";

// Atajo solo para desarrollo (npm run dev): con ?final en la URL la pagina
// arranca en el video del final, como si ya se hubiera jugado todo, para
// probar el cierre sin recorrer el juego. Con ?final=10 el video empieza en
// ese segundo (ver EndVideo). En la version publicada no hace nada.
export const DEV_FINAL_PARAM = "final";

export function devFinalStart() {
  if (process.env.NODE_ENV === "production") return null;
  const value = new URLSearchParams(window.location.search).get(DEV_FINAL_PARAM);
  const seconds = Number(value);
  return value && Number.isFinite(seconds) ? seconds : null;
}

const STEPS = ["photos-ordered", "phone-taken", "phone-unlocked", "contact-talked", "school-solved", "phone-returned"];

export default function DevShortcut() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!new URLSearchParams(window.location.search).has(DEV_FINAL_PARAM)) return;
    STEPS.forEach(markStep);
    // Lo mismo que hace el colegio al resolver el pizarron: arriba de todo
    // queda el video del final en lugar del de comienzo.
    document.querySelector(".landing")?.classList.add("is-finished");
    window.scrollTo(0, 0);
  }, []);
  return null;
}
