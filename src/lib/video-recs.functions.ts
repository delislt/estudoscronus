import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { resolveManyYoutubeVideos } from "./youtube.functions";

function extractJSON(raw: string): unknown {
  let cleaned = raw
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/```\s*$/im, "")
    .trim();
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const objStart = cleaned.indexOf("{");
    const arrStart = cleaned.indexOf("[");
    const isArray = arrStart !== -1 && (objStart === -1 || arrStart < objStart);
    const start = isArray ? arrStart : objStart;
    const end = isArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("Resposta da IA sem JSON");
    cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned);
}

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

CANAIS PERMITIDOS (use SOMENTE estes canais, escolhendo o canal pela matéria):
- Matemática: "Professor Ferretto", "Matemática Rio com Prof. Rafael Procopio", "Sandro Curió"
- Física: "Física Total", "Professor Boaro"
- Química: "Marcelão da Química", "Café com Química", "Monstrão da Química"
- Biologia: "Biologia Total com Prof. Jubilut", "Guilherme Goulart", "Samuel Cunha"
- História: "Parabólica", "Débora Aladim"
- Geografia: "Parabólica", "Débora Aladim"
- Filosofia: "Parabólica", "Débora Aladim"
- Sociologia: "Parabólica", "Débora Aladim"
- Português: "Professor Noslen", "Luma e Ponto", "Profinho"
- Literatura: "Professor Noslen", "Luma e Ponto", "Profinho"
- Redação: "Professor Noslen", "Luma e Ponto", "Profinho"

Regras importantes:
1. \`channel_hint\` deve ser EXATAMENTE um dos canais listados acima para a matéria. NÃO invente, NÃO use canais fora dessa lista (nada de Khan Academy, Me Salva!, Descomplica, Stoodi, etc.).
2. NUNCA recomende canais em inglês.
3. Cada \`search_query\` precisa ser específica (matéria + tópico exato + nome do canal). Ex: "função quadrática vértice bhaskara Professor Ferretto" — não apenas "matemática".
4. Distribua entre as matérias do aluno, dando mais peso para as de maior dificuldade. Varie os canais permitidos dentro de cada matéria.
5. Misture introdução, aprofundamento e revisão.
6. Para cada item, preencha TODOS os campos: title, subject, level ("fundamental" | "medio" | "superior"), description, reason, search_query, channel_hint, duration_hint (ex: "10-15 min").
7. Responda APENAS com JSON válido, sem markdown, no formato: {"recommendations": [ { "title": "...", "subject": "...", "level": "medio", "description": "...", "reason": "...", "search_query": "...", "channel_hint": "...", "duration_hint": "..." } ] }`;


    const { text } = await generateText({ model, prompt });
    const parsed = extractJSON(text);
    const object = RecommendationSchema.parse(parsed);

    // Replace existing recommendations
    await supabase.from("video_recommendations").delete().eq("user_id", userId);

    // Resolve actual YouTube videoIds in parallel
    const resolved = await resolveManyYoutubeVideos(
      object.recommendations.map((r) => ({ query: r.search_query, channel: r.channel_hint })),
    );

    const rows = object.recommendations.map((r, i) => ({
      user_id: userId,
      title: r.title,
      subject: r.subject,
      level: r.level,
      description: r.description,
      reason: r.reason,
      search_query: r.search_query,
      channel_hint: r.channel_hint,
      duration_hint: r.duration_hint,
      video_id: resolved[i]?.videoId ?? null,
      resolved_title: resolved[i]?.title ?? null,
    }));

    const { error } = await supabase.from("video_recommendations").insert(rows);
    if (error) throw new Error(error.message);

    return { count: rows.length };
  });
