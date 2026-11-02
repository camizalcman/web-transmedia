// Pantalla mientras se prepara una ruta: una señal que intenta sintonizar.
export default function Loading() {
  return (
    <main className="signal-screen" role="status" aria-live="polite">
      <div className="noise" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
      <p className="signal-kicker">BUSCANDO SEÑAL</p>
      <p className="signal-dots" aria-hidden="true">● ● ●</p>
      <span className="sr-only">Cargando…</span>
    </main>
  );
}
