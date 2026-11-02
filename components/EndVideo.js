"use client";

import { useEffect, useRef, useState } from "react";
import { devFinalStart } from "@/components/DevShortcut";
import PlayButton from "@/components/PlayButton";
import { END_SCREEN_AT, END_VIDEO_SRC } from "@/data/evidence";
import { resetGame, useStep } from "@/lib/storyProgress";

// Aviso de BackgroundMusic con el estado del boton del parlante ({ on }) y
// aviso de este video cuando se esta viendo ({ active }): mientras tanto la
// musica se pausa.
export const SOUND_EVENT = "senal-perdida:sound";
export const END_VIDEO_EVENT = "senal-perdida:end-video";
// Pedido de este video a BackgroundMusic para prender el sonido al darle Play.
export const SOUND_ON_EVENT = "senal-perdida:sound-on";

// Video del final: queda arriba de todo despues de resolver el pizarron (en
// el lugar del video del comienzo, que se oculta). No arranca solo: espera el
// boton de Play y empieza con sonido; se pausa si se sale y sigue al volver.
// El sonido sigue al boton del parlante. En el segundo END_SCREEN_AT (o al
// terminar, si es mas corto) aparece encima la pantalla negra con el cierre y
// el boton para reiniciar el juego.
// Esta siempre en la pagina pero oculto (ver .landing.is-finished en el CSS),
// asi aparece en el mismo instante en que se va el video del comienzo y la
// vista no salta.
export default function EndVideo() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const soundOnRef = useRef(true);
  const startedRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  // Recien despues del pizarron se empieza a descargar.
  const escaped = useStep("school-solved");

  useEffect(() => {
    const video = videoRef.current;
    const announce = (active) => window.dispatchEvent(new CustomEvent(END_VIDEO_EVENT, { detail: { active } }));

    function updateSound(event) {
      soundOnRef.current = event.detail.on;
      video.muted = !event.detail.on;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Al volver a la seccion sigue (si ya se le habia dado Play).
          if (startedRef.current && !video.ended) video.play().catch(() => {});
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

  function start() {
    const video = videoRef.current;
    startedRef.current = true;
    setStarted(true);
    // Siempre empieza con sonido: tambien se prende el parlante.
    soundOnRef.current = true;
    window.dispatchEvent(new Event(SOUND_ON_EVENT));
    video.muted = false;
    // Atajo de desarrollo: ?final=10 arranca en ese segundo.
    const from = devFinalStart();
    if (from) video.currentTime = from;
    video.play().catch(() => {});
  }

  return (
    <section ref={sectionRef} className="end-video" aria-label="Video del final">
      <video
        ref={videoRef}
        className="end-video-media"
        src={END_VIDEO_SRC}
        playsInline
        preload={escaped ? "auto" : "none"}
        onTimeUpdate={(event) => {
          if (event.currentTarget.currentTime >= END_SCREEN_AT) setFinished(true);
        }}
        onEnded={() => setFinished(true)}
      >
        Tu navegador no puede reproducir el video.
      </video>
      {!started && <PlayButton onPlay={start} />}

      {finished && (
        <div className="game-end" role="dialog" aria-modal="true" aria-label="Fin de la experiencia">
          <p>Gracias por participar.</p>
          <button onClick={resetGame}>Reiniciar juego</button>
        </div>
      )}
    </section>
  );
}
