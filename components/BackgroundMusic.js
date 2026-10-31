"use client";

import { useEffect, useRef, useState } from "react";

const MUSIC_SRC = "/music/music-horror.mp3";

// Musica de fondo del recorrido: empieza al llegar a la seccion `startId`
// (las evidencias, despues del video) y se repite sin fin. El boton para
// apagarla y prenderla esta siempre fijo arriba a la derecha.
// Los navegadores no dejan reproducir audio solo por scrollear: si el primer
// intento se bloquea, arranca con el siguiente clic, toque o tecla.
export default function BackgroundMusic({ startId }) {
  const audioRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [on, setOn] = useState(true);

  useEffect(() => {
    const section = document.getElementById(startId);
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setStarted(true);
      observer.disconnect();
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, [startId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!started || !on) {
      audio.pause();
      return;
    }

    const events = ["pointerdown", "keydown", "touchend"];
    const retry = () => play();
    const stopRetrying = () => events.forEach((name) => window.removeEventListener(name, retry));
    function play() {
      audio
        .play()
        .then(stopRetrying)
        .catch(() => events.forEach((name) => window.addEventListener(name, retry, { once: true })));
    }

    play();
    return stopRetrying;
  }, [started, on]);

  return (
    <>
      <audio ref={audioRef} src={MUSIC_SRC} loop preload="auto" />
      <button className="music-toggle" onClick={() => setOn((value) => !value)} aria-pressed={on}>
        MÚSICA {on ? "ON" : "OFF"}
      </button>
    </>
  );
}
