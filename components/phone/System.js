import Image from "next/image";
import { LOCK_WALLPAPER, PHONE_TIME } from "@/data/conversations";
import { BatteryIcon, SignalIcon, WifiIcon } from "@/components/phone/icons";

// Barra de estado de iOS, repartida a los costados del notch.
export function StatusBar({ hideTime = false }) {
  return (
    <div className="ios-status" aria-hidden="true">
      <span className="ios-status-time">{hideTime ? "" : PHONE_TIME}</span>
      <span className="ios-status-icons">
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon />
      </span>
    </div>
  );
}

// Indicador inferior de iOS. Dentro de una app funciona como "volver al inicio".
export function HomeBar({ onHome }) {
  if (!onHome) return <span className="ios-home-bar" aria-hidden="true" />;
  return (
    <button className="ios-home-bar ios-home-bar--button" onClick={onHome} aria-label="Volver a la pantalla de inicio" />
  );
}

// Fondo de la pantalla bloqueada: la foto de /public/img. next/image entrega
// una versión reducida al tamaño de la pantalla del celular.
export function LockWallpaper({ dimmed = false }) {
  return (
    <div className={`ios-wallpaper ios-wallpaper--photo ${dimmed ? "is-dimmed" : ""}`} aria-hidden="true">
      <Image src={LOCK_WALLPAPER} alt="" fill sizes="390px" priority />
    </div>
  );
}

// Fondo de la pantalla de inicio: el edificio del colegio de noche.
export function SchoolWallpaper({ dimmed = false }) {
  const windows = [];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      if (col === 3) continue;
      windows.push(
        <rect
          key={`${row}-${col}`}
          x={36 + col * 47}
          y={470 + row * 62}
          width="22"
          height="34"
          rx="2"
          fill="#11161d"
        />,
      );
    }
  }

  return (
    <svg className={`ios-wallpaper ${dimmed ? "is-dimmed" : ""}`} viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="ios-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d1424" />
          <stop offset=".55" stopColor="#090c14" />
          <stop offset="1" stopColor="#030405" />
        </linearGradient>
        <radialGradient id="ios-moon" cx=".72" cy=".2" r=".45">
          <stop offset="0" stopColor="#2a3550" stopOpacity=".55" />
          <stop offset="1" stopColor="#2a3550" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="390" height="844" fill="url(#ios-sky)" />
      <rect width="390" height="844" fill="url(#ios-moon)" />
      {/* Edificio: cuerpo, torre central con reloj y escalinata */}
      <path d="M14 450h362v394H14z" fill="#070a0e" />
      <path d="M150 360h90v90h-90z" fill="#070a0e" />
      <path d="M138 362 195 318l57 44z" fill="#070a0e" />
      <circle cx="195" cy="398" r="17" fill="none" stroke="#1b2230" strokeWidth="3" />
      <path d="M195 388v10l7 5" stroke="#1b2230" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M0 450h390" stroke="#151b25" strokeWidth="3" />
      {windows}
      <path d="M172 700h46v144h-46z" fill="#020304" />
      <path d="M150 800h90v14h-90zM140 814h110v14H140zM130 828h130v16H130z" fill="#0b0f15" />
    </svg>
  );
}
