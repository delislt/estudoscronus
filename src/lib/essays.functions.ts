import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const EssayInput = z.object({
  prompt: z.string().min(10),
  body: z.string().min(50),
});

const ResultSchema = z.object({
  c1: z.number().min(0).max(200),
  c2: z.number().min(0).max(200),
  c3: z.number().min(0).max(200),
  c4: z.number().min(0).max(200),
  c5: z.number().min(0).max(200),
  total: z.number().min(0).max(1000),
  feedback: z.object({
    c1: z.string(),
    c2: z.string(),
    c3: z.string(),
    c4: z.string(),
    c5: z.string(),
  }),
  suggestions: z.array(z.string()),
  improved_version: z.string(),
});

const SYSTEM = `Você é um corretor experiente de redações ENEM.
Avalie a redação seguindo as 5 competências oficiais (0, 40, 80, 120, 160 ou 200 pontos cada):
- C1: domínio da norma culta
- C2: compreensão da proposta e desenvolvimento do tema
- C3: organização e seleção de argumentos
- C4: mecanismos linguísticos para argumentação
- C5: proposta de intervenção respeitando direitos humanos

Para cada competência, dê nota e justificativa curta. Retorne sugestões objetivas e uma versão melhorada (mantendo a tese do aluno).`;

export const submitEssay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EssayInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const { data: row, error: insErr } = await supabase
      .from("essays")
      .insert({
        user_id: userId,
        prompt: data.prompt,
        body: data.body,
        status: "grading",
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    try {
      const gateway = createLovableAiGatewayProvider(key);
      const { output } = await generateText({
        model: gateway("google/gemini-3-pro-preview"),
        output: Output.object({ schema: ResultSchema }),
        system: SYSTEM,
        prompt: `Tema: ${data.prompt}\n\nRedação:\n${data.body}`,
      });

      const total = output.c1 + output.c2 + output.c3 + output.c4 + output.c5;

      await supabase
        .from("essays")
        .update({
          status: "done",
          c1: output.c1,
          c2: output.c2,
          c3: output.c3,
          c4: output.c4,
          c5: output.c5,
          total,
          feedback: {
            per_competency: output.feedback,
            suggestions: output.suggestions,
            improved_version: output.improved_version,
          },
          model: "google/gemini-3-pro-preview",
        })
        .eq("id", row.id);

      // XP/coins pela submissão
      const { data: xp } = await supabase.from("user_xp").select("xp, coins").eq("user_id", userId).single();
      if (xp) {
        await supabase
          .from("user_xp")
          .update({ xp: (xp.xp ?? 0) + 40, coins: (xp.coins ?? 0) + 8 })
          .eq("user_id", userId);
      }

      return { id: row.id, ...output, total };
    } catch (err) {
      await supabase.from("essays").update({ status: "error" }).eq("id", row.id);
      throw err;
    }
  });

export const listEssays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("essays")
      .select("id, prompt, status, total, c1, c2, c3, c4, c5, created_at, feedback")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  });
