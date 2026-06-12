import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tutor")({
  head: () => ({ meta: [{ title: "Tutora IA — Study" }] }),
  component: TutorStub,
});

function TutorStub() {
  return (
    <div className="min-h-screen bg-app-gradient grid place-items-center px-6">
      <div className="max-w-md text-center rounded-3xl bg-card border border-border/60 p-10 shadow-xl">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 text-primary grid place-items-center">
          <Bot className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display font-extrabold text-2xl">Tutora IA em breve ✨</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tô preparando o chat com IA, histórico de conversas e contexto do seu cronograma.
          Volta logo!
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 h-11 font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-105"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao painel
        </Link>
      </div>
    </div>
  );
}
