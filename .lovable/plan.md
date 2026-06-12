## Objetivo

Recriar a landing page do site https://study4267.lovable.app/ — uma página de apresentação de um app de estudos para teens, com IA tutora, cronograma e modo foco Pomodoro.

## Escopo

Apenas a landing page (rota `/`). Sem backend, sem autenticação real — os botões "Começar agora" e "Já tenho conta" serão apenas visuais (ou links âncora). Se você quiser as páginas `/signup` e `/login` funcionais depois, fazemos em outra etapa.

## Seções da página

1. **Navbar** — logo "Lovable" + links (Recursos, Como funciona, IA tutora) + "Entrar" e botão "Começar"
2. **Hero** — badge "Estudos leves, com IA do seu lado", título grande multicolor ("Sua rotina escolar, do jeito que faz sentido pra você."), parágrafo, citação, dois CTAs, três checkmarks (Grátis pra começar / Sem propaganda / Feito pra teens), e um **mockup de card** à direita mostrando "Sua rotina" com 5 tarefas (algumas concluídas riscadas)
3. **Recursos** — grid de 6 cards: Cronograma automático, Modo foco Pomodoro, Metas e gamificação, Videoaulas curadas, IA tutora amigável, Anotações rápidas (cada um com ícone)
4. **Como funciona** — 3 passos numerados (01 Criar conta, 02 Quiz, 03 Receber rotina)
5. **Tutor IA** — seção com chat mockup mostrando pergunta/resposta de exemplo + CTA "Conversar com a IA"
6. **CTA final** — "Pronta(o) pra começar?" com botão
7. **Footer** simples

## Design system

- Paleta clara: fundo branco/gradiente azul-claro→rosa-claro, texto azul-marinho escuro
- Acento primário: azul ciano (#3BB6E6 aprox.) para botões
- Destaques de texto: azul, cinza-azulado, rosa-coral
- Tipografia: sans-serif moderna com pesos fortes para headings
- Cards com cantos arredondados grandes (rounded-3xl), sombras suaves
- Ícones: lucide-react

Tokens definidos em `src/styles.css` (HSL/oklch semânticos) — sem cores hardcoded nos componentes.

## Arquivos a criar/editar

- `src/styles.css` — atualizar paleta e tokens
- `src/routes/index.tsx` — substituir placeholder pela landing
- `src/components/landing/Navbar.tsx`
- `src/components/landing/Hero.tsx` (inclui o mockup do card de rotina)
- `src/components/landing/Features.tsx`
- `src/components/landing/HowItWorks.tsx`
- `src/components/landing/AITutor.tsx` (inclui mockup do chat)
- `src/components/landing/FinalCTA.tsx`
- `src/components/landing/Footer.tsx`
- Atualizar `head()` em `index.tsx` com title/description em português

## Perguntas rápidas

1. Mantenho a marca como "Lovable" no header, ou troco por outro nome (ex.: "Study")?
2. Os botões CTA devem só rolar a página, ou já criar rotas `/signup` e `/login` (placeholders)?
