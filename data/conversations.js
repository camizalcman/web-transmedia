// Estado del celular de Mica.
export const PHONE_TIME = "22:18";
export const PHONE_DATE = "jueves, 13 de junio";
export const PHONE_PASSCODE = "221507";
export const PHONE_WALLPAPER = "/img/fondo.jpg";

// Conversaciones de WhatsApp, en el orden en que aparecen en la lista.
//
// Mensajes de Mica (`from: "mica"`):
// - status "read": el destinatario respondió despues (doble tilde azul).
// - status "sent": nunca obtuvo respuesta; se quedó en un solo tilde gris.
export const chats = [
  {
    id: "chicas",
    name: "Las chicas 💗",
    isGroup: true,
    members: "Juli, Sofi, Tú",
    avatar: { color: "#5b6670" },
    pinned: true,
    unread: 0,
    messages: [
      { from: "mica", time: "22:07", status: "read", text: "chicas, estoy volviendo del laboratorio" },
      { from: "mica", time: "22:07", status: "read", text: "ya bajo las escaleras" },
      { from: "sofi", time: "22:08", text: "daleee te esperamos afuera" },
      { from: "sofi", time: "22:08", text: "no tardes que nos morimos de frío jajaj" },
      { from: "mica", time: "22:11", status: "sent", text: "chicas?" },
      { from: "mica", time: "22:11", status: "sent", text: "dónde están?" },
      { from: "mica", time: "22:13", status: "sent", text: "no sé dónde me metí" },
      { from: "mica", time: "22:13", status: "sent", text: "estoy bajando hace un montón y no llego nunca" },
      { from: "mica", time: "22:14", status: "sent", text: "chicas por favor contesten" },
    ],
  },
  {
    id: "sofi",
    name: "Sofi",
    avatar: { initials: "S", color: "#d4669a" },
    pinned: true,
    unread: 2,
    messages: [
      { from: "sofi", time: "22:14", text: "Mica, ¿dónde estás? ¿Cuánto te falta?" },
      { from: "mica", time: "22:15", status: "read", text: "no sé Sofi te juro" },
      { from: "mica", time: "22:15", status: "read", text: "está todo muy raro" },
      { from: "mica", time: "22:15", status: "read", text: "se apagaron todas las luces y ahora hay luces rojas" },
      { from: "mica", time: "22:15", status: "read", text: "no hay nadie acá" },
      { from: "sofi", time: "22:16", text: "pará, ¿luces rojas de qué?" },
      { from: "sofi", time: "22:16", text: "estamos afuera. No te vemos por ningún lado." },
      { from: "mica", time: "22:16", status: "read", text: "SOFI TENGO MIEDO" },
      { from: "mica", time: "22:16", status: "read", text: "VENGAN A BUSCARME POR FAVOR" },
      { from: "sofi", time: "22:17", text: "Mica, te juro que estamos en la entrada" },
      { from: "sofi", time: "22:17", text: "no hay nadie adentro" },
    ],
  },
  {
    id: "mama",
    name: "Mamá ❤️",
    avatar: { initials: "M", color: "#8a6bc9" },
    pinned: false,
    unread: 0,
    messages: [
      { from: "mama", time: "22:12", text: "Mi amor, ¿estás volviendo?" },
      { from: "mica", time: "22:13", status: "read", text: "ma todavía no pude salir del colegio" },
      { from: "mica", time: "22:13", status: "read", text: "no entiendo qué está pasando" },
      { from: "mama", time: "22:14", text: "¿Cómo que no pudiste salir? ¿Dónde estás?" },
      { from: "mama", time: "22:14", text: "Llamame ahora." },
      { from: "mica", time: "22:15", status: "sent", text: "no me llames" },
      { from: "mica", time: "22:15", status: "sent", text: "no sé si vas a escucharme" },
      { from: "mica", time: "22:18", status: "sent", text: "ma?" },
      { from: "mica", time: "22:18", status: "sent", text: "MA CONTESTAME" },
    ],
  },
];

// Nombres que se muestran en los mensajes recibidos dentro de un grupo.
export const senderNames = { sofi: "Sofi", juli: "Juli", mama: "Mamá" };

// Mensajes que llegan cuando el jugador vuelve al celular después de resolver
// el pizarrón: Mica salió. Se suman al final de los chats de arriba, en este
// orden y de a uno (no se modifican los mensajes anteriores).
export const EPILOGUE_MESSAGES = [
  { chat: "chicas", from: "mica", time: "22:51", status: "read", text: "CHICASSS" },
  { chat: "chicas", from: "mica", time: "22:51", status: "read", text: "volvió todo a la normalidad" },
  { chat: "mama", from: "mica", time: "22:51", status: "read", text: "maaa" },
  { chat: "chicas", from: "mica", time: "22:51", status: "read", text: "estoy saliendo del colegio" },
  { chat: "mama", from: "mica", time: "22:51", status: "read", text: "ya volvió todo a la normalidad" },
  { chat: "mama", from: "mica", time: "22:51", status: "read", text: "estoy saliendo del colegio" },
  { chat: "chicas", from: "sofi", time: "22:52", text: "MICA?????" },
  { chat: "mama", from: "mama", time: "22:52", text: "MI AMOR ¿ESTÁS BIEN?" },
  { chat: "chicas", from: "juli", time: "22:52", text: "DÓNDE ESTABAS???" },
  { chat: "mama", from: "mama", time: "22:52", text: "No te muevas, ya voy a buscarte" },
  { chat: "chicas", from: "mica", time: "22:52", status: "read", text: "después les cuento, fue horrible" },
  { chat: "mama", from: "mica", time: "22:53", status: "read", text: "estoy bien ma ❤️" },
];
