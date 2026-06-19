import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { generateVideoRecommendations } from "@/lib/video-recs.functions";
import { resolveYoutubeVideo } from "@/lib/youtube.functions";
import { VIDEO_CATALOG } from "@/data/video-catalog";
import {
  Heart, CheckCircle2, ExternalLink, Filter, Sparkles, Loader2, Play as YoutubeIcon,
  Calculator, Atom, FlaskConical, Leaf, Globe2, Landmark, Users, Brain,
  BookOpen, Feather, PenLine, LayoutGrid, Tag, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

const SUBJECT_ICONS: Record<string, LucideIcon> = {
  "matemática": Calculator, "matematica": Calculator,
  "física": Atom, "fisica": Atom,
  "química": FlaskConical, "quimica": FlaskConical,
  "biologia": Leaf,
  "geografia": Globe2,
  "história": Landmark, "historia": Landmark,
  "sociologia": Users,
  "filosofia": Brain,
  "português": BookOpen, "portugues": BookOpen,
  "literatura": Feather,
  "redação": PenLine, "redacao": PenLine,
};

function iconForSubject(s: string): LucideIcon {
  if (s === "todas") return LayoutGrid;
  return SUBJECT_ICONS[s.toLowerCase().trim()] ?? BookOpen;
}

// Canonical order matching the curated catalog
const SUBJECT_ORDER = [
  "Matemática", "Física", "Química", "Biologia",
  "História", "Geografia", "Filosofia", "Sociologia",
  "Português", "Literatura", "Redação",
];

export const Route = createFileRoute("/_authenticated/videoaulas")({
  head: () => ({ meta: [{ title: "Videoaulas — Study" }] }),
  component: VideoaulasPage,
});

type Rec = {
  id: string;
  title: string;
  subject: string;
  topic: string;
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
  source: "db" | "catalog";
};

type Filter = "todas" | "favoritas" | "concluidas";

function openYoutube(videoId: string) {
  const w = window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank", "noopener,noreferrer");
  if (!w) window.location.href = `https://www.youtube.com/watch?v=${videoId}`;
}

function openSearch(q: string) {
  window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
}

function VideoaulasPage() {
  const generate = useServerFn(generateVideoRecommendations);
  const resolve = useServerFn(resolveYoutubeVideo);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [subject, setSubject] = useState<string>("todas");
  const [topic, setTopic] = useState<string>("todos");
  const [filter, setFilter] = useState<Filter>("todas");
  const [resolving, setResolving] = useState<string | null>(null);

  // Catalog items as virtual recs (always available)
  const catalogRecs = useMemo<Rec[]>(
    () =>
      VIDEO_CATALOG.map((c, i) => ({
        id: `cat-${i}`,
        title: c.title,
        subject: c.subject,
        topic: c.topic,
        level: "geral",
        description: null,
        reason: null,
        search_query: c.search_query,
        channel_hint: c.channel,
        duration_hint: null,
        video_id: null,
        resolved_title: null,
        favorited: false,
        completed: false,
        source: "catalog",
      })),
    [],
  );

  const all = useMemo<Rec[]>(() => [...recs, ...catalogRecs], [recs, catalogRecs]);

  async function handleWatch(v: Rec) {
    if (v.video_id) { openYoutube(v.video_id); return; }
    setResolving(v.id);
    try {
      const res = await resolve({ data: { query: v.search_query, channel: v.channel_hint } });
      if (res.videoId) {
        if (v.source === "db") {
          await supabase
            .from("video_recommendations")
            .update({ video_id: res.videoId, resolved_title: res.title ?? null })
            .eq("id", v.id);
        }
        setRecs((prev) => prev.map((x) => (x.id === v.id ? { ...x, video_id: res.videoId, resolved_title: res.title ?? null } : x)));
        openYoutube(res.videoId);
      } else {
        const q = v.channel_hint ? `${v.search_query} ${v.channel_hint}` : v.search_query;
        openSearch(q);
      }
    } catch {
      const q = v.channel_hint ? `${v.search_query} ${v.channel_hint}` : v.search_query;
      openSearch(q);
    } finally {
      setResolving(null);
    }
  }

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) { setLoading(false); return; }
    const { data } = await supabase
      .from("video_recommendations")
      .select("*")
      .eq("user_id", uid)
      .order("subject")
      .order("created_at", { ascending: false });
    const dbRecs: Rec[] = (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      title: r.title as string,
      subject: r.subject as string,
      topic: "Recomendado",
      level: (r.level as string) ?? "",
      description: (r.description as string) ?? null,
      reason: (r.reason as string) ?? null,
      search_query: r.search_query as string,
      channel_hint: (r.channel_hint as string) ?? null,
      duration_hint: (r.duration_hint as string) ?? null,
      video_id: (r.video_id as string) ?? null,
      resolved_title: (r.resolved_title as string) ?? null,
      favorited: !!r.favorited,
      completed: !!r.completed,
      source: "db",
    }));
    setRecs(dbRecs);
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

  const subjects = useMemo(() => {
    const set = new Set<string>(SUBJECT_ORDER);
    all.forEach((r) => set.add(r.subject));
    const ordered = [
      ...SUBJECT_ORDER.filter((s) => set.has(s)),
      ...Array.from(set).filter((s) => !SUBJECT_ORDER.includes(s)).sort((a, b) => a.localeCompare(b, "pt-BR")),
    ];
    return ["todas", ...ordered];
  }, [all]);

  const topics = useMemo(() => {
    if (subject === "todas") return [] as string[];
    const set = new Set<string>();
    all.forEach((r) => { if (r.subject === subject) set.add(r.topic); });
    return ["todos", ...Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))];
  }, [all, subject]);

  // Reset topic when subject changes
  useEffect(() => { setTopic("todos"); }, [subject]);

  const filtered = useMemo(() => {
    return all.filter((v) => {
      if (subject !== "todas" && v.subject !== subject) return false;
      if (subject !== "todas" && topic !== "todos" && v.topic !== topic) return false;
      if (filter === "favoritas") return v.favorited;
      if (filter === "concluidas") return v.completed;
      return true;
    });
  }, [all, subject, topic, filter]);

  async function patch(r: Rec, p: Partial<Pick<Rec, "favorited" | "completed">>) {
    if (r.source !== "db") {
      toast.info("Este vídeo é da seleção curada — gere recomendações para salvar progresso.");
      return;
    }
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
              Seleção curada dos melhores canais brasileiros — e recomendações personalizadas pela IA com base nas suas matérias.
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

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mr-1">
              <Filter className="h-4 w-4" /> Matéria:
            </div>
            {subjects.map((s) => {
              const Icon = iconForSubject(s);
              return (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition ${subject === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/60 hover:bg-muted"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s === "todas" ? "Todas" : s}
                </button>
              );
            })}

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
          </div>

          {topics.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mr-1">
                <Tag className="h-4 w-4" /> Tema:
              </div>
              {topics.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${topic === t ? "bg-primary/15 text-primary border-primary" : "bg-card border-border/60 hover:bg-muted"}`}
                >
                  {t === "todos" ? "Todos os temas" : t}
                </button>
              ))}
            </div>
          )}
        </section>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(
              filtered.reduce<Record<string, Rec[]>>((acc, v) => {
                (acc[v.subject] ??= []).push(v);
                return acc;
              }, {}),
            )
              .sort(([a], [b]) => {
                const ia = SUBJECT_ORDER.indexOf(a);
                const ib = SUBJECT_ORDER.indexOf(b);
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                return a.localeCompare(b, "pt-BR");
              })
              .map(([subj, items]) => {
                const Icon = iconForSubject(subj);
                return (
                  <section key={subj} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <h2 className="font-display font-bold text-xl">{subj}</h2>
                      <span className="text-xs text-muted-foreground">({items.length})</span>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {items.map((v) => (
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
                          ) : (
                            <button
                              onClick={() => handleWatch(v)}
                              className="relative block aspect-video bg-gradient-to-br from-primary/15 via-card to-muted overflow-hidden group"
                              aria-label="Abrir no YouTube"
                            >
                              <div className="absolute inset-0 grid place-items-center">
                                <span className="h-14 w-14 rounded-full bg-white/95 grid place-items-center shadow-lg group-hover:scale-105 transition">
                                  {resolving === v.id ? (
                                    <Loader2 className="h-6 w-6 text-coral animate-spin" />
                                  ) : (
                                    <YoutubeIcon className="h-6 w-6 text-coral fill-coral" />
                                  )}
                                </span>
                              </div>
                              <span className="absolute bottom-2 left-2 text-xs font-medium text-foreground/80 bg-background/80 backdrop-blur rounded-full px-2 py-0.5">
                                {v.channel_hint ?? "YouTube"}
                              </span>
                            </button>
                          )}
                          <div className="p-5 flex flex-col gap-3 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                                <Icon className="h-3 w-3" />
                                {v.subject}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/70 bg-muted rounded-full px-2.5 py-0.5">
                                <Tag className="h-3 w-3" />
                                {v.topic}
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
                                Canal: <span className="font-medium text-foreground">{v.channel_hint}</span>
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
                  </section>
                );
              })}
          </div>
        )}
      </main>
    </div>
  );
}
