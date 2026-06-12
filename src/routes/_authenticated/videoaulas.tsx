import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Heart, CheckCircle2, Play, Filter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/videoaulas")({
  head: () => ({ meta: [{ title: "Videoaulas — Study" }] }),
  component: VideoaulasPage,
});

type Video = {
  id: string;
  title: string;
  subject: string;
  level: string;
  description: string | null;
  youtube_id: string;
  duration_min: number;
};

type Progress = { video_id: string; favorited: boolean; completed: boolean };
type Filter = "todas" | "favoritas" | "concluidas";

function VideoaulasPage() {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [subject, setSubject] = useState<string>("todas");
  const [filter, setFilter] = useState<Filter>("todas");
  const [open, setOpen] = useState<Video | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const id = u.user?.id ?? null;
      setUid(id);
      const [{ data: vids }, { data: prog }] = await Promise.all([
        supabase.from("video_lessons").select("*").order("subject").order("title"),
        id ? supabase.from("video_progress").select("video_id, favorited, completed").eq("user_id", id) : Promise.resolve({ data: [] }),
      ]);
      setVideos((vids ?? []) as Video[]);
      const map: Record<string, Progress> = {};
      for (const p of (prog ?? []) as Progress[]) map[p.video_id] = p;
      setProgress(map);
      setLoading(false);
    })();
  }, []);

  const subjects = useMemo(
    () => ["todas", ...Array.from(new Set(videos.map((v) => v.subject)))],
    [videos],
  );

  const filtered = useMemo(() => {
    return videos.filter((v) => {
      if (subject !== "todas" && v.subject !== subject) return false;
      const p = progress[v.id];
      if (filter === "favoritas") return p?.favorited;
      if (filter === "concluidas") return p?.completed;
      return true;
    });
  }, [videos, progress, subject, filter]);

  async function upsert(v: Video, patch: Partial<Pick<Progress, "favorited" | "completed">>) {
    if (!uid) return;
    const cur = progress[v.id] ?? { video_id: v.id, favorited: false, completed: false };
    const next: Progress = { ...cur, ...patch };
    setProgress((m) => ({ ...m, [v.id]: next }));
    const { error } = await supabase
      .from("video_progress")
      .upsert(
        { user_id: uid, video_id: v.id, favorited: next.favorited, completed: next.completed },
        { onConflict: "user_id,video_id" },
      );
    if (error) {
      setProgress((m) => ({ ...m, [v.id]: cur }));
      toast.error("Não foi possível salvar");
    }
  }

  return (
    <div className="min-h-screen bg-app-gradient">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <section>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl">Videoaulas</h1>
          <p className="text-muted-foreground mt-1">Aulas selecionadas para reforçar o que você estudou.</p>
        </section>

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

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((v) => {
              const p = progress[v.id];
              return (
                <article key={v.id} className="rounded-3xl bg-card border border-border/60 overflow-hidden shadow-sm flex flex-col">
                  <button onClick={() => setOpen(v)} className="relative aspect-video bg-muted group">
                    <img
                      src={`https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`}
                      alt=""
                      className="h-full w-full object-cover group-hover:opacity-90 transition"
                      loading="lazy"
                    />
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="h-12 w-12 rounded-full bg-background/90 grid place-items-center shadow-md">
                        <Play className="h-5 w-5 text-foreground translate-x-[1px]" />
                      </span>
                    </span>
                    <span className="absolute bottom-2 right-2 text-xs font-medium bg-background/90 text-foreground px-2 py-0.5 rounded">
                      {v.duration_min} min
                    </span>
                  </button>
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <div className="text-xs font-semibold text-primary">{v.subject}</div>
                    <h3 className="font-display font-bold leading-snug">{v.title}</h3>
                    {v.description && <p className="text-sm text-muted-foreground line-clamp-2">{v.description}</p>}
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <button
                        onClick={() => upsert(v, { favorited: !p?.favorited })}
                        aria-label="Favoritar"
                        className={`p-2 rounded-full border ${p?.favorited ? "bg-coral/20 border-coral text-foreground" : "bg-background border-border/60 text-muted-foreground hover:text-foreground"}`}
                      >
                        <Heart className={`h-4 w-4 ${p?.favorited ? "fill-current" : ""}`} />
                      </button>
                      <button
                        onClick={() => upsert(v, { completed: !p?.completed })}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-full text-sm font-semibold py-2 ${p?.completed ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"}`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {p?.completed ? "Concluída" : "Marcar como vista"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/60 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setOpen(null)}
        >
          <div className="w-full max-w-3xl bg-card rounded-3xl overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-black">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${open.youtube_id}?autoplay=1&rel=0`}
                title={open.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-5">
              <div className="text-xs font-semibold text-primary">{open.subject}</div>
              <h3 className="font-display font-bold text-lg mt-0.5">{open.title}</h3>
              {open.description && <p className="text-sm text-muted-foreground mt-1">{open.description}</p>}
              <div className="mt-4 flex justify-end">
                <button onClick={() => setOpen(null)} className="px-4 py-2 rounded-full bg-muted text-foreground font-medium text-sm hover:bg-muted/80">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
