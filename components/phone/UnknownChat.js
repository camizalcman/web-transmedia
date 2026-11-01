"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  CameraIcon,
  ChevronLeftIcon,
  MicIcon,
  PhoneIcon,
  PlusIcon,
  StickerIcon,
  TickIcon,
  VideoIcon,
  WhatsAppGlyph,
} from "@/components/phone/icons";
import { UNKNOWN_ID, UNKNOWN_NAME } from "@/lib/unknownContact";

// Chat con el «Número desconocido»: usa las mismas clases que los chats de
// Mica (wa-*) y suma lo propio de una conversación viva: campo de texto,
// «escribiendo…» y scroll automático al último mensaje.

// Silueta sin foto, como la de un contacto que no está agendado.
export function UnknownAvatar({ size = "lg" }) {
  return (
    <span className={`wa-avatar wa-avatar--${size} wa-avatar--unknown`} aria-hidden="true">
      <svg viewBox="0 0 40 40">
        <circle cx="20" cy="15" r="7" fill="currentColor" />
        <path d="M6 36a14 14 0 0 1 28 0z" fill="currentColor" />
      </svg>
    </span>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.4 20.4 21 12 3.4 3.6l-.1 6.5L15 12 3.3 13.9z" fill="currentColor" />
    </svg>
  );
}

// Fila en la lista de chats (va primero: es la conversación más reciente).
export function UnknownChatRow({ contact, onOpen }) {
  const last = contact.messages.at(-1);
  if (!last) return null;
  return (
    <li>
      <button className="wa-row" onClick={onOpen}>
        <UnknownAvatar />
        <span className="wa-row-body">
          <span className="wa-row-top">
            <strong>{UNKNOWN_NAME}</strong>
            <time className={contact.unread ? "is-unread" : ""}>{last.time}</time>
          </span>
          <span className="wa-row-bottom">
            {contact.typing ? (
              <span className="wa-row-preview wa-row-typing">escribiendo…</span>
            ) : (
              <span className="wa-row-preview">
                {last.from === "player" && <TickIcon status={last.status} />}
                {last.text}
              </span>
            )}
            {contact.unread > 0 && (
              <b className="wa-badge" aria-label={`${contact.unread} mensajes sin leer`}>{contact.unread}</b>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

// Notificación de iOS que baja desde arriba; tocarla abre la conversación.
export function UnknownNotification({ text, onOpen }) {
  return (
    <button className="ios-notification" onClick={onOpen} aria-label={`Mensaje de ${UNKNOWN_NAME}: ${text}`}>
      <span className="ios-notification-icon"><WhatsAppGlyph /></span>
      <span className="ios-notification-body">
        <span className="ios-notification-top">
          <strong>{UNKNOWN_NAME}</strong>
          <small>ahora</small>
        </span>
        <span className="ios-notification-text">{text}</span>
      </span>
    </button>
  );
}

// Si el jugador está a menos de esto del final, los mensajes nuevos lo bajan.
const STICK_DISTANCE = 80;

export function UnknownChatView({ contact, scrollPositions, onBack }) {
  const scrollRef = useRef(null);
  const stickRef = useRef(true);
  const restoredRef = useRef(false);
  const [draft, setDraft] = useState("");

  // Al abrir: la posición en la que se dejó o el final. Después, cada mensaje
  // nuevo (o el «escribiendo…») baja hasta el final si ya se estaba ahí.
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!restoredRef.current) {
      restoredRef.current = true;
      const saved = scrollPositions.current[UNKNOWN_ID];
      node.scrollTop = saved ?? node.scrollHeight;
      stickRef.current = saved === undefined || node.scrollHeight - saved - node.clientHeight < STICK_DISTANCE;
      return;
    }
    if (stickRef.current) node.scrollTop = node.scrollHeight;
  }, [contact.messages.length, contact.typing, scrollPositions]);

  function handleScroll(event) {
    const node = event.currentTarget;
    scrollPositions.current[UNKNOWN_ID] = node.scrollTop;
    stickRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < STICK_DISTANCE;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    // Lo que escribe el jugador siempre se ve, aunque estuviera leyendo más arriba.
    stickRef.current = true;
    contact.send(draft);
    setDraft("");
  }

  const messages = contact.messages;

  return (
    <section className="wa-chat" aria-label={`Conversación con ${UNKNOWN_NAME}`}>
      <header className="wa-chat-header">
        <button className="wa-back" onClick={onBack} aria-label="Volver a Chats">
          <ChevronLeftIcon />
        </button>
        <UnknownAvatar size="sm" />
        <span className="wa-chat-title">
          <strong>{UNKNOWN_NAME}</strong>
          <small className={contact.typing ? "wa-chat-typing" : ""}>
            {contact.typing ? "escribiendo…" : contact.online ? "en línea" : "últ. vez hace mucho tiempo"}
          </small>
        </span>
        <span className="wa-icon" aria-hidden="true"><VideoIcon /></span>
        <span className="wa-icon" aria-hidden="true"><PhoneIcon /></span>
      </header>

      <ol ref={scrollRef} className="wa-messages" onScroll={handleScroll} aria-live="polite">
        <li className="wa-day">Hoy</li>
        <li className="wa-notice">Este número no está en tus contactos.</li>
        {messages.map((message, index) => {
          const mine = message.from === "player";
          const first = messages[index - 1]?.from !== message.from;
          return (
            <li
              key={message.id}
              className={`wa-bubble ${mine ? "wa-bubble--out" : "wa-bubble--in"} ${first ? "is-first" : ""}`}
            >
              {message.text}
              <span className="wa-meta">
                {message.time}
                {mine && <TickIcon status={message.status} />}
              </span>
            </li>
          );
        })}
        {contact.typing && (
          <li
            className={`wa-bubble wa-bubble--in wa-typing ${messages.at(-1)?.from !== "unknown" ? "is-first" : ""}`}
            aria-label="escribiendo"
          >
            <i />
            <i />
            <i />
          </li>
        )}
      </ol>

      <form className="wa-composer wa-composer--live" onSubmit={handleSubmit}>
        <span className="wa-icon" aria-hidden="true"><PlusIcon /></span>
        <label className="wa-composer-field wa-composer-input">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            // Las teclas no deben llegar a las escenas 3D de la página.
            onKeyDown={(event) => event.stopPropagation()}
            maxLength={300}
            autoComplete="off"
            enterKeyHint="send"
            placeholder="Mensaje"
            aria-label={`Mensaje para ${UNKNOWN_NAME}`}
          />
          <StickerIcon />
        </label>
        {draft.trim() ? (
          <button type="submit" className="wa-send" aria-label="Enviar">
            <SendIcon />
          </button>
        ) : (
          <>
            <span className="wa-icon" aria-hidden="true"><CameraIcon /></span>
            <span className="wa-icon" aria-hidden="true"><MicIcon /></span>
          </>
        )}
      </form>
    </section>
  );
}
