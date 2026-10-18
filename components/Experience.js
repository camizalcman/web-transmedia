"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { chapters } from "@/data/chapters";
import { useProgress } from "@/hooks/useProgress";
import AuthPanel from "@/components/AuthPanel";
import ThreeArtifact from "@/components/ThreeArtifact";

export default function Experience({ initialChapterId }) {
  const router = useRouter();
  const activeIndex = Math.max(
    chapters.findIndex((item) => item.id === initialChapterId),
    0,
  );
  const [flash, setFlash] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const {
    authError,
    authLoading,
    authUser,
    continueAsGuest,
    discovered,
    discover,
    firebaseConfigured,
    ready,
    reset,
    signInWithGoogle,
    submitEmail,
    syncState,
  } = useProgress();
  const chapter = chapters[activeIndex];
  const isDiscovered = discovered.has(chapter.clueId);
  const discoveredCount = chapters.filter((item) =>
    discovered.has(item.clueId),
  ).length;

  useEffect(() => {
    if (!flash) return;
    const timeout = window.setTimeout(() => setFlash(false), 650);
    return () => window.clearTimeout(timeout);
  }, [flash]);

  function handleDiscover() {
    if (isDiscovered) return;
    const completesExperience = chapters.every(
      (item) => item.clueId === chapter.clueId || discovered.has(item.clueId),
    );

    discover(chapter.clueId);
    setFlash(true);
    if (completesExperience) setCompletionOpen(true);
  }

  function canOpen(index) {
    return index === 0 || discovered.has(chapters[index - 1].clueId);
  }

  function openChapter(chapterId) {
    router.push(`/archivo/${chapterId}`);
  }

  function returnToStart() {
    router.push("/");
  }

  async function handleReset() {
    setCompletionOpen(false);
    try {
      await reset();
    } finally {
      router.push("/");
    }
  }

  if (!ready) return <main className="loading">SINTONIZANDO…</main>;

  return (
    <main className={`experience ${flash ? "is-flashing" : ""}`}>
      <div className="noise" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />

      <header className="topbar">
        <button className="brand" onClick={returnToStart}>
          S/P <i>●</i>
        </button>
        <div className="status">
          <span>{syncState === "cloud" ? "NUBE" : "LOCAL"}</span>
          <span>SEÑAL {Math.round((discoveredCount / chapters.length) * 100)}%</span>
          {firebaseConfigured && (
            <button className="auth-trigger" onClick={() => setAuthOpen(true)}>
              {authUser?.isAnonymous
                ? "INVITADO"
                : authUser?.displayName || authUser?.email || "ACCEDER"}
            </button>
          )}
        </div>
      </header>

      <section className="chapter-layout" style={{ "--signal": chapter.color }}>
        <aside className="chapter-nav" aria-label="Fragmentos de la transmisión">
          {chapters.map((item, index) => {
            const unlocked = canOpen(index);
            return (
              <button
                key={item.id}
                className={index === activeIndex ? "active" : ""}
                disabled={!unlocked}
                onClick={() => openChapter(item.id)}
                aria-label={`${item.label}${unlocked ? "" : " bloqueado"}`}
              >
                <b>{item.number}</b>
                <span>{item.label}</span>
                <i>{discovered.has(item.clueId) ? "◆" : unlocked ? "◇" : "×"}</i>
              </button>
            );
          })}
          <button className="reset-progress" onClick={handleReset}>
            <b>↺</b>
            <span>REINICIAR PROGRESO</span>
            <i>×</i>
          </button>
        </aside>

        <div className="narrative">
          <p className="kicker">{chapter.eyebrow}</p>
          <p className="chapter-number">FRAGMENTO {chapter.number}</p>
          <h2>{chapter.title}</h2>
          <p className="chapter-copy">{chapter.copy}</p>

          <div className={`clue-card ${isDiscovered ? "found" : ""}`}>
            <small>{isDiscovered ? "EVIDENCIA RECUPERADA" : "EVIDENCIA CIFRADA"}</small>
            <strong>{isDiscovered ? chapter.clueLabel : "██████ ████"}</strong>
          </div>
        </div>

        <div className="artifact-panel">
          <ThreeArtifact
            key={chapter.id}
            chapter={chapter}
            discovered={isDiscovered}
            onDiscover={handleDiscover}
          />
          <div className="artifact-caption">
            <span>[ OBJETO {chapter.number} ]</span>
            <p>{isDiscovered ? "Frecuencia aislada." : chapter.instruction}</p>
            {!isDiscovered && (
              <button onClick={handleDiscover}>INSPECCIONAR NÚCLEO</button>
            )}
          </div>
        </div>
      </section>

      <footer className="footer-bar">
        <span>UMAI / PROGRAMACIÓN III</span>
        <span>{new Date().toLocaleDateString("es-AR")}</span>
      </footer>

      {completionOpen && (
        <section className="completion" role="dialog" aria-modal="true">
          <button
            className="close"
            onClick={() => setCompletionOpen(false)}
            aria-label="Cerrar desenlace"
          >
            ×
          </button>
          <p className="kicker">TRANSMISIÓN RECONSTRUIDA</p>
          <h2>NO ERA UN ECO.<br />ERA UNA INVITACIÓN.</h2>
          <p>Fin del prototipo. La transmisión fue reconstruida por completo.</p>
        </section>
      )}

      {authOpen && (
        <AuthPanel
          authError={authError}
          authLoading={authLoading}
          onClose={() => setAuthOpen(false)}
          onContinueAsGuest={continueAsGuest}
          onGoogle={signInWithGoogle}
          onSubmitEmail={submitEmail}
          user={authUser}
        />
      )}
    </main>
  );
}
