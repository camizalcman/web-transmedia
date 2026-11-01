"use client";

import { useEffect, useRef } from "react";
import { END_VIDEO_SRC } from "@/data/evidence";
import { useStep } from "@/lib/storyProgress";

// Aviso de BackgroundMusic con el estado del boton del parlante ({ on }) y
// aviso de este video cuando se esta viendo ({ active }): mientras tanto la
// musica se pausa.
export const SOUND_EVENT = "senal-perdida:sound";
export const END_VIDEO_EVENT = "senal-perdida:end-video";

// Video del final: queda arriba de todo despues de resolver el pizarron (en
// el lugar del video del comienzo, que se oculta). Se reproduce cuando ocupa
// la pantalla y se pausa al salir. El sonido sigue al boton del parlante.
// Esta siempre en la pagina pero oculto (ver .landing.is-finished en el CSS),
// asi aparece en el mismo instante en que se va el video del comienzo y la
// vista no salta.
export default function EndVideo() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const soundOnRef = useRef(true);
  // Recien despues del pizarron se empieza a descargar.
  const escaped = useStep("school-solved");

  useEffect(() => {
    const video = videoRef.current;
    const announce = (active) => window.dispatchEvent(new CustomEvent(END_VIDEO_EVENT, { detail: { active } }));

    function updateSound(event) {
      soundOnRef.current = event.detail.on;
      video.muted = !event.detail.on;
    }

    // Si el navegador no deja reproducir con sonido, se reproduce en silencio.
    function play() {
      video.muted = !soundOnRef.current;
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          play();
          announce(true);
        } else {
          video.pause();
          announce(false);
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(sectionRef.current);
    window.addEventListener(SOUND_EVENT, updateSound);
    return () => {
      observer.disconnect();
      window.removeEventListener(SOUND_EVENT, updateSound);
      announce(false);
    };
  }, []);

  return (
    <section ref={sectionRef} className="end-video" aria-label="Video del final">
      <video
        ref={videoRef}
        className="end-video-media"
        src={END_VIDEO_SRC}
        playsInline
        preload={escaped ? "auto" : "none"}
      >
        Tu navegador no puede reproducir el video.
      </video>
    </section>
  );
}
