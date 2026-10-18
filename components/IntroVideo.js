"use client";

import { useEffect, useRef, useState } from "react";
import { INTRO_VIDEO_SRC } from "@/data/evidence";

// Segundo del video en el que aparece la flecha que invita a scrollear.
const SCROLL_CUE_AT = 30;

export default function IntroVideo({ nextSectionId }) {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const [showCue, setShowCue] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    // Los navegadores solo permiten autoplay silenciado. Si igual se bloquea,
    // se habilita la flecha para que el recorrido no quede detenido.
    videoRef.current?.play().catch(() => setShowCue(true));
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    let frame = 0;

    // --leave (0 a 1) acerca levemente el video mientras se abandona la portada.
    function update() {
      frame = 0;
      const leave = Math.min(window.scrollY / window.innerHeight, 1);
      section.style.setProperty("--leave", leave.toFixed(3));
      setScrolled(window.scrollY > 8);
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

  function toggleSound() {
    const video = videoRef.current;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (!video.muted && video.paused && !video.ended) video.play().catch(() => {});
  }

  function goToNextSection() {
    document.getElementById(nextSectionId)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section ref={sectionRef} className="intro-video" aria-label="Noticiero de apertura">
      <video
        ref={videoRef}
        className="intro-video-media"
        src={INTRO_VIDEO_SRC}
        autoPlay
        muted
        playsInline
        preload="auto"
        onTimeUpdate={(event) => {
          if (event.currentTarget.currentTime >= SCROLL_CUE_AT) setShowCue(true);
        }}
        onEnded={() => setShowCue(true)}
      >
        Tu navegador no puede reproducir el video.
      </video>

      <div className="intro-video-hud">
        <span><i>●</i> SEÑAL PERDIDA</span>
        <button onClick={toggleSound} aria-pressed={!muted}>
          SONIDO {muted ? "OFF" : "ON"}
        </button>
      </div>

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
