import Image from "next/image";
import { PHONE_TIME, PHONE_WALLPAPER } from "@/data/conversations";
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

// Fondo de pantalla del celular: la foto de /public/img. next/image entrega
// una versión reducida al tamaño de la pantalla.
// - "lock": nítida, en la pantalla bloqueada.
// - "blur": desenfocada y oscura, detrás del teclado del código.
// - "home": un poco oscurecida para que se lean los iconos.
export function Wallpaper({ mode = "lock" }) {
  return (
    <div className={`ios-wallpaper ios-wallpaper--${mode}`} aria-hidden="true">
      <Image src={PHONE_WALLPAPER} alt="" fill sizes="390px" priority />
    </div>
  );
}
