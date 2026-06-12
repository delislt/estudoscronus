import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getThreadMessages } from "@/lib/tutor.functions";
import { Bot, User as UserIcon, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/tutor/$threadId")({
  component: ThreadChat,
});

const QUICK_PROMPTS = [
  { label: "Explica", text: "Me explica passo a passo: " },
  { label: "Exercícios", text: "Gera 5 exercícios com gabarito comentado sobre: " },
  { label: "Resumir", text: "Resume em bullet points: " },
];

function ThreadChat() {
  const { threadId } = Route.useParams();
  const fetchMessages = useServerFn(getThreadMessages);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    setInitial(null);
    fetchMessages({ data: { threadId } })
      .then((res) => {
        const msgs: UIMessage[] = (res.messages ?? []).map((m) => ({
          id: m.id,
          role: m.role,
          parts: (m.parts ?? []).map((p) =>
            p.type === "text" ? { type: "text", text: p.text ?? "" } : p,
          ) as UIMessage["parts"],
        }));
        setInitial(msgs);
      })
      .catch((e) => {
        console.error(e);
        toast.error("Não foi possível carregar a conversa");
        setInitial([]);
      });
  }, [threadId, fetchMessages]);

  if (initial === null) {
    return (
      <div className="flex-1 grid place-items-center p-10 text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return <ChatInner key={threadId} threadId={threadId} initialMessages={initial} />;
}

function ChatInner({ threadId, initialMessages }: { threadId: string; initialMessages: UIMessage[] }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages, body }) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return {
            body: { messages, threadId, ...(body ?? {}) },
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          };
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => {
      console.error(e);
      toast.error("Erro na resposta da IA");
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    taRef.current?.focus();
  }, [threadId]);

  const isBusy = status === "submitted" || status === "streaming";

  async function submit() {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    await sendMessage({ text });
    setTimeout(() => taRef.current?.focus(), 0);
  }

  const isEmpty = messages.length === 0;

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
        {isEmpty && (
          <div className="max-w-md mx-auto text-center py-10">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 text-primary grid place-items-center">
              <Sparkles className="h-7 w-7" />
            </div>
            <h2 className="mt-4 font-display font-extrabold text-xl">Oi! Sou a Study 👋</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Me pergunta qualquer coisa: matérias, exercícios, resumos, dicas de estudo.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => {
                    setInput(q.text);
                    setTimeout(() => taRef.current?.focus(), 0);
                  }}
                  className="rounded-2xl border border-border/60 bg-card px-3 py-2.5 text-xs font-medium hover:bg-muted text-left"
                >
                  <span className="font-bold text-primary">{q.label}</span>
                  <span className="block text-muted-foreground mt-0.5 truncate">{q.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const text = (m.parts ?? [])
            .filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join("");
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
              <div
                className={`h-8 w-8 shrink-0 rounded-full grid place-items-center ${
                  isUser ? "bg-primary text-primary-foreground" : "bg-sky-soft text-primary"
                }`}
              >
                {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div
                className={`max-w-[85%] ${
                  isUser
                    ? "rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap"
                    : "text-sm text-foreground prose prose-sm max-w-none prose-p:my-2 prose-pre:bg-muted prose-pre:text-foreground prose-code:text-foreground"
                }`}
              >
                {isUser ? text : <ReactMarkdown>{text || "…"}</ReactMarkdown>}
              </div>
            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex gap-3">
            <div className="h-8 w-8 shrink-0 rounded-full grid place-items-center bg-sky-soft text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="text-sm text-muted-foreground italic">Pensando…</div>
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive text-center">
            Algo deu errado. Tenta de novo em alguns segundos.
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="border-t border-border/60 p-3 sm:p-4 bg-background/60"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Pergunta pra Study… (Shift+Enter pra quebrar linha)"
            className="flex-1 resize-none bg-transparent outline-none text-sm py-1.5 max-h-32 placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground grid place-items-center disabled:opacity-40 hover:brightness-105"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </>
  );
}
