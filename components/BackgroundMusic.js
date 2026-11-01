"use client";

import { useEffect, useRef, useState } from "react";
import { END_VIDEO_EVENT, SOUND_EVENT } from "@/components/EndVideo";
import { VIDEO_SOUND_EVENT, VIDEO_TOGGLE_EVENT } from "@/components/IntroVideo";

const MUSIC_SRC = "/music/music-horror.mp3";

// Musica de fondo del recorrido: empieza al llegar a la seccion `startId`
// (las evidencias, despues del video) y se repite sin fin. El boton del
// parlante esta siempre fijo arriba a la derecha: hasta que empieza la musica
// prende y apaga el sonido del video del comienzo; despues, la musica (y el
// sonido del video del final, que pausa la musica mientras se ve).
// Los navegadores no dejan reproducir audio solo por scrollear: si el primer
// intento se bloquea, arranca con el siguiente clic, toque o tecla.
export default function BackgroundMusic({ startId }) {
  const audioRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [on, setOn] = useState(true);
  // El video arranca silenciado (los navegadores solo permiten autoplay asi).
  const [videoMuted, setVideoMuted] = useState(true);
  // El video del final se esta viendo: la musica se pausa.
  const [endVideo, setEndVideo] = useState(false);

  useEffect(() => {
    const update = (event) => setEndVideo(event.detail.active);
    window.addEventListener(END_VIDEO_EVENT, update);
    return () => window.removeEventListener(END_VIDEO_EVENT, update);
  }, []);

  // El video del final sigue al boton.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: { on } }));
  }, [on]);

  useEffect(() => {
    const update = (event) => setVideoMuted(event.detail.muted);
    window.addEventListener(VIDEO_SOUND_EVENT, update);
    return () => window.removeEventListener(VIDEO_SOUND_EVENT, update);
  }, []);

  useEffect(() => {
    const section = document.getElementById(startId);
    if (!section) return;
    // Empieza cuando las evidencias ya ocupan parte de la pantalla (si no, se
    // dispararia apenas carga la pagina: la seccion arranca justo debajo del video).
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setStarted(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -30% 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [startId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!started || !on || endVideo) {
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
  }, [started, on, endVideo]);

  // Hasta llegar a las evidencias el boton es del video.
  const videoPhase = !started;
  const soundOn = videoPhase ? !videoMuted : on;
  const label =
    videoPhase || endVideo
      ? soundOn ? "Silenciar el video" : "Prender el sonido del video"
      : soundOn ? "Apagar la música" : "Prender la música";

  function toggle() {
    if (videoPhase) window.dispatchEvent(new Event(VIDEO_TOGGLE_EVENT));
    else setOn((value) => !value);
  }

  return (
    <>
      <audio ref={audioRef} src={MUSIC_SRC} loop preload="auto" />
      <button className="music-toggle" onClick={toggle} aria-pressed={soundOn} aria-label={label} title={label}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
          {soundOn ? (
            <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          ) : (
            <path d="m16 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          )}
        </svg>
      </button>
    </>
  );
}
