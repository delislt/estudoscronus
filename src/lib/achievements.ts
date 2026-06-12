import { supabase } from "@/integrations/supabase/client";

export type AchievementRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  threshold: number;
  kind: "sessions" | "streak" | "minutes" | "level" | string;
};

export type UserStats = {
  totalSessions: number;
  totalMinutes: number;
  streakDays: number;
  level: number;
};

export async function fetchUserStats(userId: string): Promise<UserStats> {
  const [{ data: xp }, { count: sessionCount }, { data: sessions }] = await Promise.all([
    supabase.from("user_xp").select("level, streak_days").eq("user_id", userId).single(),
    supabase.from("study_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("study_sessions").select("duration_min").eq("user_id", userId),
  ]);
  const totalMinutes = (sessions ?? []).reduce((s, r) => s + (r.duration_min ?? 0), 0);
  return {
    totalSessions: sessionCount ?? 0,
    totalMinutes,
    streakDays: xp?.streak_days ?? 0,
    level: xp?.level ?? 1,
  };
}

function reached(a: AchievementRow, s: UserStats) {
  switch (a.kind) {
    case "sessions": return s.totalSessions >= a.threshold;
    case "minutes":  return s.totalMinutes >= a.threshold;
    case "streak":   return s.streakDays >= a.threshold;
    case "level":    return s.level >= a.threshold;
    default: return false;
  }
}

/** Returns newly unlocked achievements for toast feedback. */
export async function checkAndAwardAchievements(userId: string): Promise<AchievementRow[]> {
  const [{ data: all }, { data: owned }] = await Promise.all([
    supabase.from("achievements").select("*"),
    supabase.from("user_achievements").select("achievement_id").eq("user_id", userId),
  ]);
  const list = (all ?? []) as AchievementRow[];
  const ownedIds = new Set((owned ?? []).map((r) => r.achievement_id));
  const stats = await fetchUserStats(userId);

  const newly: AchievementRow[] = [];
  for (const a of list) {
    if (ownedIds.has(a.id)) continue;
    if (reached(a, stats)) newly.push(a);
  }
  if (newly.length) {
    await supabase
      .from("user_achievements")
      .insert(newly.map((a) => ({ user_id: userId, achievement_id: a.id })));
  }
  return newly;
}
