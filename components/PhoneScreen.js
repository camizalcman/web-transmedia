"use client";

import { useState } from "react";

// Interfaz HTML que se muestra dentro de la pantalla del celular 3D.
// Por ahora es una prueba visual: encabezado, mensajes y un campo para
// comprobar que los clics y el teclado funcionan sobre el modelo.
const INITIAL_MESSAGES = [
  { id: 1, from: "them", text: "¿Llegaste?", time: "22:58" },
  { id: 2, from: "them", text: "Avisame cuando estés en casa", time: "23:04" },
  { id: 3, from: "me", text: "Ya casi. Hay alguien en la parada", time: "23:11" },
  { id: 4, from: "them", text: "¿Quién?", time: "23:12" },
  { id: 5, from: "me", text: "No sé. Me está mirando", time: "23:40" },
];

export default function PhoneScreen() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: Date.now(), from: "me", text, time: "23:47" }]);
    setDraft("");
  }

  return (
    <div className="wa">
      <div className="wa-status" aria-hidden="true">
        <span>23:47</span>
        <span>●●● 4G</span>
      </div>

      <header className="wa-header">
        <button className="wa-back" aria-label="Volver">‹</button>
        <span className="wa-avatar" aria-hidden="true">M</span>
        <div>
          <strong>Mamá</strong>
          <small>últ. vez hoy a las 23:12</small>
        </div>
      </header>

      <ol className="wa-messages">
        {messages.map((message) => (
          <li key={message.id} className={`wa-bubble wa-bubble--${message.from}`}>
            {message.text}
            <time>{message.time}</time>
          </li>
        ))}
      </ol>

      <form className="wa-composer" onSubmit={handleSubmit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Mensaje"
          aria-label="Escribir mensaje"
        />
        <button type="submit" aria-label="Enviar">➤</button>
      </form>
    </div>
  );
}
