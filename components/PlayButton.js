"use client";

// Boton de Play de los videos del recorrido (comienzo y final): centrado
// sobre el video, con la estetica del resto de la experiencia.
export default function PlayButton({ onPlay, label = "Reproducir el video" }) {
  return (
    <button className="video-play" onClick={onPlay} aria-label={label}>
      <span className="video-play-ring" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
        </svg>
      </span>
      <small>REPRODUCIR</small>
    </button>
  );
}
