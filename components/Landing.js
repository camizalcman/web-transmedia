import EvidenceScroll from "@/components/EvidenceScroll";
import IntroVideo from "@/components/IntroVideo";
import PhoneScroll from "@/components/PhoneScroll";

// Portada: noticiero a pantalla completa, las evidencias y el celular 3D.
// Es un Server Component; solo el video y el escenario de scroll se hidratan.
export default function Landing() {
  return (
    <main className="landing">
      <div className="noise" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
      <IntroVideo nextSectionId="evidencias" />
      <EvidenceScroll id="evidencias" />
      <PhoneScroll />
    </main>
  );
}
