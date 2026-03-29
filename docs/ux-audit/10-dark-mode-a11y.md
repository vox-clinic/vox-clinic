# Analise 10: Dark Mode e Acessibilidade

Data: 2026-03-28

---

## 1. Dark Mode

### Estado atual
- oklch color space para uniformidade perceptual
- Dark mode com tint teal sutil no background
- Theme toggle com animacao Sun/Moon
- Todos os tokens definidos em globals.css com dark variant

### Problemas potenciais

#### Contraste do teal (#14B8A6)
- **Em fundo escuro:** teal em oklch pode ter contraste suficiente, mas verificar com ferramenta WCAG
- **`bg-vox-primary` como fundo de botao:** texto branco sobre teal — contraste ratio ~3.5:1 — **ABAIXO de WCAG AA (4.5:1 para texto normal)**
- **Texto teal sobre fundo escuro:** provavelmente OK (>4.5:1)

#### Textos muted
- `text-muted-foreground` em dark mode — verificar se nao e cinza muito escuro
- Metadados em `text-[11px]` com cor muted — duplamente problematico (pequeno + baixo contraste)

#### Bordas
- `border-border/40` — 40% de opacidade pode ficar invisivel em dark mode
- Cards podem "sumir" no fundo se borda e muito sutil

#### Inputs
- Texto vs placeholder — verificar se placeholder em dark e distinguivel
- Focus ring: `ring-vox-primary` — teal em dark mode precisa de contraste suficiente

### Correcao proposta
```
1. Verificar contraste com DevTools > Lighthouse > Accessibility
2. Se teal nao passa WCAG AA:
   - Opcao A: Clarear teal para dark mode (--color-vox-primary no dark: oklch mais claro)
   - Opcao B: Usar branco como texto de botao primary (ja e, mas verificar contraste)
3. Bordas: aumentar opacidade em dark mode (border-border/60 minimo)
4. Metadados: aumentar para text-xs E usar cor com mais contraste
```

---

## 2. Acessibilidade

### Tab Order

#### O que esta bom
- Inputs com labels associados (`htmlFor` + `id`)
- Botoes tem texto ou `aria-label`
- `aria-current="page"` na navegacao
- Star rating com `aria-label` descritivo
- Links de paciente com `aria-label` incluindo nome

#### Problemas
- **Modais customizados (prescricao, certificado):** sem focus trap — Tab navega para fora
- **Notification bell dropdown:** sem keyboard navigation (arrows)
- **Tab order dos modais:** apos fechar, focus nao retorna ao trigger
- **Skip links:** nenhum implementado — usuario de keyboard precisa tab por toda a sidebar

### Focus Visible

#### O que esta bom
- Notification bell: `focus-visible:ring-2 focus-visible:ring-vox-primary/50`

#### Problemas
- **Verificar TODOS os interativos** — se base styles incluem focus-visible global ou se cada componente precisa individualmente
- **Focus ring em dark mode:** `ring-vox-primary/50` (teal 50%) pode ter baixo contraste

### Labels

#### O que esta bom
- Formulario manual: TODOS os inputs tem `<Label>` com `htmlFor`
- Required fields: asterisco vermelho + "obrigatorio" badge no form-renderer
- `aria-invalid` em campos com erro

#### Problemas
- **Command palette search:** sem `aria-label` explicito (usa placeholder como hint)
- **Select triggers no form-renderer:** sem `aria-label`
- **Botao delete medicamento (prescricao):** icone lixeira sem `aria-label`

### Botoes de Icone

| Componente | aria-label | Status |
|------------|------------|--------|
| Record button | "Iniciar/Parar gravacao" | OK |
| Theme toggle | Verificar | Verificar |
| Notification bell | "Notificacoes" | OK |
| Sidebar collapse | N/A (nao existe) | N/A |
| Calendar nav | Verificar | Verificar |
| Delete medication | **MISSING** | PROBLEMA |
| Remove tag | Verificar | Verificar |

### Imagens
- Avatares sao iniciais (div), nao img — sem necessidade de alt
- Verificar se imagens clinicas na tab Imagens tem alt text
- Logo da clinica: verificar alt

### Modais: Focus Trap

| Modal | Focus trap | ESC close | Backdrop close |
|-------|-----------|-----------|----------------|
| AlertDialog (shadcn) | Sim | Sim | Sim |
| Prescription dialog | **NAO** | **NAO** | Sim |
| Certificate dialog | **NAO** | **NAO** | Sim |
| Record consent | **NAO** | **NAO** | Verificar |
| Command palette | Sim (Dialog shadcn) | Sim | Sim |
| Notification dropdown | NAO | Verificar | Sim (click outside) |
| Sheet "Mais" (bottom nav) | Verificar (shadcn Sheet) | Sim | Sim |

### Screen Reader

#### O que funciona
- Navegacao tem `aria-label="Navegacao principal"`
- DialogTitle sr-only no command palette
- Links de paciente com aria-label descritivo
- Badges de status tem texto (nao so cor)

#### O que NAO funciona
- **Graficos (Recharts):** sem alt text ou aria descritivo
- **Waveform do record button:** puramente visual, sem alternativa
- **Drag-and-drop calendar:** sem alternativa keyboard
- **Selected item no command palette:** nao anunciado via aria-live
- **Toast notifications:** verificar se sonner usa aria-live region

### WCAG Checklist

| Criterio | Status | Nota |
|----------|--------|------|
| 1.1.1 Non-text content | PARCIAL | Faltam aria-labels em alguns botoes de icone |
| 1.3.1 Info & Relationships | BOM | Labels associados, headings hierarquicos |
| 1.4.3 Contrast (AA) | VERIFICAR | Teal sobre escuro pode falhar |
| 1.4.4 Resize text | BOM | rem/px relativos, responsive |
| 2.1.1 Keyboard | PARCIAL | Modais sem focus trap, sem skip links |
| 2.4.3 Focus order | PARCIAL | Focus nao retorna apos fechar modal |
| 2.4.7 Focus visible | PARCIAL | Presente em alguns, nao verificado globalmente |
| 3.3.1 Error identification | BOM | Erros em portugues proximo ao campo |
| 3.3.2 Labels | BOM | Todos os inputs tem label |
| 4.1.2 Name, Role, Value | PARCIAL | Modais custom sem role="dialog" |

---

## Score: 5/10

### Bom
- Labels em todos os inputs
- aria-current na navegacao
- Mensagens de erro em portugues
- oklch color space para uniformidade
- Badges com texto (nao so cor)
- Record button com aria-label

### Critico
- Modais sem focus trap (prescricao, certificado, consent)
- Contraste teal possivelmente abaixo de WCAG AA
- Sem skip links
- Botoes de icone sem aria-label (delete medicamento, etc.)
- Graficos sem acessibilidade
- DnD calendar sem alternativa keyboard
- Focus nao retorna ao trigger apos fechar modal
