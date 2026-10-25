import { Caveat } from "next/font/google";
import LockerRoom from "@/components/LockerRoom";

// Letra manuscrita para la hoja con las cuentas (se dibuja sobre un canvas).
const handwriting = Caveat({ subsets: ["latin"], weight: "600" });

export const metadata = {
  title: "Lockers — Señal perdida",
  description: "Vista de prueba de los lockers 3D con el celular adentro.",
};

// Ruta de prueba para explorar la escena antes de integrarla al recorrido.
export default function LockersPage() {
  return <LockerRoom handFont={handwriting.style.fontFamily} />;
}
