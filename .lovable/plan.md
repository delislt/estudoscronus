## 1. Links do YouTube que não abrem

Hoje o card aponta para `youtube.com/results?search_query=...` — uma página de busca, não um vídeo. Além disso, dentro do preview em iframe, `target="_blank"` às vezes é bloqueado.

**Solução:**
- Criar `resolveYoutubeVideo` (server function) que, recebendo `search_query + channel_hint`, faz fetch em `https://www.youtube.com/results?...`, extrai o primeiro `videoId` via regex e devolve `{ videoId, title }`. Sem precisar de YouTube API key.
- Adicionar coluna `video_id` em `video_recommendations` (migration).
- Ao gerar recomendações, resolver os IDs em paralelo e salvar.
- No card: trocar o `<a>` por um botão que faz `window.open('https://youtu.be/<id>', '_blank', 'noopener')` — funciona dentro do iframe do preview. Mostrar também a thumbnail (`https://i.ytimg.com/vi/<id>/hqdefault.jpg`).
- Para recomendações antigas sem `video_id`, resolver on-demand no clique.

## 2. Calendário de estudos diário com IA

Já existe a tabela `schedule_tasks`. Falta a página, a geração diária por IA e o "nunca acaba".

**Backend**
- Server function `generateDailyPlan({ date })`:
  - Lê `onboarding` (objetivo, horas/dia, estilo), `subjects` (com dificuldade), `goals` ativas, últimos 7 dias de `study_sessions` (matérias menos vistas → prioridade).
  - Chama Gemini 3 Flash via gateway pedindo 2–5 blocos para o dia (matéria, tópico, duração em min, descrição curta, justificativa). JSON via `generateText` + `extractJSON` (mesmo padrão do `video-recs.functions.ts` que funcionou).
  - Insere em `schedule_tasks` com `scheduled_date = date`, sem duplicar (se o dia já tem tarefas geradas pela IA, pula).
- Server function `ensureUpcomingPlan({ days = 7 })`: chamada pelo cliente quando entra na página — gera o que faltar dos próximos N dias.
- Server route pública `POST /api/public/hooks/generate-daily-plans`:
  - Roda diariamente via `pg_cron + pg_net`, autenticada com `apikey` (anon).
  - Para cada usuário ativo (com onboarding feito), gera plano para `hoje + 7` se faltar. Assim a esteira nunca acaba.
- Migration: adicionar `source text default 'ai'` e `ai_reason text` em `schedule_tasks` para distinguir blocos gerados por IA e mostrar o "por quê". Garantir GRANT/RLS já existentes.

**Frontend — `/calendario`**
- Header padrão `AppHeader`.
- Visão semanal (7 colunas) + seletor para mês. Card por dia mostra blocos: matéria, tópico, duração, status (check / pular).
- Ações: marcar concluído (escreve em `study_sessions` e dispara achievement check), pular, regenerar dia (chama `generateDailyPlan` forçando refresh do dia).
- Ao montar: chama `ensureUpcomingPlan({ days: 7 })` para garantir que o usuário sempre vê a semana à frente.
- Estado vazio: CTA "Gerar minha semana com IA".
- Link no `AppHeader` para `/calendario`.

## Arquivos

- `supabase/migrations/<ts>_calendar_videoid.sql` — adiciona `video_id` em `video_recommendations`, `source` e `ai_reason` em `schedule_tasks`.
- `src/lib/youtube.functions.ts` — `resolveYoutubeVideo`.
- `src/lib/calendar.functions.ts` — `generateDailyPlan`, `ensureUpcomingPlan`, `regenerateDay`.
- `src/lib/video-recs.functions.ts` — resolve `video_id` ao gerar.
- `src/routes/_authenticated/videoaulas.tsx` — usa `video_id`, `window.open`, thumbnail.
- `src/routes/_authenticated/calendario.tsx` — nova página.
- `src/routes/api/public/hooks/generate-daily-plans.ts` — endpoint cron.
- `src/components/AppHeader.tsx` — adiciona "Calendário".
- SQL `cron.schedule` (via insert tool, não migration) para rodar diariamente às 03:00.

## Pontos de atenção

- O scrape do YouTube depende do HTML público; se mudar o regex, links voltam ao fallback de busca. Logamos o falhado e seguimos.
- A geração de plano pode custar créditos da Lovable AI; o cron está limitado a usuários com onboarding completo e a só completar o que falta.
- `schedule_tasks` já tem RLS por `user_id`; o endpoint cron usa `supabaseAdmin` e itera por usuário explicitamente.
