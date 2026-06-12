import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, Flame, Trophy, CalendarDays, Target,
} from "lucide-react";
import { toISODate, levelFromXp } from "@/lib/scheduling";
import { AppHeader } from "@/components/AppHeader";
import { completeStudyTask } from "@/lib/progress.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Painel — Study" }] }),
  component: Dashboard,
});

type Task = {
  id: string;
  title: string;
  scheduled_date: string;
  duration_min: number;
  is_review: boolean;
  completed: boolean;
  subject_id: string | null;
};
type XP = { xp: number; level: number; streak_days: number; last_study_date: string | null };
type Goal = { id: string; title: string; period: string; target_value: number; current_value: number };

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [weekTasks, setWeekTasks] = useState<Task[]>([]);
  const [xp, setXp] = useState<XP | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;

    const today = toISODate(new Date());
    const in7 = new Date();
    in7.setDate(in7.getDate() + 6);

    const [{ data: profile }, { data: tasks }, { data: xpData }, { data: goalsData }] =
      await Promise.all([
        supabase.from("profiles").select("full_name, onboarding_completed").eq("id", uid).single(),
        supabase
          .from("schedule_tasks")
          .select("*")
          .eq("user_id", uid)
          .gte("scheduled_date", today)
          .lte("scheduled_date", toISODate(in7))
          .order("scheduled_date"),
        supabase.from("user_xp").select("*").eq("user_id", uid).single(),
        supabase.from("goals").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      ]);

    if (profile && !profile.onboarding_completed) {
      setNeedsOnboarding(true);
      navigate({ to: "/onboarding" });
      return;
    }
    setName(profile?.full_name ?? "");
    const all = (tasks ?? []) as Task[];
    setTodayTasks(all.filter((t) => t.scheduled_date === today));
    setWeekTasks(all);
    setXp((xpData as XP) ?? { xp: 0, level: 1, streak_days: 0, last_study_date: null });
    setGoals((goalsData ?? []) as Goal[]);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  async function completeTask(t: Task) {
    if (t.completed) return;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;

    setTodayTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, completed: true } : x)));

    const today = toISODate(new Date());
    await supabase
      .from("schedule_tasks")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", t.id);
    await supabase.from("study_sessions").insert({
      user_id: uid,
      task_id: t.id,
      subject_id: t.subject_id,
      duration_min: t.duration_min,
    });

    // XP + streak update
    const gainedXp = xpForMinutes(t.duration_min);
    const last = xp?.last_study_date;
    let streak = xp?.streak_days ?? 0;
    if (last !== today) {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      streak = last === toISODate(yest) ? streak + 1 : 1;
    }
    const newXp = (xp?.xp ?? 0) + gainedXp;
    const { level } = levelFromXp(newXp);
    await supabase
      .from("user_xp")
      .update({ xp: newXp, level, streak_days: streak, last_study_date: today })
      .eq("user_id", uid);

    // Bump weekly goal progress
    const weekly = goals.find((g) => g.period === "weekly");
    if (weekly) {
      await supabase
        .from("goals")
        .update({ current_value: Math.min(weekly.target_value, weekly.current_value + t.duration_min) })
        .eq("id", weekly.id);
    }

    toast.success(`+${gainedXp} XP 🎉`);

    // Achievement check
    try {
      const unlocked = await checkAndAwardAchievements(uid);
      for (const a of unlocked) {
        toast.success(`Conquista desbloqueada: ${a.title} 🏆`, { description: a.description });
      }
    } catch (e) {
      console.error("achievement check failed", e);
    }

    load();
  }

  if (needsOnboarding) return null;
  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-app-gradient text-muted-foreground text-sm">
        Carregando…
      </div>
    );

  const completedToday = todayTasks.filter((t) => t.completed).length;
  const lvl = levelFromXp(xp?.xp ?? 0);
  const greet = new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="min-h-screen bg-app-gradient">
      <AppHeader />


      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <section>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl">
            {greet}, {name?.split(" ")[0] || "estudante"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Você tem {todayTasks.length} {todayTasks.length === 1 ? "tarefa" : "tarefas"} pra hoje.
          </p>
        </section>

        <section className="grid sm:grid-cols-3 gap-4">
          <StatCard icon={<Flame className="h-5 w-5" />} label="Streak" value={`${xp?.streak_days ?? 0} dias`} tone="coral" />
          <StatCard icon={<Trophy className="h-5 w-5" />} label="Nível" value={`${lvl.level}`} sub={`${lvl.xpInLevel}/${lvl.xpToNext} XP`} tone="sky" />
          <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Hoje" value={`${completedToday}/${todayTasks.length}`} sub="tarefas concluídas" tone="rose" />
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-3xl bg-card border border-border/60 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl">Sua rotina de hoje</h2>
              <Link to="/tutor" className="text-xs font-semibold text-primary hover:underline">
                Pedir ajuda à IA →
              </Link>
            </div>
            {todayTasks.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Nada agendado para hoje. Aproveita pra revisar ou conversar com a tutora 💬
              </p>
            ) : (
              <ul className="mt-5 space-y-2.5">
                {todayTasks.map((t) => (
                  <li key={t.id} className={`flex items-center justify-between rounded-2xl px-4 py-3 ${t.is_review ? "bg-rose-soft" : "bg-sky-soft"}`}>
                    <button onClick={() => completeTask(t)} className="flex items-center gap-3 text-left flex-1 min-w-0">
                      {t.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <span className={`truncate text-sm font-medium ${t.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {t.title}
                      </span>
                    </button>
                    <span className="text-xs text-muted-foreground shrink-0 ml-3">{t.duration_min} min</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-card border border-border/60 p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="font-display font-bold">Metas</h3>
              </div>
              {goals.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma meta ainda.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {goals.slice(0, 3).map((g) => {
                    const pct = Math.min(100, Math.round((g.current_value / Math.max(1, g.target_value)) * 100));
                    return (
                      <li key={g.id}>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="font-medium truncate">{g.title}</span>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-3xl bg-card border border-border/60 p-6 shadow-sm">
              <h3 className="font-display font-bold">Próximos dias</h3>
              <ul className="mt-3 space-y-1.5 text-sm">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i);
                  const iso = toISODate(d);
                  const count = weekTasks.filter((t) => t.scheduled_date === iso).length;
                  return (
                    <li key={iso} className="flex items-center justify-between text-muted-foreground">
                      <span>
                        {d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                      </span>
                      <span className={count ? "text-foreground font-semibold" : ""}>
                        {count ? `${count} tarefa${count > 1 ? "s" : ""}` : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, tone,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; tone: "coral" | "sky" | "rose" }) {
  const bg = tone === "coral" ? "bg-coral/20" : tone === "sky" ? "bg-sky-soft" : "bg-rose-soft";
  return (
    <div className={`rounded-3xl ${bg} p-5`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display font-extrabold text-3xl">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
