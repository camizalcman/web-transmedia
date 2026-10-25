"use client";

import { useCallback, useEffect, useState } from "react";
import LockerScene from "@/components/LockerScene";
import PhoneModel from "@/components/PhoneModel";
import { LOCK_CLUES, LOCK_CODE } from "@/data/lockers";

const DIALS = LOCK_CODE.length;

// Los lockers, el panel para ingresar el codigo del candado y, al tocar el
// celular que esta adentro, la vista interactiva del celular a pantalla completa.
// `handFont` es la familia de la letra manuscrita de la hoja con las pistas.
export default function LockerRoom({ handFont }) {
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [digits, setDigits] = useState(() => Array(DIALS).fill(0));
  const [shake, setShake] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);

  const openPhone = useCallback(() => setPhoneOpen(true), []);
  const openLock = useCallback(() => setLockOpen(true), []);
  const closeLock = useCallback(() => setLockOpen(false), []);

  const stepDial = useCallback((index, step = 1) => {
    setError(false);
    setDigits((current) =>
      current.map((digit, i) => (i === index ? (digit + step + 10) % 10 : digit)),
    );
  }, []);

  function tryCode() {
    if (unlocked) return;
    if (digits.join("") === LOCK_CODE) {
      setUnlocked(true);
    } else {
      setError(true);
      setShake((count) => count + 1);
    }
  }

  useEffect(() => {
    if (!phoneOpen && !lockOpen) return;
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setPhoneOpen(false);
        setLockOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phoneOpen, lockOpen]);

  return (
    <main className="locker-page">
      <LockerScene
        phoneOpen={phoneOpen}
        onPhoneSelect={openPhone}
        lockOpen={lockOpen}
        digits={digits}
        shake={shake}
        unlocked={unlocked}
        onLockSelect={openLock}
        onDialStep={stepDial}
        onUnlockDone={closeLock}
        noteLines={LOCK_CLUES}
        handFont={handFont}
      />
      <p className="phone-hint">
        TOCÁ UNA PUERTA PARA ABRIRLA · ARRASTRÁ PARA MIRAR
      </p>
      {!lockOpen && (
        <p className="locker-credit">
          Modelos de Sketchfab (CC BY 4.0): “School Locker” por Lee Studio · “Combination Padlock” por RED2000 ·
          “Old books” por Arkikon · “Textured Books” por sydniekay · “Stationery” por Mikhail Antonov · “Ruler” por Artieee
        </p>
      )}

      {lockOpen && (
        <LockPanel
          digits={digits}
          error={error}
          unlocked={unlocked}
          onStep={stepDial}
          onSubmit={tryCode}
          onClose={closeLock}
        />
      )}

      {phoneOpen && (
        <section className="locker-phone" role="dialog" aria-modal="true" aria-label="Celular">
          <button className="locker-back" onClick={() => setPhoneOpen(false)}>
            ← VOLVER A LOS LOCKERS
          </button>
          <PhoneModel />
        </section>
      )}
    </main>
  );
}

// Panel del codigo: una columna por rueda (de arriba hacia abajo en el
// candado, de izquierda a derecha aca). Tambien se puede usar el teclado:
// numeros, flechas y Enter.
function LockPanel({ digits, error, unlocked, onStep, onSubmit, onClose }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (unlocked) return;
    const handleKey = (event) => {
      if (/^\d$/.test(event.key)) {
        onStep(active, Number(event.key) - digits[active]);
        setActive((index) => Math.min(index + 1, digits.length - 1));
      } else if (event.key === "ArrowUp") {
        onStep(active, 1);
      } else if (event.key === "ArrowDown") {
        onStep(active, -1);
      } else if (event.key === "ArrowLeft") {
        setActive((index) => Math.max(index - 1, 0));
      } else if (event.key === "ArrowRight") {
        setActive((index) => Math.min(index + 1, digits.length - 1));
      } else if (event.key === "Enter") {
        onSubmit();
      } else {
        return;
      }
      event.preventDefault();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, digits, unlocked, onStep, onSubmit]);

  return (
    <section
      className={`lock-panel ${error ? "is-error" : ""} ${unlocked ? "is-open" : ""}`}
      role="dialog"
      aria-label="Código del candado"
    >
      <button className="lock-close" onClick={onClose} aria-label="Cerrar">
        ×
      </button>
      <p className="lock-title">
        {unlocked ? "CANDADO ABIERTO" : error ? "CÓDIGO INCORRECTO" : "INGRESÁ EL CÓDIGO"}
      </p>
      <div className="lock-dials">
        {digits.map((digit, index) => (
          <div
            key={index}
            className={`lock-dial ${index === active && !unlocked ? "is-active" : ""}`}
            onClick={() => setActive(index)}
          >
            <button onClick={() => onStep(index, 1)} disabled={unlocked} aria-label={`Subir número ${index + 1}`}>
              ▲
            </button>
            <span aria-live="polite">{digit}</span>
            <button onClick={() => onStep(index, -1)} disabled={unlocked} aria-label={`Bajar número ${index + 1}`}>
              ▼
            </button>
          </div>
        ))}
      </div>
      <button className="lock-submit" onClick={onSubmit} disabled={unlocked}>
        PROBAR
      </button>
    </section>
  );
}
