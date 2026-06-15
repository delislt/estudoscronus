
# Plano completo — Chronos

Implementação dividida em 4 fases entregáveis. Cada fase é funcional sozinha; você pode aprovar tudo de uma vez e eu construo em sequência.

## Visão geral de novas rotas

```
/flashcards          → estudo SRS + criação manual/IA
/flashcards/$deckId  → revisão diária do deck
/resumos             → upload PDF/imagem → resumo/mapa mental/flashcards
/simulados           → lista de simulados (ENEM/Fuvest/Unicamp/ITA/Concursos)
/simulados/$id       → execução cronometrada
/simulados/$id/resultado → relatório por assunto + TRI (ENEM)
/redacao             → submissão e correção IA (5 competências ENEM)
/foco                → Pomodoro + métricas de sessão
/metas               → CRUD metas semanais + progresso
/planejamento        → cronograma longo-prazo até a data da prova
```

Tutor (`/tutor`) ganha: seletor de nível (10 anos / Médio / Vestibular / Universitário), entrada por voz (STT), saída por voz (TTS) e upload de imagem (modo câmera) para resolver exercícios.

---

## Fase 1 — Essenciais de estudo

**Flashcards + SRS (algoritmo SM-2 Anki-like)**
- Tabelas: `decks`, `flashcards (front, back, ease, interval, due_at, reps, lapses)`, `flashcard_reviews`.
- Server fns: `createDeck`, `generateFlashcardsFromText` (IA), `getDueCards`, `reviewCard` (Again/Hard/Good/Easy → recalcula ease/interval).
- Job diário: detecta cards com lapses altos e sugere reforço.

**Resumos automáticos (upload PDF/slides)**
- Storage bucket `documents` (privado).
- Tabela `documents`, `summaries (type: short|full|mindmap|quick_review|flashcards)`.
- Server fn `processDocument`: extrai texto (pdf-parse no servidor), envia para Gemini, gera 4 formatos + opção "criar deck de flashcards".

**Modo Foco / Pomodoro**
- Rota `/foco` cliente (sem backend pesado). Timer 25/5 configurável, sons, modo "não perturbe".
- Cada sessão completa grava em `study_sessions` (já existe) e dá XP.

**Metas semanais UI**
- Rota `/metas` com CRUD sobre tabela `goals` (já existe). Barra de progresso semanal por matéria + horas alvo.

**Tutor multi-nível**
- Adiciona selector no `/tutor` (4 níveis). Injeta no system prompt: vocabulário, profundidade, analogias.

---

## Fase 2 — Vestibular

**Simulados com banco enem.dev + IA**
- Tabelas: `exam_banks`, `questions (source, year, subject, statement, alternatives, correct, difficulty, discrimination)`, `exam_attempts`, `exam_answers`.
- Importador one-shot do dataset enem.dev (server fn admin que baixa JSON de https://enem.dev/api e popula `questions`).
- Para Fuvest/Unicamp/ITA/Concursos: IA gera questões inéditas marcadas como `source='ai'` (a partir do estilo das instituições).
- Simulado adaptativo: próximo item escolhido pelo desempenho (IRT 2PL simplificado).
- Relatório por assunto e por habilidade.

**TRI ENEM**
- Função `calculateTRI(answers, questions)` com 3 parâmetros (a/b/c) usando MLE/EAP simplificado. Compara com nota bruta.

**Correção de redação**
- Rota `/redacao`. Textarea + opção upload foto. IA Gemini avalia 5 competências ENEM (0–200 cada), devolve nota total, justificativa por competência, sugestões e versão melhorada.
- Tabela `essays`.

**Planejamento automático vestibular**
- Onboarding pergunta data da prova-alvo e matérias prioritárias.
- Server fn `generateLongTermPlan` cria blocos semanais até a data: revisão espaçada das matérias fracas, simulados mensais, redação semanal. Grava em `schedule_tasks` (existe).

---

## Fase 3 — Multimodal

**Tutor por voz**
- Conector ElevenLabs (Realtime STT `scribe_v2_realtime` + TTS) já documentado.
- Botão microfone no `/tutor`: streaming bidirecional. Texto transcrito vira mensagem; resposta sintetizada toca em paralelo ao streaming de texto.

**Modo câmera (foto do exercício)**
- Componente `<CameraInput />` (input file capture=environment) no `/tutor`. Imagem vai como `image_url` no Gemini, que lê o enunciado e explica passo-a-passo.

**Leitura de PDF com explicação em tempo real**
- Em `/resumos/$id`, viewer PDF (`react-pdf`) com sidebar de chat IA contextualizada na página atual: ao trocar de página, system message inclui texto extraído daquela página.

---

## Fase 4 — Polimento gamificação

- **Moeda virtual (Coins)**: coluna `coins` em `user_xp`. Ações ganham (revisão SRS, sessão foco, simulado). Loja simples: temas, avatares, "dica grátis no simulado".
- **Ranking entre amigos**: tabela `friendships (user_id, friend_id, status)`. `/ranking` ganha aba "Amigos" filtrando leaderboard.
- **Detecção de esquecimento**: job diário marca subjects com taxa de erro recente alta e cria recomendação no dashboard.

---

## Detalhes técnicos

**Stack**
- Tudo via `createServerFn` (TanStack Start), exceto webhooks/cron em `/api/public/*`.
- IA via Lovable AI Gateway (`google/gemini-3-flash-preview` padrão; `gemini-3-pro` para correção de redação e geração de questões; `gemini-3-flash-image-preview` opcional para mapa mental).
- Voz via conector ElevenLabs (STT + TTS).
- PDFs: `pdf-parse` no servidor para texto; `react-pdf` no cliente para viewer.
- Storage: bucket privado `documents` com RLS por `auth.uid()`.

**Migrações novas (resumo)**
- Fase 1: `decks`, `flashcards`, `flashcard_reviews`, `documents`, `summaries` (+ bucket `documents`).
- Fase 2: `exam_banks`, `questions`, `exam_attempts`, `exam_answers`, `essays`.
- Fase 4: `friendships`, coluna `coins` em `user_xp`, `shop_items`, `user_inventory`.

Toda tabela: GRANTs + RLS escopado por `auth.uid()`.

**Cron novos**
- Diário 04:00: detector de esquecimento + reforço de flashcards (já existe `generate-daily-plans`).

**Custo de IA estimado** — alto por causa de simulados gerados, redação, voz e visão. Recomendo monitorar créditos.

---

## Ordem de entrega proposta

Vou implementar em ondas, cada onda em uma mensagem para você poder testar incrementalmente:

1. **Onda A**: Migrações Fase 1 + 2 + 4 (uma migration grande, aprovação única).
2. **Onda B**: Flashcards SRS + Metas semanais UI + Tutor multi-nível + Foco/Pomodoro.
3. **Onda C**: Upload de documentos + Resumos automáticos + Leitura PDF em tempo real.
4. **Onda D**: Importador enem.dev + Simulados + TRI + Relatórios.
5. **Onda E**: Redação IA + Planejamento longo-prazo.
6. **Onda F**: Tutor por voz (ElevenLabs) + Modo câmera.
7. **Onda G**: Moeda + Loja + Amigos + Detector de esquecimento.

Aprove para eu começar pela Onda A.
