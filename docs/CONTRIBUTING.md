# Contributing — VoxClinic

Guia de workflow para a equipe de desenvolvimento.

## Git Workflow

### Branches

```
main                    ← produção (deploy automático via Vercel)
  └── feat/nome-curto   ← feature branches (vida curta)
  └── fix/nome-curto    ← bug fixes
  └── chore/nome-curto  ← refactor, docs, config
```

**Regras:**
- **Nunca commitar direto na `main`** — sempre via Pull Request
- Branches devem ter vida curta (1-3 dias max)
- Deletar a branch depois do merge

### Convenção de Nomes

| Tipo | Branch | Exemplo |
|------|--------|---------|
| Feature | `feat/nome-curto` | `feat/prescription-pdf` |
| Bug fix | `fix/nome-curto` | `fix/calendar-conflict` |
| Refactor/docs | `chore/nome-curto` | `chore/update-deps` |

### Commits (Conventional Commits)

```
tipo: descrição curta em português ou inglês

Exemplos:
feat: adicionar geração de PDF para prescrições
fix: corrigir conflito de horário no calendário
chore: atualizar dependências e docs
refactor: extrair componente de medicação
test: adicionar testes para financial actions
```

Tipos válidos: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`, `perf`

## Workflow Diário

### 1. Pegar uma tarefa

```bash
# Sincronizar com main
git checkout main
git pull origin main

# Criar branch
git checkout -b feat/minha-feature
```

### 2. Desenvolver

Seguir o Development Workflow do CLAUDE.md:

1. **Feature doc** → `docs/features/<name>.md` (se for feature nova)
2. **Implementar** → código + testes
3. **QA local** (obrigatório antes de push):
   ```bash
   npx prisma validate
   npx tsc --noEmit
   npm test
   ```
4. **Docs** → atualizar se necessário

### 3. Push e Pull Request

```bash
git push -u origin feat/minha-feature
```

Criar PR no GitHub com:
- Título curto e descritivo
- Descrição do que mudou e por quê
- Screenshots se for UI
- Marcar reviewer

### 4. Code Review

**Autor:**
- PR deve ter QA passando (CI verde)
- Descrever decisões não-óbvias
- Responder comentários prontamente

**Reviewer:**
- Verificar: segurança (workspaceId, RBAC), tipos, testes
- Aprovar ou pedir mudanças com comentários claros
- Não bloquear por estilo — só por bugs, segurança, ou lógica

### 5. Merge

- **Squash and merge** (1 commit limpo por PR)
- Deletar a branch depois do merge
- Vercel faz deploy automático da main

## CI Pipeline

O CI roda automaticamente em push e PRs para main:

| Job | O que verifica |
|-----|---------------|
| Quality Checks | prisma validate, tsc --noEmit, lint, npm audit |
| Unit Tests | vitest com cobertura |
| E2E Tests | Playwright (chromium) |

**O PR só pode ser mergeado se Quality + Unit Tests passarem.**

## Checklist antes de abrir PR

- [ ] `npx prisma validate` — schema válido
- [ ] `npx tsc --noEmit` — zero erros de tipo
- [ ] `npm test` — todos os testes passando
- [ ] Sem `console.log` em código de produção (usar `logger`)
- [ ] Mutations usam `safeAction()` wrapper
- [ ] Queries filtram por `workspaceId`
- [ ] Operações destrutivas verificam `requirePermission()`
- [ ] Textos de UI em pt-BR
- [ ] Feature doc atualizado (se aplicável)

## O que NÃO fazer

- Push direto na main
- Merge sem CI verde
- Pular testes locais
- Commitar `.env`, credenciais, ou secrets
- Ignorar erros de TypeScript com `@ts-ignore`
- Queries sem filtro de workspaceId
- Mutations sem safeAction

## Comunicação

- **Issues** → GitHub Issues com label e assignee
- **PRs** → Mencionar o reviewer com @
- **Dúvidas** → Comentar na issue ou PR relevante
- **Board** → [VoxClinic Roadmap](https://github.com/orgs/vox-clinic/projects/1)
