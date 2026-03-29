# Inventario Completo de Telas e Componentes — VoxClinic

Data: 2026-03-28

---

## Paginas (47 total)

### Publicas (6)
| Rota | Arquivo | Funcao |
|------|---------|--------|
| `/` | `src/app/page.tsx` | Landing page / redirect auth |
| `/onboarding` | `src/app/onboarding/page.tsx` | Wizard 5 etapas (profissao, perguntas, clinica, revisao, conclusao) |
| `/docs` | `src/app/docs/page.tsx` | Documentacao de features (118 features, 11 categorias) |
| `/privacidade` | `src/app/privacidade/page.tsx` | Politica de privacidade LGPD |
| `/termos` | `src/app/termos/page.tsx` | Termos de uso |
| `/dpo` | `src/app/dpo/page.tsx` | Formulario DPO (direitos LGPD) |

### Auth (2)
| Rota | Arquivo | Funcao |
|------|---------|--------|
| `/sign-in` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Login via Clerk |
| `/sign-up` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Cadastro via Clerk |

### Dashboard (31)
| Rota | Arquivo | Funcao |
|------|---------|--------|
| `/dashboard` | `dashboard/page.tsx` | Home — KPIs, agenda do dia, acoes rapidas, atividade recente |
| `/appointments` | `appointments/page.tsx` | Lista de atendimentos com filtro de status |
| `/appointments/new` | `appointments/new/page.tsx` | Nova consulta — selecionar paciente + gravar audio |
| `/appointments/review` | `appointments/review/page.tsx` | Revisar dados extraidos pela IA antes de salvar |
| `/appointments/processing/[recordingId]` | `appointments/processing/[recordingId]/page.tsx` | Polling de progresso (transcricao + IA) |
| `/appointments/[id]/receipt` | `appointments/[id]/receipt/page.tsx` | Recibo de consulta (impressao) |
| `/calendar` | `calendar/page.tsx` | Calendario semana/dia/mes/lista com DnD |
| `/patients` | `patients/page.tsx` | Lista de pacientes com busca, tags, filtros |
| `/patients/new` | `patients/new/page.tsx` | Escolha: cadastro por voz ou manual |
| `/patients/new/voice` | `patients/new/voice/page.tsx` | Cadastro por voz com revisao de dados extraidos |
| `/patients/new/manual` | `patients/new/manual/page.tsx` | Formulario manual completo |
| `/patients/[id]` | `patients/[id]/page.tsx` | Perfil do paciente — 8 tabs |
| `/patients/[id]/prescricao` | `patients/[id]/prescricao/page.tsx` | Editor de prescricao |
| `/patients/[id]/report` | `patients/[id]/report/page.tsx` | Relatorio imprimivel do paciente |
| `/prescriptions/[id]` | `prescriptions/[id]/page.tsx` | Visualizar prescricao (imprimir, PDF, WhatsApp, email) |
| `/certificates/[id]` | `certificates/[id]/page.tsx` | Visualizar atestado/declaracao/encaminhamento/laudo |
| `/financial` | `financial/page.tsx` | Dashboard financeiro — 9 tabs |
| `/teleconsulta/[id]` | `teleconsulta/[id]/page.tsx` | Sala de video (Daily.co) |
| `/mensagens` | `mensagens/page.tsx` | Inbox WhatsApp — conversas e chat |
| `/reports` | `reports/page.tsx` | Analytics — graficos, KPIs, NPS |
| `/settings` | `settings/page.tsx` | Configuracoes — 13 tabs + 2 links externos |
| `/settings/billing` | `settings/billing/page.tsx` | Plano, uso, upgrade |
| `/settings/audit` | `settings/audit/page.tsx` | Log de auditoria (67+ tipos de acao) |
| `/settings/form-builder/[id]` | `settings/form-builder/[id]/page.tsx` | Construtor de formularios customizados |
| `/settings/whatsapp` | `settings/whatsapp/page.tsx` | Setup WhatsApp Business |
| `/settings/tiss` | `settings/tiss/page.tsx` | Configuracao TISS (operadoras) |
| `/settings/import` | `settings/import/page.tsx` | Importacao CSV de pacientes |
| `/settings/migration` | `settings/migration/page.tsx` | Migracao de banco de dados externo |

### Admin (4)
| Rota | Arquivo | Funcao |
|------|---------|--------|
| `/admin` | `admin/page.tsx` | Dashboard admin — KPIs globais, distribuicao de planos |
| `/admin/workspaces` | `admin/workspaces/page.tsx` | Gestao de workspaces |
| `/admin/usuarios` | `admin/usuarios/page.tsx` | Lista de usuarios |
| `/admin/roadmap` | `admin/roadmap/page.tsx` | Tracker de roadmap |

