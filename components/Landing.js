import EvidenceScroll from "@/components/EvidenceScroll";
import IntroVideo from "@/components/IntroVideo";

// Portada: noticiero a pantalla completa y, al scrollear, las evidencias.
// Es un Server Component; solo el video y el escenario de scroll se hidratan.
export default function Landing() {
  return (
    <main className="landing">
      <div className="noise" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
      <IntroVideo nextSectionId="evidencias" />
      <EvidenceScroll id="evidencias" />
    </main>
  );
}
