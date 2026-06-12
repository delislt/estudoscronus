import { createFileRoute } from "@tanstack/react-router";

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/api/public/hooks/generate-daily-plans")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-cron-secret");
        if (!provided) return new Response("Unauthorized", { status: 401 });

        const lovableKey = process.env.LOVABLE_API_KEY;
        if (!lovableKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Verify the cron shared secret stored in the private app_config table.
        // The publishable/anon key is shipped to the browser and must NOT
        // be used to guard server-side admin endpoints.
        const { data: secretRow } = await supabaseAdmin
          .from("app_config")
          .select("value")
          .eq("key", "cron_secret")
          .maybeSingle();
        const expected = (secretRow as any)?.value as string | undefined;
        if (!expected || provided.length !== expected.length || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
        const { generateText } = await import("ai");



        // Find users who have onboarding done
        const { data: users } = await supabaseAdmin
          .from("onboarding")
          .select("user_id, objective, exam_date, hours_per_day, learning_style");

        if (!users) return Response.json({ ok: true, users: 0 });

        const today = new Date();
        today.setUTCHours(12, 0, 0, 0);
        const horizon = 7;
        const gateway = createLovableAiGatewayProvider(lovableKey);
        const model = gateway("google/gemini-3-flash-preview");

        let totalCreated = 0;
        let totalUsers = 0;

        for (const u of users) {
          totalUsers++;
          try {
            const { data: subjects } = await supabaseAdmin
              .from("subjects")
              .select("id, name, difficulty")
              .eq("user_id", u.user_id)
              .order("difficulty", { ascending: false });
            if (!subjects || subjects.length === 0) continue;

            for (let i = 0; i < horizon; i++) {
              const d = new Date(today.getTime() + i * 86400000);
              const date = toISODate(d);

              const { data: existing } = await supabaseAdmin
                .from("schedule_tasks")
                .select("id")
                .eq("user_id", u.user_id)
                .eq("scheduled_date", date)
                .eq("source", "ai")
                .limit(1);
              if (existing && existing.length > 0) continue;

              const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
              const totalMin = Math.max(30, Math.round(Number(u.hours_per_day ?? 1) * 60));
              const subjectList = subjects.map((s: any) => `- ${s.name} (dificuldade ${s.difficulty}/5)`).join("\n");

              const prompt = `Você é uma tutora brasileira. Monte o plano de estudos de ${date} (${weekday}).
Perfil: objetivo=${u.objective ?? "estudos"}, prova=${u.exam_date ?? "—"}, horas/dia=${u.hours_per_day ?? 1}, estilo=${u.learning_style ?? "misto"}.
Matérias:
${subjectList}
Regras: 2–5 blocos somando ~${totalMin} min; tópicos específicos; alterne matérias; inclua 1 bloco de revisão quando fizer sentido. duration_min entre 20 e 90, múltiplo de 5.
Responda APENAS JSON: {"blocks":[{"title":"...","subject":"...","topic":"...","duration_min":45,"is_review":false,"reason":"..."}]}`;

              try {
                const { text } = await generateText({ model, prompt });
                const cleaned = text.replace(/^```json\s*/im, "").replace(/^```\s*/im, "").replace(/```\s*$/im, "").trim();
                const start = cleaned.indexOf("{");
                const end = cleaned.lastIndexOf("}");
                const parsed = JSON.parse(cleaned.slice(start, end + 1));

                const subjMap = new Map<string, string>();
                for (const s of subjects) subjMap.set(String(s.name).toLowerCase().trim(), s.id);

                const rows = (parsed.blocks ?? []).map((b: any) => ({
                  user_id: u.user_id,
                  subject_id: subjMap.get(String(b.subject ?? "").toLowerCase().trim()) ?? null,
                  title: String(b.title ?? "Estudo"),
                  topic: b.topic ?? null,
                  scheduled_date: date,
                  duration_min: Math.min(180, Math.max(10, Number(b.duration_min ?? 30))),
                  is_review: !!b.is_review,
                  source: "ai",
                  ai_reason: b.reason ?? null,
                }));

                if (rows.length > 0) {
                  const { error } = await supabaseAdmin.from("schedule_tasks").insert(rows);
                  if (!error) totalCreated += rows.length;
                }
              } catch (err) {
                console.error("[cron] plan failed", u.user_id, date, err);
              }
            }
          } catch (err) {
            console.error("[cron] user failed", u.user_id, err);
          }
        }

        return Response.json({ ok: true, users: totalUsers, created: totalCreated });
      },
    },
  },
});
