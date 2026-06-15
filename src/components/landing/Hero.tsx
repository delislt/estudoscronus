import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, CheckCircle2, Circle, Sparkles } from "lucide-react";

const tasks = [
  { title: "Matemática — funções", time: "30 min", done: true, tone: "sky" },
  { title: "Redação — argumentação", time: "25 min", done: true, tone: "rose" },
  { title: "Biologia — célula", time: "40 min", done: true, tone: "rose" },
  { title: "História — Brasil colônia", time: "20 min", done: false, tone: "sky" },
  { title: "Revisão geral", time: "15 min", done: false, tone: "rose" },
];

export function Hero() {
  return (
    <section id="top" className="bg-app-gradient">
      <div className="mx-auto max-w-6xl px-6 pt-12 pb-20 lg:pt-20 lg:pb-28 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-coral/30 text-coral-foreground px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            Estudos leves, com IA do seu lado
          </span>

          <h1 className="mt-6 font-display font-extrabold text-5xl sm:text-6xl leading-[1.05] text-foreground">
            Sua rotina escolar,{" "}
            <span className="block">
              <span className="text-primary">do jeito</span>{" "}
              <span className="text-muted-foreground">que faz</span>
            </span>
            <span className="block">
              <span className="text-coral">sentido</span> pra você.
            </span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            Cronogramas inteligentes, metas que motivam, modo foco com Pomodoro
            e uma IA tutora pronta pra explicar qualquer matéria.
          </p>

          <p className="mt-4 italic text-sm text-muted-foreground">"Estudar pode ser leve."</p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 h-12 font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-105 transition"
            >
              Começar agora
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth" className="text-sm font-medium text-foreground hover:underline underline-offset-4">
              Já tenho conta
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Grátis pra começar", "Sem propaganda", "Feito pra teens"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Routine card mockup */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 via-transparent to-coral/20 blur-2xl rounded-[2rem]" />
          <div className="relative rounded-3xl bg-card border border-border/60 shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Hoje, terça</p>
                <h2 className="font-display font-bold text-xl mt-0.5">Sua rotina</h2>
              </div>
              <span className="rounded-full bg-primary/20 text-primary-foreground px-3 py-1 text-xs font-semibold">
                3 de 5 ✨
              </span>
            </div>

            <ul className="mt-5 space-y-2.5">
              {tasks.map((t) => (
                <li
                  key={t.title}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                    t.tone === "sky" ? "bg-sky-soft" : "bg-rose-soft"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {t.done ? (
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className={`truncate text-sm font-medium ${
                        t.done ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {t.title}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3">{t.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
