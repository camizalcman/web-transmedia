"use client";

import { useEffect, useRef, useState } from "react";
import HomeScreen from "@/components/phone/HomeScreen";
import LockScreen from "@/components/phone/LockScreen";
import { UnknownNotification } from "@/components/phone/UnknownChat";
import useUnknownContact from "@/components/phone/useUnknownContact";
import WhatsApp from "@/components/phone/WhatsApp";
import { chats } from "@/data/conversations";
import { FIRST_MESSAGE, UNKNOWN_ID } from "@/lib/unknownContact";
import { markStep } from "@/lib/storyProgress";

// Cuánto después de abrir el último de los chats de Mica escribe el número desconocido (ms).
const UNKNOWN_DELAY = 6000;
// Cuánto queda la notificación en pantalla si no se la toca (ms).
const NOTIFICATION_TIME = 7000;

// Interfaz HTML que se muestra dentro de la pantalla del celular 3D.
// Este componente no se desmonta mientras el celular está en escena, así que
// conserva el estado de la navegación: desbloqueo, chats leídos y la posición
// de lectura de cada conversación. El chat con el número desconocido también
// vive acá (y además se guarda para sobrevivir a una recarga).
export default function PhoneScreen() {
  const [screen, setScreen] = useState("lock");
  const [openChatId, setOpenChatId] = useState(null);
  const [readChats, setReadChats] = useState(() => new Set());
  const [notification, setNotification] = useState(false);
  const scrollPositions = useRef({});
  const contact = useUnknownContact(screen === "whatsapp" && openChatId === UNKNOWN_ID);
  const { appeared, talked, appear, open: openContact } = contact;
  const allChatsRead = chats.every((chat) => readChats.has(chat.id));

  function openChat(chatId) {
    setOpenChatId(chatId);
    setReadChats((current) => new Set(current).add(chatId));
    if (chatId === UNKNOWN_ID) {
      openContact();
      setNotification(false);
    }
  }

  // El número desconocido escribe una sola vez, cuando el jugador ya entró a
  // los tres chats de Mica.
  useEffect(() => {
    if (appeared || !allChatsRead || screen === "lock") return;
    const timer = window.setTimeout(() => {
      appear();
      setNotification(true);
    }, UNKNOWN_DELAY);
    return () => window.clearTimeout(timer);
  }, [appeared, allChatsRead, screen, appear]);

  // Cuando el jugador ya habló con el número desconocido (le escribió y
  // recibió respuesta), se habilita bajar al pasillo. Si la conversación ya
  // había ocurrido antes de recargar, se habilita al desbloquear el celular.
  useEffect(() => {
    if (talked && screen !== "lock") markStep("contact-talked");
  }, [talked, screen]);

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(false), NOTIFICATION_TIME);
    return () => window.clearTimeout(timer);
  }, [notification]);

  return (
    <div className="ios">
      {screen === "lock" && (
        <LockScreen
          onUnlock={() => {
            setScreen("home");
            // Desbloquear el celular habilita el siguiente tramo del recorrido.
            markStep("phone-unlocked");
          }}
        />
      )}
      {screen === "home" && <HomeScreen onOpenWhatsApp={() => setScreen("whatsapp")} />}
      {screen === "whatsapp" && (
        <WhatsApp
          openChatId={openChatId}
          readChats={readChats}
          scrollPositions={scrollPositions}
          contact={contact}
          onOpenChat={openChat}
          onBack={() => setOpenChatId(null)}
          onHome={() => setScreen("home")}
        />
      )}
      {notification && screen !== "lock" && (
        <UnknownNotification
          text={FIRST_MESSAGE}
          onOpen={() => {
            setScreen("whatsapp");
            openChat(UNKNOWN_ID);
          }}
        />
      )}
    </div>
  );
}
