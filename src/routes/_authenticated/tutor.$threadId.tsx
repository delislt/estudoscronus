import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getThreadMessages } from "@/lib/tutor.functions";
import { Bot, User as UserIcon, Send, Sparkles, Mic, MicOff, Camera, Volume2, X, Paperclip, FileText } from "lucide-react";
import { toast } from "sonner";
import { MessageResponse } from "@/components/ai-elements/message";

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

type Level = "kid" | "medio" | "vestibular" | "uni";
const LEVELS: { key: Level; label: string }[] = [
  { key: "kid", label: "Criança (10 anos)" },
  { key: "medio", label: "Ensino Médio" },
  { key: "vestibular", label: "Vestibular" },
  { key: "uni", label: "Universitário" },
];

function ChatInner({ threadId, initialMessages }: { threadId: string; initialMessages: UIMessage[] }) {
  const [input, setInput] = useState("");
  const [level, setLevel] = useState<Level>(() => {
    if (typeof window === "undefined") return "medio";
    return (localStorage.getItem("tutor.level") as Level) || "medio";
  });
  const [pendingFile, setPendingFile] = useState<{ url: string; mediaType: string; name: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("tutor.level", level);
  }, [level]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages, body }) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers: Record<string, string> = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          return {
            body: { messages, threadId, level, ...(body ?? {}) },
            headers,
          };
        },
      }),
    [threadId, level],
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

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 6 MB)."); return; }
    const reader = new FileReader();
    reader.onload = () => setPendingImage({ url: reader.result as string, mediaType: file.type });
    reader.readAsDataURL(file);
  }

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Reconhecimento de voz não suportado neste navegador."); return; }
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
    const recog = new SR();
    recog.lang = "pt-BR"; recog.continuous = true; recog.interimResults = true;
    let finalText = "";
    recog.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interim += t;
      }
      setInput((finalText + " " + interim).trim());
    };
    recog.onerror = () => setRecording(false);
    recog.onend = () => setRecording(false);
    recognitionRef.current = recog;
    recog.start();
    setRecording(true);
  }

  function speak(id: string, text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) { toast.error("Síntese de voz não suportada."); return; }
    if (speakingId === id) { window.speechSynthesis.cancel(); setSpeakingId(null); return; }
    window.speechSynthesis.cancel();
    const cleaned = text.replace(/[#*`>_~]/g, "").replace(/\$+/g, "");
    const utt = new SpeechSynthesisUtterance(cleaned);
    utt.lang = "pt-BR"; utt.rate = 1.0;
    utt.onend = () => setSpeakingId(null);
    utt.onerror = () => setSpeakingId(null);
    window.speechSynthesis.speak(utt);
    setSpeakingId(id);
  }

  async function submit() {
    const text = input.trim();
    if (!text && !pendingImage) return;
    if (isBusy) return;
    setInput("");
    const img = pendingImage;
    setPendingImage(null);
    const parts: any[] = [];
    if (text) parts.push({ type: "text", text });
    if (img) parts.push({ type: "file", url: img.url, mediaType: img.mediaType });
    await sendMessage({ role: "user", parts });
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
          const files = (m.parts ?? []).filter((p: any) => p.type === "file") as Array<{ url: string; mediaType: string }>;
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
              <div className={`h-8 w-8 shrink-0 rounded-full grid place-items-center ${
                isUser ? "bg-primary text-primary-foreground" : "bg-sky-soft text-primary"
              }`}>
                {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`max-w-[85%] space-y-2 ${
                isUser
                  ? "rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap"
                  : "text-sm text-foreground prose prose-sm max-w-none prose-p:my-2 prose-pre:bg-muted prose-pre:text-foreground prose-code:text-foreground"
              }`}>
                {files.map((f, i) => f.mediaType?.startsWith("image/") ? (
                  <img key={i} src={f.url} alt="anexo" className="rounded-lg max-h-64 border border-border/40" />
                ) : null)}
                {isUser ? text : <MessageResponse>{text || "…"}</MessageResponse>}
                {!isUser && text && (
                  <button
                    type="button"
                    onClick={() => speak(m.id, text)}
                    className="not-prose inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-1"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    {speakingId === m.id ? "Parar" : "Ouvir"}
                  </button>
                )}
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
        className="border-t border-border/60 p-3 sm:p-4 bg-background/60 space-y-2"
      >
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0 mr-1">
            Nível
          </span>
          {LEVELS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLevel(l.key)}
              className={`shrink-0 text-xs px-2.5 h-7 rounded-full border transition ${
                level === l.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border/60 hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        
        {pendingImage && (
          <div className="relative inline-block">
            <img src={pendingImage.url} alt="prévia" className="h-20 rounded-lg border border-border/60" />
            <button
              type="button"
              onClick={() => setPendingImage(null)}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border border-border grid place-items-center"
              aria-label="Remover imagem"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-card px-2 py-2 focus-within:ring-2 focus-within:ring-primary/30">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImagePick}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-9 w-9 shrink-0 rounded-xl grid place-items-center text-muted-foreground hover:text-primary hover:bg-muted"
            aria-label="Foto do exercício"
            title="Foto do exercício"
          >
            <Camera className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleMic}
            className={`h-9 w-9 shrink-0 rounded-xl grid place-items-center hover:bg-muted ${
              recording ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-primary"
            }`}
            aria-label={recording ? "Parar gravação" : "Falar"}
            title={recording ? "Parar gravação" : "Falar"}
          >
            {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
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
            placeholder={pendingImage ? "Descreve o que perguntar sobre a imagem…" : "Pergunta pra Study… (Shift+Enter pra quebrar linha)"}
            className="flex-1 resize-none bg-transparent outline-none text-sm py-1.5 max-h-32 placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={isBusy || (!input.trim() && !pendingImage)}
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
