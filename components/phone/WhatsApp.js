"use client";

import { useLayoutEffect, useRef } from "react";
import { chats, senderNames } from "@/data/conversations";
import {
  CallsIcon,
  CameraIcon,
  ChatsIcon,
  ChevronLeftIcon,
  CommunitiesIcon,
  GroupAvatarIcon,
  MicIcon,
  MoreIcon,
  PhoneIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  StickerIcon,
  TickIcon,
  UpdatesIcon,
  VideoIcon,
} from "@/components/phone/icons";
import { HomeBar, StatusBar } from "@/components/phone/System";
import { UnknownChatRow, UnknownChatView } from "@/components/phone/UnknownChat";
import { UNKNOWN_ID } from "@/lib/unknownContact";

function Avatar({ chat, size = "lg" }) {
  return (
    <span className={`wa-avatar wa-avatar--${size}`} style={{ background: chat.avatar.color }} aria-hidden="true">
      {chat.isGroup ? <GroupAvatarIcon /> : chat.avatar.initials}
    </span>
  );
}

// Los iconos de acción que no abren nada se muestran como decoración.
function Decoration({ children, className = "" }) {
  return <span className={`wa-icon ${className}`} aria-hidden="true">{children}</span>;
}

// `contact`: el chat con el «Número desconocido» (useUnknownContact). Se suma
// a la lista recién cuando apareció; los chats de Mica no cambian.
// `extraMessages` (por id de chat) se agregan al final de cada conversación y
// `extraUnread` cuenta los que llegaron sin leer.
export default function WhatsApp({
  openChatId,
  readChats,
  scrollMemory,
  contact,
  extraMessages = {},
  extraUnread = {},
  onOpenChat,
  onBack,
  onHome,
}) {
  const allChats = chats.map((item) =>
    extraMessages[item.id] ? { ...item, messages: [...item.messages, ...extraMessages[item.id]] } : item,
  );
  const chat = allChats.find((item) => item.id === openChatId);
  const unknownOpen = openChatId === UNKNOWN_ID && contact?.appeared;

  return (
    <div className="wa">
      <StatusBar />
      {unknownOpen ? (
        <UnknownChatView contact={contact} scrollMemory={scrollMemory} onBack={onBack} />
      ) : chat ? (
        <ChatView key={chat.id} chat={chat} scrollMemory={scrollMemory} onBack={onBack} />
      ) : (
        <ChatList
          chats={allChats}
          readChats={readChats}
          extraUnread={extraUnread}
          contact={contact}
          onOpenChat={onOpenChat}
        />
      )}
      <HomeBar onHome={onHome} />
    </div>
  );
}

