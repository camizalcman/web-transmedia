"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PHONE_TIME } from "@/data/conversations";
import { hasStep } from "@/lib/storyProgress";
import { FIRST_MESSAGE, FIRST_OPEN_MESSAGES, detectIntent, replyTo } from "@/lib/unknownContact";

// Estado del chat con el «Número desconocido». Vive en PhoneScreen (que no se
// desmonta mientras el celular está en escena), así que sobrevive a cerrar
// WhatsApp o cambiar de chat, y además se guarda en localStorage para que el
// historial siga ahí al recargar la página. A diferencia del resto del
// recorrido (que vuelve a empezar al recargar), esta conversación se conserva.
//
// Ritmo: las respuestas del contacto esperan en `outbox` y se envían de a una,
// con «escribiendo…» antes de cada mensaje. Los mensajes del jugador quedan
// en cola (`answered: false`) y se contestan en orden, nunca dos a la vez.
// Como la cola y el outbox se guardan, una recarga a mitad de una respuesta
// la retoma sin duplicar mensajes.

const STORAGE_KEY = "senal-perdida:numero-desconocido";
const VERSION = 1;
const MAX_LENGTH = 300;

const INITIAL = {
  version: VERSION,
  appeared: false,
  opened: false,
  appearedAt: null,
  nextId: 1,
  messages: [],
  outbox: [],
  clues: [],
  asked: {},
  misses: 0,
  // Si ya hubo una conversación: el jugador escribió y el contacto terminó
  // de contestarle. Habilita bajar al pasillo.
  talked: false,
  // Si el acertijo del pizarrón ya se resolvió (una vez resuelto, no se pierde).
  solved: false,
  unread: 0,
};

function load() {
  if (typeof window === "undefined") return INITIAL;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (saved?.version === VERSION) return { ...INITIAL, ...saved };
  } catch {
    // Datos corruptos o almacenamiento bloqueado: se empieza de cero.
  }
  return INITIAL;
}

// La hora del celular quedó en PHONE_TIME; los mensajes nuevos avanzan desde
// ahí según el tiempo real que pasó desde que apareció el contacto.
function clockTime(appearedAt) {
  const [hours, minutes] = PHONE_TIME.split(":").map(Number);
  const elapsed = appearedAt ? Math.floor((Date.now() - appearedAt) / 60000) : 0;
  const total = hours * 60 + minutes + Math.min(Math.max(elapsed, 0), 59 - minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function addMessage(state, message) {
  return {
    ...state,
    nextId: state.nextId + 1,
    messages: [...state.messages, { id: state.nextId, time: clockTime(state.appearedAt), ...message }],
  };
}

// El contacto lee el mensaje pendiente y prepara su respuesta.
function respond(state, messageId) {
  const message = state.messages.find((item) => item.id === messageId);
  if (!message || message.answered) return state;
  const solved = state.solved || hasStep("school-solved");
  // Después del pizarrón todo cae en la misma respuesta de "ya te liberaste".
  const intent = solved ? "liberado" : detectIntent(message.text);
  const asked = state.asked[intent] ?? 0;
  const reply = replyTo(intent, {
    asked,
    clues: new Set(state.clues),
    solved,
    liberado: state.asked.liberado ?? 0,
    misses: state.misses,
  });
  return {
    ...state,
    solved,
    // Lee todo lo que el jugador escribió hasta este mensaje (doble tilde azul).
    messages: state.messages.map((item) =>
      item.from === "player" && item.id <= messageId ? { ...item, status: "read", answered: true } : item,
    ),
    outbox: [...state.outbox, ...reply.messages],
    clues: [...new Set([...state.clues, ...reply.clues])],
    asked: { ...state.asked, [intent]: asked + 1 },
    misses: intent === "desconocido" ? state.misses + 1 : 0,
  };
}

const typingTime = (text) => Math.min(Math.max(700 + text.length * 45, 1100), 3200);

// `isOpen`: si el jugador está mirando esta conversación (los mensajes que
// llegan mientras tanto no cuentan como no leídos).
export default function useUnknownContact(isOpen) {
  const [state, setState] = useState(load);
  const [typing, setTyping] = useState(false);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Sin almacenamiento disponible el chat sigue funcionando en memoria.
    }
  }, [state]);

  // Motor de la conversación: primero se envía lo que haya en el outbox (de a
  // un mensaje); si está vacío, se contesta el mensaje pendiente más viejo.
  const nextOut = state.outbox[0];
  const outboxKey = state.outbox.length ? `${state.outbox.length}:${nextOut}` : "";
  const pendingId = state.outbox.length
    ? null
    : state.messages.find((item) => item.from === "player" && !item.answered)?.id ?? null;

  useEffect(() => {
    if (!state.appeared) return;
    const timers = [];
    if (outboxKey) {
      // Pausa, «escribiendo…» y recién ahí el mensaje.
      timers.push(
        window.setTimeout(() => {
          setTyping(true);
          timers.push(
            window.setTimeout(() => {
              setTyping(false);
              setState((current) => {
                if (current.outbox[0] !== nextOut) return current;
                const next = addMessage(current, { from: "unknown", text: nextOut });
                const outbox = current.outbox.slice(1);
                return {
                  ...next,
                  outbox,
                  talked:
                    current.talked ||
                    (outbox.length === 0 && current.messages.some((item) => item.from === "player" && item.answered)),
                  unread: isOpenRef.current ? 0 : current.unread + 1,
                };
              });
            }, typingTime(nextOut)),
          );
        }, 900),
      );
    } else if (pendingId !== null) {
      // Un momento hasta que "lee" el mensaje.
      timers.push(window.setTimeout(() => setState((current) => respond(current, pendingId)), 700));
    }
    return () => {
      timers.forEach(window.clearTimeout);
      setTyping(false);
    };
  }, [state.appeared, outboxKey, nextOut, pendingId]);

  // Aparece una sola vez: el estado queda guardado.
  const appear = useCallback(() => {
    setState((current) => {
      if (current.appeared) return current;
      const appeared = { ...current, appeared: true, appearedAt: Date.now(), unread: 1 };
      return addMessage(appeared, { from: "unknown", text: FIRST_MESSAGE });
    });
  }, []);

  // Al abrir el chat se marca como leído. La primera vez, si el jugador no
  // contestó todavía, el contacto insiste.
  const open = useCallback(() => {
    setState((current) => {
      if (!current.appeared) return current;
      const firstTime = !current.opened && !current.messages.some((item) => item.from === "player");
      return {
        ...current,
        opened: true,
        unread: 0,
        outbox: firstTime ? [...current.outbox, ...FIRST_OPEN_MESSAGES] : current.outbox,
      };
    });
  }, []);

  const send = useCallback((text) => {
    const clean = text.replace(/\s+/g, " ").trim().slice(0, MAX_LENGTH);
    if (!clean) return;
    setState((current) => ({
      ...addMessage(current, { from: "player", text: clean, status: "sent", answered: false }),
      // Si el jugador contesta antes de que el contacto insista, ya no insiste.
      outbox: current.outbox.filter((text) => !FIRST_OPEN_MESSAGES.includes(text)),
    }));
  }, []);

  return {
    appeared: state.appeared,
    talked: state.talked,
    messages: state.messages,
    unread: state.unread,
    typing,
    // "En línea" mientras lee o tiene algo para decir.
    online: typing || state.outbox.length > 0 || pendingId !== null,
    appear,
    open,
    send,
  };
}
