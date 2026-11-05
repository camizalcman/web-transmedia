"use client";

import { useEffect, useState } from "react";
import AuthPanel from "@/components/AuthPanel";
import {
  CASE_FILES,
  continueAsGuest,
  displayName,
  persistenceStatus,
  signInWithGoogle,
  startCloudSave,
  submitEmail,
  useCloudSave,
} from "@/lib/cloudSave";

const LABELS = {
  remote: "REMOTO",
  syncing: "SINCRONIZANDO",
  offline: "OFFLINE",
  connecting: "CONECTANDO",
  local: "LOCAL",
};

const DESCRIPTIONS = {
  remote: "La partida está guardada en la nube (Firebase).",
  syncing: "Subiendo los últimos cambios a la nube…",
  offline: "Sin conexión: se guarda en este dispositivo y se sube cuando vuelva la red.",
  connecting: "Conectando con la nube…",
  local: "Solo se guarda en este navegador.",
};

// Indicador fijo (arriba a la izquierda; en pantallas angostas, abajo) de donde se esta guardando la partida
// y acceso a la cuenta. Arranca la sesion de Firebase al montarse la portada.
export default function CloudStatus() {
  const cloud = useCloudSave();
  const [open, setOpen] = useState(false);
  const status = persistenceStatus(cloud);
  const name = displayName(cloud.user);
  const game = cloud.game ?? {};

  useEffect(() => {
    startCloudSave();
  }, []);

  const description =
    status === "local" && cloud.configured
      ? "La nube no respondió: solo se guarda en este navegador."
      : DESCRIPTIONS[status];

  return (
    <>
      <div className={`cloud-status is-${status}`}>
        <span className="cloud-status-dot" aria-hidden="true" />
        <span className="cloud-status-label" aria-live="polite">
          {LABELS[status]}
          <span className="sr-only">: {description}</span>
        </span>
        {cloud.configured && (
          <button className="cloud-status-user" onClick={() => setOpen(true)}>
            {name || "GUARDAR PROGRESO"}
          </button>
        )}
      </div>

      {open && (
        <AuthPanel
          title={name ? "TU INVESTIGACIÓN" : "GUARDAR PROGRESO"}
          intro={
            name
              ? "Tu investigación queda guardada en esta cuenta. Entrá con ella desde cualquier dispositivo para seguirla."
              : "Registrate para no perder tu investigación y seguirla desde otro dispositivo."
          }
          authError={cloud.authError}
          authLoading={cloud.authLoading}
          onClose={() => setOpen(false)}
          onContinueAsGuest={continueAsGuest}
          onGoogle={signInWithGoogle}
          onSubmitEmail={submitEmail}
          user={cloud.user}
        >
          <div className="cloud-summary">
            <small>INVESTIGACIÓN GUARDADA · {LABELS[status]}</small>
            <div className={`cloud-case ${game.solved ? "is-solved" : ""}`}>
              <span>INVESTIGACIÓN</span>
              <strong>{game.solved ? "RESUELTA" : "ABIERTA"}</strong>
            </div>
            {/* Solo el numero de paso: los nombres adelantarian el juego. */}
            <ul className="cloud-files" aria-label="Expedientes">
              {CASE_FILES.map((file, index) => (
                <li key={file.step} className={game[file.field] ? "is-done" : ""}>
                  <span aria-hidden="true">{game[file.field] ? "◆" : "◇"}</span>
                  PASO {index + 1}
                  <span className="sr-only">{game[file.field] ? ", completado" : ", pendiente"}</span>
                </li>
              ))}
            </ul>
            <p className="cloud-files-count">
              EXPEDIENTES {CASE_FILES.filter((file) => game[file.field]).length}/{CASE_FILES.length} · MENSAJES CON EL
              DESCONOCIDO {game.unknownChat?.messages?.length ?? 0}
            </p>
          </div>
        </AuthPanel>
      )}
    </>
  );
}
