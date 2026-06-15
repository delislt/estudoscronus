import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Sparkles, Layers } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import {
  listDecks,
  createDeck,
  deleteDeck,
  generateCardsFromText,
} from "@/lib/flashcards.functions";

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({ meta: [{ title: "Flashcards — Chronos" }] }),
  component: FlashcardsPage,
});

type Deck = {
  id: string;
  name: string;
  description: string | null;
  total: number;
  due: number;
};

function FlashcardsPage() {
  const fetchDecks = useServerFn(listDecks);
  const createFn = useServerFn(createDeck);
  const deleteFn = useServerFn(deleteDeck);
  const genFn = useServerFn(generateCardsFromText);

  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [showAI, setShowAI] = useState<string | null>(null);
  const [aiText, setAiText] = useState("");
  const [aiCount, setAiCount] = useState(10);
  const [aiBusy, setAiBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await fetchDecks()) as Deck[];
      setDecks(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [fetchDecks]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createFn({ data: { name: name.trim(), description: desc.trim() || undefined } });
      toast.success("Deck criado");
      setName("");
      setDesc("");
      setShowNew(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar este deck e todos os cards?")) return;
    await deleteFn({ data: { id } });
    toast.success("Deck apagado");
    load();
  }

  async function handleAI(e: React.FormEvent) {
    e.preventDefault();
    if (!showAI || !aiText.trim()) return;
    setAiBusy(true);
    try {
      const r = (await genFn({
        data: { deck_id: showAI, text: aiText.trim(), count: aiCount },
      })) as { created: number };
      toast.success(`${r.created} cartões gerados pela IA`);
      setShowAI(null);
      setAiText("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro IA");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-app-gradient">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold">Flashcards</h1>
            <p className="text-sm text-muted-foreground">
              Revisão espaçada (SM-2). Estude o que tá pra esquecer.
            </p>
          </div>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 h-10 font-semibold shadow-lg shadow-primary/30 hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> Novo deck
          </button>
        </div>

        {showNew && (
          <form
            onSubmit={handleCreate}
            className="rounded-2xl border border-border/60 bg-card p-4 mb-6 grid sm:grid-cols-[1fr_2fr_auto] gap-2"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do deck"
              className="h-10 px-3 rounded-xl bg-background border border-border/60 text-sm"
              required
              maxLength={120}
            />
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Descrição (opcional)"
              className="h-10 px-3 rounded-xl bg-background border border-border/60 text-sm"
              maxLength={500}
            />
            <button
              type="submit"
              className="rounded-xl bg-primary text-primary-foreground px-4 h-10 font-semibold text-sm"
            >
              Criar
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : decks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 p-10 text-center">
            <Layers className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum deck ainda. Crie um pra começar a estudar.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {decks.map((d) => (
              <div
                key={d.id}
                className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{d.name}</h3>
                    {d.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {d.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Apagar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {d.total} cartões
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full ${d.due > 0 ? "bg-primary/15 text-primary font-semibold" : "bg-muted text-muted-foreground"}`}
                  >
                    {d.due} pra revisar
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/flashcards/$deckId"
                    params={{ deckId: d.id }}
                    className="flex-1 inline-flex items-center justify-center rounded-xl h-10 bg-primary text-primary-foreground text-sm font-semibold hover:brightness-105"
                  >
                    Estudar
                  </Link>
                  <button
                    onClick={() => setShowAI(showAI === d.id ? null : d.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl h-10 px-3 bg-muted text-foreground text-sm font-medium hover:bg-muted/70"
                  >
                    <Sparkles className="h-4 w-4" /> IA
                  </button>
                </div>

                {showAI === d.id && (
                  <form onSubmit={handleAI} className="space-y-2 border-t border-border/40 pt-3">
                    <textarea
                      value={aiText}
                      onChange={(e) => setAiText(e.target.value)}
                      placeholder="Cole aqui o texto/matéria — a IA cria os flashcards…"
                      rows={5}
                      className="w-full rounded-xl bg-background border border-border/60 p-3 text-sm resize-none"
                      maxLength={20000}
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">
                        Qtd
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={aiCount}
                          onChange={(e) => setAiCount(Math.max(1, Math.min(30, Number(e.target.value))))}
                          className="ml-2 w-14 h-8 px-2 rounded-lg bg-background border border-border/60 text-sm"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={aiBusy || !aiText.trim()}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-xl h-9 px-3 bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4" />
                        {aiBusy ? "Gerando…" : "Gerar cartões"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
