import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateObject } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const RecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      title: z.string(),
      subject: z.string(),
      level: z.string(),
      description: z.string(),
      reason: z.string(),
      search_query: z.string(),
      channel_hint: z.string(),
      duration_hint: z.string(),
    }),
  ),
});

export const generateVideoRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: onb }, { data: subjects }] = await Promise.all([
      supabase
        .from("onboarding")
        .select("objective, exam_date, hours_per_day, learning_style")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("subjects")
        .select("name, difficulty")
        .eq("user_id", userId)
        .order("difficulty", { ascending: false }),
    ]);

    const subjectList = (subjects ?? [])
      .map((s) => `- ${s.name} (dificuldade ${s.difficulty}/5)`)
      .join("\n") || "- (sem matérias cadastradas — sugira matérias gerais do ensino médio)";

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const prompt = `Você é uma tutora de estudos brasileira. Recomende entre 8 e 12 videoaulas REAIS do YouTube **em português brasileiro** para este estudante.

Perfil do aluno:
- Objetivo: ${onb?.objective ?? "estudar com foco no ensino médio"}
- Data da prova: ${onb?.exam_date ?? "não definida"}
- Horas por dia: ${onb?.hours_per_day ?? 1}
- Estilo de aprendizagem: ${onb?.learning_style ?? "misto"}

Matérias (priorize as de maior dificuldade):
${subjectList}

Regras importantes:
1. Sugira buscas no YouTube em **português brasileiro** que retornem aulas de canais brasileiros conhecidos (Khan Academy Brasil, Curso Enem Gratuito, Professor Ferretto, Stoodi, Equaciona Matemática, Me Salva!, Descomplica, Biologia Total, Quimica em Ação, Débora Aladim, Noslen, Português com Letícia, etc.).
2. NUNCA recomende canais em inglês.
3. Cada \`search_query\` precisa ser específica (matéria + tópico exato), não genérica. Ex: "função quadrática vértice bhaskara aula" — não apenas "matemática".
4. Distribua entre as matérias do aluno, dando mais peso para as de maior dificuldade.
5. Misture introdução, aprofundamento e revisão.
6. Para cada item, preencha TODOS os campos: title, subject, level ("fundamental" | "medio" | "superior"), description, reason, search_query, channel_hint, duration_hint (ex: "10-15 min").`;

    const { object } = await generateObject({
      model,
      schema: RecommendationSchema,
      prompt,
    });

    // Replace existing recommendations
    await supabase.from("video_recommendations").delete().eq("user_id", userId);

    const rows = object.recommendations.map((r) => ({
      user_id: userId,
      title: r.title,
      subject: r.subject,
      level: r.level,
      description: r.description,
      reason: r.reason,
      search_query: r.search_query,
      channel_hint: r.channel_hint,
      duration_hint: r.duration_hint,
    }));

    const { error } = await supabase.from("video_recommendations").insert(rows);
    if (error) throw new Error(error.message);

    return { count: rows.length };
  });
