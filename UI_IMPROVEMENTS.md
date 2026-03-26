# VoxClinic UI/UX Improvements - Changelog

Data: 2026-03-26

## Resumo

Conjunto de melhorias visuais focadas em tipografia, hierarquia visual, navegacao e usabilidade geral do sistema. Nenhuma mudanca funcional — apenas refinamentos de CSS, classes Tailwind e fonte.

---

## 1. Tipografia (layout.tsx, globals.css)

### Antes
- Fonte: **Geist Sans** + **Geist Mono** (via `next/font/google`)
- Variavel CSS: `--font-geist-sans`, `--font-geist-mono`

### Depois
- Fonte: **Inter** + **JetBrains Mono** (via `next/font/google`)
- Inter: melhor legibilidade em telas, suporte completo a latin-ext (acentos pt-BR), optical sizing
- JetBrains Mono: mais legivel que Geist Mono para dados tabulares
- Adicionado `display: "swap"` para melhor performance de carregamento
- Subsets: `["latin", "latin-ext"]` para Inter (melhor suporte a caracteres portugueses)

### Arquivos alterados
- `src/app/layout.tsx` — import de fontes e variavel CSS no html
- `src/app/globals.css` — `--font-sans`, `--font-mono`, `--font-heading` atualizados com fallbacks

---

## 2. Design Tokens / globals.css

### Cores (Light Mode)
- Background: levemente mais quente (`0.988 → 0.985` lightness)
- Cards: leve tint teal ao inves de branco puro (`oklch(0.995 0.001 175)`)
- Muted foreground: mais escuro para melhor legibilidade (`0.50 → 0.46`)
- Borders: ligeiramente mais visiveis para melhor estrutura (`0.91 → 0.905`)
- Ring: mais saturado para melhor visibilidade do foco (`0.12 → 0.14`)

### Cores (Dark Mode)
- Background: ligeiramente mais escuro (`0.13 → 0.115`)
- Muted foreground: ajustado para melhor contraste (`0.65 → 0.60`)
- Borders: mais visiveis (`8% → 10%` opacidade)

### Base Layer
- Adicionado `font-feature-settings: "cv11", "ss01"` para alternativas tipograficas do Inter
- Adicionado `text-rendering: optimizeLegibility`
- Adicionado estilos para `h2` e `h3` (antes so h1 tinha estilo)
- Adicionado `::selection` com cor teal para selecao de texto
- Adicionado `scroll-behavior: smooth` (com respeito a `prefers-reduced-motion`)
- Radius base reduzido de `0.75rem → 0.625rem` (mais sutil, menos "bubbly")

---

## 3. Header (dashboard/layout.tsx)

### Mudancas
- Logo: `size-7 → size-8`, `rounded-lg → rounded-xl`, shadow mais pronunciado
- Logo: adicionado hover state (opacity + shadow transition)
- Logo text: `text-base → text-[15px]` para melhor proporcao
- Clinic name separator: `h-4 → h-5`, hidden on mobile preservado
- Clinic name: adicionado `font-medium` para melhor legibilidade
- Toolbar: gap reduzido (`gap-1.5 → gap-1`)
- UserButton: separado visualmente com `border-l` e `ml-1.5 pl-1.5`
- Padding responsivo: `px-5 → px-4 md:px-6`

---

## 4. Sidebar (nav-sidebar.tsx)

### Mudancas
- Width: `w-52 → w-56` (mais espaco para labels)
- Background: `bg-card/30 → bg-sidebar` (usa token semantico)
- Links: `py-2 → py-2.5` (mais area de toque)
- Active state: removido `shadow-sm`, adicionado **indicador vertical** (barra teal 3px na esquerda)
- Active state: `font-medium → font-semibold` para mais destaque
- Hover state: `hover:bg-muted/60 → hover:bg-accent` (mais consistente)
- Section headers: `pb-2 → pb-2.5`, `pt-4 → pt-5`
- Icones: adicionado `shrink-0` para evitar compressao

---

## 5. Bottom Nav Mobile (nav-bottom.tsx)

### Mudancas
- Backdrop: `backdrop-blur-xl → backdrop-blur-2xl`, `bg-background/80 → bg-background/85`
- Active indicator: adicionada barra horizontal no topo (2px, teal) no item ativo
- Botao central (Consulta):
  - Antes: circulo `size-8 rounded-full` com icon `size-4`
  - Depois: retangulo `size-10 rounded-2xl` com icon `size-5`, ativo = fundo teal solido com sombra
- Icones: `size-5 → size-[22px]` para melhor visibilidade
- Adicionado `active:scale-95` para feedback tatil
- Adicionado `data-nav-bottom` attribute para print styles
- Removido `scale-110` no active (substituido pelo indicador superior)

---

## 6. Dashboard (dashboard/page.tsx)

### Hero Section
- Padding responsivo: `p-6 → p-5 sm:p-6`
- Segundo blob decorativo adicionado (canto inferior esquerdo)
- Greeting: `text-sm → text-[13px] font-medium`
- CTA button: `font-medium → font-semibold`, `px-4 → px-5`
- CTA hover: adicionado `hover:-translate-y-px` (micro-lift effect)

### Stat Cards
- Numeros: `text-2xl → text-[28px]` com `leading-none tracking-tight` para mais impacto
- Icon containers: `size-9 → size-10`, fundo com `[0.08]` opacidade
- Labels: `font-medium → font-semibold`, cor `text-muted-foreground/70`
- Trend badge: agora inline-flex com background colorido (`bg-vox-success/10`)
- Cards: adicionado `transition-shadow hover:shadow-md`
- Gradient overlay: `duration-300` para transicao mais suave
- Alinhamento: `items-center → items-start` para melhor hierarquia

