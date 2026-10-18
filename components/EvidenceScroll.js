"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { evidence } from "@/data/evidence";

const clamp = (value) => Math.min(Math.max(value, 0), 1);
const range = (progress, start, end) => clamp((progress - start) / (end - start));
const easeOut = (value) => 1 - (1 - value) ** 3;

export default function EvidenceScroll({ id }) {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const itemRefs = useRef([]);
  const [found, setFound] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let target = 0;
    let current = 0;
    let frame = 0;

    function measure() {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      target = clamp(-rect.top / Math.max(total, 1));
    }

    // El scroll solo actualiza variables CSS: las transformaciones las
    // resuelve el navegador sin re-renderizar React en cada cuadro.
    function render(progress) {
      stage.style.setProperty("--p", progress.toFixed(4));

      let count = 0;
      evidence.forEach((item, index) => {
        const enter = easeOut(range(progress, item.enter[0], item.enter[1]));
        const exit = item.exit === null ? 0 : range(progress, item.exit, item.exit + 0.1);
        const node = itemRefs.current[index];
        node.style.setProperty("--t", enter.toFixed(4));
        node.style.setProperty("--o", exit.toFixed(4));
        if (enter > 0.9) count += 1;
      });

      setFound(count);
    }

    // Interpolacion suave hacia el valor real del scroll (efecto de camara).
    function tick() {
      current += (target - current) * 0.12;
      if (Math.abs(target - current) < 0.0005) current = target;
      render(current);
      frame = current === target ? 0 : requestAnimationFrame(tick);
    }

    function handleScroll() {
      measure();
      if (reduceMotion) {
        current = target;
        render(current);
        return;
      }
      if (!frame) frame = requestAnimationFrame(tick);
    }

    measure();
    current = target;
    render(current);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <section ref={sectionRef} id={id} className="evidence-scroll" aria-label="Evidencias de la desaparición">
      <div ref={stageRef} className="evidence-stage">
        <div className="evidence-grid" aria-hidden="true" />

        <header className="evidence-hud">
          <span>EXPEDIENTE N.º 0613 / DESAPARICIÓN</span>
          <span>
            EVIDENCIAS <b>{String(found).padStart(2, "0")}</b>/{String(evidence.length).padStart(2, "0")}
          </span>
        </header>

        <div className="evidence-board">
          {evidence.map((item, index) => (
            <figure
              key={item.id}
              ref={(node) => { itemRefs.current[index] = node; }}
              className={`evidence evidence--${item.effect}`}
              style={{
                "--x": `${item.desktop.x}%`,
                "--y": `${item.desktop.y}%`,
                "--w": `${item.desktop.w}vw`,
                "--depth": `${item.desktop.depth}vh`,
                "--mx": `${item.mobile.x}%`,
                "--my": `${item.mobile.y}%`,
                "--mw": `${item.mobile.w}vw`,
                "--mdepth": `${item.mobile.depth}vh`,
                "--ratio": item.ratio,
                "--rot": `${item.rotate}deg`,
                "--tone": item.color,
                zIndex: index + 1,
              }}
            >
              <div className="evidence-media">
                {item.image ? (
                  <Image src={item.image} alt={item.label} fill sizes="(max-width: 900px) 90vw, 40vw" />
                ) : (
                  <span className="evidence-placeholder" aria-hidden="true">
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <small>PLACEHOLDER · {item.id}</small>
                  </span>
                )}
              </div>
              <figcaption>
                <span>{item.id.toUpperCase()}</span> {item.label}
                <small>{item.meta}</small>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="evidence-progress" aria-hidden="true" />
      </div>
    </section>
  );
}
