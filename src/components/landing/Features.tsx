import {
  CalendarClock,
  Timer,
  Trophy,
  Video,
  Bot,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";

const features: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: CalendarClock, title: "Cronograma automático", desc: "Montamos sua rotina com base no seu perfil e horários." },
  { icon: Timer, title: "Modo foco Pomodoro", desc: "Sessões de 25 min com pausa, sem distração." },
  { icon: Trophy, title: "Metas e gamificação", desc: "XP, níveis e streaks pra manter o ritmo." },
  { icon: Video, title: "Videoaulas curadas", desc: "Sugestões por matéria e dificuldade." },
  { icon: Bot, title: "IA tutora amigável", desc: "Tira dúvidas, explica exercícios, resume conteúdo." },
  { icon: NotebookPen, title: "Anotações rápidas", desc: "Salve ideias e revisões em segundos." },
];

export function Features() {
  return (
    <section id="recursos" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl">
            Tudo que você precisa em um só lugar
          </h2>
          <p className="mt-4 text-muted-foreground">
            Organização, foco, motivação e ajuda na hora do estudo.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-3xl bg-card border border-border/60 p-6 hover:shadow-md hover:-translate-y-0.5 transition"
            >
              <div className="h-11 w-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display font-bold text-lg">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
