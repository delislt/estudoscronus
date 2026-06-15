import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listShop = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [items, inv, xp] = await Promise.all([
      context.supabase
        .from("shop_items")
        .select("id, slug, name, description, kind, price, metadata")
        .eq("active", true)
        .order("price"),
      context.supabase
        .from("user_inventory")
        .select("item_id, equipped"),
      context.supabase
        .from("user_xp")
        .select("coins, xp, level")
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);
    if (items.error) throw new Error(items.error.message);
    const owned = new Map((inv.data ?? []).map((r) => [r.item_id, r.equipped]));
    return {
      coins: xp.data?.coins ?? 0,
      xp: xp.data?.xp ?? 0,
      level: xp.data?.level ?? 1,
      items: (items.data ?? []).map((it) => ({
        ...it,
        owned: owned.has(it.id),
        equipped: owned.get(it.id) ?? false,
      })),
    };
  });

export const buyItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ item_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: item, error: ie } = await context.supabase
      .from("shop_items")
      .select("id, price, kind")
      .eq("id", data.item_id)
      .single();
    if (ie || !item) throw new Error("Item não encontrado");

    const { data: xp } = await context.supabase
      .from("user_xp")
      .select("coins")
      .eq("user_id", context.userId)
      .maybeSingle();
    const coins = xp?.coins ?? 0;
    if (coins < item.price) throw new Error("Moedas insuficientes");

    const { data: already } = await context.supabase
      .from("user_inventory")
      .select("id")
      .eq("user_id", context.userId)
      .eq("item_id", item.id)
      .maybeSingle();
    if (already) throw new Error("Você já possui este item");

    const { error: ue } = await context.supabase
      .from("user_xp")
      .update({ coins: coins - item.price })
      .eq("user_id", context.userId);
    if (ue) throw new Error(ue.message);

    const { error: ine } = await context.supabase
      .from("user_inventory")
      .insert({ user_id: context.userId, item_id: item.id });
    if (ine) throw new Error(ine.message);

    return { ok: true, coins: coins - item.price };
  });

export const equipItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ item_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("user_inventory")
      .select("id, item_id, equipped, shop_items!inner(kind)")
      .eq("user_id", context.userId)
      .eq("item_id", data.item_id)
      .maybeSingle();
    if (!row) throw new Error("Item não está no inventário");
    const kind = (row as any).shop_items.kind as string;
    // Unequip others of same kind
    const { data: sameKind } = await context.supabase
      .from("user_inventory")
      .select("id, shop_items!inner(kind)")
      .eq("user_id", context.userId);
    const ids = (sameKind ?? [])
      .filter((r) => (r as any).shop_items.kind === kind)
      .map((r) => r.id);
    if (ids.length)
      await context.supabase
        .from("user_inventory")
        .update({ equipped: false })
        .in("id", ids);
    await context.supabase
      .from("user_inventory")
      .update({ equipped: true })
      .eq("id", row.id);
    return { ok: true };
  });
