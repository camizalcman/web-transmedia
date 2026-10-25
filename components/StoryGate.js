"use client";

import { useStep } from "@/lib/storyProgress";

// Muestra su contenido recien cuando se completo `step` en el recorrido.
// Mientras tanto la seccion no existe, asi que no se puede scrollear hasta ella.
export default function StoryGate({ step, children }) {
  return useStep(step) ? children : null;
}
