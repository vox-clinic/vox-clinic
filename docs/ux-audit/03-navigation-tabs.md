# Analise 3: Tabs, Navegacao e Overflow

Data: 2026-03-28

---

## 1. Tabs do Paciente (8 tabs)

### Estado atual
Resumo, Historico, Tratamentos, Prescricoes, Documentos, Imagens, Gravacoes, Formularios
- Overflow: `overflow-x-auto scrollbar-hide` — scroll horizontal sem indicador
- Mobile: icones visiveis, labels escondidos (`hidden sm:inline`)
- Tab ativa: underline indicator (variant="line")

### Problemas
- **8 tabs em laptop 13":** cabe apertado, pode precisar scroll sem que o usuario perceba
- **Mobile:** so icones sem labels — usuario precisa adivinhar o que cada icone significa (Clipboard vs FileText vs Image nao sao obvios)
- **Sem indicador de scroll:** usuario nao sabe que tem mais tabs a direita
- **Ordem pode nao ser ideal:** "Resumo" e "Historico" sao os mais usados (correto estarem primeiro), mas "Formularios" no final pode ser esquecido

### Correcao proposta
```
1. Mobile: adicionar labels truncados (2-3 letras) abaixo dos icones OU usar scrollable tabs com setas
2. Adicionar fade gradient nas bordas quando ha scroll (CSS: mask-image com gradient)
3. Considerar agrupar: "Documentos + Imagens + Gravacoes" em uma unica tab "Arquivos" com sub-tabs
4. Isso reduziria de 8 para 6 tabs — cabe confortavelmente
```

---

## 2. Tabs de Configuracoes (15 items!)

### Estado atual
13 TabsTrigger + 2 Links externos (TISS, Auditoria) = 15 items em barra horizontal
- Overflow: scroll nativo do navegador, sem indicador visual
- Tamanho: `text-[13px]` — menor que padrao
- TISS e Auditoria: sao `<Link>` estilizados diferente dos `<TabsTrigger>`

### Problemas (CRITICO)
- **15 items em tab bar horizontal e inaceitavel** — excede 1200px de largura
- **Mobile: completamente inutilizavel** — usuario precisa scroll muito para encontrar "Plano" ou "Auditoria"
- **Nenhum indicador de overflow** — tabs "escondidas" nao existem para o usuario
- **TISS e Auditoria como Links** criam inconsistencia de interacao (saem da pagina vs mudam tab)
- **Sem agrupamento logico** — Clinica, Procedimentos, Campos, Formularios sao relacionados mas nao agrupados

### Correcao proposta (REESTRUTURACAO)
```
Substituir tab bar horizontal por sidebar vertical com agrupamento:

Clinica
  ├── Dados da Clinica
  ├── Procedimentos
  ├── Campos Customizados
  └── Aparencia

Equipe
  ├── Membros
  └── Comissoes

Agendamento
  ├── Agendas
  └── Online (Booking)

Comunicacao
  ├── Mensagens (WhatsApp/SMS)
  └── Formularios

Financeiro
  ├── Gateway de Pagamento
  ├── Fiscal (NFS-e)
  └── TISS

Sistema
  ├── Plano
  └── Auditoria

Implementacao:
- Desktop: sidebar esquerda com secoes collapsiveis (w-56)
- Mobile: Sheet bottom com lista agrupada
- Elimina problema de overflow completamente
- Agrupa logicamente para melhor navegacao
```

---

## 3. Tabs do Financeiro (9 tabs)

### Estado atual
Resumo, Contas a Receber, Despesas, Fluxo de Caixa, NFS-e, TISS, Comissoes, Estoque, Tabela de Precos
- Overflow: `overflow-x-auto` com `w-fit`
- Sem indicador de scroll

### Problemas
- **9 tabs transbordam em laptop 13"**
- **Mesmo problema de falta de indicador de scroll**
- **"Tabela de Precos" no final** — pode nao ser encontrado

### Correcao proposta
```
1. Adicionar fade gradient + setas de scroll nas bordas
2. OU agrupar: "NFS-e + TISS + Comissoes" como sub-menu de "Avancado"
3. Resultado: Resumo | Receber | Despesas | Fluxo | Estoque | Precos | Avancado ▾
```

---

