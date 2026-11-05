"use client";

import { useEffect, useRef, useState } from "react";
import PlayButton from "@/components/PlayButton";
import { INTRO_VIDEO_SRC } from "@/data/evidence";

// Segundo del video en el que aparece la flecha que invita a scrollear.
const SCROLL_CUE_AT = 30;

// El sonido del video se maneja con el boton del parlante de BackgroundMusic:
// el boton pide prender o apagar con VIDEO_TOGGLE_EVENT y el video avisa su
// estado con VIDEO_SOUND_EVENT ({ muted }).
export const VIDEO_TOGGLE_EVENT = "senal-perdida:video-toggle";
export const VIDEO_SOUND_EVENT = "senal-perdida:video-sound";

function announce(video) {
  window.dispatchEvent(new CustomEvent(VIDEO_SOUND_EVENT, { detail: { muted: video.muted } }));
}

export default function IntroVideo({ nextSectionId }) {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const [showCue, setShowCue] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // El video no arranca solo: espera el boton de Play y empieza con sonido.
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);

  function start() {
    const video = videoRef.current;
    startedRef.current = true;
    setStarted(true);
    video.muted = false;
    announce(video);
    video.play().catch(() => setShowCue(true));
  }

  // El boton del parlante (efecto de mas abajo) llama al start mas reciente.
  // Se declara antes que los efectos que lo usan.
  const startRef = useRef(start);
  useEffect(() => {
    startRef.current = start;
  });

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    let frame = 0;

    // --leave (0 a 1) acerca levemente el video mientras se abandona la portada.
    // Al scrollear el video se silencia (se puede volver a prender con el boton).
    function update() {
      frame = 0;
      const leave = Math.min(window.scrollY / window.innerHeight, 1);
      section.style.setProperty("--leave", leave.toFixed(3));
      const away = window.scrollY > 8;
      setScrolled(away);
      if (away && !video.muted) {
        video.muted = true;
        announce(video);
      }
    }

    function handleScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    function toggleSound() {
      // Antes del Play, el parlante tambien lo inicia (con sonido).
      if (!startedRef.current) {
        startRef.current();
        return;
      }
      video.muted = !video.muted;
      announce(video);
      if (!video.muted && video.paused && !video.ended) video.play().catch(() => {});
    }
    window.addEventListener(VIDEO_TOGGLE_EVENT, toggleSound);
    return () => window.removeEventListener(VIDEO_TOGGLE_EVENT, toggleSound);
  }, []);

  function goToNextSection() {
    document.getElementById(nextSectionId)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section ref={sectionRef} className="intro-video" aria-label="Noticiero de apertura">
      <video
        ref={videoRef}
        className="intro-video-media"
        src={INTRO_VIDEO_SRC}
        playsInline
        preload="auto"
        onTimeUpdate={(event) => {
          if (event.currentTarget.currentTime >= SCROLL_CUE_AT) setShowCue(true);
        }}
        onEnded={() => setShowCue(true)}
      >
        Tu navegador no puede reproducir el video.
      </video>

      {!started && <PlayButton onPlay={start} />}

      <button
        className={`scroll-cue ${showCue && !scrolled ? "is-visible" : ""}`}
        onClick={goToNextSection}
        aria-label="Bajar hacia las evidencias"
        tabIndex={showCue && !scrolled ? 0 : -1}
      >
        <svg viewBox="0 0 24 36" aria-hidden="true">
          <path d="M12 2v30M3 23l9 9 9-9" />
        </svg>
      </button>
    </section>
  );
}
