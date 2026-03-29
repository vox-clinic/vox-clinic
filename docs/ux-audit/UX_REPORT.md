# Auditoria UX/UI — VoxClinic — 2026-03-28

## Score por Area

| Area | Score | Problemas | Status |
|------|-------|-----------|--------|
| Hierarquia & Layout | 6/10 | 12 | Precisa atencao |
| Dashboard | 6/10 | 9 | Precisa atencao |
| Navegacao & Tabs | 5/10 | 14 | Critico |
| Formularios & Inputs | 7/10 | 8 | Bom com gaps |
| Tabelas & Listas | 7/10 | 7 | Bom com gaps |
| Perfil do Paciente | 6/10 | 11 | Precisa atencao |
| Calendario | 7/10 | 6 | Bom com gaps |
| Estados da Interface | 5/10 | 10 | Critico |
| Responsividade | 6/10 | 9 | Precisa atencao |
| Dark Mode & A11y | 5/10 | 13 | Critico |
| **MEDIA GERAL** | **6.0/10** | **99** | |

---

## Top 10 Quick Wins (alto impacto, baixo esforco)

| # | Fix | Impacto | Esforco | Arquivo |
|---|-----|---------|---------|---------|
| 1 | **Criar dashboard/loading.tsx** com skeletons | Alto — elimina tela em branco na pagina mais vista | 30min | `src/app/(dashboard)/dashboard/loading.tsx` |
| 2 | **Tornar stat cards clicaveis** no dashboard | Alto — navegacao intuitiva | 15min | `dashboard/page.tsx` |
| 3 | **Aumentar metadados do paciente** de 11px para 12-13px | Alto — legibilidade diaria | 10min | `patients/[id]/page.tsx` |
| 4 | **Adicionar idade calculada** "(34 anos)" ao lado da data de nascimento | Alto — elimina calculo mental | 10min | `patients/[id]/page.tsx` |
| 5 | **Padronizar empty states** — criar componente reutilizavel | Medio — consistencia visual | 1h | `src/components/ui/empty-state.tsx` |
| 6 | **Adicionar aria-label em botoes de icone** (delete medicamento, etc.) | Medio — acessibilidade basica | 20min | Varios componentes |
| 7 | **Adicionar fade gradient** nas tab bars com overflow | Medio — usuario descobre tabs ocultas | 30min | CSS global + tab components |
| 8 | **Adicionar tooltip** em botoes disabled ("Nenhuma alteracao") | Medio — feedback claro | 20min | Settings, forms |
| 9 | **Mobile: colapsar botoes do paciente** em dropdown "Acoes" | Alto — header usavel em mobile | 30min | `patients/[id]/page.tsx` |
| 10 | **Adicionar badge de nao-lidas** no item "Mensagens" da sidebar | Medio — nao perder mensagens | 20min | `nav-sidebar.tsx` |

---

## Top 10 Problemas Estruturais (requerem refatoracao)

| # | Problema | Impacto | Esforco | Descricao |
|---|---------|---------|---------|-----------|
| 1 | **Settings: 15 tabs horizontal** | Critico — inutilizavel em mobile/laptop | 1-2 dias | Trocar por sidebar vertical com agrupamento logico |
| 2 | **Modais sem focus trap** | Critico — acessibilidade quebrada | 4h | Migrar prescricao/certificado para DialogContent shadcn |
| 3 | **Sem error boundary customizado** | Alto — crash = tela branca | 2h | Criar error.tsx e not-found.tsx globais |
| 4 | **Contraste teal WCAG** | Alto — pode falhar AA | 4h | Auditar com Lighthouse, ajustar tokens dark mode |
| 5 | **Tabs do paciente (8)** em mobile | Medio — scroll sem indicador | 4h | Agrupar Documentos+Imagens+Gravacoes em "Arquivos" |
| 6 | **Financial tabs (9)** overflow | Medio — tabs escondidas | 3h | Agrupar ou adicionar scroll indicators |
| 7 | **Calendar touch targets** 32px | Medio — abaixo minimo 44px | 2h | Aumentar botoes de navegacao |
| 8 | **Dashboard: Agenda abaixo do fold** | Medio — info #1 nao visivel | 3h | Reorganizar layout: Stats > Agenda > Actions |
| 9 | **Sem skip links** | Medio — keyboard users prejudicados | 1h | Adicionar "Pular para conteudo" no layout |
| 10 | **Select nativo vs shadcn** inconsistente | Baixo — visual inconsistente | 3h | Padronizar todos para shadcn Select |

