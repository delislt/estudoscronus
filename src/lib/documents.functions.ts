import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("documents")
      .select("id, title, mime_type, page_count, size_bytes, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().min(1).max(240),
        storage_path: z.string().min(1),
        mime_type: z.string().max(120),
        size_bytes: z.number().int().min(0).max(50_000_000).optional(),
        page_count: z.number().int().min(0).max(2000).optional(),
        extracted_text: z.string().max(2_000_000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("documents")
      .insert({
        user_id: context.userId,
        title: data.title,
        storage_path: data.storage_path,
        mime_type: data.mime_type,
        size_bytes: data.size_bytes ?? null,
        page_count: data.page_count ?? null,
        extracted_text: data.extracted_text ?? null,
        status: "ready",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase
      .from("documents")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (doc?.storage_path) {
      await context.supabase.storage.from("documents").remove([doc.storage_path]);
    }
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: doc, error: dErr }, { data: sums }] = await Promise.all([
      context.supabase
        .from("documents")
        .select("id, title, storage_path, mime_type, page_count, extracted_text, status, created_at")
        .eq("id", data.id)
        .maybeSingle(),
      context.supabase
        .from("summaries")
        .select("id, kind, content, created_at")
        .eq("document_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (dErr) throw new Error(dErr.message);
    if (!doc) throw new Error("Documento não encontrado");

    // Create a signed URL (1h) so the client can render the PDF
    let signedUrl: string | null = null;
    if (doc.storage_path) {
      const { data: signed } = await context.supabase.storage
        .from("documents")
        .createSignedUrl(doc.storage_path, 60 * 60);
      signedUrl = signed?.signedUrl ?? null;
    }

    return { doc, summaries: sums ?? [], signedUrl };
  });

const SUMMARY_KIND = z.enum(["short", "full", "mindmap", "quick_review", "flashcards"]);

const PROMPTS: Record<z.infer<typeof SUMMARY_KIND>, string> = {
  short:
    "Faça um resumo BEM CURTO (máx 200 palavras) em português do Brasil. Use bullets com os pontos essenciais.",
  full:
    "Faça um resumo COMPLETO em português do Brasil, estruturado com títulos `##`, subtópicos, exemplos e conceitos-chave em negrito. Foco em estudar pra prova.",
  mindmap:
    "Crie um MAPA MENTAL em formato markdown nested list (`- tópico\\n  - subtópico`). Comece pelo conceito central, ramifique até 3 níveis. Em português do Brasil.",
  quick_review:
    "Crie uma REVISÃO RÁPIDA em formato de 10 cards de 'pergunta → resposta curta', formato `**P:** ...\\n**R:** ...`. Em português do Brasil.",
  flashcards:
    "Gere 10 flashcards em JSON puro no formato `[{\"front\":\"pergunta\",\"back\":\"resposta\"}]`. SOMENTE o JSON, sem texto adicional. Em português do Brasil.",
};

export const generateSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ document_id: z.string().uuid(), kind: SUMMARY_KIND }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase
      .from("documents")
      .select("id, title, extracted_text")
      .eq("id", data.document_id)
      .maybeSingle();
    if (!doc) throw new Error("Documento não encontrado");
    const text = (doc.extracted_text ?? "").trim();
    if (text.length < 30) throw new Error("Documento sem texto extraído.");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText } = await import("ai");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const { text: out } = await generateText({
      model,
      prompt: `${PROMPTS[data.kind]}\n\nTítulo: ${doc.title}\n\nConteúdo:\n"""\n${text.slice(0, 80000)}\n"""`,
    });

    let content: unknown = { markdown: out };
    if (data.kind === "flashcards") {
      try {
        const m = out.match(/\[[\s\S]*\]/);
        content = { cards: JSON.parse(m ? m[0] : out) };
      } catch {
        content = { markdown: out };
      }
    }

    const { data: row, error } = await context.supabase
      .from("summaries")
      .insert({
        user_id: context.userId,
        document_id: data.document_id,
        kind: data.kind,
        content: content as never,
      })
      .select("id, kind, content, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const askAboutDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        document_id: z.string().uuid(),
        question: z.string().min(1).max(2000),
        page_context: z.string().max(20000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase
      .from("documents")
      .select("title, extracted_text")
      .eq("id", data.document_id)
      .maybeSingle();
    if (!doc) throw new Error("Documento não encontrado");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText } = await import("ai");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const fullText = (doc.extracted_text ?? "").slice(0, 60000);
    const pageBlock = data.page_context
      ? `\n\nTRECHO DA PÁGINA ATUAL (priorize este contexto):\n"""\n${data.page_context.slice(0, 12000)}\n"""`
      : "";

    const { text } = await generateText({
      model,
      system:
        "Você é uma tutora que responde dúvidas SOBRE um documento de estudo. Sempre em português do Brasil. Cite o que estiver no documento; se não estiver, diga claramente. Use markdown, listas e exemplos.",
      prompt: `Documento: ${doc.title}\n\nCONTEÚDO COMPLETO (use como referência):\n"""\n${fullText}\n"""${pageBlock}\n\nPergunta do aluno: ${data.question}`,
    });
    return { answer: text };
  });
