import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Sparkles,
  Send,
  Loader2,
  FileText,
  Map,
  Zap,
  Layers,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import {
  getDocument,
  generateSummary,
  askAboutDocument,
} from "@/lib/documents.functions";
import { MessageResponse } from "@/components/ai-elements/message";

export const Route = createFileRoute("/_authenticated/resumos/$documentId")({
  component: DocumentViewer,
});

type SummaryKind = "short" | "full" | "mindmap" | "quick_review" | "flashcards";
type Summary = {
  id: string;
  kind: SummaryKind;
  content: { markdown?: string; cards?: { front: string; back: string }[] };
  created_at: string;
};
type Doc = {
  id: string;
  title: string;
  page_count: number | null;
  extracted_text: string | null;
};

const TABS: { key: SummaryKind; label: string; icon: typeof FileText }[] = [
  { key: "short", label: "Resumo curto", icon: Zap },
  { key: "full", label: "Resumo completo", icon: BookOpen },
  { key: "mindmap", label: "Mapa mental", icon: Map },
  { key: "quick_review", label: "Revisão rápida", icon: FileText },
  { key: "flashcards", label: "Flashcards", icon: Layers },
];

function DocumentViewer() {
  const { documentId } = Route.useParams();
  const fetchDoc = useServerFn(getDocument);
  const genFn = useServerFn(generateSummary);
  const askFn = useServerFn(askAboutDocument);

  const [doc, setDoc] = useState<Doc | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [active, setActive] = useState<SummaryKind>("short");
  const [busy, setBusy] = useState<SummaryKind | null>(null);

  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = (await fetchDoc({ data: { id: documentId } })) as {
      doc: Doc;
      summaries: Summary[];
      signedUrl: string | null;
    };
    setDoc(r.doc);
    setSummaries(r.summaries);
    setPdfUrl(r.signedUrl);
  }, [fetchDoc, documentId]);

  useEffect(() => {
    load().catch((e) => toast.error(e instanceof Error ? e.message : "Erro"));
  }, [load]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, asking]);

  const current = summaries.find((s) => s.kind === active);

  async function handleGenerate(kind: SummaryKind) {
    setBusy(kind);
    try {
      const row = (await genFn({ data: { document_id: documentId, kind } })) as Summary;
      setSummaries((s) => [row, ...s.filter((x) => x.kind !== kind)]);
      setActive(kind);
      toast.success("Pronto!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro IA");
    } finally {
      setBusy(null);
    }
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || asking) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setAsking(true);
    try {
      const r = (await askFn({ data: { document_id: documentId, question: q } })) as {
        answer: string;
      };
      setMessages((m) => [...m, { role: "assistant", text: r.answer }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="min-h-screen bg-app-gradient">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Link
          to="/resumos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Documentos
        </Link>

        <h1 className="font-display text-xl sm:text-2xl font-extrabold mb-4 truncate">
          {doc?.title ?? "Carregando…"}
        </h1>

        <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
          {/* PDF viewer */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden h-[78vh]">
            {pdfUrl ? (
              <iframe src={pdfUrl} title="PDF" className="w-full h-full" />
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">
                Carregando PDF…
              </div>
            )}
          </div>

          {/* Side: tabs + chat */}
          <div className="flex flex-col gap-4 h-[78vh]">
            <div className="rounded-2xl border border-border/60 bg-card p-4 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 border-b border-border/40 -mx-1 px-1">
                {TABS.map((t) => {
                  const has = summaries.some((s) => s.kind === t.key);
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActive(t.key)}
                      className={`shrink-0 inline-flex items-center gap-1.5 text-xs px-3 h-8 rounded-full border transition ${
                        active === t.key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border/60 hover:text-foreground"
                      }`}
                    >
                      <t.icon className="h-3.5 w-3.5" />
                      {t.label}
                      {has && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto pt-3 text-sm">
                {!current ? (
                  <div className="h-full grid place-items-center text-center px-4">
                    <div>
                      <Sparkles className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Nenhum {TABS.find((t) => t.key === active)?.label.toLowerCase()} ainda.
                      </p>
                      <button
                        onClick={() => handleGenerate(active)}
                        disabled={busy === active}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 h-10 text-sm font-semibold disabled:opacity-60"
                      >
                        {busy === active ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        Gerar com IA
                      </button>
                    </div>
                  </div>
                ) : current.kind === "flashcards" && current.content.cards ? (
                  <div className="space-y-2">
                    {current.content.cards.map((c, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-border/60 p-3 bg-background"
                      >
                        <p className="font-semibold">{c.front}</p>
                        <p className="text-muted-foreground mt-1">{c.back}</p>
                      </div>
                    ))}
                    <button
                      onClick={() => handleGenerate(active)}
                      disabled={busy === active}
                      className="text-xs text-muted-foreground hover:text-foreground underline mt-2"
                    >
                      Regenerar
                    </button>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none prose-p:my-2">
                    <MessageResponse>
                      {current.content.markdown ?? "(sem conteúdo)"}
                    </MessageResponse>
                    <button
                      onClick={() => handleGenerate(active)}
                      disabled={busy === active}
                      className="text-xs text-muted-foreground hover:text-foreground underline mt-2 no-underline"
                    >
                      Regenerar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Chat */}
            <div className="rounded-2xl border border-border/60 bg-card flex flex-col h-72">
              <div className="px-4 py-2 border-b border-border/40 text-xs uppercase tracking-wider text-muted-foreground">
                Tira-dúvidas sobre o documento
              </div>
              <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
                {messages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Pergunte qualquer coisa sobre o conteúdo.
                  </p>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[90%] ${
                      m.role === "user"
                        ? "ml-auto rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3 py-2"
                        : "mr-auto prose prose-sm max-w-none prose-p:my-1.5"
                    }`}
                  >
                    {m.role === "user" ? m.text : <MessageResponse>{m.text}</MessageResponse>}
                  </div>
                ))}
                {asking && (
                  <p className="text-xs italic text-muted-foreground">Pensando…</p>
                )}
              </div>
              <form
                onSubmit={ask}
                className="border-t border-border/40 p-2 flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      ask(e as unknown as React.FormEvent);
                    }
                  }}
                  rows={1}
                  placeholder="Pergunte algo…"
                  className="flex-1 resize-none bg-background border border-border/60 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 max-h-24"
                />
                <button
                  type="submit"
                  disabled={asking || !input.trim()}
                  className="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground grid place-items-center disabled:opacity-40"
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
