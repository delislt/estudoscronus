import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, PenLine, Send } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { listEssays, submitEssay } from "@/lib/essays.functions";

export const Route = createFileRoute("/_authenticated/redacao")({
  head: () => ({ meta: [{ title: "Redação — Chronos" }] }),
  component: EssayPage,
});

type Essay = {
  id: string;
  prompt: string;
  status: string;
  total: number | null;
  c1: number | null;
  c2: number | null;
  c3: number | null;
  c4: number | null;
  c5: number | null;
  created_at: string;
  feedback: {
    per_competency?: Record<string, string>;
    suggestions?: string[];
    improved_version?: string;
  } | null;
};

function EssayPage() {
  const list = useServerFn(listEssays);
  const submit = useServerFn(submitEssay);
  const [essays, setEssays] = useState<Essay[]>([]);
  const [prompt, setPrompt] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Essay | null>(null);

  function refresh() {
    list().then((r) => setEssays(r as Essay[]));
  }
  useEffect(() => { refresh(); }, []);

  async function handleSubmit() {
    if (prompt.trim().length < 10) return toast.error("Descreva o tema (mín. 10 caracteres).");
    if (body.trim().length < 50) return toast.error("Redação muito curta.");
    setLoading(true);
    try {
      await submit({ data: { prompt: prompt.trim(), body: body.trim() } });
      toast.success("Redação corrigida!");
      setPrompt("");
      setBody("");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold inline-flex items-center gap-2">
            <PenLine className="h-7 w-7" /> Correção de redação
          </h1>
          <p className="text-muted-foreground mt-1">5 competências ENEM com nota e versão melhorada.</p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <label className="block">
            <span className="text-sm text-muted-foreground">Tema / proposta</span>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex.: Desafios para o combate à desinformação na era digital"
              className="mt-1 w-full rounded-lg bg-background border border-border px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted-foreground">Sua redação</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder="Cole o texto da sua redação aqui..."
              className="mt-1 w-full rounded-lg bg-background border border-border px-3 py-2 font-mono text-sm leading-relaxed"
            />
            <p className="text-xs text-muted-foreground mt-1">{body.length} caracteres</p>
          </label>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar para correção
          </button>
        </section>

        <section>
          <h2 className="font-display font-semibold mb-3">Histórico</h2>
          {essays.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma redação ainda.</p>
          ) : (
            <ul className="space-y-2">
              {essays.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setSelected(selected?.id === e.id ? null : e)}
                    className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-primary transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium line-clamp-1">{e.prompt}</p>
                        <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                      <div className="text-right">
                        {e.status === "done" ? (
                          <p className="text-2xl font-display font-bold text-primary">{e.total}</p>
                        ) : e.status === "grading" ? (
                          <span className="text-xs text-muted-foreground">Corrigindo...</span>
                        ) : (
                          <span className="text-xs text-destructive">Erro</span>
                        )}
                      </div>
                    </div>
                  </button>
                  {selected?.id === e.id && e.status === "done" && (
                    <div className="mt-2 rounded-xl border border-border bg-card/50 p-4 space-y-3">
                      <div className="grid grid-cols-5 gap-2">
                        {[e.c1, e.c2, e.c3, e.c4, e.c5].map((v, i) => (
                          <div key={i} className="text-center">
                            <p className="text-xs text-muted-foreground">C{i + 1}</p>
                            <p className="text-lg font-display font-bold">{v}</p>
                          </div>
                        ))}
                      </div>
                      {e.feedback?.per_competency && (
                        <div className="space-y-2 text-sm">
                          {Object.entries(e.feedback.per_competency).map(([k, v]) => (
                            <p key={k}><span className="font-semibold uppercase mr-1">{k}:</span>{v}</p>
                          ))}
                        </div>
                      )}
                      {e.feedback?.suggestions && e.feedback.suggestions.length > 0 && (
                        <div>
                          <p className="font-medium mb-1">Sugestões</p>
                          <ul className="list-disc pl-5 text-sm space-y-1">
                            {e.feedback.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {e.feedback?.improved_version && (
                        <details className="text-sm">
                          <summary className="cursor-pointer font-medium">Versão melhorada</summary>
                          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{e.feedback.improved_version}</p>
                        </details>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
