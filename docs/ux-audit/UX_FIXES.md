# Correcoes UX Priorizadas — VoxClinic

Data: 2026-03-28

---

## Urgente (afeta usabilidade diaria)

- [ ] **Dashboard loading.tsx** — Criar `src/app/(dashboard)/dashboard/loading.tsx` com skeletons para greeting, stats, actions, agenda, atividade. Sem isso, pagina fica em branco no carregamento.
- [ ] **Settings: tabs → sidebar vertical** — Reestruturar 15 tabs horizontais para sidebar vertical com agrupamento (Clinica, Equipe, Agendamento, Comunicacao, Financeiro, Sistema). `settings/page.tsx` — refatorar TabsList para aside + secoes.
- [ ] **Modais: focus trap + ESC** — Prescricao e certificado dialogs usam div customizado sem focus trap/ESC. Migrar para `<DialogContent>` do shadcn que ja tem tudo. `create-prescription-dialog.tsx`, `create-certificate-dialog.tsx`, `record-button.tsx` (consent modal).
- [ ] **Error boundary** — Criar `src/app/error.tsx` (global) e `src/app/not-found.tsx` (404 customizada). Sem isso, crash = tela branca sem recovery.
- [ ] **Paciente: metadados 11px → 13px** — Em `patients/[id]/page.tsx`, trocar `text-[11px]` por `text-xs` (12px) ou `text-[13px]`. Profissional precisa ler CPF/telefone rapidamente.
- [ ] **Paciente: botoes mobile** — Em mobile, colapsar 5 botoes de acao em 1 dropdown "Acoes ▾". Manter apenas "Nova Consulta" visivel. `patients/[id]/page.tsx` — wrap em `hidden sm:flex` + dropdown `sm:hidden`.
- [ ] **Dashboard: stat cards clicaveis** — Envolver cada stat card em `<Link href="/patients">` etc. Adicionar `hover:shadow-md cursor-pointer transition-shadow`. `dashboard/page.tsx`.

---

## Alto (melhoria significativa)

