"use client";

import { useRef, useState } from "react";
import HomeScreen from "@/components/phone/HomeScreen";
import LockScreen from "@/components/phone/LockScreen";
import WhatsApp from "@/components/phone/WhatsApp";
import { markStep } from "@/lib/storyProgress";

// Interfaz HTML que se muestra dentro de la pantalla del celular 3D.
// Este componente no se desmonta mientras el celular está en escena, así que
// conserva el estado de la navegación: desbloqueo, chats leídos y la posición
// de lectura de cada conversación.
export default function PhoneScreen() {
  const [screen, setScreen] = useState("lock");
  const [openChatId, setOpenChatId] = useState(null);
  const [readChats, setReadChats] = useState(() => new Set());
  const scrollPositions = useRef({});

  function openChat(chatId) {
    setOpenChatId(chatId);
    setReadChats((current) => new Set(current).add(chatId));
  }

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
          onOpenChat={openChat}
          onBack={() => setOpenChatId(null)}
          onHome={() => setScreen("home")}
        />
      )}
    </div>
  );
}
