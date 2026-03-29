# Analise 6: Perfil do Paciente (tela mais importante)

Data: 2026-03-28

---

## 1. Header do Paciente

### Estado atual
- Avatar circular (14x14) com iniciais
- Fundo gradient no hero section
- Nome: h1, 20px bold
- Metadados inline: CPF, telefone, email, nascimento, convenio — cada um com icone + texto `[11px]`
- Tags como badges abaixo dos metadados
- Alertas em badges vermelhos
- 5 botoes de acao + dropdown "Mais" a direita

### Problemas
- **Metadados em `text-[11px]`** — muito pequeno, especialmente em mobile. Profissional com paciente na frente nao vai conseguir ler CPF a 11px
- **5 botoes + dropdown competem com info do paciente** — header fica sobrecarregado
- **Em mobile (`flex-wrap`)**: botoes fazem wrap para multiplas linhas, criando header enorme que empurra o conteudo para baixo
- **Falta idade calculada** — nascimento esta la, mas profissional quer ver "34 anos" direto, nao calcular mentalmente
- **Falta status ativo/inativo** visivel no header
- **Avatar poderia ter foto** quando disponivel (upload de foto do paciente)

### Correcao proposta
```
1. Metadados: aumentar para text-xs (12px) minimo
2. Adicionar idade calculada: "12/05/1992 (34 anos)"
3. Botoes: em mobile, mover TODOS para dropdown "Acoes ▾" (1 botao)
4. Desktop: manter 2-3 botoes primarios + dropdown para o resto
5. Adicionar badge de status "Ativo" (verde) / "Inativo" (cinza) proximo ao nome
6. Header hero: reduzir padding vertical em mobile para nao ocupar tanto espaco
```

---

## 2. Tab Resumo

### Estado atual
- "Dados Pessoais" card com botao "Editar"
- Campos mostrados: nome, CPF, telefone, email, nascimento, sexo + campos customizados
- "Mostrar todos (7 campos ocultos)" — toggle para campos vazios
- Historico Medico (card verde): alergias, doencas cronicas, medicacoes
- Alertas (card vermelho): alertas clinicos
- "Autoriza receber mensagens via WhatsApp" toggle
- "Dados Complementares" customizados por profissao

### Problemas
- **"7 campos ocultos"** — por que esconder? Se o profissional esta no perfil, provavelmente quer ver tudo. Esconder cria clique extra desnecessario
- **Historico medico em card verde** — a cor verde pode confundir (verde = sucesso/positivo). Para alergias e doencas, vermelho ou amarelo seria mais apropriado
- **Toggle WhatsApp** esta misturado com dados clinicos — deveria estar em uma secao "Comunicacao" separada
- **Sem indicador de completude** — profissional nao sabe se o perfil esta 70% ou 100% preenchido

### Correcao proposta
```
1. Mostrar todos os campos por default (remover toggle de ocultar)
   - Campos vazios: mostrar como "—" em cinza, nao esconder
2. Historico Medico: trocar de verde para amarelo/amber (card warning)
   - Alergias sao alertas, nao coisas positivas
3. Mover toggle WhatsApp para secao propria ou settings do paciente
4. Adicionar barra de completude: "Perfil 85% completo — falta: endereco, convenio"
```

---

## 3. Tab Historico

### Estado atual
- Timeline cronologica de consultas
- Cada consulta: data, procedimento, profissional, resumo IA
- Expansivel para detalhes completos
- Link para ouvir gravacao

### Problemas
- **Sem filtro por periodo** — com muitas consultas, fica dificil encontrar uma especifica
- **Sem busca** no historico (ex: buscar por "dor lombar" nos resumos)

### Correcao proposta
```
1. Adicionar filtro de periodo (ultimos 30 dias, 3 meses, 1 ano, todos)
2. Adicionar busca por texto no historico
```

---

## 4. Tab Prescricoes

### Estado atual
- Lista com data, status, medicamentos
- Acao de repetir prescricao
- Status: rascunho, assinada, enviada com badges

### Problemas
- **Repetir prescricao (uso continuo)** — fluxo de "copiar e ajustar" prescricao anterior nem sempre e claro
- **Status badges** — verificar se cores sao suficientemente diferentes

### O que esta bom
- Informacao suficiente na lista
- Acoes contextuais por prescricao
- Abertura de prescricao em nova tab

---

## 5. Tab Documentos

### Verificar
- Upload drag-and-drop?
- Preview de PDF/imagem?
- Categorias/tags/pastas?
- Empty state com CTA "Fazer upload"?

### Correcao necessaria se ausente
```
1. Implementar drag-and-drop zone (react-dropzone)
2. Preview inline para imagens e PDFs
3. Categorias: Exames, Laudos, Outros
4. Empty state: icone Upload + "Nenhum documento anexado" + botao "Fazer upload"
```

---

## 6. Tab Imagens

### Verificar
- Grid de imagens clinicas?
- Lightbox para ver em tamanho real?
- Antes/depois pareado?
- Filtro por regiao corporal?

### Observacao
Para especialidades como dermatologia e cirurgia plastica, esta tab e critica. Precisa ter:
- Upload com drag-and-drop
- Grid com thumbnails
- Lightbox com zoom
- Pareamento antes/depois com datas
- Filtro por regiao ou procedimento

---

## 7. Tab Gravacoes

### Verificar
- Player de audio integrado?
- Transcricao ao lado?
- Download disponivel?
- Busca na transcricao?

### Observacao
Audio e o core do VoxClinic. Tab de gravacoes deve ser premium:
- Player inline com controles (play/pause, velocidade, seek)
- Transcricao sincronizada ao lado
- Resumo IA acima da transcricao
- Download do audio
- Busca na transcricao

---

## 8. Tab Formularios

### Verificar
- Lista de formularios preenchidos?
- Visualizar respostas?
- Preencher novo formulario?
- Empty state?

### Observacao
Integra com form-renderer. Deve mostrar:
- Lista cronologica de formularios preenchidos
- Clicar para ver respostas (read-only)
- Botao "Preencher novo" com seletor de template
- Empty state: "Nenhum formulario preenchido" + CTA

---

## Score: 6/10

### Excelente
- Header comprehensivo com todas as infos
- Badges de metadados com icones
- 8 tabs cobrem todos os aspectos do paciente
- Tags e alertas visiveis
- Acoes contextuais (prescricao, atestado, relatorio)

### Precisa melhorar
- Metadados muito pequenos (11px) — critico
- Header sobrecarregado em mobile (5 botoes + wrap)
- Campos ocultos por default (deveria mostrar tudo)
- Card verde para historico medico (semantica errada)
- Falta idade calculada automaticamente
- Falta status ativo/inativo no header
- Falta filtro/busca no historico
- Completude do perfil nao indicada
