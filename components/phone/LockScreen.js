"use client";

import { useEffect, useRef, useState } from "react";
import { PHONE_DATE, PHONE_PASSCODE, PHONE_TIME } from "@/data/conversations";
import { LockIcon } from "@/components/phone/icons";
import { HomeBar, SchoolWallpaper, StatusBar } from "@/components/phone/System";

const KEYS = [
  ["1", ""], ["2", "ABC"], ["3", "DEF"],
  ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
  ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
];
const CODE_LENGTH = PHONE_PASSCODE.length;

export default function LockScreen({ onUnlock }) {
  const [mode, setMode] = useState("locked");
  const [digits, setDigits] = useState("");
  const [error, setError] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const swipeStart = useRef(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  function later(callback, delay) {
    timers.current.push(window.setTimeout(callback, delay));
  }

  // Tocar o deslizar hacia arriba abre el teclado, como en iOS.
  function handlePointerUp(event) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start === null || event.clientY - start > 30) return;
    setMode("code");
  }

  function pressDigit(digit) {
    if (unlocking || digits.length >= CODE_LENGTH) return;
    const next = digits + digit;
    setError(false);
    setDigits(next);
    if (next.length < CODE_LENGTH) return;

    if (next === PHONE_PASSCODE) {
      later(() => setUnlocking(true), 150);
      later(onUnlock, 700);
    } else {
      later(() => {
        setError(true);
        setDigits("");
      }, 250);
    }
  }

  function handleDelete() {
    if (unlocking) return;
    if (!digits) {
      setMode("locked");
      setError(false);
      return;
    }
    setDigits(digits.slice(0, -1));
  }

  return (
    <div className={`ios-lock ${mode === "code" ? "is-code" : ""} ${unlocking ? "is-unlocking" : ""}`}>
      <SchoolWallpaper dimmed={mode === "code"} />
      <StatusBar hideTime />

      {mode === "locked" ? (
        <div
          className="ios-lock-face"
          onPointerDown={(event) => { swipeStart.current = event.clientY; }}
          onPointerUp={handlePointerUp}
        >
          <span className="ios-lock-icon"><LockIcon /></span>
          <p className="ios-lock-time">{PHONE_TIME}</p>
          <p className="ios-lock-date">{PHONE_DATE}</p>
          <button className="ios-lock-hint" onClick={() => setMode("code")}>
            Desliza hacia arriba para abrir
          </button>
          <HomeBar />
        </div>
      ) : (
        <div className="ios-passcode">
          <span className="ios-lock-icon"><LockIcon open={unlocking} /></span>
          <p className="ios-passcode-title">Introduce el código</p>
          <div className={`ios-passcode-dots ${error ? "is-error" : ""}`} aria-label={`${digits.length} de ${CODE_LENGTH} dígitos`}>
            {Array.from({ length: CODE_LENGTH }, (_, index) => (
              <span key={index} className={index < digits.length ? "is-filled" : ""} />
            ))}
          </div>
          <p className="ios-passcode-error" role="status">{error ? "Código incorrecto" : ""}</p>

          <div className="ios-keypad">
            {KEYS.map(([digit, letters]) => (
              <button key={digit} onClick={() => pressDigit(digit)} aria-label={digit}>
                <b>{digit}</b>
                <small>{letters}</small>
              </button>
            ))}
            <span />
            <button onClick={() => pressDigit("0")} aria-label="0">
              <b>0</b>
            </button>
            <span />
          </div>

          <button className="ios-passcode-action" onClick={handleDelete}>
            {digits ? "Eliminar" : "Cancelar"}
          </button>
          <HomeBar />
        </div>
      )}
    </div>
  );
}
