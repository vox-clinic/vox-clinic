# Analise 8: Estados da Interface

Data: 2026-03-28

---

## 1. Loading States

### Inventario

| Pagina/Componente | Loading state | Tipo | Adequado? |
|-------------------|---------------|------|-----------|
| Dashboard | **NENHUM** | - | CRITICO — pagina fica em branco |
| Patient list | 3 skeleton cards | Skeleton | Bom |
| Patient profile | Delegado a tabs | Varies | OK |
| Settings hero | Skeleton h-44, tab h-10, content h-48 | Skeleton | Bom |
| Settings sections | Skeleton por secao | Skeleton | Bom |
| Calendar | Spinner centralizado | Spinner | Poderia ser skeleton |
| Financial | 3 skeleton cards + h-64 | Skeleton | Bom |
| Appointments | Nenhum (SSR) | - | OK (server render) |
| Command palette | Spinner no icone de busca | Inline spinner | Excelente |
| Voice registration | Spinner + skeleton fields | Combinado | Bom |

### Problemas
1. **Dashboard sem loading** — CRITICO. Primeira tela que o usuario ve todo dia, fica em branco ate carregar
2. **Calendar usa spinner** em vez de skeleton — menos profissional
3. **Sem Suspense boundaries** nos async components

### Correcao proposta
```
1. URGENTE: Criar src/app/(dashboard)/dashboard/loading.tsx
   - Skeleton para greeting card
   - 4 skeleton cards para stats
   - 4 skeleton cards para quick actions
   - 2 skeleton cards lado a lado para agenda + atividade

2. Calendar: trocar spinner por skeleton que mostra grade de horarios vazia

3. Adicionar loading.tsx em CADA rota:
   - /patients/loading.tsx
   - /financial/loading.tsx
   - /settings/loading.tsx
   - /calendar/loading.tsx
```

### Botoes durante submit
| Componente | Estado submit | Adequado? |
|------------|---------------|-----------|
| Manual patient form | "Salvando..." + spinner | Bom |
| Voice patient form | "Salvando..." + spinner + disabled | Bom |
| Settings save | "Salvando..." + spinner → "Salvo!" + check (2s) | Excelente |
| Prescription dialog | Spinner + disabled | Bom |
| Certificate dialog | Spinner + disabled | Bom |
| Calendar schedule | Verificar | - |

---

## 2. Error States

### Inventario

| Tipo de erro | Implementacao | Adequado? |
|-------------|---------------|-----------|
| Validacao de campo | Texto vermelho abaixo do input | Bom |
| Erro de server action | Toast.error com mensagem pt-BR | Bom |
| Erro de rede | Toast generico | Poderia ser melhor |
| Crash de componente | **Sem error boundary visivel** | PROBLEMA |
| Permissao negada | Redirect para dashboard | Funcional |
| 404 | Next.js default | Poderia ser customizado |

### Problemas
1. **Sem Error Boundary customizado** — se um componente crasha, tela inteira fica branca
2. **Erro de rede generico** — deveria distinguir "sem internet" de "servidor fora"
3. **404 page nao customizada** — perde branding

### Correcao proposta
```
1. Criar src/app/error.tsx (global error boundary)
   - Mostrar: icone triste + "Algo deu errado" + "Tentar novamente" + "Voltar ao dashboard"
   - Log erro para Sentry

2. Criar src/app/not-found.tsx
   - Mostrar: icone 404 + "Pagina nao encontrada" + "Voltar ao dashboard"
   - Manter branding (logo, cores)

3. Criar componente ErrorBoundary reutilizavel para secoes criticas
```

---

## 3. Empty States

### Auditoria completa

