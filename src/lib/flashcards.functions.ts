import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { scheduleNext, type Rating } from "@/lib/sm2";

export const listDecks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("decks")
      .select("id, name, description, subject_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Compute counts per deck (due now, total)
    const ids = (data ?? []).map((d) => d.id);
    if (ids.length === 0) return [];
    const nowIso = new Date().toISOString();
    const { data: cards } = await context.supabase
      .from("flashcards")
      .select("deck_id, due_at")
      .in("deck_id", ids);
    const counts: Record<string, { total: number; due: number }> = {};
    for (const c of cards ?? []) {
      const k = c.deck_id as string;
      if (!counts[k]) counts[k] = { total: 0, due: 0 };
      counts[k].total += 1;
      if ((c.due_at as string) <= nowIso) counts[k].due += 1;
    }
    return (data ?? []).map((d) => ({
      ...d,
      total: counts[d.id]?.total ?? 0,
      due: counts[d.id]?.due ?? 0,
    }));
  });

export const createDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().min(1).max(120),
        description: z.string().max(500).optional(),
        subject_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("decks")
      .insert({
        user_id: context.userId,
        name: data.name,
        description: data.description ?? null,
        subject_id: data.subject_id ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("decks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        deck_id: z.string().uuid(),
        front: z.string().min(1).max(2000),
        back: z.string().min(1).max(4000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("flashcards").insert({
      deck_id: data.deck_id,
      user_id: context.userId,
      front: data.front,
      back: data.back,
      source: "manual",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("flashcards").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDeckSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ deck_id: z.string().uuid(), limit: z.number().min(1).max(100).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: deck }, { data: due }] = await Promise.all([
      context.supabase.from("decks").select("id, name").eq("id", data.deck_id).maybeSingle(),
      context.supabase
        .from("flashcards")
        .select("id, front, back, ease, interval_days, reps, lapses, due_at")
        .eq("deck_id", data.deck_id)
        .lte("due_at", new Date().toISOString())
        .order("due_at", { ascending: true })
        .limit(data.limit ?? 30),
    ]);
    if (!deck) throw new Error("Deck not found");
    return { deck, cards: due ?? [] };
  });

export const reviewCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        flashcard_id: z.string().uuid(),
        rating: z.enum(["again", "hard", "good", "easy"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: card, error: e1 } = await context.supabase
      .from("flashcards")
      .select("id, ease, interval_days, reps, lapses")
      .eq("id", data.flashcard_id)
      .maybeSingle();
    if (e1 || !card) throw new Error("Card not found");

    const next = scheduleNext(
      {
        ease: Number(card.ease),
        interval_days: card.interval_days as number,
        reps: card.reps as number,
        lapses: card.lapses as number,
      },
      data.rating as Rating,
    );

    const [{ error: uErr }, { error: rErr }] = await Promise.all([
      context.supabase
        .from("flashcards")
        .update({
          ease: next.ease,
          interval_days: next.interval_days,
          reps: next.reps,
          lapses: next.lapses,
          due_at: next.due_at.toISOString(),
          last_reviewed_at: new Date().toISOString(),
        })
        .eq("id", data.flashcard_id),
      context.supabase.from("flashcard_reviews").insert({
        flashcard_id: data.flashcard_id,
        user_id: context.userId,
        rating: data.rating,
        prev_ease: Number(card.ease),
        new_ease: next.ease,
        prev_interval: card.interval_days as number,
        new_interval: next.interval_days,
      }),
    ]);
    if (uErr) throw new Error(uErr.message);
    if (rErr) throw new Error(rErr.message);

    // Award small XP for a review
    const xpGain = data.rating === "again" ? 1 : 3;
    const { data: xpRow } = await context.supabase
      .from("user_xp")
      .select("xp, coins")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (xpRow) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("user_xp")
        .update({ xp: (xpRow.xp ?? 0) + xpGain, coins: (xpRow.coins ?? 0) + 1 })
        .eq("user_id", context.userId);
    }

    return { ok: true, next_due: next.due_at.toISOString() };
  });

// AI: generate cards from a chunk of text
export const generateCardsFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        deck_id: z.string().uuid(),
        text: z.string().min(20).max(20000),
        count: z.number().min(1).max(30).default(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText } = await import("ai");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const prompt = `A partir do conteúdo abaixo, gere ${data.count} flashcards de estudo de alta qualidade em português do Brasil. Cada flashcard deve testar UM conceito específico. Use perguntas claras e respostas concisas (1-3 frases). Evite repetições.

Devolva APENAS um JSON válido no formato:
[{"front":"pergunta","back":"resposta"}, ...]

Conteúdo:
"""
${data.text.slice(0, 18000)}
"""`;

    const { text } = await generateText({ model, prompt });
    let cards: { front: string; back: string }[] = [];
    try {
      const m = text.match(/\[[\s\S]*\]/);
      cards = JSON.parse(m ? m[0] : text);
    } catch {
      throw new Error("IA não retornou JSON válido");
    }
    cards = cards
      .filter((c) => c && typeof c.front === "string" && typeof c.back === "string")
      .slice(0, data.count);

    if (cards.length === 0) throw new Error("Nenhum cartão gerado");

    const rows = cards.map((c) => ({
      deck_id: data.deck_id,
      user_id: context.userId,
      front: c.front.slice(0, 2000),
      back: c.back.slice(0, 4000),
      source: "ai",
    }));
    const { error } = await context.supabase.from("flashcards").insert(rows);
    if (error) throw new Error(error.message);
    return { created: rows.length };
  });

export const getDueOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const nowIso = new Date().toISOString();
    const { count: dueCount } = await context.supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .lte("due_at", nowIso);
    const { count: totalCount } = await context.supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true });
    return { due: dueCount ?? 0, total: totalCount ?? 0 };
  });
