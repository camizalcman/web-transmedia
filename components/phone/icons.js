// Iconos SVG del sistema y de WhatsApp. Heredan el color del texto.
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

export function SignalIcon() {
  return (
    <svg viewBox="0 0 18 12" aria-hidden="true">
      {[0, 1, 2, 3].map((bar) => (
        <rect key={bar} x={bar * 4.6} y={9 - bar * 3} width="3" height={3 + bar * 3} rx="1" fill="currentColor" />
      ))}
    </svg>
  );
}

export function WifiIcon() {
  return (
    <svg viewBox="0 0 16 12" aria-hidden="true">
      <path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0z" fill="currentColor" />
      <path d="M3.4 6.8a6.6 6.6 0 0 1 9.2 0M1 4.4a10 10 0 0 1 14 0" {...stroke} strokeWidth="1.7" />
    </svg>
  );
}

export function BatteryIcon() {
  return (
    <svg viewBox="0 0 27 13" aria-hidden="true">
      <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".45" />
      <rect x="2" y="2" width="13" height="9" rx="2" fill="currentColor" />
      <path d="M25 4.5v4a2 2 0 0 0 0-4z" fill="currentColor" opacity=".45" />
    </svg>
  );
}

export function LockIcon({ open = false }) {
  return (
    <svg viewBox="0 0 20 26" aria-hidden="true">
      <path d={open ? "M5 12V7a5 5 0 0 1 9.6-2" : "M5 12V7a5 5 0 0 1 10 0v5"} {...stroke} strokeWidth="2.4" />
      <rect x="2" y="11" width="16" height="13" rx="3" fill="currentColor" />
    </svg>
  );
}

export function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 12 20" aria-hidden="true">
      <path d="M10 2 2 10l8 8" {...stroke} strokeWidth="2.6" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="5.2" {...stroke} />
      <path d="m11 11 3.5 3.5" {...stroke} />
    </svg>
  );
}

export function CameraIcon() {
  return (
    <svg viewBox="0 0 24 20" aria-hidden="true">
      <path d="M3 5h4l2-2.5h6L17 5h4a1.5 1.5 0 0 1 1.5 1.5V17a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 17V6.5A1.5 1.5 0 0 1 3 5z" {...stroke} strokeWidth="1.8" />
      <circle cx="12" cy="11.5" r="4" {...stroke} strokeWidth="1.8" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2v12M2 8h12" {...stroke} strokeWidth="2.2" />
    </svg>
  );
}

export function MoreIcon() {
  return (
    <svg viewBox="0 0 16 4" aria-hidden="true">
      {[2, 8, 14].map((cx) => <circle key={cx} cx={cx} cy="2" r="1.8" fill="currentColor" />)}
    </svg>
  );
}

export function VideoIcon() {
  return (
    <svg viewBox="0 0 26 16" aria-hidden="true">
      <rect x="1" y="1.5" width="16" height="13" rx="3" {...stroke} strokeWidth="1.8" />
      <path d="m17 6.5 7-4v11l-7-4z" {...stroke} strokeWidth="1.8" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5.5 1.5 8 6 6.3 7.8a11 11 0 0 0 5.9 5.9L14 12l4.5 2.5-.8 3a2 2 0 0 1-2.1 1.4A16 16 0 0 1 1.1 4.4 2 2 0 0 1 2.5 2.3z" {...stroke} strokeWidth="1.7" />
    </svg>
  );
}

export function StickerIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M18.5 10.5a8.5 8.5 0 1 1-9-9h4l5 5z" {...stroke} strokeWidth="1.7" />
      <path d="M13.5 1.5v5h5" {...stroke} strokeWidth="1.7" />
    </svg>
  );
}

export function MicIcon() {
  return (
    <svg viewBox="0 0 16 22" aria-hidden="true">
      <rect x="4" y="1" width="8" height="13" rx="4" {...stroke} strokeWidth="1.8" />
      <path d="M1 10a7 7 0 0 0 14 0M8 17v4" {...stroke} strokeWidth="1.8" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M8.6 1.2 12.8 5.4 10.9 6l-2.6 2.6.3 3-1.1 1.1-2.4-2.4L2 13.4l-.4-.4 3.1-3.1L2.3 7.5l1.1-1.1 3 .3L9 4.1z" fill="currentColor" />
    </svg>
  );
}

// Tildes de estado de los mensajes enviados.
export function TickIcon({ status }) {
  if (status === "read") {
    return (
      <svg className="wa-tick wa-tick--read" viewBox="0 0 18 11" aria-label="Leído">
        <path d="m1 6 3.5 3.5L11 2M7.5 8.5l1 1L16 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className="wa-tick wa-tick--sent" viewBox="0 0 12 11" aria-label="Enviado">
      <path d="m1 6 3.5 3.5L11 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Iconos de la barra inferior de WhatsApp.
export function UpdatesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" {...stroke} strokeWidth="1.8" strokeDasharray="10 3.5" />
      <circle cx="12" cy="12" r="5" {...stroke} strokeWidth="1.8" />
    </svg>
  );
}

export function CallsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 3.5 10 8 8.3 9.8a11 11 0 0 0 5.9 5.9L16 14l4.5 2.5-.8 3a2 2 0 0 1-2.1 1.4A16 16 0 0 1 3.1 6.4a2 2 0 0 1 1.4-2.1z" {...stroke} strokeWidth="1.8" />
    </svg>
  );
}

export function CommunitiesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" {...stroke} strokeWidth="1.8" />
      <path d="M5 20a7 7 0 0 1 14 0" {...stroke} strokeWidth="1.8" />
      <circle cx="4.5" cy="10" r="2.2" {...stroke} strokeWidth="1.6" />
      <circle cx="19.5" cy="10" r="2.2" {...stroke} strokeWidth="1.6" />
    </svg>
  );
}

export function ChatsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z" fill="currentColor" />
      <path d="M8 10.5h8M8 14h5" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" {...stroke} strokeWidth="1.8" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" {...stroke} strokeWidth="1.8" />
    </svg>
  );
}

// Avatar por defecto de WhatsApp para grupos.
export function GroupAvatarIcon() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="15" cy="15" r="5.5" fill="currentColor" />
      <circle cx="26.5" cy="16.5" r="4.5" fill="currentColor" opacity=".75" />
      <path d="M5 31a10 10 0 0 1 20 0z" fill="currentColor" />
      <path d="M22 31a8.5 8.5 0 0 1 14-6.5V31z" fill="currentColor" opacity=".75" />
    </svg>
  );
}

// Logo simplificado de WhatsApp para el icono de la app.
export function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 4.5A11.5 11.5 0 0 0 6.1 21.8L4.6 27.4l5.8-1.5A11.5 11.5 0 1 0 16 4.5z" fill="none" stroke="#fff" strokeWidth="2.2" />
      <path d="M12 10.2c.4 0 .7 0 .9.6l1.1 2.6c.1.3 0 .6-.2.9l-.8.9c-.2.2-.2.5 0 .8a8.7 8.7 0 0 0 4.1 3.6c.3.1.6.1.8-.1l1-1.2c.2-.3.5-.3.8-.2l2.6 1.2c.3.2.5.4.4.8-.2 1.4-1.6 2.4-3 2.3-1.5-.1-3.9-.9-6-3s-3-4.4-3.1-5.9c-.1-1.4.8-2.9 1.4-3.3z" fill="#fff" />
    </svg>
  );
}
