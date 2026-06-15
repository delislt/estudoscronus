import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { AITutor } from "@/components/landing/AITutor";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cronus — Estudos leves, com IA do seu lado" },
      {
        name: "description",
        content:
          "Cronogramas inteligentes, metas, modo foco Pomodoro e uma IA tutora pronta pra explicar qualquer matéria. Feito pra teens.",
      },
      { property: "og:title", content: "Cronus — Estudos leves, com IA do seu lado" },
      {
        property: "og:description",
        content:
          "Rotina escolar do jeito que faz sentido pra você. Cronograma, foco, metas e IA tutora.",
      },
      { property: "og:url", content: "https://estudoscronus.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://estudoscronus.lovable.app/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <AITutor />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
