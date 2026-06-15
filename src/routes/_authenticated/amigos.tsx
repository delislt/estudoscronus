import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, UserPlus, Check, X, Search, Flame, Trophy } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import {
  searchUsers,
  listFriends,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
} from "@/lib/friends.functions";

export const Route = createFileRoute("/_authenticated/amigos")({
  head: () => ({ meta: [{ title: "Amigos — Chronos" }] }),
  component: FriendsPage,
});

function FriendsPage() {
  const fetchFriends = useServerFn(listFriends);
  const searchFn = useServerFn(searchUsers);
  const sendFn = useServerFn(sendFriendRequest);
  const respondFn = useServerFn(respondFriendRequest);
  const removeFn = useServerFn(removeFriend);

  const [data, setData] = useState<{
    accepted: any[];
    incoming: any[];
    outgoing: any[];
  }>({ accepted: [], incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setData(await fetchFriends());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function doSearch() {
    if (q.trim().length < 2) return;
    setSearching(true);
    try {
      setResults(await searchFn({ data: { q: q.trim() } }));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  }

  async function send(uid: string) {
    try {
      await sendFn({ data: { addressee_id: uid } });
      toast.success("Pedido enviado");
      setResults((r) => r.filter((x) => x.id !== uid));
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function respond(id: string, accept: boolean) {
    try {
      await respondFn({ data: { id, accept } });
      toast.success(accept ? "Amigo aceito" : "Pedido recusado");
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function remove(id: string) {
    try {
      await removeFn({ data: { id } });
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Users className="h-7 w-7" /> Amigos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Compare progresso e estude junto.
          </p>
        </div>

        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Search className="h-4 w-4" /> Encontrar pessoas
          </h2>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Nome do estudante"
              className="flex-1 px-3 py-2 rounded-lg bg-background border border-border/60"
            />
            <button
              onClick={doSearch}
              disabled={searching}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
            >
              Buscar
            </button>
          </div>
          {results.length > 0 && (
            <ul className="mt-4 space-y-2">
              {results.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="h-9 w-9 rounded-full" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/20" />
                    )}
                    <span>{r.full_name ?? "Estudante"}</span>
                  </div>
                  <button
                    onClick={() => send(r.id)}
                    className="text-sm px-3 py-1.5 rounded-full bg-primary text-primary-foreground inline-flex items-center gap-1"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Adicionar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {loading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : (
          <>
            {data.incoming.length > 0 && (
              <section>
                <h2 className="font-semibold mb-3">Pedidos recebidos</h2>
                <ul className="space-y-2">
                  {data.incoming.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-card"
                    >
                      <span>{f.full_name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => respond(f.id, true)}
                          className="p-2 rounded-full bg-emerald-500/15 text-emerald-600"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => respond(f.id, false)}
                          className="p-2 rounded-full bg-red-500/15 text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="font-semibold mb-3">Meus amigos ({data.accepted.length})</h2>
              {data.accepted.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Você ainda não tem amigos. Que tal convidar alguém?
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.accepted.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {f.avatar_url ? (
                          <img src={f.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/20" />
                        )}
                        <div>
                          <div className="font-medium">{f.full_name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            <span className="inline-flex items-center gap-1">
                              <Trophy className="h-3 w-3" /> Nv {f.level} · {f.xp} XP
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Flame className="h-3 w-3 text-orange-500" /> {f.streak_days}d
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => remove(f.id)}
                        className="text-xs px-3 py-1 rounded-full text-muted-foreground hover:text-red-500"
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {data.outgoing.length > 0 && (
              <section>
                <h2 className="font-semibold mb-3">Pedidos enviados</h2>
                <ul className="space-y-2">
                  {data.outgoing.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-card text-muted-foreground"
                    >
                      <span>{f.full_name}</span>
                      <button
                        onClick={() => remove(f.id)}
                        className="text-xs hover:text-red-500"
                      >
                        Cancelar
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
