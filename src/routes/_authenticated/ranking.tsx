import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Medal, Flame } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ranking")({
  head: () => ({ meta: [{ title: "Ranking — Study" }] }),
  component: RankingPage,
});

type Row = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  streak_days: number;
};

function RankingPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [optedIn, setOptedIn] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const id = u.user?.id ?? null;
    setUid(id);
    const [{ data: profile }, { data: lb }] = await Promise.all([
      id ? supabase.from("profiles").select("leaderboard_opt_in").eq("id", id).single() : Promise.resolve({ data: null }),
      supabase.rpc("get_leaderboard", { _limit: 50 }),
    ]);
    setOptedIn(Boolean(profile?.leaderboard_opt_in));
    setRows((lb ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleOptIn(next: boolean) {
    if (!uid) return;
    setOptedIn(next);
    const { error } = await supabase.from("profiles").update({ leaderboard_opt_in: next }).eq("id", uid);
    if (error) {
      setOptedIn(!next);
      toast.error("Não foi possível atualizar");
      return;
    }
    toast.success(next ? "Você entrou no ranking!" : "Você saiu do ranking");
    load();
  }

  return (
    <div className="min-h-screen bg-app-gradient">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <section className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl">Ranking</h1>
            <p className="text-muted-foreground mt-1">Só aparecem pessoas que optaram por participar.</p>
          </div>
          <label className="inline-flex items-center gap-3 rounded-full bg-card border border-border/60 px-4 py-2.5 text-sm shadow-sm cursor-pointer">
            <span className="font-medium">Participar do ranking</span>
            <span
              role="switch"
              aria-checked={optedIn}
              onClick={() => toggleOptIn(!optedIn)}
              className={`relative inline-block h-5 w-9 rounded-full transition ${optedIn ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition ${optedIn ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </label>
        </section>

        <section className="rounded-3xl bg-card border border-border/60 p-2 sm:p-4 shadow-sm">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Ainda ninguém no ranking. {optedIn ? "Estude para subir!" : "Ative a opção acima para entrar."}
            </p>
          ) : (
            <ol className="divide-y divide-border/60">
              {rows.map((r, i) => {
                const isMe = r.user_id === uid;
                const place = i + 1;
                return (
                  <li key={r.user_id} className={`flex items-center gap-3 px-3 sm:px-4 py-3 rounded-2xl ${isMe ? "bg-primary/10" : ""}`}>
                    <div className={`w-8 text-center font-display font-extrabold ${place <= 3 ? "text-primary" : "text-muted-foreground"}`}>
                      {place}
                    </div>
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-sm font-semibold">
                        {(r.full_name ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{r.full_name ?? "Estudante"} {isMe && <span className="text-xs text-primary">(você)</span>}</div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-3">
                        <span className="inline-flex items-center gap-1"><Medal className="h-3 w-3" /> Nv {r.level}</span>
                        <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" /> {r.streak_days}d</span>
                      </div>
                    </div>
                    <div className="font-display font-bold">{r.xp} XP</div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