- [ ] **Tab overflow indicators** — Adicionar fade gradient + setas nas tab bars com overflow. CSS: `mask-image: linear-gradient(to right, black 90%, transparent)` quando scroll disponivel. Afetar: patient tabs, financial tabs.
- [ ] **Contraste WCAG teal** — Rodar Lighthouse em cada pagina. Se teal (#14B8A6) falha AA em dark mode, ajustar `--color-vox-primary` no dark para valor mais claro. `globals.css`.
- [ ] **Empty state component** — Criar `src/components/ui/empty-state.tsx` com props: icon, title, description, action. Substituir 3+ variantes inconsistentes em dashboard, financial, notifications.
- [ ] **Dashboard: reorganizar layout** — Mover "Agenda de Hoje" para acima do fold. Ordem: Stats → Agenda (span full ou 60%) → Quick Actions → Atividade → Pacientes. `dashboard/page.tsx`.
- [ ] **Idade calculada no paciente** — Adicionar `(${calcularIdade(nascimento)} anos)` ao lado da data de nascimento no header. `patients/[id]/page.tsx`.
- [ ] **Skip links** — Adicionar `<a href="#main" className="sr-only focus:not-sr-only">Pular para conteudo</a>` no inicio do layout. `(dashboard)/layout.tsx`.
- [ ] **Calendar touch targets** — Aumentar botoes de navegacao de `size-8` (32px) para `size-11` (44px). `calendar/page.tsx`.
- [ ] **Busca em settings lists** — Adicionar Input de busca em Procedimentos, Campos, Team quando lista > 10 items. `procedimentos-section.tsx`, `campos-section.tsx`, `team-section.tsx`.
- [ ] **Patient tabs: agrupar** — Consolidar Documentos + Imagens + Gravacoes em tab "Arquivos" com sub-navegacao. Reduz de 8 para 6 tabs. `patients/[id]/page.tsx`.
- [ ] **Financial: feedback save** — Na tabela de precos, adicionar toast "Preco atualizado" apos save on blur. `financial/page.tsx`.

---

## Medio (polimento)

- [ ] **Dashboard: tendencia nos KPIs** — Adicionar `<span className="text-xs text-vox-success">↑ 12%</span>` comparando com mes anterior. `dashboard/page.tsx`.
- [ ] **Dashboard: consultas hoje** — Substituir "Gravacoes" por "Consultas Hoje" nos stat cards (mais relevante diariamente). `dashboard/page.tsx`.
- [ ] **aria-labels em botoes de icone** — Adicionar `aria-label` em: delete medicamento (prescricao), remove tag, calendar nav buttons, theme toggle. Varios arquivos.
- [ ] **Tooltip em disabled** — Botao "Salvar" disabled → tooltip "Nenhuma alteracao para salvar". `settings/page.tsx`, forms.
- [ ] **Badge mensagens sidebar** — Mostrar contagem de nao-lidas no item "Mensagens" da sidebar. `nav-sidebar.tsx`.
- [ ] **Notification dropdown keyboard** — Adicionar navegacao por arrow keys no dropdown de notificacoes. `notification-bell.tsx`.
- [ ] **Calendar empty state** — Adicionar overlay "Sem consultas neste periodo" + CTA "Agendar" quando view esta vazia. `calendar/page.tsx`.
- [ ] **Calendar: persistir view** — Salvar preferencia de view (semana/dia/mes/lista) em localStorage. `calendar/page.tsx`.
- [ ] **Mobile calendar default** — Default para "Dia" em mobile (via media query check). `calendar/page.tsx`.
- [ ] **Breadcrumbs consistentes** — Garantir breadcrumb em TODAS as paginas nao-top-level (prescriptions/[id], certificates/[id], financial sub-pages).
- [ ] **Select padronizar** — Substituir todos os `<select>` nativos por shadcn `<Select>` para consistencia visual. `create-certificate-dialog.tsx`, `form-renderer.tsx`.
- [ ] **Atendimentos: busca + filtro data** — Adicionar busca por nome e filtro de periodo na lista de atendimentos. `appointments/page.tsx`.
- [ ] **Patient list: ordenacao** — Adicionar dropdown "Ordenar por: Nome | Ultima consulta | Cadastro". `patient-list-search.tsx`.
- [ ] **Loading.tsx em todas as rotas** — Criar loading.tsx para: patients, financial, settings, calendar. Cada um com skeleton apropriado.
- [ ] **Historico medico: cor amber** — Trocar card verde por amarelo/amber (alergias sao alertas, nao positivos). `patients/[id]/page.tsx`.

---

## Cosmetico

- [ ] **Padronizar gaps** — Substituir gap-0.5 por gap-1, gap-2.5 por gap-3, gap-5 por gap-6 em todo o dashboard. `dashboard/page.tsx`.
- [ ] **Sidebar modo compacto** — Considerar modo so-icones (w-16) entre 768-1024px. `nav-sidebar.tsx`.
- [ ] **Bottom nav focus** — Retornar focus ao botao "Mais" ao fechar sheet. `nav-bottom.tsx`.
- [ ] **Patient: mostrar campos vazios** — Remover "Mostrar todos (7 campos ocultos)" — exibir todos com "-" para vazios. `patients/[id]/page.tsx`.
- [ ] **Patient: barra de completude** — Adicionar "Perfil 85% completo" com progress bar. `patients/[id]/page.tsx`.
- [ ] **Financial: numeros right-align** — Valores monetarios alinhados a direita. `financial/page.tsx`.
- [ ] **Financial: exportar** — Botao "Exportar Excel" no header do financial. `financial/page.tsx`.
- [ ] **Input moeda** — Criar CurrencyInput com formatacao R$ X.XXX,XX. Usar em pricing, financial. Novo componente.
- [ ] **Chart accessibility** — Adicionar aria-label descritivo nos graficos Recharts. `reports/page.tsx`.
- [ ] **DnD calendar keyboard** — Adicionar alternativa keyboard para drag-and-drop (arrow keys + Enter). `calendar/page.tsx`.
- [ ] **Patient: status badge** — Adicionar badge "Ativo"/"Inativo" proximo ao nome. `patients/[id]/page.tsx`.
- [ ] **CEP feedback** — Toast "Endereco preenchido automaticamente" apos auto-fill ViaCEP. `manual-patient-form.tsx`.

---

## Contagem

| Prioridade | Total |
|------------|-------|
| Urgente | 7 |
| Alto | 10 |
| Medio | 15 |
| Cosmetico | 12 |
| **Total** | **44** |
