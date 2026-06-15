import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const searchUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ q: z.string().min(2).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .ilike("full_name", `%${data.q}%`)
      .neq("id", context.userId)
      .limit(20);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listFriends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const { data: rows, error } = await context.supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status, created_at")
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const otherIds = Array.from(
      new Set(
        (rows ?? []).map((r) => (r.requester_id === uid ? r.addressee_id : r.requester_id)),
      ),
    );
    let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
    let xpMap: Record<string, { xp: number; level: number; streak_days: number }> = {};
    if (otherIds.length) {
      const [{ data: profs }, { data: xps }] = await Promise.all([
        context.supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", otherIds),
        context.supabase
          .from("user_xp")
          .select("user_id, xp, level, streak_days")
          .in("user_id", otherIds),
      ]);
      profilesMap = Object.fromEntries(
        (profs ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]),
      );
      xpMap = Object.fromEntries(
        (xps ?? []).map((x) => [x.user_id, { xp: x.xp, level: x.level, streak_days: x.streak_days }]),
      );
    }

    const accepted: any[] = [];
    const incoming: any[] = [];
    const outgoing: any[] = [];
    for (const r of rows ?? []) {
      const otherId = r.requester_id === uid ? r.addressee_id : r.requester_id;
      const obj = {
        id: r.id,
        other_id: otherId,
        full_name: profilesMap[otherId]?.full_name ?? "Usuário",
        avatar_url: profilesMap[otherId]?.avatar_url ?? null,
        xp: xpMap[otherId]?.xp ?? 0,
        level: xpMap[otherId]?.level ?? 1,
        streak_days: xpMap[otherId]?.streak_days ?? 0,
        status: r.status,
      };
      if (r.status === "accepted") accepted.push(obj);
      else if (r.status === "pending" && r.addressee_id === uid) incoming.push(obj);
      else if (r.status === "pending" && r.requester_id === uid) outgoing.push(obj);
    }
    return { accepted, incoming, outgoing };
  });

export const sendFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ addressee_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.addressee_id === context.userId) throw new Error("Você não pode se adicionar");
    const { data: existing } = await context.supabase
      .from("friendships")
      .select("id, status")
      .or(
        `and(requester_id.eq.${context.userId},addressee_id.eq.${data.addressee_id}),and(requester_id.eq.${data.addressee_id},addressee_id.eq.${context.userId})`,
      )
      .maybeSingle();
    if (existing) throw new Error("Pedido já existe");
    const { error } = await context.supabase.from("friendships").insert({
      requester_id: context.userId,
      addressee_id: data.addressee_id,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const respondFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), accept: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.accept) {
      const { error } = await context.supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", data.id)
        .eq("addressee_id", context.userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("friendships")
        .delete()
        .eq("id", data.id)
        .eq("addressee_id", context.userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const removeFriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const uid = context.userId;
    const { error } = await context.supabase
      .from("friendships")
      .delete()
      .eq("id", data.id)
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