### Publicas Compartilhaveis (4)
| Rota | Arquivo | Funcao |
|------|---------|--------|
| `/booking/[token]` | `booking/[token]/page.tsx` | Agendamento online (publico) |
| `/nps/[token]` | `nps/[token]/page.tsx` | Pesquisa NPS (publico) |
| `/sala/[token]` | `sala/[token]/page.tsx` | Sala de teleconsulta (paciente) |
| `/verificar/[token]` | `verificar/[token]/page.tsx` | Verificacao de documento digital |

---

## Componentes (76 total)

### Root Level — Custom (15)
| Componente | Funcao |
|------------|--------|
| `nav-sidebar.tsx` | Sidebar desktop com RBAC e indicador ativo |
| `nav-bottom.tsx` | Bottom nav mobile com sheet "Mais" |
| `command-palette.tsx` | Busca global Cmd+K (pacientes, paginas, acoes) |
| `breadcrumb.tsx` | Navegacao hierarquica |
| `notification-bell.tsx` | Dropdown de notificacoes com polling 60s |
| `theme-toggle.tsx` | Toggle dark/light mode |
| `record-button.tsx` | Botao de gravacao com waveform, timer, consentimento LGPD |
| `confirm-dialog.tsx` | Dialog de confirmacao reutilizavel |
| `create-prescription-dialog.tsx` | Modal de prescricao com interacoes medicamentosas |
| `create-certificate-dialog.tsx` | Modal de atestado/declaracao/encaminhamento/laudo |
| `prescription-template-picker.tsx` | Browser de templates de prescricao |
| `form-renderer.tsx` | Renderizador de formularios dinamicos (11 tipos de campo) |
| `cid-autocomplete.tsx` | Autocomplete CID-10 com busca debounced |
| `medication-autocomplete.tsx` | Autocomplete de medicamentos com favoritos |
| `teleconsulta-badge.tsx` | Badge/link de teleconsulta |

### shadcn/ui (23)
accordion, alert-dialog, alert, avatar, badge, button, card, dialog, dropdown-menu, input, label, popover, progress, select, separator, sheet, skeleton, switch, table, tabs, textarea, tooltip, sonner

### Animacao/Visual — Landing (17)
animated-beam, animated-gradient-text, avatar-circles, bento-grid, blur-fade, border-beam, globe, magic-card, marquee, number-ticker, particles, ripple, safari, shine-border, typing-animation, word-rotate

### Landing Page (13 secoes)
landing-page, nav-bar, hero-section, social-proof-bar, features-bento-section, ai-showcase-section, how-it-works-section, professions-section, security-section, testimonials-section, pricing-section, faq-section, final-cta-section

### Tour (2)
tour-provider, tour-steps

### Settings Sections (13)
clinica-section, procedimentos-section, campos-section, formularios-section, team-section, agendas-section, booking-section, messaging-section, aparencia-section, comissoes-section, gateway-section, plano-section, booking-widget-section

---

## Layouts

| Arquivo | Escopo | Fornece |
|---------|--------|---------|
| `src/app/layout.tsx` | Global | Clerk, ThemeProvider, Toaster, fonts, metadata, SW |
| `src/app/(auth)/layout.tsx` | Auth | Sidebar branded + area de conteudo |
| `src/app/(dashboard)/layout.tsx` | Dashboard | Header sticky, NavSidebar, NavBottom, CommandPalette, NotificationBell, TourProvider |
| `src/app/(admin)/layout.tsx` | Admin | Header admin, nav, "Voltar ao app" |
| `src/app/sala/layout.tsx` | Teleconsulta paciente | Background cinza minimalista |
| `src/app/(dashboard)/settings/layout.tsx` | Settings | Permission check (settings.view) |

---

## Design System

| Token | Valor |
|-------|-------|
| Primary | `#14B8A6` (teal) — `bg-vox-primary` |
| Success | `#10B981` |
| Warning | `#F59E0B` |
| Error | `#EF4444` |
| Font | Inter (sans), JetBrains Mono (mono) |
| Border Radius | `0.625rem` base, escalas sm→4xl |
| Cards | `rounded-2xl`, `border-border/40` |
| Inputs | `h-10`, `rounded-xl` |
| Buttons | `rounded-xl`, `h-9` |
| Cor space | oklch |
| Dark mode | Sim, com tint teal |
| Print | @media print com A4, margens 1.5cm/2cm |
