import PhoneModel from "@/components/PhoneModel";

export const metadata = {
  title: "Celular — Señal perdida",
  description: "Vista de prueba del modelo 3D del celular.",
};

// Ruta de prueba para explorar el modelo antes de integrarlo al recorrido.
export default function PhonePage() {
  return (
    <main className="phone-page">
      <p className="phone-hint">ARRASTRÁ PARA GIRAR · RUEDA PARA ACERCAR</p>
      <PhoneModel />
    </main>
  );
}