---

## O Que Esta Bom

### Arquitetura de UI
- Design system consistente (teal, Inter, rounded-xl, shadcn/ui)
- oklch color space para uniformidade perceptual
- Cards com estilo uniforme em todas as paginas (rounded-2xl, border-border/40)
- Icons consistentes (Lucide, size-4, text-vox-primary)

### Formularios
- Mascaras de CPF, telefone, CEP, data — todas implementadas e funcionais
- Validacao real-time no formulario manual de paciente
- CID-10 e medicamentos com autocompletes dedicados
- Drug interaction checking com severidade por cores
- ViaCEP integrado para auto-fill de endereco
- LGPD consent modal para gravacao de audio

### Navegacao
- Command palette (Cmd+K) com keyboard navigation excelente
- Sidebar com RBAC — items filtrados por permissao
- Active state claro (borda + cor + peso de fonte)
- Bottom nav com accent button central e safe area inset
- Tour system para onboarding de novos usuarios

### Mobile
- Mobile-first approach com grids responsivos
- Patient list como cards (nao tabela) — naturalmente responsivo
- Bottom nav com sheet "Mais" para overflow
- Layouts empilham corretamente em breakpoints menores

### Componentes
- Settings sections altamente consistentes entre si (card wrapper, icons, labels, empty states)
- Loading skeletons na maioria das paginas
- Toast notifications uniformes (sonner)
- Confirm dialog reutilizavel para acoes destrutivas
- Form renderer com 11 tipos de campo e validacao

### Dominio
- Todas as strings em pt-BR
- Datas em DD/MM/AAAA
- CPF com validacao de digitos verificadores
- NPS, audit log, TISS — features especificas do mercado brasileiro
- Print layouts para prescricao, atestado, recibo, relatorio

---

## Metodologia

Auditoria realizada por analise estatica de codigo (JSX/TSX, Tailwind classes, props, estrutura de componentes). Cada arquivo de pagina e componente foi lido completamente. Nao inclui testes em dispositivos reais ou ferramentas automatizadas (Lighthouse, axe-core). Recomenda-se validacao adicional com:

1. **Lighthouse Accessibility audit** em cada pagina
2. **axe-core browser extension** para WCAG compliance
3. **Teste manual** em iPhone SE, iPad, laptop 13", monitor 27"
4. **Screen reader testing** (VoiceOver/NVDA) nas rotas criticas
5. **User testing** com 3-5 profissionais de saude reais

---

## Arquivos da Auditoria

| Arquivo | Conteudo |
|---------|----------|
| [00-inventory.md](./00-inventory.md) | Inventario completo de telas e componentes |
| [01-hierarchy-layout.md](./01-hierarchy-layout.md) | Hierarquia visual e layout |
| [02-dashboard.md](./02-dashboard.md) | Dashboard |
| [03-navigation-tabs.md](./03-navigation-tabs.md) | Tabs, navegacao e overflow |
| [04-forms-inputs.md](./04-forms-inputs.md) | Formularios e inputs |
| [05-tables-lists.md](./05-tables-lists.md) | Tabelas e listas |
| [06-patient-profile.md](./06-patient-profile.md) | Perfil do paciente |
| [07-calendar.md](./07-calendar.md) | Calendario e agendamento |
| [08-states.md](./08-states.md) | Estados da interface |
| [09-responsive-mobile.md](./09-responsive-mobile.md) | Responsividade e mobile |
| [10-dark-mode-a11y.md](./10-dark-mode-a11y.md) | Dark mode e acessibilidade |
| [UX_FIXES.md](./UX_FIXES.md) | Lista priorizada de correcoes |
