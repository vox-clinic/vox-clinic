# Onboarding Revamp

## Problema

O onboarding atual tem 4 passos genéricos e pouca orientação. Problemas:
- Step 2 (perguntas) pode ser pulado sem validação
- Step 3 só pede o nome da clínica — podia coletar mais
- Step 4 (preview IA) é denso e confuso para quem nunca usou o sistema
- Se a IA falha, o workspace fica vazio sem aviso
- Não coleta informações essenciais: horário de atendimento, duração padrão de consulta
- Tour pós-onboarding não tem visualização (infra existe mas UI não)
- Nenhuma validação de campos

## Solução

Onboarding em **6 passos** com progress bar visual, validação em cada passo, e dados que realmente importam para o dia 1.

## Novo Fluxo (6 Steps)

### Step 1 — Boas-vindas + Profissão
- Mensagem de boas-vindas personalizada com nome do Clerk
- Grid de profissões com ícones e descrição curta
- Animação suave ao selecionar
- **Valida:** profissão obrigatória

### Step 2 — Sobre sua prática
- Perguntas contextuais por profissão (manter as existentes)
- Adicionar: volume de pacientes/mês, já usa sistema, de onde vem (indicação?)
- **Valida:** pelo menos 1 resposta

### Step 3 — Dados da clínica
- Nome da clínica (obrigatório)
- Telefone (opcional, com máscara)
- Horário de atendimento: hora início + hora fim (Select)
- Duração padrão de consulta: 15/20/30/45/60 min (Select)
- Fuso horário (pré-preenchido com America/Sao_Paulo)
- **Valida:** nome obrigatório, horários válidos

### Step 4 — Preview IA (simplificado)
- Loading com animação "Configurando seu workspace com IA..."
- Mostra cards resumidos (não tabelas editáveis):
  - X procedimentos sugeridos
  - X campos customizados
  - X perguntas de anamnese
- Botão "Personalizar depois" (aceita tudo) + "Revisar e editar"
- Se IA falhar: fallback com config padrão por profissão + aviso
- **Não bloqueia:** pode seguir sem IA

### Step 5 — Primeira agenda
- Criar a agenda padrão com o nome
- Configurar dias de atendimento (checkboxes seg-sab)
- Preview visual do horário semanal
- **Valida:** pelo menos 1 dia selecionado

### Step 6 — Tudo pronto!
- Resumo visual do que foi configurado (checklist com ✓)
- "Ir para o painel" (botão primário)
- "Ver tour guiado" (botão secundário — lança o tour)
- Confetti ou animação de celebração

## Dados coletados no onboarding (novos)

| Campo | Onde salva | Default |
|-------|-----------|---------|
| Horário início | BookingConfig.startHour | 8 |
| Horário fim | BookingConfig.endHour | 18 |
| Duração consulta | Workspace.procedures[0].duration | 30 |
| Dias atendimento | Agenda.workDays (novo campo ou JSON) | seg-sex |
| Telefone clínica | User.phone ou Workspace | null |

## Melhorias técnicas

- Validação com Zod em cada step
- Fallback de IA: config padrão por profissão (hardcoded)
- SessionStorage para persistir progresso entre refreshes
- Animações com `motion` (já instalado)
- Error boundary com retry
- Loading states em cada transição
- Mobile-first (todos os steps responsivos)

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/app/onboarding/page.tsx` | Reescrever (6 steps) |
| `src/app/onboarding/professions.ts` | Manter + expandir |
| `src/app/onboarding/steps/` | Novo: componentes por step |
| `src/server/actions/workspace.ts` | Atualizar generateWorkspace para novos campos |
| `prisma/schema.prisma` | Possivelmente: workDays no Agenda |

## Fora de escopo (por agora)

- Tour visual (implementar separado)
- Team onboarding (membro convidado)
- Onboarding analytics
