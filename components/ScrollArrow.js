"use client";

import { useEffect, useState } from "react";

// true `delay` ms despues de que `active` pasa a true (y mientras siga en
// true). Sirve para que una flecha aparezca unos segundos despues de un paso.
export function useDelayed(active, delay) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setReady(true), delay);
    return () => window.clearTimeout(timer);
  }, [active, delay]);
  return active && ready;
}

// Flecha animada que indica hacia donde seguir scrolleando: abajo (pegada al
// borde inferior) o arriba (pegada al borde superior). Misma estetica que la
// flecha del video del comienzo. Aparece y se va con un fundido; mientras
// esta oculta no se puede tocar ni enfocar. Tocarla hace el scroll.
export default function ScrollArrow({ direction = "down", visible, onClick, label }) {
  return (
    <button
      className={`story-arrow story-arrow--${direction} ${visible ? "is-visible" : ""}`}
      onClick={onClick}
      aria-label={label}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <svg viewBox="0 0 24 36" aria-hidden="true">
        <path d={direction === "up" ? "M12 34V4M3 13l9-9 9 9" : "M12 2v30M3 23l9 9 9-9"} />
      </svg>
    </button>
  );
}
