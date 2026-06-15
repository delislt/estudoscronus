import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Target, Minus } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import {
  listGoals,
  createGoal,
  updateGoalProgress,
  deleteGoal,
} from "@/lib/goals.functions";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({ meta: [{ title: "Metas — Chronos" }] }),
  component: GoalsPage,
});

type Goal = {
  id: string;
  title: string;
  period: "daily" | "weekly" | "monthly";
  target_value: number;
  current_value: number;
};

const PERIOD_LABEL: Record<string, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
};

function GoalsPage() {
  const fetchGoals = useServerFn(listGoals);
  const createFn = useServerFn(createGoal);
  const updateFn = useServerFn(updateGoalProgress);
  const deleteFn = useServerFn(deleteGoal);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [target, setTarget] = useState(5);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await fetchGoals()) as Goal[];
      setGoals(data);
    } finally {
      setLoading(false);
    }
  }, [fetchGoals]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createFn({ data: { title: title.trim(), period, target_value: target } });
    toast.success("Meta criada");
    setTitle("");
    setTarget(5);
    load();
  }

  async function tweak(g: Goal, delta: number) {
    const newVal = Math.max(0, g.current_value + delta);
    setGoals((gs) => gs.map((x) => (x.id === g.id ? { ...x, current_value: newVal } : x)));
    try {
      await updateFn({ data: { id: g.id, current_value: newVal } });
    } catch (e) {
      toast.error("Erro");
      load();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar meta?")) return;
    await deleteFn({ data: { id } });
    load();
  }

  return (
    <div className="min-h-screen bg-app-gradient">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold">Metas</h1>
          <p className="text-sm text-muted-foreground">
            Defina objetivos diários, semanais ou mensais e acompanhe o progresso.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-border/60 bg-card p-4 mb-6 grid sm:grid-cols-[1fr_auto_auto_auto] gap-2"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Resolver 50 questões de matemática"
            className="h-10 px-3 rounded-xl bg-background border border-border/60 text-sm"
            required
            maxLength={120}
          />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="h-10 px-3 rounded-xl bg-background border border-border/60 text-sm"
          >
            <option value="daily">Diária</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
          <input
            type="number"
            min={1}
            max={10000}
            value={target}
            onChange={(e) => setTarget(Math.max(1, Number(e.target.value)))}
            className="h-10 px-3 rounded-xl bg-background border border-border/60 text-sm w-24"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary text-primary-foreground px-4 h-10 font-semibold text-sm inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Criar
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : goals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 p-10 text-center">
            <Target className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma meta ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => {
              const pct = Math.min(100, Math.round((g.current_value / g.target_value) * 100));
              const done = pct >= 100;
              return (
                <div
                  key={g.id}
                  className="rounded-2xl border border-border/60 bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {PERIOD_LABEL[g.period]}
                        </span>
                        {done && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-semibold">
                            Concluída
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold mt-1">{g.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {g.current_value} / {g.target_value}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => tweak(g, -1)}
                        className="h-8 w-8 rounded-lg bg-muted grid place-items-center hover:bg-muted/70"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => tweak(g, 1)}
                        className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center hover:brightness-105"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive grid place-items-center"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${done ? "bg-emerald-500" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
