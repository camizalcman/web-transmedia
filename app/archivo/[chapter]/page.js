import { notFound } from "next/navigation";
import Experience from "@/components/Experience";
import { chapters } from "@/data/chapters";

export function generateStaticParams() {
  return chapters.map((chapter) => ({ chapter: chapter.id }));
}

export async function generateMetadata({ params }) {
  const { chapter: chapterId } = await params;
  const chapter = chapters.find((item) => item.id === chapterId);

  if (!chapter) return {};

  return {
    title: `${chapter.label} — Señal perdida`,
    description: chapter.copy,
  };
}

export default async function ChapterPage({ params }) {
  const { chapter: chapterId } = await params;
  const chapterExists = chapters.some((item) => item.id === chapterId);

  if (!chapterExists) notFound();

  return <Experience initialChapterId={chapterId} />;
}
