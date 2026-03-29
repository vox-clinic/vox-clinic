# Analise 2: Dashboard

Data: 2026-03-28

---

## 1. Stat Cards

### Estado atual
4 cards: Pacientes (total), Este Mes (consultas), Agendados (futuros), Gravacoes (total)
- Layout: `grid-cols-2 lg:grid-cols-4`
- Cada card: icone + label + numero

### Problemas
- **Cards nao sao clicaveis** — deviam levar para a pagina correspondente (pacientes, calendario, etc.)
- **Sem indicador de tendencia** — falta "↑ 12% vs mes anterior" para dar contexto ao numero
- **Metricas incompletas** — faltam KPIs criticos:
  - Faturamento do mes (R$)
  - Consultas hoje (urgente pra rotina matinal)
  - Taxa de no-show (metrica de eficiencia)
  - NPS score (satisfacao)
- **Todos os cards tem o mesmo peso visual** — o mais importante (ex: consultas hoje) deveria ser maior ou ter cor diferente
- **Sem diferenciacao por cor** — todos usam o mesmo estilo de card

### Correcao proposta
```
1. Tornar cards clicaveis com Link wrapper + hover:shadow-md + cursor-pointer
2. Adicionar tendencia: <span className="text-xs text-vox-success">↑ 12%</span>
3. Considerar card duplo para "Hoje" (span 2 colunas) com agenda inline
4. Trocar "Gravacoes" (pouco util diariamente) por "Faturamento Mes"
```

---

## 2. Quick Actions

### Estado atual
4 botoes: Nova Consulta, Cadastro por Voz, Novo Paciente, Agendar
- Layout: `grid-cols-2 lg:grid-cols-4`
- Cada botao: icone + label

### Problemas
- **Ordem pode nao refletir frequencia real** — "Nova Consulta" deveria ser sempre primeiro (e ja e, bom)
- **Visual:** Parecem cards informativos ou parecem botoes clicaveis? Verificar se hover state e claro o suficiente
- **Em mobile:** 2 colunas — OK, caem acima do fold

### O que esta bom
- Acoes relevantes para o dia-a-dia
- Icones distinguiveis
- Responsivo com grid

---

## 3. Agenda de Hoje + Atividade Recente

### Estado atual
Layout side-by-side: `lg:grid-cols-2`
- Esquerda: "Proxima Consulta" + "Agenda de Hoje" (lista)
- Direita: "Atividade Recente" (lista)

### Problemas
- **Agenda de Hoje deveria ser dominante** — ocupa apenas 50% da largura. Em um CRM medico, a agenda do dia e a informacao #1
- **Empty state inconsistente:**
  - Agenda: icone CalendarX2 + texto + link "Agendar consulta →" — **bom**
  - Atividade: apenas texto "Nenhuma atividade recente." — **fraco**, sem icone, sem CTA
- **Informacoes de consulta em mobile:** procedimento escondido com `hidden sm:flex` — perde contexto
- **Atividade recente:** nao mostra detalhes suficientes (tipo de atividade, paciente envolvido)

### Correcao proposta
```
1. Agenda: mudar para lg:col-span-2 ou pelo menos 60/40 split
2. Atividade empty state: adicionar icone Activity + texto "As atividades do dia aparecerão aqui"
3. Mobile: mostrar procedimento como badge abaixo do nome (nao ao lado)
4. Atividade: adicionar tipo de acao + link para o paciente
```

---

## 4. Busca Rapida + Pacientes Recentes

### Estado atual
- Busca rapida: componente QuickSearch na parte inferior da pagina
- Pacientes recentes: lista com avatar + nome + ultima consulta

### Problemas
- **Busca muito abaixo** — precisa scroll para acessar. Profissional com paciente na frente nao vai scrollar
- **Cmd+K existe mas nao e obvio** — novo usuario nao sabe que existe
- **Pacientes recentes:** mostra info basica — bom para acesso rapido

### Correcao proposta
```
1. Mover busca para o topo OU tornar mais proeminente o hint de Cmd+K no header
2. Adicionar tooltip "Dica: use Ctrl+K para busca rapida" na primeira visita
3. Considerar busca inline no proprio header da pagina (nao em secao separada)
```

---

## 5. Layout Geral

### Problemas
- **Scroll excessivo** — para ver tudo (stats + actions + agenda + atividade + busca + recentes), precisa scroll significativo
- **Acima do fold:** Stats + Quick Actions — bom, mas Agenda (o mais importante) fica abaixo
- **Espaco lateral:** em monitores grandes (1440px+), conteudo fica centralizado mas com margens generosas — aceitavel

### Loading States
- **CRITICO: Nenhum skeleton/loading state no dashboard** — pagina fica em branco ate os dados chegarem
- Async page component sem Suspense boundary ou loading.tsx

### Correcao proposta
```
1. Criar src/app/(dashboard)/dashboard/loading.tsx com skeletons
2. Reorganizar: Stats → Agenda de Hoje (grande) → Quick Actions → Atividade Recente → Pacientes Recentes
3. A agenda deve estar acima do fold em QUALQUER viewport
```

---

## Score: 6/10

### Bom
- Quick actions relevantes e bem posicionadas
- Grid responsivo funciona
- Empty state da agenda com CTA
- Greeting contextual (Bom dia/tarde/noite)

### Precisa melhorar
- Sem loading states (critico)
- Cards nao clicaveis
- Sem tendencias nos KPIs
- Agenda nao e proeminente o suficiente
- Empty states inconsistentes
- Busca muito abaixo do fold
- Faltam KPIs criticos (faturamento, consultas hoje)
