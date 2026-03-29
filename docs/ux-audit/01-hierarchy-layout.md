# Analise 1: Hierarquia Visual e Layout

Data: 2026-03-28

---

## 1. Hierarquia de Informacao

### Dashboard
- **Bom:** Greeting card no topo estabelece contexto (nome + horario do dia)
- **Problema:** Stat cards (4 KPIs) tem peso visual identico — nao ha diferenciacao entre o mais e o menos importante
- **Problema:** "Agenda de Hoje" e "Atividade Recente" tem peso visual igual, mas Agenda deveria ser dominante (e o que o profissional mais precisa)
- **Problema:** Busca rapida e Pacientes Recentes ficam abaixo do fold em telas menores

### Perfil do Paciente
- **Bom:** Header com avatar, nome e badges de metadados cria hierarquia clara
- **Problema:** Metadados usam `text-[11px]` — agressivamente pequeno, dificulta leitura
- **Problema:** 5 botoes de acao + dropdown competem com informacoes do paciente no header
- **Problema:** 8 tabs sem indicador de qual e mais usada/importante

### Settings
- **Bom:** Hero card com gradiente e avatar emoji e visualmente forte
- **Problema:** 15 tabs horizontais — impossivel ver todas sem scroll, usuario nao sabe que existem mais tabs
- **Problema:** Tabs TISS e Auditoria sao Links estilizados diferente dos TabsTrigger — inconsistencia

### Financeiro
- **Bom:** Cards de KPI no topo (receita, consultas, ticket medio)
- **Problema:** 9 tabs sem indicador de scroll

### Calendario
- **Bom:** Hierarquia clara: navegacao > seletor de view > conteudo
- **Bom:** Badge com contagem de consultas junto ao titulo

---

## 2. Espacamento e Respiracao

### Padroes encontrados
- Dashboard usa `space-y-6` como ritmo vertical principal — **bom**
- Stat cards: `pt-5 pb-4` interno — **consistente**
- Itens de lista: `px-3 py-2.5` — **apertado mas consistente**

### Problemas
- **Gaps inconsistentes:** `gap-0.5`, `gap-1`, `gap-2`, `gap-2.5`, `gap-3`, `gap-5` usados no mesmo contexto (dashboard)
- **Tamanhos de fonte granulares:** `[10px]`, `[11px]`, `[12px]`, `[13px]` — gera ruido visual sutil
- **Settings sections:** Maioria usa `space-y-3` ou `space-y-4`, mas MessagingSection mistura ambos
- **Dashboard em mobile:** Sem ajuste explicito de padding no container externo — pode ficar grudado nas bordas

### Recomendacao
Padronizar escala de gaps: usar apenas `gap-2`, `gap-3`, `gap-4`, `gap-6`. Eliminar `gap-0.5`, `gap-2.5`, `gap-5` que criam micro-variacoes imperceptiveis mas inconsistentes.

---

## 3. Consistencia de Layout

### O que esta consistente
- **Cards:** `rounded-2xl`, `border-border/40` em todas as paginas — excelente
- **Icones em titulos:** `size-4 text-vox-primary` em todas as settings sections
- **Loading pattern:** Skeleton em todas as paginas — mesmo tamanho e formato
- **Error handling:** Toast-based com `friendlyError()` helper — uniforme
- **List items:** Mesmo padrao `group hover:opacity` para revelar acoes
- **Labels:** `text-xs font-medium uppercase tracking-wider` — consistente

### O que NAO esta consistente
| Aspecto | Variacoes encontradas |
|---------|----------------------|
| Empty states | 3+ estilos diferentes (dashboard agenda vs atividade recente vs pacientes) |
| Header de pagina | Dashboard tem greeting card, Settings tem hero card, outras tem titulo simples |
| Padding de pagina | `pb-24 md:pb-6` no calendario, `pb-20` em settings — valores diferentes |
| Tab bars | Settings: 15 tabs horizontal. Financial: 9 tabs horizontal. Paciente: 8 tabs. Sem padrao de overflow |
| Tamanho de texto em tabs | Settings: `text-[13px]`. Outras: default `text-sm` |

### Recomendacao
1. **Padronizar empty states:** Criar componente `<EmptyState icon={X} title="..." description="..." action={...} />` reutilizavel
2. **Padronizar headers:** Todas as paginas devem ter `<PageHeader title="..." description="..." actions={...} />`
3. **Padronizar padding inferior:** Definir variavel `pb-safe` que leve em conta a bottom nav mobile

---

## 4. Densidade de Informacao

### Telas com muita informacao
- **Perfil do paciente:** Header muito denso (nome + 5 badges + tags + alertas + 6 botoes). Em mobile, botoes fazem wrap e criam header enorme
- **Settings:** 13 secoes com formularios densos. Sem busca/filtro para procedimentos (pode ter 100+)
- **Financial resumo:** KPIs + tabela de procedimentos + transacoes recentes — bem distribuido

### Telas com pouca informacao
- **Patients/new:** Apenas 2 cards de escolha (voz/manual) — poderia usar melhor o espaco
- **Appointments/processing:** Tela de polling com spinner — correto ser minimalista

### Formularios longos
- **Manual patient form:** Dividido em 3 cards (Dados Pessoais, Endereco, Campos Adicionais) — bom
- **Settings sections:** Cada tab e uma secao separada — bom
- **Onboarding:** 5 steps com wizard — excelente

### Listas longas
- **Pacientes:** Paginacao implementada — bom
- **Atendimentos:** Paginacao implementada — bom
- **Procedimentos (settings):** Sem busca, sem paginacao — problema com 100+ itens
- **Equipe (settings):** Sem busca — problema com 20+ membros

---

## Correcoes Propostas

### P1 — Empty State Component
```
Arquivo: src/components/ui/empty-state.tsx
Criar componente reutilizavel com: icon, title, description, action (opcional)
Substituir as 3+ variacoes atuais por esse componente unico
```

### P2 — Page Header Component
```
Arquivo: src/components/page-header.tsx
Props: title, description?, badge?, actions?, breadcrumb?
Substituir os headers inconsistentes em todas as paginas
```

### P3 — Padronizar gaps
```
Global: Substituir gap-0.5 por gap-1, gap-2.5 por gap-3, gap-5 por gap-6
Manter apenas: gap-1, gap-2, gap-3, gap-4, gap-6, gap-8
```

### P4 — Busca em listas de settings
```
Arquivos: procedimentos-section.tsx, campos-section.tsx, team-section.tsx
Adicionar Input de busca no topo de cada lista quando items > 10
```
