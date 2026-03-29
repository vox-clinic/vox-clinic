# Analise 4: Formularios e Inputs

Data: 2026-03-28

---

## 1. Formularios de Cadastro

### Manual Patient Form — EXCELENTE
- **Labels:** Acima do input (correto), com `htmlFor` associado
- **Required:** Asterisco vermelho `<span className="text-vox-primary">*</span>`
- **Validacao em tempo real:**
  - CPF: valida digitos verificadores ao completar 11 digitos
  - Telefone: minimo 10 digitos
  - Data nascimento: nao futura, nao >130 anos, dia/mes valido
- **Mensagens de erro:** Em portugues, em vermelho (`text-vox-error`), abaixo do campo
- **`aria-invalid`** em campos com erro

### Voice Patient Form — BOM
- 3 estados: gravando → processando → revisao
- Campos de baixa confianca destacados com borda amarela + icone warning
- Threshold: < 0.8 confianca = destaque
- **Problema:** Nao permite adicionar procedimentos/alertas manualmente se IA nao detectou

### Settings Sections — CONSISTENTE
- Todas usam mesmo padrao: Card > CardHeader > CardContent
- Labels: `text-xs font-medium uppercase tracking-wider`
- Inputs: `rounded-xl border border-input`
- Formularios inline (editar-no-lugar) para procedimentos, campos, agendas

---

## 2. Inputs Especificos

| Input | Mascara | Status | Observacao |
|-------|---------|--------|------------|
| CPF | `XXX.XXX.XXX-XX` | OK | Validacao real-time com algoritmo de digitos |
| Telefone | `+XX (XX) XXXXX-XXXX` | OK | Formato internacional |
| CEP | `XXXXX-XXX` | OK | Auto-fill via ViaCEP com spinner |
| Data nascimento | `DD/MM/AAAA` | OK | Validacao de logica de data |
| Moeda (R$) | `type="number" step="0.01"` | PARCIAL | Falta formatacao visual com R$ e virgula |
| Busca paciente | Autocomplete debounced | OK | Command palette + inline search |
| Busca medicamento | Autocomplete com favoritos + ANVISA | OK | Badges de tipo de controle |
| CID-10 | Autocomplete single/multi + busca debounced | OK | Codigo + descricao |

### Problemas
- **Moeda:** Input `type="number"` nao mostra "R$" nem formata centavos como `150,00`. Profissional brasileiro espera formato `R$ 150,00`
- **CEP auto-fill sobrescreve input manual** sem aviso — pode ser surpreendente se usuario ja preencheu
- **Data nascimento no form-renderer:** Usa `type="date"` nativo do browser — inconsistente com mascara DD/MM/AAAA do manual form

### Correcao proposta
```
1. Input moeda: criar componente CurrencyInput com formatacao R$ X.XXX,XX
   - Usar Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
2. CEP: mostrar toast "Endereco preenchido automaticamente" apos auto-fill
3. form-renderer date: usar mesmo padrao de mascara DD/MM/AAAA do manual form
```

---

## 3. Formularios Dinamicos (Form Builder)

### Estado atual
- `form-renderer.tsx` suporta 11 tipos: text, textarea, number, select, multiselect, checkbox, radio, date, rating (5 estrelas), section headers, rich text
- Layout: grid 2 colunas responsivo (`grid grid-cols-2 gap-x-4 gap-y-4`)
- Campos full-width ou half-width baseado em config
- Campos obrigatorios: badge "obrigatorio" vermelho
- Validacao: required, min/max number, min/max length, multiselect min selection

### Problemas
- **Erro em selects vs inputs:** Inputs mostram borda vermelha + ring, selects mostram so borda — inconsistente
- **Multiselect vazio:** Mostra borda sem placeholder — usuario nao sabe que precisa selecionar
- **Rating:** Nao mostra texto descritivo (ex: "1 = Ruim, 5 = Excelente")
- **Sem input masks** no form-renderer (phone, CPF, dosagem) — depende do tipo do campo customizado
- **Date usa `type="date"` nativo** — estilo varia por browser, inconsistente com resto do app

