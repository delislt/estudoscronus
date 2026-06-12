import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { fetchUserStats, type AchievementRow, type UserStats } from "@/lib/achievements";
import { Trophy, Flame, Sparkles, Clock, Medal, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/conquistas")({
  head: () => ({ meta: [{ title: "Conquistas — Study" }] }),
  component: ConquistasPage,
});

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy, flame: Flame, sparkles: Sparkles, clock: Clock, medal: Medal,
};

function progress(a: AchievementRow, s: UserStats) {
  const v =
    a.kind === "sessions" ? s.totalSessions :
    a.kind === "minutes"  ? s.totalMinutes :
    a.kind === "streak"   ? s.streakDays :
    a.kind === "level"    ? s.level : 0;
  return { v, pct: Math.min(100, Math.round((v / Math.max(1, a.threshold)) * 100)) };
}

function ConquistasPage() {
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<AchievementRow[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<UserStats>({ totalSessions: 0, totalMinutes: 0, streakDays: 0, level: 1 });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      const [{ data: ach }, { data: owned }, s] = await Promise.all([
        supabase.from("achievements").select("*").order("threshold"),
        supabase.from("user_achievements").select("achievement_id").eq("user_id", uid),
        fetchUserStats(uid),
      ]);
      setAll((ach ?? []) as AchievementRow[]);
      setOwnedIds(new Set((owned ?? []).map((r) => r.achievement_id)));
      setStats(s);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-app-gradient">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <section>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl">Conquistas</h1>
          <p className="text-muted-foreground mt-1">
            Você desbloqueou {ownedIds.size} de {all.length} conquistas.
          </p>
        </section>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {all.map((a) => {
              const owned = ownedIds.has(a.id);
              const Icon = iconMap[a.icon] ?? Trophy;
              const { v, pct } = progress(a, stats);
              return (
                <div
                  key={a.id}
                  className={`rounded-3xl border p-5 ${owned ? "bg-card border-primary/30 shadow-sm" : "bg-card/60 border-border/60"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-12 w-12 rounded-2xl grid place-items-center shrink-0 ${owned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {owned ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-bold">{a.title}</div>
                      <div className="text-sm text-muted-foreground">{a.description}</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                      <span>{owned ? "Desbloqueada" : "Progresso"}</span>
                      <span>{v}/{a.threshold}</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full ${owned ? "bg-primary" : "bg-primary/60"}`} style={{ width: `${pct}%` }} />
                    </div>
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
