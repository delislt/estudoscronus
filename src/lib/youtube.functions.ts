import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ResolveInput = z.object({
  query: z.string().min(2),
  channel: z.string().optional().nullable(),
});

async function searchYoutube(query: string): Promise<{ videoId: string; title?: string } | null> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=pt&gl=BR`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  if (!res.ok) return null;
  const html = await res.text();

  // ytInitialData JSON blob
  const m = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
  if (!m) return null;
  const videoId = m[1];

  // Try to grab a matching title near the videoId
  const titleMatch = html.match(
    new RegExp(`"videoId":"${videoId}".{0,400}?"title":\\{"runs":\\[\\{"text":"([^"]{3,150})"`),
  );
  const title = titleMatch?.[1];
  return { videoId, title };
}

export const resolveYoutubeVideo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ResolveInput.parse(d))
  .handler(async ({ data }) => {
    const q = data.channel ? `${data.query} ${data.channel}` : data.query;
    try {
      const hit = (await searchYoutube(q)) ?? (await searchYoutube(data.query));
      return hit ?? { videoId: null, title: null };
    } catch (e) {
      console.error("[youtube] resolve failed", e);
      return { videoId: null, title: null };
    }
  });

export async function resolveManyYoutubeVideos(
  items: { query: string; channel?: string | null }[],
): Promise<({ videoId: string | null; title: string | null })[]> {
  return Promise.all(
    items.map(async (it) => {
      try {
        const q = it.channel ? `${it.query} ${it.channel}` : it.query;
        const hit = (await searchYoutube(q)) ?? (await searchYoutube(it.query));
        return { videoId: hit?.videoId ?? null, title: hit?.title ?? null };
      } catch {
        return { videoId: null, title: null };
      }
    }),
  );
}
