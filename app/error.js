"use client";

import Link from "next/link";
import { useEffect } from "react";

// Error inesperado en una ruta: se corta la transmisión y se ofrece
// reintentar (vuelve a cargar y renderizar el tramo) o empezar desde la portada.
// Tiene que ser Client Component porque recibe `retry` en el navegador.
export default function Error({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="signal-screen" role="alert">
      <div className="noise" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
      <p className="signal-kicker">SE PERDIÓ LA SEÑAL</p>
      <h1>Algo interrumpió la transmisión.</h1>
      <div className="signal-actions">
        <button onClick={() => retry()}>REINTENTAR</button>
        <Link href="/">VOLVER AL INICIO</Link>
      </div>
    </main>
  );
}
