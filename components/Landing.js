import { Caveat } from "next/font/google";
import EvidenceScroll from "@/components/EvidenceScroll";
import IntroVideo from "@/components/IntroVideo";
import LockerRoom from "@/components/LockerRoom";
import PhoneScroll from "@/components/PhoneScroll";
import SchoolScroll from "@/components/SchoolScroll";
import StoryGate from "@/components/StoryGate";

// Letra manuscrita: la hoja de los lockers y la tiza del pizarron.
const handwriting = Caveat({ subsets: ["latin"], weight: "600" });

// Portada: noticiero a pantalla completa, las evidencias, los lockers (con
// el celular bajo candado), el celular 3D y el colegio en la dimension paralela.
// Cada tramo se habilita al completar el anterior: el celular aparece cuando
// se lo saca del locker y el colegio cuando se desbloquea el celular.
// Es un Server Component; solo el video y los escenarios de scroll se hidratan.
export default function Landing() {
  return (
    <main className="landing">
      <div className="noise" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
      <IntroVideo nextSectionId="evidencias" />
      <EvidenceScroll id="evidencias" />
      <LockerRoom embedded handFont={handwriting.style.fontFamily} />
      <StoryGate step="phone-taken">
        <PhoneScroll />
      </StoryGate>
      <StoryGate step="phone-unlocked">
        <SchoolScroll handFont={handwriting.style.fontFamily} />
      </StoryGate>
    </main>
  );
}
