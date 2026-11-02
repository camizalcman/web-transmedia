import Link from "next/link";

export const metadata = {
  title: "Sin señal — Señal perdida",
  description: "Esta grabación no existe en el archivo del colegio.",
};

// Ruta inexistente (o un capítulo de la ruta dinámica que no existe).
export default function NotFound() {
  return (
    <main className="signal-screen">
      <div className="noise" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
      <p className="signal-kicker">CÁMARA 404 · SIN SEÑAL</p>
      <h1>No hay ninguna grabación acá.</h1>
      <p className="signal-copy">Lo que buscás no está en el archivo del colegio.</p>
      <div className="signal-actions">
        <Link href="/">VOLVER AL INICIO</Link>
      </div>
    </main>
  );
}