### O que esta bom
- `aria-label` no rating: `{starValue} de {max}`
- Radio buttons usam `<input type="radio">` semantico com sr-only
- Labels em todos os campos
- Validacao server-side + client-side
- Campos condicionais (visibilidade baseada em outro campo)

---

## 4. Modais e Dialogs

### Prescricao Dialog
- **Tamanho:** `max-w-2xl max-h-[90vh]` com `overflow-y-auto` — bom
- **Mobile:** `mx-4` de padding lateral
- **Problema:** Com muitos medicamentos, modal fica apertado
- **Problema:** Sem focus trap — usuario pode tab para fora do modal
- **Problema:** Sem ESC handler — so fecha clicando fora ou no X
- **Problema:** Botao de deletar medicamento (icone lixeira) sem `aria-label`
- **Bom:** Spinner no submit, botao disabled durante save
- **Bom:** Drug interaction warnings com cores por severidade (grave=vermelho, moderada=amarelo, leve=azul)
- **Bom:** Grid responsivo `grid-cols-1 sm:grid-cols-2` por medicamento

### Certificado Dialog
- **Tamanho:** `max-w-lg max-h-[90vh]` — mais estreito (correto, menos campos)
- **Problema:** Campos de horario `grid-cols-2` sem breakpoint `sm:` — apertado em mobile
- **Problema:** Sem focus trap, sem ESC handler (mesmo que prescricao)
- **Bom:** Select nativo para tipo de documento — boa semantica
- **Bom:** Renderizacao condicional por tipo (atestado mostra dias, declaracao mostra horarios)

### Confirm Dialog
- Usa shadcn `AlertDialog` — semanticamente correto
- Variant destructive (vermelho) como default
- Labels customizaveis
- **Bom:** Simples e efetivo

### Problemas transversais dos modais
1. **Nenhum modal tem focus trap** — Tab key navega para fora
2. **Nenhum modal fecha com ESC** (exceto AlertDialog que herda do Radix)
3. **Modais customizados nao usam `role="dialog"` nem `aria-modal="true"`**
4. **Em mobile pequeno (320px), `mx-4` pode nao ser suficiente** — modal fica com 288px util

### Correcao proposta
```
1. Criar wrapper ModalBase que inclui:
   - role="dialog" + aria-modal="true" + aria-labelledby
   - Focus trap (usar @radix-ui/react-focus-scope ou similar)
   - ESC handler: onKeyDown={(e) => e.key === 'Escape' && onClose()
   - Backdrop click to close
2. Substituir divs customizados por DialogContent do shadcn (ja tem tudo)
3. Certificado: adicionar sm: breakpoint nos campos de horario
```

---

## 5. Selects e Multi-selects

### Estado atual
- Select simples: shadcn `<Select>` ou `<select>` nativo (inconsistente)
- Multi-select: implementacao custom com tags clicaveis + badge de contagem
- CID autocomplete: componente dedicado com busca debounced
- Medication autocomplete: componente dedicado com favoritos

### Problemas
- **Inconsistencia Select vs select:** Alguns formularios usam shadcn `<Select>` (estilizado), outros usam `<select>` nativo (estilo diferente)
- **Multi-select sem busca interna** quando opcoes > 10
- **Tags do paciente:** Adiciona via input + Enter, remove via X — funcional mas sem autocomplete de tags existentes
- **Dropdowns com muitas opcoes:** CID (1022 codigos) e medicamentos (248) tem autocomplete — bom. Outros selects nao.

### Correcao proposta
```
1. Padronizar: TODOS os selects devem usar shadcn <Select> (nunca <select> nativo)
2. Adicionar busca em selects com > 10 opcoes (usar Combobox pattern)
3. Tags: adicionar autocomplete com tags existentes do workspace
```

---

## Score: 7/10

### Excelente
- Mascaras de CPF, telefone, CEP, data — todas funcionam
- Validacao real-time no form manual
- CID e medicamento autocomplete dedicados
- Drug interaction checking na prescricao
- Labels e aria-invalid consistentes

### Precisa melhorar
- Modais sem focus trap e ESC handler (critico para acessibilidade)
- Input de moeda sem formatacao brasileira
- Select nativo vs shadcn inconsistente
- Form-renderer date inconsistente com resto do app
- Validacao de erro visual inconsistente (inputs vs selects)