## 4. Sidebar Principal

### Estado atual
- Desktop: sidebar fixa `w-56` com items agrupados (Menu Principal + Acoes)
- Active state: borda esquerda teal + bg highlight + font semibold
- "Nova Consulta": botao accent com `bg-vox-primary` no bloco de acoes
- Mobile: `hidden md:flex` — desaparece completamente

### Problemas
- **"Nova Consulta" no bloco de Acoes** — pode nao ser visivel sem scroll se ha muitos items no menu principal
- **Sem collapse/expand** — sidebar sempre ocupa 224px, nao tem modo compacto
- **Sem indicador de notificacoes** no item "Mensagens" — usuario nao sabe se tem mensagens novas sem ir na pagina

### O que esta bom
- Icones distinguiveis e consistentes
- Active state claro com multiplos indicadores (cor + borda + peso de fonte)
- `aria-current="page"` implementado corretamente
- Tour IDs presentes para onboarding
- Permissoes RBAC filtram items

### Correcao proposta
```
1. Adicionar badge de contagem no item "Mensagens" quando ha nao-lidas
2. Mover "Nova Consulta" para acima do separator (mais visivel)
3. Considerar modo compacto (so icones, w-16) para ganhar espaco
```

---

## 5. Bottom Nav (Mobile)

### Estado atual
- 4-5 items primarios + "Mais" para overflow
- "Consulta" no centro com accent (bg-vox-primary, tamanho maior)
- Sheet "Mais" abre de baixo com items secundarios
- `pb-[env(safe-area-inset-bottom)]` para notch

### Problemas
- **"Mais" button sem `aria-label` ou `aria-expanded`** — acessibilidade
- **Sheet "Mais" sem empty state** — se todas as permissoes escondem items, mostra vazio
- **Focus management:** focus nao e gerenciado quando sheet abre/fecha

### O que esta bom
- `aria-current="page"` correto
- Labels de texto abaixo dos icones (nao so icone)
- Safe area inset para dispositivos com notch
- Grid dinamico baseado em items visiveis

---

## 6. Breadcrumbs

### Estado atual
- Componente `breadcrumb.tsx` com links opcionais
- Usado em paginas internas (novo paciente, etc.)
- Pattern "< Pacientes" no perfil do paciente

### Problemas
- **Nao e consistente em todas as paginas internas** — algumas paginas profundas nao tem breadcrumb
- **Sem breadcrumb no financial, calendar, reports** — usuario pode se sentir perdido
- **Mobile: breadcrumb ocupa espaco** mas e necessario para navegacao

### Correcao proposta
```
Garantir breadcrumb em TODAS as paginas que nao sao top-level:
- /patients/[id] → Pacientes > Nome do Paciente
- /patients/[id]/prescricao → Pacientes > Nome > Prescricao
- /appointments/review → Atendimentos > Revisar
- /settings/form-builder/[id] → Configuracoes > Formularios > Editar
- /prescriptions/[id] → Prescricoes > #ID
- /certificates/[id] → Atestados > #ID
```

---

## 7. Command Palette (Cmd+K)

### Estado atual
- Busca global: pacientes, paginas, acoes
- Keyboard navigation (ArrowUp/Down, Enter, Escape)
- Desktop: botao com hint "Ctrl+K" | Mobile: botao icone
- Debounce 300ms
- Loading spinner durante busca
- Resultados agrupados com secoes

### O que esta bom
- `DialogTitle sr-only` para screen readers
- Keyboard navigation excelente
- Empty state "Nenhum resultado encontrado"
- Dica "Digite para buscar..." quando vazio
- Responsivo: `max-w-[calc(100vw-2rem)] sm:max-w-lg`

### Problemas menores
- **Selected item nao e anunciado para screen readers** — falta aria-live
- **Sem historico de buscas recentes**
- **Sem hint para novos usuarios** de que Cmd+K existe (alem do botao no header)

---

## Score: 5/10

### Critico
- Settings com 15 tabs horizontal — inutilizavel
- Sem indicador de overflow em NENHUMA tab bar
- Financial com 9 tabs sem overflow handling

### Bom
- Sidebar active state excelente
- Command palette bem implementado
- Bottom nav com accent button e safe area
- Breadcrumb existe (mas precisa ser consistente)
