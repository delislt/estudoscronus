# MVP Study — Plataforma de estudos com IA

Vou construir o MVP em **uma sequência grande**, ativando Lovable Cloud (auth + banco) e Lovable AI (tutora). Para entregar com qualidade, divido em 3 entregas dentro deste MVP. Confirma e eu começo pela Entrega 1.

## Entrega 1 — Fundação (auth + onboarding + dashboard básico)

**Backend (Lovable Cloud)**
- Tabelas: `profiles`, `onboarding` (objetivo, prazo, horas/dia, dias da semana, dificuldades, estilo), `subjects`, `study_sessions`, `goals`, `achievements`, `user_xp`, `chat_threads`, `chat_messages`.
- RLS scopada por `auth.uid()` em todas. Trigger cria `profile` no signup.

**Auth**
- `/auth` (email/senha + Google) usando broker Lovable.
- Layout `_authenticated/` (já gerenciado).
- Após login: se onboarding incompleto → `/onboarding`, senão `/dashboard`.

**Onboarding (`/onboarding`)**
- Wizard multi-step (objetivo, data prova, horas/dia, dias, matérias e dificuldades, estilo).
- Salva em `onboarding` + cria registros em `subjects`.

**Dashboard (`/dashboard`)**
- Saudação + resumo do dia, próximas tarefas, barra de progresso, metas, streak, XP.
- Cronograma da semana gerado a partir das respostas do onboarding (algoritmo simples no server: distribui horas pelas matérias priorizando dificuldades + repetição espaçada básica).
- Botão "marcar como concluído" → cria `study_session` → atualiza XP/streak.

**Landing** — manter a atual, ajustar CTAs para `/auth`.

## Entrega 2 — IA tutora com histórico

- Página `/tutor` com lista de threads (sidebar) + chat por thread (`/tutor/$threadId`).
- Server route `/api/chat` usando AI SDK + Lovable AI Gateway (`google/gemini-3-flash-preview`).
- Persistência em `chat_threads` / `chat_messages` (RLS por user).
- System prompt: tutora amigável, didática, pt-BR, focada em estudo do teen, conhece contexto do user (matérias com dificuldade).
- Renderização com `message.parts` + markdown.
- Botão "explica isso" / "gera exercícios" / "resume" como prompts rápidos.

## Entrega 3 — Gamificação + biblioteca

- Sistema de XP/níveis, streaks, conquistas (1ª semana, 30 dias, 100h, meta mensal).
- Ranking entre amigos (opcional, escondido por padrão).
- Página `/videoaulas`: lista curada (seed inicial estática por matéria) com filtros, favoritos, marcação de concluído.
- Tema claro/escuro toggle.

## Stack técnica

- TanStack Start + Supabase (via Lovable Cloud).
- `createServerFn` para reads/writes; `/api/chat` server route para streaming.
- shadcn + Tailwind no design já existente (sky/coral/rose).
- Zod para validação.

## Pronto para começar?

Confirma e eu já ativo o Cloud + provisiono o LOVABLE_API_KEY e começo a Entrega 1.