### Agenda de Hoje
- Card title: icone agora dentro de container `size-6 rounded-lg`
- Link "Ver agenda": hover com background ao inves de underline
- Empty state: icone maior (`size-12 → size-14`, `rounded-full → rounded-2xl`)
- Time badge: `size-9 → size-10`, `rounded-lg → rounded-xl`
- Patient name: `text-sm → text-[13px]`, `font-medium → font-semibold`
- Hover: `hover:bg-muted/50 → hover:bg-accent`

### Atividade Recente
- Mesma padronizacao de card titles com icone em container
- Avatar iniciais: `size-7 bg-muted → size-8 bg-vox-primary/[0.08]` com cor teal
- Status badges: `font-medium → font-semibold`

### Acoes Rapidas
- CTA principal: `py-2.5 → py-3`, adicionado micro-lift hover
- Secondary actions: icones agora dentro de containers arredondados (`size-7 rounded-lg`)
- Spacing: `space-y-1.5 → space-y-2`
- Hover: `hover:bg-muted/50 → hover:bg-accent`

### Pacientes Recentes
- Empty state: icone em container `size-12 rounded-2xl`
- Avatar: `size-7 → size-8`, cor teal ao inves de muted
- Nome + data: reorganizado em layout vertical (nome em cima, data embaixo) ao inves de lado a lado
- Fonte: `text-sm → text-[13px]`

---

## 7. Pagina de Pacientes (patients/page.tsx)

### Mudancas
- Badge total: adicionado `font-semibold`
- Subtitle: `text-sm → text-[13px]`, cor mais sutil (`text-muted-foreground/70`)
- Botao Voz: hover `bg-accent` ao inves de `bg-muted/50`
- Botao Novo Paciente: `font-medium → font-semibold`, shadow mais forte, micro-lift hover

---

## Arquivos NAO Alterados (outro agente trabalhando)

- `src/app/(dashboard)/patients/new/*` — cadastro de pacientes
- `src/app/(dashboard)/patients/[id]/*` — detalhes do paciente
- `src/components/patient-list-search.tsx` — busca de pacientes

---

## 8. Auth Pages (sign-in, sign-up)

### Antes
- Paginas minimalistas com apenas o componente Clerk centralizado
- Sem branding ou identidade visual

### Depois
- **Novo layout split-screen** (`src/app/(auth)/layout.tsx`):
  - Painel esquerdo (md+): gradiente teal-to-teal-700, circulos decorativos, dot grid pattern
  - Icone mic em container frosted glass (80x80px)
  - Titulo "VoxClinic", tagline "CRM inteligente com voz"
  - Descricao do produto e feature pills ("Transcricao por voz", "IA integrada", "LGPD compliant")
  - Mobile: apenas o formulario centralizado
- Sign-in: link "Nao tem conta? Cadastre-se" abaixo do form
- Sign-up: link "Ja tem conta? Entre" abaixo do form

### Arquivos alterados
- `src/app/(auth)/layout.tsx` — NOVO (criado)
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` — removido wrapper, adicionado link
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` — removido wrapper, adicionado link

---

## 9. Command Palette (command-palette.tsx)

### Mudancas
- Trigger buttons: `hover:bg-muted/60 → hover:bg-accent`, adicionado focus ring teal
- Search input: `text-sm → text-[13px]`
- Section headers: cor `text-muted-foreground/50` mais sutil
- Result items: `hover:bg-muted/50 → hover:bg-accent`, `text-sm → text-[13px]`
- Patient avatars: `bg-muted → bg-vox-primary/[0.08] text-vox-primary` (identidade visual)
- Page/action icons: `text-muted-foreground → text-muted-foreground/50` (mais sutil em repouso)

---

## 10. Notification Bell (notification-bell.tsx)

### Mudancas
- Bell button: `hover:bg-muted/60 → hover:bg-accent`, adicionado focus ring teal
- Unread badge: `bg-vox-error → bg-vox-primary` (teal, nao vermelho), `size-4 → size-[18px]`, adicionado `ring-2 ring-background`
- Notification items: `hover:bg-muted/50 → hover:bg-accent`
- Type icon containers: `size-7 rounded-full → size-8 rounded-xl` com icon `size-4`
- Unread dots: `size-1.5 → size-2`
- Time text: `text-[10px] → text-[11px] text-muted-foreground/60`
- "Marcar tudo como lido": agora `text-xs font-medium text-vox-primary hover:text-vox-primary/80`
- Empty state: icone dentro de container `rounded-2xl bg-muted/50`

---

## 11. Theme Toggle (theme-toggle.tsx)

### Mudancas
- Trocado `<Button variant="ghost" size="icon">` por `<button>` com classes inline
- Estilo consistente com toolbar: `size-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent`
- Focus ring teal padronizado

---

## Principios de Design Aplicados

1. **Hierarquia visual clara**: numeros grandes, labels pequenos, icones proporcionais
2. **Feedback tatil**: micro-lift em hover, scale em active, indicators de estado
3. **Consistencia**: mesmos patterns de hover/active/focus em toda app
4. **Legibilidade**: Inter > Geist para pt-BR, font-feature-settings otimizados
5. **Espacamento generoso**: mais breathing room em items interativos
6. **Containers semanticos**: icones em containers arredondados para mais peso visual
