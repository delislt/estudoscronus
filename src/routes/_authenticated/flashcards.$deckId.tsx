import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import {
  getDeckSession,
  reviewCard,
  addCard,
} from "@/lib/flashcards.functions";

export const Route = createFileRoute("/_authenticated/flashcards/$deckId")({
  component: DeckStudy,
});

type Card = {
  id: string;
  front: string;
  back: string;
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
};

const RATINGS: { key: "again" | "hard" | "good" | "easy"; label: string; cls: string }[] = [
  { key: "again", label: "Errei", cls: "bg-destructive text-destructive-foreground" },
  { key: "hard", label: "Difícil", cls: "bg-amber-500 text-white" },
  { key: "good", label: "Bom", cls: "bg-emerald-500 text-white" },
  { key: "easy", label: "Fácil", cls: "bg-sky-500 text-white" },
];

function DeckStudy() {
  const { deckId } = Route.useParams();
  const getSession = useServerFn(getDeckSession);
  const review = useServerFn(reviewCard);
  const add = useServerFn(addCard);

  const [deckName, setDeckName] = useState("");
  const [queue, setQueue] = useState<Card[]>([]);
  const [showBack, setShowBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(0);

  const [showAdd, setShowAdd] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = (await getSession({ data: { deck_id: deckId, limit: 50 } })) as {
        deck: { name: string };
        cards: Card[];
      };
      setDeckName(r.deck.name);
      setQueue(r.cards);
      setShowBack(false);
    } finally {
      setLoading(false);
    }
  }, [getSession, deckId]);

  useEffect(() => {
    load();
  }, [load]);

  const current = queue[0];

  async function rate(key: "again" | "hard" | "good" | "easy") {
    if (!current) return;
    try {
      await review({ data: { flashcard_id: current.id, rating: key } });
      setDone((n) => n + 1);
      setQueue((q) => q.slice(1));
      setShowBack(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    await add({ data: { deck_id: deckId, front: front.trim(), back: back.trim() } });
    toast.success("Cartão adicionado");
    setFront("");
    setBack("");
    setShowAdd(false);
    load();
  }

  return (
    <div className="min-h-screen bg-app-gradient">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link
          to="/flashcards"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Decks
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-extrabold">{deckName || "Deck"}</h1>
            <p className="text-xs text-muted-foreground">
              {done} revisados • {queue.length} na fila
            </p>
          </div>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 h-9 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Cartão
          </button>
        </div>

        {showAdd && (
          <form
            onSubmit={handleAdd}
            className="rounded-2xl border border-border/60 bg-card p-4 mb-6 space-y-2"
          >
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Pergunta (frente)"
              rows={2}
              className="w-full rounded-xl bg-background border border-border/60 p-3 text-sm resize-none"
              required
            />
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Resposta (verso)"
              rows={3}
              className="w-full rounded-xl bg-background border border-border/60 p-3 text-sm resize-none"
              required
            />
            <button
              type="submit"
              className="rounded-xl bg-primary text-primary-foreground px-4 h-10 text-sm font-semibold"
            >
              Adicionar
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Carregando…</p>
        ) : !current ? (
          <div className="rounded-3xl border border-border/60 bg-card p-10 text-center">
            <Check className="h-10 w-10 mx-auto text-emerald-500" />
            <h2 className="mt-3 font-display font-extrabold text-xl">Tudo em dia!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Nenhum cartão pra revisar agora. Volte depois.
            </p>
            <button
              onClick={load}
              className="mt-4 rounded-full bg-primary text-primary-foreground px-4 h-10 text-sm font-semibold"
            >
              Recarregar
            </button>
          </div>
        ) : (
          <>
            <div
              onClick={() => setShowBack((v) => !v)}
              className="rounded-3xl border border-border/60 bg-card p-8 min-h-[260px] cursor-pointer select-none flex flex-col"
            >
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {showBack ? "Resposta" : "Pergunta"}
              </span>
              <p className="mt-3 text-lg whitespace-pre-wrap flex-1">
                {showBack ? current.back : current.front}
              </p>
              {!showBack && (
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Toque para revelar
                </p>
              )}
            </div>

            {showBack && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                {RATINGS.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => rate(r.key)}
                    className={`rounded-xl h-12 text-sm font-semibold ${r.cls} hover:brightness-105`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
