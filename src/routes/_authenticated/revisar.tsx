import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Brain, AlertTriangle, Calendar, Layers } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { detectForgetting } from "@/lib/forgetting.functions";

export const Route = createFileRoute("/_authenticated/revisar")({
  head: () => ({ meta: [{ title: "Revisar — Chronos" }] }),
  component: RevisarPage,
});

function RevisarPage() {
  const fn = useServerFn(detectForgetting);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fn()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-muted-foreground">Analisando sua curva de esquecimento…</p>
        </main>
      </div>
    );

  const riskLevel =
    data.score > 30 ? "Alto" : data.score > 12 ? "Médio" : data.score > 0 ? "Baixo" : "Tudo em dia";
  const riskColor =
    data.score > 30
      ? "text-red-500 bg-red-500/15 border-red-500/30"
      : data.score > 12
      ? "text-amber-600 bg-amber-500/15 border-amber-500/30"
      : data.score > 0
      ? "text-blue-500 bg-blue-500/15 border-blue-500/30"
      : "text-emerald-600 bg-emerald-500/15 border-emerald-500/30";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Brain className="h-7 w-7" /> Detector de esquecimento
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Baseado na curva de Ebbinghaus e no seu histórico.
            </p>
          </div>
          <span
            className={`px-4 py-2 rounded-full border font-semibold text-sm ${riskColor}`}
          >
            Risco: {riskLevel}
          </span>
        </div>

        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4" /> Flashcards atrasados ({data.due_cards.length})
          </h2>
          {data.due_cards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cartão pendente. 🎉</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {data.due_cards.slice(0, 20).map((c: any) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm"
                >
                  <div className="min-w-0 pr-3">
                    <div className="truncate">{c.front}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.deck_name} · atrasado {c.overdue_days}d
                      {c.lapses > 0 && ` · ${c.lapses} esquecimentos`}
                    </div>
                  </div>
                  <Link
                    to="/flashcards/$deckId"
                    params={{ deckId: c.deck_id }}
                    className="text-xs px-3 py-1 rounded-full bg-primary text-primary-foreground"
                  >
                    Revisar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Matérias esfriando ({data.cold_subjects.length})
          </h2>
          {data.cold_subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Você estudou todas as suas matérias nos últimos 5 dias.
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.cold_subjects.map((s: any) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span className="text-sm">{s.name}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-background border border-border/60">
                    risco {s.risk}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Tarefas perdidas ({data.missed_tasks.length})
          </h2>
          {data.missed_tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem pendências do calendário.</p>
          ) : (
            <ul className="space-y-2">
              {data.missed_tasks.map((t: any) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm"
                >
                  <span>{t.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.scheduled_date).toLocaleDateString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
