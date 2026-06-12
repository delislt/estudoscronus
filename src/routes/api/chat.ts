import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `Você é a Study, uma tutora de estudos amigável, didática e calorosa, focada em estudantes do ensino médio e vestibulares brasileiros.

Regras de estilo:
- Sempre responda em português do Brasil, com tom acolhedor e jovem (sem ser infantil).
- Explique passo a passo, com analogias do cotidiano quando ajudar.
- Use markdown: títulos curtos, listas, **negrito** em conceitos-chave, blocos de código quando fizer sentido. Para matemática, use LaTeX entre $...$ ou $$...$$.
- Quando o aluno pedir "explica isso", quebre em partes pequenas e termine com uma pergunta pra checar o entendimento.
- Quando pedir "gera exercícios", crie 3 a 5 questões com gabarito comentado ao final.
- Quando pedir "resume", entregue um resumo enxuto com bullet points e uma frase final de revisão.
- Se a pergunta não for de estudo, redirecione gentilmente.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return new Response("Unauthorized", { status: 401 });
          }
          const token = authHeader.slice("Bearer ".length);

          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
            return new Response("Missing Supabase env", { status: 500 });
          }
          if (!LOVABLE_API_KEY) {
            return new Response("Missing LOVABLE_API_KEY", { status: 500 });
          }

          const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
          if (claimsError || !claimsData?.claims?.sub) {
            return new Response("Unauthorized", { status: 401 });
          }
          const userId = claimsData.claims.sub;

          const body = (await request.json()) as {
            messages?: UIMessage[];
            threadId?: string;
          };
          const messages = body.messages;
          const threadId = body.threadId;
          if (!Array.isArray(messages) || !threadId) {
            return new Response("messages and threadId required", { status: 400 });
          }

          // Verify thread belongs to user
          const { data: thread, error: tErr } = await supabase
            .from("chat_threads")
            .select("id, title")
            .eq("id", threadId)
            .eq("user_id", userId)
            .maybeSingle();
          if (tErr || !thread) {
            return new Response("Thread not found", { status: 404 });
          }

          // Persist last user message (the most recent one from messages)
          const lastUser = [...messages].reverse().find((m) => m.role === "user");
          if (lastUser) {
            const { data: existing } = await supabase
              .from("chat_messages")
              .select("id")
              .eq("thread_id", threadId)
              .eq("role", "user")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            const lastText = (lastUser.parts ?? [])
              .filter((p) => p.type === "text")
              .map((p) => (p as { text: string }).text)
              .join("");
            const existingText = existing
              ? await supabase
                  .from("chat_messages")
                  .select("parts")
                  .eq("id", existing.id)
                  .single()
                  .then((r) =>
                    ((r.data?.parts as unknown as { type: string; text?: string }[]) ?? [])
                      .filter((p) => p.type === "text")
                      .map((p) => p.text ?? "")
                      .join(""),
                  )
              : "";
            if (lastText && lastText !== existingText) {
              await supabase.from("chat_messages").insert({
                thread_id: threadId,
                user_id: userId,
                role: "user",
                parts: lastUser.parts as never,
              });
            }
          }

          // Auto-title from first user message
          if (thread.title === "Nova conversa" && lastUser) {
            const firstText =
              (lastUser.parts ?? [])
                .filter((p) => p.type === "text")
                .map((p) => (p as { text: string }).text)
                .join("")
                .trim()
                .slice(0, 60) || "Nova conversa";
            await supabase
              .from("chat_threads")
              .update({ title: firstText })
              .eq("id", threadId);
          }

          const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY);
          const model = gateway("google/gemini-3-flash-preview");

          const result = streamText({
            model,
            system: SYSTEM_PROMPT,
            messages: convertToModelMessages(messages),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages,
            onFinish: async ({ messages: finalMessages }) => {
              const assistant = [...finalMessages]
                .reverse()
                .find((m) => m.role === "assistant");
              if (!assistant) return;
              await supabase.from("chat_messages").insert({
                thread_id: threadId,
                user_id: userId,
                role: "assistant",
                parts: assistant.parts as never,
              });
              await supabase
                .from("chat_threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", threadId);
            },
          });
        } catch (err) {
          console.error("[/api/chat] error", err);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});