| Local | Icone | Titulo | Descricao | CTA | Score |
|-------|-------|--------|-----------|-----|-------|
| Dashboard - Agenda | CalendarX2 | "Nenhuma consulta" | "Agendar primeira" | Link | 9/10 |
| Dashboard - Atividade | Nenhum | Texto simples | Nenhuma | Nenhum | 3/10 |
| Dashboard - Pacientes | UserX | "Nenhum paciente" | Texto breve | Nenhum | 5/10 |
| Patient list - busca | Icone | "Nenhum encontrado" | "Tente outro nome" | Nenhum | 7/10 |
| Patient list - vazio | Icone | "Nenhum cadastrado" | "Cadastre primeiro" | Nenhum | 7/10 |
| Appointments - vazio | ClipboardList | "Nenhum atendimento" | Nenhuma | Nenhum | 6/10 |
| Financial - resumo | Nenhum | Texto simples | Nenhuma | Nenhum | 4/10 |
| Settings - sections | Icone | Titulo | Descricao ajuda | Nenhum | 7/10 |
| Command palette | Nenhum | "Nenhum resultado" | Nenhuma | Nenhum | 5/10 |
| Notification bell | Bell | "Nenhuma notificacao" | Nenhuma | Nenhum | 6/10 |

### Padrao ideal
```tsx
<EmptyState
  icon={Calendar}
  title="Nenhuma consulta agendada"
  description="Agende sua primeira consulta para comecar"
  action={{ label: "Agendar consulta", href: "/calendar" }}
/>
```

### Problemas
- **3+ estilos diferentes** de empty state
- **Maioria sem CTA** — usuario fica parado sem saber o proximo passo
- **Dashboard Atividade e Financial Resumo** sao os piores — so texto sem visual

---

## 4. Success States

### Inventario
| Acao | Feedback | Adequado? |
|------|----------|-----------|
| Salvar paciente | Toast success + redirect | Bom |
| Salvar prescricao | Toast + abre nova tab | Bom |
| Salvar certificado | Toast + abre nova tab | Bom |
| Salvar settings | "Salvo!" inline (2s) + check icon | Excelente |
| Agendar consulta | Toast + fecha modal | Bom |
| Deletar item | Toast success | Bom |
| Importar CSV | Toast com contagem | Bom |

### O que esta bom
- Feedback consistente via toast (sonner)
- Settings tem feedback inline (mais imediato que toast)
- Redirects apos criacao levam ao item criado

### Problemas menores
- **Sem "desfazer"** em nenhuma acao destrutiva (deletar paciente, remover procedimento)
- **Toast position:** verificar se nao e coberto por bottom nav em mobile

---

## 5. Disabled States

### Inventario
| Elemento | Visual disabled | Tooltip? |
|----------|----------------|----------|
| Botao submit | opacity-50 + cursor-not-allowed | Nao |
| Input readonly | Background cinza | Nao |
| Permission-gated items | Hidden (nao disabled) | N/A |
| Botao sem permissao | Hidden | N/A |

### Problemas
- **Itens gated por permissao sao HIDDEN, nao DISABLED** — usuario nao sabe que a funcionalidade existe
- **Nenhum tooltip explica POR QUE esta disabled** — ex: "Salvar" disabled deveria dizer "Nenhuma alteracao feita"
- **Sem diferenca visual entre readonly e disabled**

### Correcao proposta
```
1. Botoes submit disabled: adicionar tooltip "Nenhuma alteracao para salvar"
2. Features gated: mostrar como disabled + tooltip "Upgrade para Pro" ou "Peca permissao ao admin"
3. Diferenciar readonly (borda pontilhada + bg-muted) de disabled (opacity-50)
```

---

## Score: 5/10

### Critico
- Dashboard sem loading state
- Sem error boundary customizado
- Sem 404 customizada

### Bom
- Botoes com estado de submit consistente
- Toast para success/error uniforme
- Settings com feedback inline excelente
- Skeletons na maioria das paginas

### Precisa melhorar
- Empty states inconsistentes (3+ estilos)
- Sem "desfazer" em acoes destrutivas
- Disabled sem tooltip explicativo
- Calendar com spinner em vez de skeleton
