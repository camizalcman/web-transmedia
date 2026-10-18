import { PHONE_DATE } from "@/data/conversations";
import { WhatsAppGlyph } from "@/components/phone/icons";
import { HomeBar, SchoolWallpaper, StatusBar } from "@/components/phone/System";

// El icono de Calendario muestra el día de la fecha del celular.
const [weekday, dayAndMonth] = PHONE_DATE.split(", ");
const calendarGlyph = <><em>{weekday}</em>{dayAndMonth.split(" ")[0]}</>;

// Apps decorativas: no son botones porque no se abren.
const APPS = [
  { name: "FaceTime", tone: "facetime", glyph: "▶" },
  { name: "Calendario", tone: "calendar", glyph: calendarGlyph },
  { name: "Fotos", tone: "photos", glyph: "✿" },
  { name: "Cámara", tone: "camera", glyph: "◉" },
  { name: "Reloj", tone: "clock", glyph: "◷" },
  { name: "Notas", tone: "notes", glyph: "≡" },
  { name: "Mapas", tone: "maps", glyph: "➤" },
  { name: "Ajustes", tone: "settings", glyph: "⚙" },
];
const DOCK = [
  { name: "Teléfono", tone: "phone", glyph: "✆" },
  { name: "Safari", tone: "safari", glyph: "✦" },
  { name: "Mensajes", tone: "messages", glyph: "❝" },
  { name: "Música", tone: "music", glyph: "♫" },
];

function AppIcon({ app }) {
  return (
    <span className="ios-app" aria-hidden="true">
      <span className={`ios-app-icon ios-app-icon--${app.tone}`}>{app.glyph}</span>
      <small>{app.name}</small>
    </span>
  );
}

export default function HomeScreen({ onOpenWhatsApp }) {
  return (
    <div className="ios-home">
      <SchoolWallpaper dimmed />
      <StatusBar />

      <div className="ios-home-grid">
        {APPS.map((app) => <AppIcon key={app.name} app={app} />)}
        <button className="ios-app" onClick={onOpenWhatsApp}>
          <span className="ios-app-icon ios-app-icon--whatsapp"><WhatsAppGlyph /></span>
          <small>WhatsApp</small>
        </button>
      </div>

      <span className="ios-home-search" aria-hidden="true">Buscar</span>

      <div className="ios-dock">
        {DOCK.map((app) => <AppIcon key={app.name} app={app} />)}
      </div>
      <HomeBar />
    </div>
  );
}
