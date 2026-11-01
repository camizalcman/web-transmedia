import { Caveat, Rock_Salt } from "next/font/google";
import BackgroundMusic from "@/components/BackgroundMusic";
import EvidenceScroll from "@/components/EvidenceScroll";
import IntroVideo from "@/components/IntroVideo";
import LockerRoom from "@/components/LockerRoom";
import PhoneScroll from "@/components/PhoneScroll";
import SchoolScroll from "@/components/SchoolScroll";
import StoryGate from "@/components/StoryGate";

// Letra manuscrita de la hoja de los lockers.
const handwriting = Caveat({ subsets: ["latin"], weight: "600" });
// Letra del mensaje del pizarron: a mano, rasposa, de terror.
const boardWriting = Rock_Salt({ subsets: ["latin"], weight: "400" });

// Portada: noticiero a pantalla completa, las evidencias, los lockers (con
// el celular bajo candado), el celular 3D y el colegio en la dimension paralela.
// Cada tramo se habilita al completar el anterior: el celular aparece cuando
// se lo saca del locker y el colegio cuando, con el celular desbloqueado, se
// habló con el número desconocido. Al resolver el pizarrón se vuelve hacia
// arriba: el celular recibe los mensajes de Mica, los lockers tienen luz
// normal y en las evidencias aparece la foto de la salida (el video del
// comienzo ya no se ve).
// Es un Server Component; solo el video y los escenarios de scroll se hidratan.
export default function Landing() {
  return (
    <main className="landing">
      <div className="noise" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
      <IntroVideo nextSectionId="evidencias" />
      <BackgroundMusic startId="evidencias" />
      <EvidenceScroll id="evidencias" />
      <LockerRoom embedded handFont={handwriting.style.fontFamily} />
      <StoryGate step="phone-taken">
        <PhoneScroll />
      </StoryGate>
      <StoryGate step="contact-talked">
        <SchoolScroll handFont={handwriting.style.fontFamily} boardFont={boardWriting.style.fontFamily} />
      </StoryGate>
    </main>
  );
}
