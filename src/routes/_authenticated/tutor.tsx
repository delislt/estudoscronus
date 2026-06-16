import { createFileRoute, Link, useNavigate, Outlet } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { listThreads, createThread, deleteThread } from "@/lib/tutor.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tutor")({
  head: () => ({ meta: [{ title: "Tutora IA — Study" }] }),
  component: TutorLayout,
});

type Thread = { id: string; title: string; updated_at: string };

function TutorLayout() {
  const navigate = useNavigate();
  const fetchThreads = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = (await fetchThreads()) as Thread[];
      setThreads(data);
    } finally {
      setLoading(false);
    }
  }, [fetchThreads]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleNew() {
    const { id } = await createFn();
    await refresh();
    navigate({ to: "/tutor/$threadId", params: { threadId: id } });
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Apagar essa conversa?")) return;
    await deleteFn({ data: { id } });
    toast.success("Conversa apagada");
    await refresh();
    navigate({ to: "/tutor" });
  }

  return (
    <div className="min-h-screen bg-app-gradient">
      <AppHeader />


      <div className="max-w-6xl mx-auto px-6 py-6 grid md:grid-cols-[280px_1fr] gap-6">
        <aside className="rounded-3xl bg-card border border-border/60 p-4 shadow-sm h-fit md:sticky md:top-24">
          <button
            onClick={handleNew}
            className="w-full rounded-full bg-primary text-primary-foreground h-11 font-semibold shadow-lg shadow-primary/30 hover:brightness-105 inline-flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Nova conversa
          </button>
          <div className="mt-4 space-y-1">
            {loading ? (
              <p className="text-xs text-muted-foreground px-2">Carregando…</p>
            ) : threads.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                Sem conversas ainda.
              </p>
            ) : (
              threads.map((t) => (
                <div key={t.id} className="group flex items-center gap-1">
                  <Link
                    to="/tutor/$threadId"
                    params={{ threadId: t.id }}
                    className="flex-1 min-w-0 flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted"
                    activeProps={{ className: "flex-1 min-w-0 flex items-center gap-2 rounded-xl px-3 py-2 text-sm bg-muted font-medium" }}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t.title}</span>
                  </Link>
                  <button
                    onClick={(e) => handleDelete(t.id, e)}
                    className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition"
                    aria-label="Apagar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="rounded-3xl bg-card border border-border/60 shadow-sm min-h-[70vh] flex flex-col overflow-hidden">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
