"use client";

import { useEffect, useRef, useState } from "react";
import PhoneModel from "@/components/PhoneModel";

const clamp = (value) => Math.min(Math.max(value, 0), 1);

// Tramo del recorrido de la seccion (0 a 1) en el que el celular entra en escena.
const ENTRANCE = [0.15, 0.8];

export default function PhoneScroll() {
  const sectionRef = useRef(null);
  const entranceRef = useRef(0);
  const [near, setNear] = useState(false);

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
      <div className="phone-scroll-stage">{near && <PhoneModel entranceRef={entranceRef} />}</div>
    </section>
  );
}
