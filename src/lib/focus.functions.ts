import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { levelFromXp } from "@/lib/scheduling";

export const recordFocusSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        duration_min: z.number().min(1).max(240),
        subject_id: z.string().uuid().optional().nullable(),
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const [{ error: sErr }, { data: xp }] = await Promise.all([
      context.supabase.from("study_sessions").insert({
        user_id: context.userId,
        subject_id: data.subject_id ?? null,
        duration_min: data.duration_min,
      }),
      context.supabase
        .from("user_xp")
        .select("xp, coins, streak_days, last_study_date")
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);
    if (sErr) throw new Error(sErr.message);

    // XP gain = 1 per minute, capped 120
    const xpGain = Math.min(120, data.duration_min);
    const coinsGain = Math.floor(data.duration_min / 10);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (xp) {
      let streak = xp.streak_days ?? 0;
      if (xp.last_study_date !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yIso = yesterday.toISOString().slice(0, 10);
        streak = xp.last_study_date === yIso ? streak + 1 : 1;
      }
      const newXp = (xp.xp ?? 0) + xpGain;
      const { level } = levelFromXp(newXp);
      await supabaseAdmin
        .from("user_xp")
        .update({
          xp: newXp,
          level,
          coins: (xp.coins ?? 0) + coinsGain,
          streak_days: streak,
          last_study_date: today,
        })
        .eq("user_id", context.userId);
    } else {
      const { level } = levelFromXp(xpGain);
      await supabaseAdmin.from("user_xp").insert({
        user_id: context.userId,
        xp: xpGain,
        level,
        coins: coinsGain,
        streak_days: 1,
        last_study_date: today,
      });
    }

    return { ok: true, xpGain, coinsGain };
  });
