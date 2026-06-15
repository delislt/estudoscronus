import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Coins, Check, Sparkles, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { listShop, buyItem, equipItem } from "@/lib/shop.functions";

export const Route = createFileRoute("/_authenticated/loja")({
  head: () => ({ meta: [{ title: "Loja — Chronos" }] }),
  component: ShopPage,
});

type Item = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: string;
  price: number;
  owned: boolean;
  equipped: boolean;
};

function ShopPage() {
  const fetchShop = useServerFn(listShop);
  const buy = useServerFn(buyItem);
  const equip = useServerFn(equipItem);
  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetchShop();
      setCoins(r.coins);
      setItems(r.items as Item[]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function onBuy(it: Item) {
    setBusy(it.id);
    try {
      await buy({ data: { item_id: it.id } });
      toast.success(`${it.name} comprado!`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }
  async function onEquip(it: Item) {
    setBusy(it.id);
    try {
      await equip({ data: { item_id: it.id } });
      toast.success("Equipado");
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  const byKind = items.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.kind] ||= []).push(it);
    return acc;
  }, {});

  const labels: Record<string, string> = {
    powerup: "Power-ups",
    avatar: "Avatares",
    theme: "Temas",
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <ShoppingBag className="h-7 w-7" /> Loja
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Use suas moedas conquistadas estudando.
            </p>
          </div>
          <div className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-4 py-2 inline-flex items-center gap-2 font-semibold">
            <Coins className="h-5 w-5" /> {coins}
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : (
          Object.entries(byKind).map(([kind, list]) => (
            <section key={kind} className="mb-8">
              <h2 className="text-lg font-semibold mb-3">{labels[kind] ?? kind}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((it) => (
                  <div
                    key={it.id}
                    className="rounded-2xl border border-border/60 bg-card p-5 flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{it.name}</h3>
                      {it.equipped && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Equipado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex-1">
                      {it.description ?? ""}
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                        <Coins className="h-4 w-4" /> {it.price}
                      </span>
                      {it.owned ? (
                        it.kind === "powerup" ? (
                          <span className="text-xs inline-flex items-center gap-1 text-emerald-600">
                            <Check className="h-3 w-3" /> No inventário
                          </span>
                        ) : (
                          <button
                            disabled={busy === it.id || it.equipped}
                            onClick={() => onEquip(it)}
                            className="text-sm px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70 disabled:opacity-50"
                          >
                            {it.equipped ? "Equipado" : "Equipar"}
                          </button>
                        )
                      ) : (
                        <button
                          disabled={busy === it.id || coins < it.price}
                          onClick={() => onBuy(it)}
                          className="text-sm px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <Sparkles className="h-3.5 w-3.5" /> Comprar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
