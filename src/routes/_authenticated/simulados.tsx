import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardCheck, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { listAttempts, startEnemAttempt } from "@/lib/simulados.functions";

export const Route = createFileRoute("/_authenticated/simulados")({
  head: () => ({ meta: [{ title: "Simulados — Chronos" }] }),
  component: SimuladosPage,
});

const DISCIPLINES = [
  { value: "linguagens", label: "Linguagens" },
  { value: "matematica", label: "Matemática" },
  { value: "ciencias-humanas", label: "Humanas" },
  { value: "ciencias-natureza", label: "Natureza" },
] as const;

type Attempt = {
  id: string;
  source: string;
  subjects: string[];
  total_questions: number;
  correct_count: number | null;
  tri_score: number | null;
  raw_score: number | null;
  status: string;
  started_at: string;
  finished_at: string | null;
};

function SimuladosPage() {
  const fetchAttempts = useServerFn(listAttempts);
  const startFn = useServerFn(startEnemAttempt);
  const navigate = useNavigate();

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [year, setYear] = useState(2023);
  const [selected, setSelected] = useState<string[]>(["matematica"]);
  const [perDisc, setPerDisc] = useState(10);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchAttempts().then((r) => setAttempts(r as Attempt[]));
  }, [fetchAttempts]);

  function toggleDisc(d: string) {
    setSelected((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function handleCreate() {
    if (selected.length === 0) return toast.error("Selecione ao menos uma área.");
    setCreating(true);
    try {
      const res = await startFn({
        data: {
          year,
          disciplines: selected as ("linguagens" | "matematica" | "ciencias-humanas" | "ciencias-natureza")[],
          questionsPerDiscipline: perDisc,
        },
      });
      navigate({ to: "/simulados/$attemptId", params: { attemptId: res.attemptId } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Simulados ENEM</h1>
          <p className="text-muted-foreground mt-1">Questões reais do dataset enem.dev com cálculo TRI por área.</p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo simulado
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-muted-foreground">Ano da prova</span>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1 w-full rounded-lg bg-background border border-border px-3 py-2"
              >
                {Array.from({ length: 15 }, (_, i) => 2023 - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-muted-foreground">Questões por área</span>
              <input
                type="number"
                min={5}
                max={45}
                value={perDisc}
                onChange={(e) => setPerDisc(Number(e.target.value))}
                className="mt-1 w-full rounded-lg bg-background border border-border px-3 py-2"
              />
            </label>
          </div>

          <div>
            <span className="text-sm text-muted-foreground">Áreas</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {DISCIPLINES.map((d) => {
                const on = selected.includes(d.value);
                return (
                  <button
                    key={d.value}
                    onClick={() => toggleDisc(d.value)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition ${
                      on ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            Começar simulado
          </button>
          <p className="text-xs text-muted-foreground">
            Na primeira vez para um ano/área, importamos as questões do enem.dev — pode levar alguns segundos.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold mb-3">Seus simulados</h2>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum simulado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {attempts.map((a) => (
                <li key={a.id}>
                  <Link
                    to={a.status === "finished" ? "/simulados/$attemptId/resultado" : "/simulados/$attemptId"}
                    params={{ attemptId: a.id }}
                    className="block rounded-xl border border-border bg-card p-4 hover:border-primary transition"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-medium">{a.source.toUpperCase()} · {a.subjects.join(", ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.started_at).toLocaleString("pt-BR")} · {a.total_questions} questões
                        </p>
                      </div>
                      <div className="text-right">
                        {a.status === "finished" ? (
                          <>
                            <p className="text-lg font-display font-bold">{a.tri_score ?? a.raw_score}</p>
                            <p className="text-xs text-muted-foreground">
                              {a.correct_count}/{a.total_questions} acertos
                            </p>
                          </>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">Em andamento</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
