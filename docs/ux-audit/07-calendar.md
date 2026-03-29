# Analise 7: Calendario e Agendamento

Data: 2026-03-28

---

## 1. Views

### Estado atual
4 views: Semana (default), Dia, Mes, Lista
- Toggle group com botoes
- Labels escondidos em mobile (`hidden sm:inline`) — so icones
- Troca entre views e client-side (sem reload)

### Problemas
- **View padrao "Semana"** — correto para desktop, mas em mobile "Dia" seria mais pratico
- **Sem persistencia de preferencia** — cada vez que entra, volta para Semana
- **DnD em mobile:** touch events podem conflitar com scroll

### O que esta bom
- 4 views cobrem todos os casos de uso
- Toggle group com visual claro de selecao
- Badge com contagem de consultas do periodo

### Correcao proposta
```
1. Mobile: default para view "Dia" (via media query ou user preference)
2. Persistir preferencia de view em localStorage
3. Testar DnD touch em dispositivos reais
```

---

## 2. Appointment Cards

### Estado atual
- Cor por agenda/status
- Informacao: nome, procedimento, horario, status
- Click abre detalhes/edicao
- Status actions: confirmar, cancelar, marcar como atendido

### O que esta bom
- Cores distinguem agendas
- Informacao essencial visivel no card
- Acoes de status acessiveis

### Problemas
- **Verificar contraste das cores** — cores customizadas de agenda podem ter baixo contraste com texto
- **Cards muito curtos em view semanal** — consultas de 15min ficam com pouco espaco para info

### Correcao proposta
```
1. Garantir min-height para cards curtos (mostrar pelo menos nome)
2. Tooltip no hover com informacao completa quando card esta truncado
3. Validar contraste WCAG AA para todas as cores de agenda
```

---

## 3. Criacao de Agendamento

### Estado atual
- Modal/form via ScheduleForm component
- Busca de paciente inline
- Selecao de procedimento
- Preco aparece automaticamente baseado no procedimento

### O que esta bom
- Busca de paciente inline (nao precisa sair da tela)
- Preco automatico por procedimento
- Selecao de agenda quando multiplas existem

### Problemas
- **Verificar se conflitos sao mostrados ANTES de salvar** — essencial
- **Verificar se modal e grande o suficiente** para todos os campos

### Correcao proposta
```
1. Mostrar warning de conflito em tempo real ao selecionar horario
2. Sugerir proximo horario disponivel quando ha conflito
```

---

## 4. Bloqueios de Horario

### Estado atual
- BlockTimeForm component separado
- Visual distinguivel de consultas (verificar)
- Recorrencia: diario, semanal, mensal

### Problemas
- **Verificar se bloqueios sao visualmente diferentes de consultas** — padrao e usar cor diferente (cinza) ou pattern (listras)
- **Editar/remover:** deve ser acessivel com click + confirm dialog

---

## 5. Mobile

### Estado atual
- Header: `flex-col sm:flex-row` — empilha em mobile
- Navigation buttons: `size-8` (32px) — pode ser pequeno para touch (recomendado 44px)
- View labels: `hidden sm:inline` — so icones em mobile
- Action buttons: texto escondido em mobile

### Problemas
- **Botoes de navegacao 32px** — abaixo do minimo 44px recomendado para touch targets
- **So icones nos botoes de view** — usuario pode nao saber diferenca entre "Semana" e "Mes"
- **Toque em slot para criar** — verificar se funciona naturalmente

### Correcao proposta
```
1. Aumentar touch targets para min 44px (size-11)
2. Adicionar labels abreviados nos view buttons (Sem, Dia, Mes, List)
3. Long press em slot = criar agendamento (com haptic feedback se possivel)
```

---

## 6. Loading e Empty States

### Loading
- Spinner centralizado + "Carregando agenda..." — **funcional mas poderia ser skeleton**
- Sem skeleton por view — mesmo spinner para todas

### Empty states
- Sem estado explicito para "0 consultas hoje" — view simplesmente mostra vazia
- Deveria ter mensagem: "Nenhuma consulta agendada para hoje. Agendar?"

### Correcao proposta
```
1. Trocar spinner por skeleton que respeita a view atual (slots vazios)
2. Adicionar empty state overlay: "Sem consultas neste periodo" + CTA "Agendar"
```

---

## Score: 7/10

### Excelente
- 4 views cobrem todos os cenarios
- DnD implementado
- Conflitos detectados
- Badge de contagem no header
- Multiplas agendas suportadas
- Waitlist implementada

### Precisa melhorar
- Touch targets muito pequenos (32px)
- Sem persistencia de preferencia de view
- Loading spinner em vez de skeleton
- Sem empty state para periodos vazios
- Mobile view default deveria ser "Dia"
