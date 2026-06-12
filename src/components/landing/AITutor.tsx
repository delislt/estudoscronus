import { Bot, MessageCircle } from "lucide-react";

export function AITutor() {
  return (
    <section id="ia-tutora" className="py-24">
      <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-semibold">
            <Bot className="h-3.5 w-3.5" />
            Tutor IA
          </span>
          <h2 className="mt-5 font-display font-extrabold text-4xl sm:text-5xl">
            Tira dúvidas a qualquer hora.
          </h2>
          <p className="mt-5 text-muted-foreground max-w-lg">
            Pergunte sobre qualquer matéria, peça resumos, explicações passo a
            passo ou ajuda pra organizar a semana.
          </p>
          <a
            href="#cta"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 h-12 font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-105 transition"
          >
            <MessageCircle className="h-4 w-4" />
            Conversar com a IA
          </a>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-tr from-coral/20 via-transparent to-primary/20 blur-2xl rounded-[2rem]" />
          <div className="relative rounded-3xl bg-card border border-border/60 p-6 shadow-xl space-y-3">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary/15 px-4 py-3 text-sm">
              Me explica equação do 2º grau de forma simples 🙏
            </div>
            <div className="mr-auto max-w-[90%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm text-foreground">
              Bora! Imagina uma parábola: ela é o desenho de uma equação do tipo{" "}
              <code className="font-mono text-xs bg-background/70 px-1 rounded">
                ax² + bx + c = 0
              </code>
              . Pra achar onde ela cruza o eixo x, usamos Bhaskara…
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
