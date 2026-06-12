import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { generateVideoRecommendations } from "@/lib/video-recs.functions";
import { resolveYoutubeVideo } from "@/lib/youtube.functions";
import { Heart, CheckCircle2, ExternalLink, Filter, Sparkles, Loader2, Play as YoutubeIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/videoaulas")({
  head: () => ({ meta: [{ title: "Videoaulas — Study" }] }),
  component: VideoaulasPage,
});

type Rec = {
  id: string;
  title: string;
  subject: string;
  level: string;
  description: string | null;
  reason: string | null;
  search_query: string;
  channel_hint: string | null;
  duration_hint: string | null;
  video_id: string | null;
  resolved_title: string | null;
  favorited: boolean;
  completed: boolean;
};

type Filter = "todas" | "favoritas" | "concluidas";

function openYoutube(videoId: string) {
  const w = window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank", "noopener,noreferrer");
  if (!w) {
    // popup blocked — navigate top window
    window.location.href = `https://www.youtube.com/watch?v=${videoId}`;
  }
}


function VideoaulasPage() {
  const generate = useServerFn(generateVideoRecommendations);
  const resolve = useServerFn(resolveYoutubeVideo);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [subject, setSubject] = useState<string>("todas");
  const [filter, setFilter] = useState<Filter>("todas");
  const [resolving, setResolving] = useState<string | null>(null);

  async function handleWatch(v: Rec) {
    if (v.video_id) {
      openYoutube(v.video_id);
      return;
    }
    setResolving(v.id);
    try {
      const res = await resolve({ data: { query: v.search_query, channel: v.channel_hint } });
      if (res.videoId) {
        await supabase
          .from("video_recommendations")
          .update({ video_id: res.videoId, resolved_title: res.title ?? null })
          .eq("id", v.id);
        setRecs((prev) => prev.map((x) => (x.id === v.id ? { ...x, video_id: res.videoId, resolved_title: res.title ?? null } : x)));
        openYoutube(res.videoId);
      } else {
        const q = v.channel_hint ? `${v.search_query} ${v.channel_hint}` : v.search_query;
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("Não consegui abrir o vídeo");
    } finally {
      setResolving(null);
    }
  }


  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    const { data } = await supabase
      .from("video_recommendations")
      .select("*")
      .eq("user_id", uid)
      .order("subject")
      .order("created_at", { ascending: false });
    setRecs((data ?? []) as Rec[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await generate();
      toast.success(`${res.count} novas recomendações geradas pela IA 🎬`);
      await load();
    } catch (e) {
      const err = e as Error;
      console.error(err);
      toast.error("Não foi possível gerar recomendações", { description: err.message });
    } finally {
      setGenerating(false);
    }
  }

  const subjects = useMemo(
    () => ["todas", ...Array.from(new Set(recs.map((r) => r.subject)))],
    [recs],
  );

  const filtered = useMemo(() => {
    return recs.filter((v) => {
      if (subject !== "todas" && v.subject !== subject) return false;
      if (filter === "favoritas") return v.favorited;
      if (filter === "concluidas") return v.completed;
      return true;
    });
  }, [recs, subject, filter]);

  async function patch(r: Rec, p: Partial<Pick<Rec, "favorited" | "completed">>) {
    const next = { ...r, ...p };
    setRecs((cur) => cur.map((x) => (x.id === r.id ? next : x)));
    const { error } = await supabase
      .from("video_recommendations")
      .update(p)
      .eq("id", r.id);
    if (error) {
      setRecs((cur) => cur.map((x) => (x.id === r.id ? r : x)));
      toast.error("Não foi possível salvar");
    }
  }

  return (
    <div className="min-h-screen bg-app-gradient">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl">Videoaulas</h1>
            <p className="text-muted-foreground mt-1 max-w-xl">
              Recomendações personalizadas pela IA — vídeos em português, escolhidos a partir das suas matérias e do seu estilo de aprender.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-semibold px-5 py-2.5 shadow-sm hover:opacity-95 disabled:opacity-60"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Gerando…" : recs.length ? "Atualizar com IA" : "Gerar recomendações"}
          </button>
        </section>

        {recs.length > 0 && (
          <section className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mr-1">
              <Filter className="h-4 w-4" /> Matéria:
            </div>
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${subject === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/60 hover:bg-muted"}`}
              >
                {s === "todas" ? "Todas" : s}
              </button>
            ))}
            <span className="mx-2 h-5 w-px bg-border" />
            {(["todas", "favoritas", "concluidas"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${filter === f ? "bg-foreground text-background border-foreground" : "bg-card border-border/60 hover:bg-muted"}`}
              >
                {f === "todas" ? "Todas" : f === "favoritas" ? "Favoritas" : "Concluídas"}
              </button>
            ))}
          </section>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : recs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 p-10 text-center bg-card/40">
            <YoutubeIcon className="h-10 w-10 text-primary mx-auto" />
            <h2 className="font-display font-bold text-xl mt-3">Nenhuma recomendação ainda</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Clique em <strong>Gerar recomendações</strong> e a IA monta uma playlist personalizada
              de aulas em português com base nas suas matérias.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((v) => (
              <article key={v.id} className="rounded-3xl bg-card border border-border/60 overflow-hidden shadow-sm flex flex-col">
                {v.video_id ? (
                  <button
                    onClick={() => handleWatch(v)}
                    className="relative block aspect-video bg-muted overflow-hidden group"
                    aria-label="Abrir no YouTube"
                  >
                    <img
                      src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`}
                      alt={v.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 grid place-items-center bg-black/20 group-hover:bg-black/30 transition">
                      <span className="h-14 w-14 rounded-full bg-white/95 grid place-items-center shadow-lg">
                        <YoutubeIcon className="h-6 w-6 text-coral fill-coral" />
                      </span>
                    </div>
                  </button>
                ) : null}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                      {v.subject}
                    </span>
                    {v.duration_hint && (
                      <span className="text-xs text-muted-foreground">{v.duration_hint}</span>
                    )}
                  </div>
                  <h3 className="font-display font-bold leading-snug">{v.resolved_title ?? v.title}</h3>
                  {v.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{v.description}</p>
                  )}
                  {v.reason && (
                    <p className="text-xs text-foreground/70 bg-muted/60 rounded-xl p-2.5 leading-relaxed">
                      <span className="font-semibold">Por que pra você: </span>{v.reason}
                    </p>
                  )}
                  {v.channel_hint && (
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <YoutubeIcon className="h-3.5 w-3.5 text-coral" />
                      Canal sugerido: <span className="font-medium text-foreground">{v.channel_hint}</span>
                    </p>
                  )}
                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <button
                      onClick={() => patch(v, { favorited: !v.favorited })}
                      aria-label="Favoritar"
                      className={`p-2 rounded-full border ${v.favorited ? "bg-coral/20 border-coral text-foreground" : "bg-background border-border/60 text-muted-foreground hover:text-foreground"}`}
                    >
                      <Heart className={`h-4 w-4 ${v.favorited ? "fill-current" : ""}`} />
                    </button>
                    <button
                      onClick={() => patch(v, { completed: !v.completed })}
                      aria-label="Marcar como vista"
                      className={`p-2 rounded-full border ${v.completed ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border/60 text-muted-foreground hover:text-foreground"}`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleWatch(v)}
                      disabled={resolving === v.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full text-sm font-semibold py-2 bg-foreground text-background hover:opacity-90 disabled:opacity-60"
                    >
                      {resolving === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                      Ver no YouTube
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
