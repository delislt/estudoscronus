import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { ensureUpcomingPlan, generateDailyPlan } from "@/lib/calendar.functions";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, RefreshCw, Sparkles, SkipForward, BookOpen, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { checkAndAwardAchievements } from "@/lib/achievements";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendário — Study" }] }),
  component: CalendarioPage,
});

type Task = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  topic: string | null;
  scheduled_date: string;
  duration_min: number;
  is_review: boolean;
  completed: boolean;
  skipped: boolean;
  source: string;
  ai_reason: string | null;
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfWeek(d: Date) {
  const c = new Date(d);
  c.setUTCHours(12, 0, 0, 0);
  const day = c.getUTCDay(); // 0=sun
  const diff = day === 0 ? -6 : 1 - day;
  c.setUTCDate(c.getUTCDate() + diff);
  return c;
}
function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}
function fmtWeekday(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "short" });
}
function fmtDayNum(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function CalendarioPage() {
  const ensure = useServerFn(ensureUpcomingPlan);
  const genDay = useServerFn(generateDailyPlan);
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busyDay, setBusyDay] = useState<string | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const todayISO = toISODate(new Date());

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    const start = toISODate(weekStart);
    const end = toISODate(addDays(weekStart, 6));
    const { data } = await supabase
      .from("schedule_tasks")
      .select("*")
      .eq("user_id", uid)
      .gte("scheduled_date", start)
      .lte("scheduled_date", end)
      .order("scheduled_date")
      .order("created_at");
    setTasks((data ?? []) as Task[]);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  // Ensure upcoming plan on first mount
  useEffect(() => {
    (async () => {
      setBootstrapping(true);
      try {
        const res = await ensure({ data: { days: 7 } });
        if (res.created > 0) {
          toast.success(`IA gerou ${res.created} blocos pra sua semana`);
          await load();
        }
      } catch (e) {
        console.error(e);
      } finally {
        setBootstrapping(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      const arr = m.get(t.scheduled_date) ?? [];
      arr.push(t);
      m.set(t.scheduled_date, arr);
    }
    return m;
  }, [tasks]);

  async function regenerate(date: string) {
    setBusyDay(date);
    try {
      const r = await genDay({ data: { date, force: true } });
      toast.success(`Dia regenerado (${r.count} blocos)`);
      await load();
    } catch (e) {
      const err = e as Error;
      toast.error("Falha ao regenerar", { description: err.message });
    } finally {
      setBusyDay(null);
    }
  }

  async function generateOne(date: string) {
    setBusyDay(date);
    try {
      const r = await genDay({ data: { date } });
      if (r.count === 0) toast("Nada a gerar (talvez sem matérias/onboarding)");
      else toast.success(`Gerados ${r.count} blocos`);
      await load();
    } catch (e) {
      const err = e as Error;
      toast.error("Falha ao gerar", { description: err.message });
    } finally {
      setBusyDay(null);
    }
  }

  async function toggleDone(t: Task) {
    const next = !t.completed;
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: next } : x)));
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    await supabase
      .from("schedule_tasks")
      .update({ completed: next, completed_at: next ? new Date().toISOString() : null })
      .eq("id", t.id);
    if (next) {
      await supabase.from("study_sessions").insert({
        user_id: uid,
        subject_id: t.subject_id,
        duration_min: t.duration_min,
        started_at: new Date().toISOString(),
        notes: t.title,
      });
      try {
        await checkAndAwardAchievements(uid);
      } catch (e) {
        console.error(e);
      }
    }
  }

  async function toggleSkip(t: Task) {
    const next = !t.skipped;
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, skipped: next } : x)));
    await supabase.from("schedule_tasks").update({ skipped: next }).eq("id", t.id);
  }

  return (
    <div className="min-h-screen bg-app-gradient">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl inline-flex items-center gap-2">
              <CalendarIcon className="h-7 w-7 text-primary" /> Calendário
            </h1>
            <p className="text-muted-foreground mt-1 max-w-xl">
              Sua semana de estudos montada pela IA — atualizada todo dia pra você nunca ficar sem o que estudar.
            </p>
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="p-2 rounded-full border border-border/60 hover:bg-muted"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="px-3 py-2 rounded-full border border-border/60 hover:bg-muted text-sm font-medium"
            >
              Hoje
            </button>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="p-2 rounded-full border border-border/60 hover:bg-muted"
              aria-label="Próxima semana"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {bootstrapping && tasks.length === 0 && (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-4 inline-flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Gerando sua semana com a IA…
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {days.map((d) => {
              const iso = toISODate(d);
              const list = byDay.get(iso) ?? [];
              const isToday = iso === todayISO;
              const totalMin = list.reduce((acc, t) => acc + (t.completed ? 0 : t.duration_min), 0);
              return (
                <article
                  key={iso}
                  className={`rounded-2xl border ${isToday ? "border-primary shadow-md" : "border-border/60"} bg-card flex flex-col min-h-[280px]`}
                >
                  <header className="p-3 border-b border-border/60 flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{fmtWeekday(d)}</div>
                      <div className="font-display font-bold">{fmtDayNum(d)}</div>
                      {totalMin > 0 && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">{totalMin} min restantes</div>
                      )}
                    </div>
                    <button
                      onClick={() => regenerate(iso)}
                      disabled={busyDay === iso}
                      className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                      aria-label="Regenerar dia"
                      title="Regenerar dia com IA"
                    >
                      {busyDay === iso ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    </button>
                  </header>
                  <div className="p-2 flex flex-col gap-2 flex-1">
                    {list.length === 0 ? (
                      <button
                        onClick={() => generateOne(iso)}
                        disabled={busyDay === iso}
                        className="m-2 rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center justify-center gap-1.5"
                      >
                        {busyDay === iso ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        Gerar com IA
                      </button>
                    ) : (
                      list.map((t) => (
                        <div
                          key={t.id}
                          className={`rounded-xl p-2.5 border text-sm ${
                            t.completed
                              ? "bg-primary/10 border-primary/30 line-through text-muted-foreground"
                              : t.skipped
                                ? "bg-muted/60 border-border/60 opacity-60"
                                : "bg-background border-border/60"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <BookOpen className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold leading-tight">{t.title}</div>
                              {t.topic && <div className="text-xs text-muted-foreground truncate">{t.topic}</div>}
                              <div className="text-[11px] text-muted-foreground mt-1">
                                {t.duration_min} min{t.is_review ? " · revisão" : ""}
                              </div>
                              {t.ai_reason && (
                                <div className="text-[11px] text-foreground/70 mt-1 italic line-clamp-2">{t.ai_reason}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            <button
                              onClick={() => toggleDone(t)}
                              className={`flex-1 inline-flex items-center justify-center gap-1 rounded-full text-[11px] font-semibold py-1.5 ${
                                t.completed ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                              }`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {t.completed ? "Feito" : "Concluir"}
                            </button>
                            <button
                              onClick={() => toggleSkip(t)}
                              aria-label="Pular"
                              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <SkipForward className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
