import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { getAttempt } from "@/lib/simulados.functions";

export const Route = createFileRoute("/_authenticated/simulados/$attemptId/resultado")({
  head: () => ({ meta: [{ title: "Resultado do simulado — Chronos" }] }),
  component: ResultPage,
});

type PerSubject = Record<string, { total: number; correct: number; tri?: number }>;

function ResultPage() {
  const { attemptId } = Route.useParams();
  const fetchAttempt = useServerFn(getAttempt);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchAttempt({ data: { attemptId } }).then(setData);
  }, [attemptId, fetchAttempt]);

  if (!data) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="max-w-3xl mx-auto px-6 py-20 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" /> Carregando relatório...
        </div>
      </div>
    );
  }

  const attempt = data.attempt as {
    source: string;
    total_questions: number;
    correct_count: number;
    raw_score: number | null;
    tri_score: number | null;
    per_subject: PerSubject | null;
    finished_at: string | null;
  };

  const per = attempt.per_subject ?? {};

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <Link to="/simulados" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <header className="rounded-2xl border border-border bg-card p-6 text-center space-y-2">
          <Trophy className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-3xl font-display font-bold">Nota TRI ENEM</h1>
          <p className="text-5xl font-display font-bold text-primary">{attempt.tri_score ?? "—"}</p>
          <p className="text-sm text-muted-foreground">
            {attempt.correct_count}/{attempt.total_questions} acertos · nota bruta {attempt.raw_score}
          </p>
          <p className="text-xs text-muted-foreground">
            {attempt.source.toUpperCase()} · finalizado em {attempt.finished_at ? new Date(attempt.finished_at).toLocaleString("pt-BR") : "—"}
          </p>
        </header>

        <section>
          <h2 className="font-display font-semibold mb-3">Por área</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(per).map(([subject, s]) => {
              const pct = Math.round((s.correct / Math.max(1, s.total)) * 100);
              return (
                <div key={subject} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{subject}</p>
                    <p className="text-2xl font-display font-bold text-primary">{s.tri ?? "—"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {s.correct}/{s.total} acertos ({pct}%)
                  </p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          O cálculo TRI usa um modelo 3PL simplificado com parâmetros padrão (a=1, b=0, c=0.2). Para precisão oficial, é necessário calibrar com banco amplo de respostas — esta nota é uma estimativa.
        </p>
      </div>
    </div>
  );
}
