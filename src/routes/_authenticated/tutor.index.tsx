import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot } from "lucide-react";
import { createThread } from "@/lib/tutor.functions";

export const Route = createFileRoute("/_authenticated/tutor/")({
  component: TutorIndex,
});

function TutorIndex() {
  const navigate = useNavigate();
  const createFn = useServerFn(createThread);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    createFn()
      .then(({ id }) => {
        navigate({ to: "/tutor/$threadId", params: { threadId: id }, replace: true });
      })
      .catch((e) => console.error(e));
  }, [createFn, navigate]);

  return (
    <div className="flex-1 grid place-items-center p-10 text-center">
      <div>
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 text-primary grid place-items-center">
          <Bot className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display font-extrabold text-2xl">Tutora Study ✨</h1>
        <p className="mt-1 text-sm text-muted-foreground">Preparando sua conversa…</p>
      </div>
    </div>
  );
}
