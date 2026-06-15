import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Plus, Loader2 } from "lucide-react";
import { listThreads, createThread } from "@/lib/tutor.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tutor/")({
  component: TutorIndex,
});

function TutorIndex() {
  const navigate = useNavigate();
  const fetchThreads = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const ran = useRef(false);
  const [loading, setLoading] = useState(true);
  const [hasThreads, setHasThreads] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    fetchThreads()
      .then((threads) => {
        const list = (threads as { id: string }[]) ?? [];
        if (list.length > 0) {
          // Volta para a conversa mais recente em vez de criar uma nova
          navigate({
            to: "/tutor/$threadId",
            params: { threadId: list[0].id },
            replace: true,
          });
          return;
        }
        setHasThreads(false);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [fetchThreads, navigate]);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const { id } = await createFn();
      navigate({ to: "/tutor/$threadId", params: { threadId: id }, replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível criar uma nova conversa");
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 grid place-items-center p-10 text-center">
        <div>
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 text-primary grid place-items-center">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Carregando suas conversas…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 grid place-items-center p-10 text-center">
      <div className="max-w-sm">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 text-primary grid place-items-center">
          <Bot className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display font-extrabold text-2xl">Tutora Cronus ✨</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasThreads
            ? "Selecione uma conversa ao lado ou comece uma nova."
            : "Tudo pronto! Comece sua primeira conversa com a tutora."}
        </p>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground h-11 px-6 font-semibold shadow-lg shadow-primary/30 hover:brightness-105 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Nova conversa
        </button>
      </div>
    </div>
  );
}
