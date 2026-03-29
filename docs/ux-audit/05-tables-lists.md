# Analise 5: Tabelas e Listas

Data: 2026-03-28

---

## 1. Lista de Pacientes

### Estado atual
- Grid: `grid gap-2 sm:grid-cols-2 xl:grid-cols-3` (cards, nao tabela)
- Cada card: avatar (iniciais), nome (truncado), alerta badge, contato, convenio, tags (max 3 + "+X"), ultima consulta
- Busca: input com icone, debounce 300ms
- Filtros: tags e convenio como badges clicaveis toggle
- Paginacao: Previous/Next com "X / Y"
- Loading: 3 skeleton cards com pulse
- Export: botao Excel (hidden mobile)

### O que esta bom
- Cards em vez de tabela — excelente para responsividade
- Busca com `aria-label`
- Patient links com `aria-label` incluindo nome
- Pagination com `aria-label`
- Loading skeleton mantendo layout do grid
- Filtros visuais (badges toggle) sem modal — direto e rapido
- "Limpar filtros" aparece condicionalmente
- Tags com "+X mais" para nao poluir

### Problemas
- **Sem ordenacao** — nao pode ordenar por nome, ultima consulta, etc.
- **Nomes truncados** podem cortar informacao importante em telas estreitas
- **Contato mostra OU telefone OU email** — se paciente tem ambos, mostra so telefone
- **Sem indicador visual de paciente inativo/ativo**

### Empty states
- Sem resultados de busca: Icone + "Nenhum paciente encontrado" + "Tente buscar por outro nome" — **bom**
- Sem pacientes: Icone + "Nenhum paciente cadastrado" + "Cadastre seu primeiro paciente" — **bom**

### Correcao proposta
```
1. Adicionar dropdown "Ordenar por: Nome | Ultima consulta | Data cadastro"
2. Mostrar telefone E email (telefone principal, email secundario em text-xs)
3. Badge de status ativo/inativo no card
```

---

## 2. Lista de Atendimentos

### Estado atual
- Server-rendered (RSC)
- Layout: lista vertical de cards
- Cada card: data/hora, status badge, nome paciente (link), procedimentos (badges), notas (truncadas)
- Filtro por status: scheduled, completed, cancelled, no-show
- Paginacao: "Anterior | Page X of Y | Proximo"
- Contagem total no header

### Problemas
- **Paginacao usa Links, nao Buttons** — menos acessivel (falta role="button" ou semantica de navegacao)
- **Sem skeleton/loading** — server-rendered, mas navegacao entre paginas nao tem transicao
- **Cards nao tem hover state** — nao fica claro que sao clicaveis
- **Sem busca por paciente** na lista de atendimentos
- **Sem filtro por data** — so por status

### Empty state
- Icone ClipboardList + "Nenhum atendimento encontrado." — **bom**, centralizado

### Correcao proposta
```
1. Adicionar busca por nome do paciente
2. Adicionar filtro por periodo (data inicio/fim)
3. Trocar Links de paginacao por Buttons com aria-label
4. Adicionar hover:shadow-sm nos cards para indicar clicabilidade
```

---

## 3. Tabelas Financeiras

### Estado atual
- Financial page com 9 tabs
- Resumo: KPI cards (receita, consultas, ticket medio) + tabela de procedimentos + transacoes recentes
- Layout: `lg:grid-cols-2 xl:grid-cols-3`
- Tabela de precos: input inline com save on blur

### Problemas
- **Save on blur sem feedback visual** — usuario muda preco, clica fora, nao sabe se salvou
- **Sem botao "Salvar" explicito** na tabela de precos — pattern implicito confuso
- **Numeros possivelmente nao alinhados a direita** — padrao financeiro e right-align para valores
- **Sem filtro de periodo** nas tabs alem de "Resumo" (que tem toggle mes/ano)
- **Sem exportar** dados financeiros

### Empty states
- "Nenhum procedimento registrado no periodo." — **bom**
- "Nenhuma transacao no periodo." — **bom**
- "Nenhum procedimento configurado no workspace." — **bom**
- Mensagens contextuais por secao — **consistente**

### Correcao proposta
```
1. Tabela de precos: mostrar toast "Preco atualizado" apos save on blur
2. Valores monetarios: text-right + formatacao R$ X.XXX,XX
3. Adicionar filtro de periodo em todas as tabs (nao so Resumo)
4. Adicionar botao "Exportar Excel" no header do financial
5. Valores negativos: text-vox-error (vermelho)
```

---

## 4. Listas Diversas

### Prescricoes do paciente
- Lista com data, status, medicamentos — informacao suficiente
- Status com badges (rascunho, assinada, enviada)
- Acao: repetir prescricao para uso continuo

### Historico de consultas
- Timeline cronologica
- Data, procedimento, profissional, resumo IA
- Expansivel para detalhes

### Agenda (calendar)
- Appointment cards com cor por agenda/status
- Nome, procedimento, horario — informacao essencial
- DnD para reagendar

### Conversas WhatsApp
- Inbox com lista de conversas + chat
- Mensagens com timestamp relativo

---

## 5. Empty States — Auditoria Transversal

### Consistentes e bons
- Lista de pacientes (2 variantes: sem resultados / sem pacientes)
- Lista de atendimentos
- Financial (3 variantes por secao)
- Settings sections (procedimentos, campos, agendas, comissoes, formularios)

### Inconsistentes
| Local | Estilo |
|-------|--------|
| Dashboard - Agenda | Icone grande + texto + CTA link |
| Dashboard - Atividade | So texto, sem icone, sem CTA |
| Dashboard - Pacientes Recentes | Icone medio + texto |
| Command Palette | Texto centralizado muted |

### Padroes de empty state encontrados
```
Padrao A (completo): Icone + Titulo + Descricao + CTA
Padrao B (medio): Icone + Texto
Padrao C (minimo): So texto muted
```

### Correcao proposta
```
Padronizar TODOS para Padrao A:
<div className="flex flex-col items-center gap-2 py-8 text-center">
  <Icon className="size-8 text-muted-foreground/30" />
  <p className="text-sm font-medium text-muted-foreground">Titulo</p>
  <p className="text-xs text-muted-foreground/70">Descricao de ajuda</p>
  <Button variant="outline" size="sm">CTA →</Button> {/* quando aplicavel */}
</div>
```

---

## Score: 7/10

### Excelente
- Patient list como cards (nao tabela) — responsivo naturalmente
- Busca com debounce e filtros visuais
- Empty states na maioria das listas
- Loading skeletons na lista de pacientes
- Paginacao funcional

### Precisa melhorar
- Sem ordenacao na lista de pacientes
- Sem busca/filtro de data nos atendimentos
- Financial save-on-blur sem feedback
- Empty states inconsistentes entre paginas
- Sem exportacao no financial
