import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

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

const PlanSchema = z.object({
  blocks: z.array(
    z.object({
      title: z.string(),
      subject: z.string(),
      topic: z.string().optional().default(""),
      duration_min: z.number().int().min(10).max(180),
      is_review: z.boolean().optional().default(false),
      reason: z.string().optional().default(""),
    }),
  ),
});

type SupabaseLike = {
  from: (table: string) => any;
};

async function planForDate(
  supabase: SupabaseLike,
  userId: string,
  date: string,
  apiKey: string,
): Promise<number> {
  // Skip if already has AI-generated tasks for that date
  const { data: existing } = await supabase
    .from("schedule_tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("scheduled_date", date)
    .eq("source", "ai")
    .limit(1);
  if (existing && existing.length > 0) return 0;

  const [{ data: onb }, { data: subjects }, { data: recent }] = await Promise.all([
    supabase
      .from("onboarding")
      .select("objective, exam_date, hours_per_day, learning_style")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("subjects")
      .select("id, name, difficulty")
      .eq("user_id", userId)
      .order("difficulty", { ascending: false }),
    supabase
      .from("study_sessions")
      .select("subject_id, duration_min, started_at")
      .eq("user_id", userId)
      .gte("started_at", new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);

  if (!onb) return 0; // no onboarding → don't plan

  const subjectList = (subjects ?? []).map(
    (s: any) => `- ${s.name} (dificuldade ${s.difficulty}/5)`,
  );
  if (subjectList.length === 0) return 0;

  const recentBySubject: Record<string, number> = {};
  for (const s of recent ?? []) {
    if (!s.subject_id) continue;
    recentBySubject[s.subject_id] = (recentBySubject[s.subject_id] ?? 0) + (s.duration_min ?? 0);
  }
  const recentSummary = (subjects ?? [])
    .map((s: any) => `- ${s.name}: ${recentBySubject[s.id] ?? 0} min nos últimos 7 dias`)
    .join("\n");

  const weekday = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" });
  const hoursPerDay = onb?.hours_per_day ?? 1;
  const totalMin = Math.max(30, Math.round(Number(hoursPerDay) * 60));

  const prompt = `Você é uma tutora brasileira montando o plano de estudos do dia ${date} (${weekday}) para um aluno.

Perfil:
- Objetivo: ${onb?.objective ?? "estudos gerais"}
- Data da prova: ${onb?.exam_date ?? "não definida"}
- Horas por dia: ${hoursPerDay}
- Estilo: ${onb?.learning_style ?? "misto"}

Matérias (priorize as de maior dificuldade):
${subjectList.join("\n")}

Tempo gasto nos últimos 7 dias (priorize matérias menos estudadas):
${recentSummary}

Regras:
1. Monte entre 2 e 5 blocos somando ~${totalMin} minutos no total.
2. Cada bloco tem matéria + tópico específico (não genérico). Ex: "Função quadrática — vértice e raízes".
3. Alterne matérias; inclua pelo menos 1 bloco de revisão se houver matéria já estudada.
4. duration_min é múltiplo de 5 entre 20 e 90.
5. Responda APENAS JSON, sem markdown:
{"blocks":[{"title":"...","subject":"...","topic":"...","duration_min":45,"is_review":false,"reason":"..."}]}`;

  const gateway = createLovableAiGatewayProvider(apiKey);
  const model = gateway("google/gemini-3-flash-preview");
  const { text } = await generateText({ model, prompt });
  const parsed = PlanSchema.parse(extractJSON(text));

  // Map subject names -> ids
  const subjMap = new Map<string, string>();
  for (const s of subjects ?? []) {
    subjMap.set(String(s.name).toLowerCase().trim(), s.id);
  }

  const rows = parsed.blocks.map((b) => ({
    user_id: userId,
    subject_id: subjMap.get(b.subject.toLowerCase().trim()) ?? null,
    title: b.title,
    topic: b.topic ?? null,
    scheduled_date: date,
    duration_min: b.duration_min,
    is_review: !!b.is_review,
    source: "ai",
    ai_reason: b.reason ?? null,
  }));

  const { error } = await supabase.from("schedule_tasks").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const generateDailyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ date: z.string(), force: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    if (data.force) {
      await supabase
        .from("schedule_tasks")
        .delete()
        .eq("user_id", userId)
        .eq("scheduled_date", data.date)
        .eq("source", "ai");
    }

    const count = await planForDate(supabase, userId, data.date, apiKey);
    return { count };
  });

export const ensureUpcomingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ days: z.number().int().min(1).max(14).default(7) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    let created = 0;
    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);
    for (let i = 0; i < data.days; i++) {
      const d = new Date(today.getTime() + i * 86400000);
      created += await planForDate(supabase, userId, toISODate(d), apiKey);
    }
    return { created };
  });