function ChatList({ chats, readChats, extraUnread, contact, onOpenChat }) {
  const unreadOf = (chat) => (readChats.has(chat.id) ? 0 : chat.unread) + (extraUnread[chat.id] ?? 0);
  const unreadChats =
    chats.filter((chat) => unreadOf(chat) > 0).length + (contact?.appeared && contact.unread ? 1 : 0);

  return (
    <section className="wa-list" aria-label="Chats">
      <div className="wa-list-actions">
        <Decoration className="wa-icon--round"><MoreIcon /></Decoration>
        <span>
          <Decoration><CameraIcon /></Decoration>
          <Decoration className="wa-icon--green"><PlusIcon /></Decoration>
        </span>
      </div>
      <h2 className="wa-list-title">Chats</h2>
      <div className="wa-search" aria-hidden="true">
        <SearchIcon />
        <span>Buscar</span>
      </div>
      <div className="wa-filters" aria-hidden="true">
        <span className="is-active">Todos</span>
        <span>No leídos{unreadChats ? ` ${unreadChats}` : ""}</span>
        <span>Favoritos</span>
        <span>Grupos</span>
      </div>

      <ul className="wa-rows">
        {contact?.appeared && <UnknownChatRow contact={contact} onOpen={() => onOpenChat(UNKNOWN_ID)} />}
        {chats.map((chat) => {
          const last = chat.messages.at(-1);
          const unread = unreadOf(chat);
          return (
            <li key={chat.id}>
              <button className="wa-row" onClick={() => onOpenChat(chat.id)}>
                <Avatar chat={chat} />
                <span className="wa-row-body">
                  <span className="wa-row-top">
                    <strong>{chat.name}</strong>
                    <time className={unread ? "is-unread" : ""}>{last.time}</time>
                  </span>
                  <span className="wa-row-bottom">
                    <span className="wa-row-preview">
                      {last.from === "mica" && <TickIcon status={last.status} />}
                      {chat.isGroup && last.from !== "mica" && `${senderNames[last.from]}: `}
                      {last.text}
                    </span>
                    {unread ? (
                      <b className="wa-badge" aria-label={`${unread} mensajes sin leer`}>{unread}</b>
                    ) : (
                      chat.pinned && <span className="wa-pin" aria-label="Fijado"><PinIcon /></span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="wa-encrypted">🔒 Tus mensajes personales están cifrados de extremo a extremo</p>

      <nav className="wa-tabs" aria-hidden="true">
        <span><UpdatesIcon />Novedades</span>
        <span><CallsIcon />Llamadas</span>
        <span><CommunitiesIcon />Comunidades</span>
        <span className="is-active">
          <i><ChatsIcon />{unreadChats > 0 && <b className="wa-badge">{unreadChats}</b>}</i>
          Chats
        </span>
        <span><SettingsIcon />Configuración</span>
      </nav>
    </section>
  );
}

function ChatView({ chat, scrollMemory, onBack }) {
  const scrollRef = useRef(null);

  const countKey = `${chat.id}:mensajes`;
  const countRef = useRef(chat.messages.length);

  // Al abrir se muestra el final de la conversación (el último estado de la
  // historia) o, si ya se había leído, la posición en la que se dejó (salvo
  // que hayan llegado mensajes nuevos desde entonces: ahí, el final).
  useLayoutEffect(() => {
    const node = scrollRef.current;
    const saved = scrollMemory.get(chat.id);
    const savedCount = scrollMemory.get(countKey) ?? countRef.current;
    node.scrollTop = saved !== undefined && savedCount >= countRef.current ? saved : node.scrollHeight;
  }, [chat.id, countKey, scrollMemory]);

  // Un mensaje nuevo con el chat abierto baja hasta el final.
  useLayoutEffect(() => {
    if (chat.messages.length <= countRef.current) return;
    countRef.current = chat.messages.length;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat.messages.length]);

  return (
    <section className="wa-chat" aria-label={`Conversación con ${chat.name}`}>
      <header className="wa-chat-header">
        <button className="wa-back" onClick={onBack} aria-label="Volver a Chats">
          <ChevronLeftIcon />
        </button>
        <Avatar chat={chat} size="sm" />
        <span className="wa-chat-title">
          <strong>{chat.name}</strong>
          <small>{chat.isGroup ? chat.members : "toca para ver la info del contacto"}</small>
        </span>
        <Decoration><VideoIcon /></Decoration>
        <Decoration><PhoneIcon /></Decoration>
      </header>

      <ol
        ref={scrollRef}
        className="wa-messages"
        onScroll={(event) => {
          scrollMemory.set(chat.id, event.currentTarget.scrollTop);
          scrollMemory.set(countKey, chat.messages.length);
        }}
      >
        <li className="wa-day">Hoy</li>
        {chat.messages.map((message, index) => {
          const mine = message.from === "mica";
          const first = chat.messages[index - 1]?.from !== message.from;
          return (
            <li
              key={index}
              className={`wa-bubble ${mine ? "wa-bubble--out" : "wa-bubble--in"} ${first ? "is-first" : ""}`}
            >
              {chat.isGroup && !mine && first && <span className="wa-sender">{senderNames[message.from]}</span>}
              {message.text}
              <span className="wa-meta">
                {message.time}
                {mine && <TickIcon status={message.status} />}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="wa-composer" aria-hidden="true">
        <span className="wa-icon"><PlusIcon /></span>
        <span className="wa-composer-field"><StickerIcon /></span>
        <span className="wa-icon"><CameraIcon /></span>
        <span className="wa-icon"><MicIcon /></span>
      </div>
    </section>
  );
}
