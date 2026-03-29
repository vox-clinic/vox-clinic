# Analise 9: Responsividade e Mobile

Data: 2026-03-28

---

## 1. Breakpoints

### Padrao Tailwind usado
- `sm:` (640px) — tablets
- `md:` (768px) — sidebar aparece
- `lg:` (1024px) — grids expandem
- `xl:` (1280px) — grids maximos

### 320px (mobile pequeno)
- **Dashboard:** Stats em grid-cols-2 ficam apertados (cada card ~144px)
- **Patient header:** Metadados 11px comprimidos
- **Modais:** `mx-4` deixa 288px uteis — borderline
- **Problema:** Command palette `max-w-[calc(100vw-2rem)]` = 288px — funcional mas apertado

### 375px (iPhone SE/mini)
- **Dashboard:** Funcional
- **Patient list:** Cards full-width — bom
- **Calendar:** Buttons 32px — abaixo do minimo touch 44px
- **Tabs:** Scroll horizontal sem indicador

### 768px (tablet)
- **Sidebar aparece** (`md:flex`) — correto
- **Bottom nav desaparece** — correto
- **Dashboard:** Grid expande para 4 colunas em stats — bom

### 1024px (laptop 13")
- **Patient tabs (8):** Apertado, pode precisar scroll
- **Settings tabs (15):** Definitivamente transbordam
- **Financial tabs (9):** Possivel transbordamento

### 1440px+ (monitor grande)
- **Conteudo centralizado** com max-width — aceitavel
- **Sem modo wide** que aproveite toda a largura — espaco desperdicado em monitores ultrawide

---

## 2. Sidebar → Bottom Nav

### Estado atual
- Sidebar: `hidden md:flex w-56` — desktop only
- Bottom nav: `md:hidden` — mobile only
- Transicao: binary switch no breakpoint md (768px)

### O que esta bom
- Sidebar com RBAC — itens filtrados por permissao
- Bottom nav com "Consulta" accent no centro
- Safe area inset para dispositivos com notch
- Sheet "Mais" para items overflow

### Problemas
- **Transicao abrupta** — nao ha estado intermediario (sidebar compacta)
- **"Mais" sheet sem empty state** se todas permissoes escondem items
- **Focus nao gerenciado** ao abrir/fechar sheet

### Correcao proposta
```
1. Considerar sidebar compacta (so icones, w-16) entre 768px e 1024px
2. Adicionar empty state no sheet "Mais": "Todas as opcoes ja estao no menu"
3. Gerenciar focus: ao fechar sheet, retornar focus para o botao "Mais"
```

---

## 3. Componentes Criticos em Mobile

### Calendar
- **DnD touch:** Implementado mas nao verificado em dispositivos reais
- **Touch targets:** Botoes de navegacao 32px — abaixo de 44px minimo
- **View labels:** Hidden, so icones
- **Slots de horario:** Toque para criar — verificar se funciona sem conflito com scroll

### Tabelas
- **Patient list:** Cards (nao tabela) — excelente, responsivo naturalmente
- **Appointments:** Cards verticais — bom
- **Financial:** Cards com grid responsivo — bom
- **Settings audit log:** Tabela com scroll horizontal — verificar usabilidade

### Modais
- **Prescription:** `mx-4` padding — funcional mas apertado em 320px
- **Certificate:** `mx-4` — OK
- **Confirm:** AlertDialog shadcn — responsivo por default
- **Nenhum modal vira full-screen em mobile** — deveria para modais complexos

### Forms
- **Inputs:** Full-width em mobile — bom
- **Touch target de inputs:** `h-10` (40px) — proximo do 44px recomendado, aceitavel
- **Labels:** Acima dos inputs — correto para mobile
- **Date picker:** Nativo do browser em mobile — OK
- **Selects:** Shadcn Select vs nativo — verificar usabilidade touch

### Tabs
- **Patient:** Scroll horizontal com scrollbar-hide — funcional mas sem indicador
- **Settings:** Scroll horizontal — insuficiente para 15 items
- **Financial:** Scroll horizontal — marginal para 9 items

### Charts (Reports page)
- **Recharts:** Responsivo por default com ResponsiveContainer
- **Legendas:** Podem ficar apertadas em mobile
- **Tooltip:** Touch para ver dados — funcional

---

## 4. Print Layouts

### Estado atual (globals.css)
```css
@media print:
- Esconde nav, header, sidebar, footer, buttons, toasts
- Configura A4 com margens 1.5cm lateral, 2cm topo/base
- Remove backgrounds (print economiza tinta)
- Previne quebra de pagina em cards
```

### Prescricao
- Print button disponivel
- Layout otimizado para A4
- Header com dados da clinica + paciente
- Lista de medicamentos formatada

### Atestado
- Print button disponivel
- Tipo de documento no header
- Conteudo formatado
- Assinatura do profissional

### Recibo
- Print button disponivel
- Dados fiscais
- Valores formatados

### Relatorio do paciente
- Print button disponivel
- Dados demograficos + campos customizados + anamnese
- Calcula idade

### Problemas
- **Verificar se TODOS os elementos nao-imprimiveis sao escondidos** (toasts, tooltips, popovers)
- **Verificar quebra de pagina** em relatorios longos
- **Logo da clinica:** verificar se aparece no print (pode ser background-image que nao imprime)

---

## Score: 6/10

### Excelente
- Mobile-first approach com grids responsivos
- Patient list como cards (nao tabela)
- Bottom nav com safe area inset
- Print styles abrangentes para documentos clinicos
- Sidebar/bottom nav binary switch funcional

### Precisa melhorar
- Touch targets abaixo de 44px no calendario
- Tabs sem indicador de overflow em TODAS as telas
- Modais nao viram full-screen em mobile
- Sem sidebar compacta entre tablet e desktop
- Metadados muito pequenos (11px) em mobile
- Settings tabs completamente inutilizavel em mobile
