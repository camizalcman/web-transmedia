"use client";

import { useEffect, useRef, useState } from "react";
import PhoneModel from "@/components/PhoneModel";
import ScrollArrow, { useDelayed } from "@/components/ScrollArrow";
import { hasStep, markStep, useStep } from "@/lib/storyProgress";

const clamp = (value) => Math.min(Math.max(value, 0), 1);

// Flechas del celular (ms): hacia abajo, despues de hablar con el numero
// desconocido (el colegio ya esta abierto); hacia arriba, despues de volver
// del pizarron, cuando ya llegaron los mensajes nuevos (siguen los lockers).
const DOWN_CUE_DELAY = 4000;
const UP_CUE_DELAY = 6000;

// Tramo del recorrido de la seccion (0 a 1) en el que el celular entra en escena.
const ENTRANCE = [0.15, 0.8];

// Avisa a los lockers que el celular ya se puede mostrar sin trabas.
const markPhoneReady = () => markStep("phone-ready");

export default function PhoneScroll() {
  const sectionRef = useRef(null);
  const entranceRef = useRef(0);
  const [near, setNear] = useState(false);
  const talked = useStep("contact-talked");
  const escaped = useStep("school-solved");
  const returned = useStep("phone-returned");
  const downCue = useDelayed(talked && !escaped, DOWN_CUE_DELAY);
  const upCue = useDelayed(returned, UP_CUE_DELAY);

  useEffect(() => {
    const section = sectionRef.current;

    // La escena 3D se crea recien cuando la seccion se acerca a la pantalla,
    // para no competir con la carga del video.
    const proximity = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: "150% 0px" },
    );
    proximity.observe(section);

    // 0 cuando la seccion asoma por abajo, 1 cuando se llega a su final.
    function handleScroll() {
      const rect = section.getBoundingClientRect();
      const progress = clamp((window.innerHeight - rect.top) / section.offsetHeight);
      entranceRef.current = clamp((progress - ENTRANCE[0]) / (ENTRANCE[1] - ENTRANCE[0]));
      // Al volver desde el colegio ya resuelto, el celular recibe los mensajes nuevos.
      // (con el escenario del celular ocupando la pantalla, no solo pasado de largo).
      const onScreen = rect.bottom >= window.innerHeight * 0.95;
      if (onScreen && entranceRef.current > 0.9 && hasStep("school-solved") && !hasStep("phone-returned")) {
        markStep("phone-returned");
      }
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      proximity.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <section ref={sectionRef} className="phone-scroll" aria-label="Celular de la persona desaparecida">
      <div className="phone-scroll-stage">
        {near && <PhoneModel entranceRef={entranceRef} onReady={markPhoneReady} />}
        <ScrollArrow
          direction="down"
          visible={downCue}
          label="Bajar al colegio"
          onClick={() => document.querySelector(".school-scroll")?.scrollIntoView({ behavior: "smooth" })}
        />
        <ScrollArrow
          direction="up"
          visible={upCue}
          label="Volver a los lockers"
          onClick={() => {
            const lockers = document.querySelector(".locker-scroll");
            if (lockers) window.scrollTo({ top: lockers.offsetTop, behavior: "smooth" });
          }}
        />
      </div>
    </section>
  );
}
