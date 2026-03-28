# ⚠️ DEPRECATED — Memed integration foi removida. Prescrição agora é 100% nativa.

> Este documento é mantido apenas para referência histórica. Ver `docs/features/prescricao-avancada.md` para a implementação atual.

---

# (HISTÓRICO) Memed Digital Prescription Integration — Feature Document

## 1. Overview

Memed é a plataforma líder de prescrição digital no Brasil: 150k+ médicos, 3M+ prescrições/mês. 62% dos CRMs médicos já integram. A integração é **gratuita para parceiros de software**.

**O que Memed oferece:**
- Base de 60k+ medicamentos atualizada em tempo real
- Alertas de interação medicamentosa automáticos
- Assinatura digital ICP-Brasil (compliance CFM/ANVISA)
- Entrega ao paciente via SMS/email/WhatsApp
- Suporte multi-profissão (CRM, CRO, COREN, CRMV, CRF, CRN, CREFITO, CRP)
- Tipos: simples, antibióticos, notificação A/B, controle especial, manipulados

---

## 2. Opção de Integração: Memed Embed (Recomendado)

Memed fornece script JS (`sinapse-prescricao.min.js`) que renderiza a UI completa dentro da aplicação parceira.

**Modos:** FullScreen (overlay total) ou Embedded (container mín. 820x700px)

| Abordagem | Prós | Contras |
|-----------|------|---------|
| **Embed (script + iframe)** | Integração rápida, UI completa, gratuito, 350+ parceiros | Menos controle visual, dimensões mínimas |
| REST API only | Controle total da UI | Sem busca de medicamentos, sem interações — inviável |
| memed-react (community) | Hooks React prontos | Não oficial, manutenção incerta |

**Decisão:** Embed com wrapper React próprio + REST API no backend para registro e tokens.

---

## 3. Autenticação

### Nível Parceiro (backend)
- **API Key + Secret Key** por parceiro (VoxClinic como um todo)
- Nunca expor no frontend
- Armazenar como env vars: `MEMED_API_KEY`, `MEMED_SECRET_KEY`

### Nível Prescritor (por profissional)
- Registro via `POST /sinapse-prescricao/usuarios` retorna JWT token
- Token usado no frontend (`data-token` no script)
- Token pode mudar — verificar a cada uso

### Flow
```
Backend registra prescritor → Memed retorna token → Armazena encrypted
→ Frontend busca token do backend → Carrega script com token
→ Memed valida → Módulo de prescrição inicializado
```

---

## 4. Data Flow

```
Usuário clica "Prescrição Memed"
  → Backend retorna token do prescritor
    → Frontend carrega script Memed
      → setPaciente({ nome, cpf, telefone, idExterno })
        → show("plataforma.prescricao")
          → Médico usa Memed UI (busca, dosagem, interações)
            → Médico clica "Imprimir" no Memed
              → Evento "prescricaoImpressa" com payload completo
                → VoxClinic salva Prescription com campos Memed
                  → Busca PDF assinado via REST API
                    → Prescrição aparece na lista com badge Memed
```

---

## 5. UI/UX

### Pontos de Entrada

**A. Aba Prescrições do paciente (`prescricoes-tab.tsx`)**
- Se Memed configurado: botão "Prescrição Memed" (primário) + "Prescrição Manual" (secundário)
- Se não configurado: botão existente inalterado

**B. Modo de exibição:** Drawer/modal grande (min 820x700). Mobile → FullScreen mode.

### Lista de Prescrições
- Badge Memed nas prescrições com `source === "memed"`
- "Assinada digitalmente" indicator
- Link download PDF assinado

### Settings
- Seção "Integração Memed" nas configurações
- Campos: conselho (CRM/CRO/etc.), número, UF
- Status: "Conectado" / "Não configurado"
- Botão "Conectar ao Memed"
- Configuração por membro (cada profissional tem seu token)

---

## 6. Data Model

### Novo Model: `MemedPrescriber`

```prisma
model MemedPrescriber {
  id              String   @id @default(cuid())
  workspaceId     String
  userId          String
  memedExternalId String
  memedToken      String   // encrypted
  boardCode       String   // CRM, CRO, etc.
  boardNumber     String
  boardState      String   // UF
  status          String   @default("pending")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@unique([workspaceId, userId])
  @@index([workspaceId])
}
```

### Campos novos em Prescription

```prisma
memedPrescriptionId   String?  // UUID do Memed
memedStatus           String?  // "signed" | "pending"
signedPdfUrl          String?  // PDF assinado
memedDigitalLink      String?  // Link para paciente
memedPayload          Json?    // Payload completo
source                String   @default("manual") // "manual" | "memed"
```

### Environment Variables

```
MEMED_API_KEY        // Partner API key (opcional)
MEMED_SECRET_KEY     // Partner secret key (opcional)
MEMED_API_URL        // default: staging URL
MEMED_SCRIPT_URL     // default: staging script URL
```

---

## 7. Fallback

- **Sem Memed configurado:** Zero mudança, fluxo manual funciona igual
- **Membro não registrado:** Mostra apenas prescrição manual + prompt para configurar
- **Memed indisponível:** Toast de erro + fallback para manual
- **Staging indisponível:** Midnight-6AM weekdays e finais de semana
- **Histórico misto:** Campo `source` diferencia Memed vs manual

---

## 8. Implementation Plan

### Fase 1: Backend (2-3 dias)

| Step | Task | Arquivo |
|------|------|---------|
| 1.1 | Schema: MemedPrescriber model + campos em Prescription | `prisma/schema.prisma` |
| 1.2 | Env vars: MEMED_* | `src/lib/env.ts` |
| 1.3 | Memed API client | `src/lib/memed/client.ts` |
| 1.4 | Server actions: register, getToken, syncPrescription | `src/server/actions/memed.ts` |
| 1.5 | createMemedPrescription action | `src/server/actions/prescription.ts` |

### Fase 2: Settings UI (1-2 dias)

| Step | Task | Arquivo |
|------|------|---------|
| 2.1 | Seção Memed nas configurações | `settings/sections/memed-section.tsx` |
| 2.2 | Registrar na settings page | `settings/page.tsx` |

### Fase 3: Prescription UI (3-4 dias)

| Step | Task | Arquivo |
|------|------|---------|
| 3.1 | Hook `useMemed` (script load, MdHub, eventos) | `src/hooks/use-memed.ts` |
| 3.2 | Componente Memed panel (drawer/modal) | `src/components/memed-prescription-panel.tsx` |
| 3.3 | Botão Memed no dialog de prescrição | `create-prescription-dialog.tsx` |
| 3.4 | Badge Memed na lista de prescrições | `prescricoes-tab.tsx` |
| 3.5 | PDF display para prescrições Memed | `prescriptions/[id]/page.tsx` |

### Fase 4: Polish (1-2 dias)

| Step | Task |
|------|------|
| 4.1 | Token refresh logic |
| 4.2 | Error handling e fallback graceful |
| 4.3 | Audit logging |

### Fase 5: Parceria Memed (paralelo)

- Contato via memed.com.br/parceiro-software/
- Obter credenciais produção
- Processo de homologação

**Esforço total: 7-11 dias** | **Custo: ZERO** (gratuito para parceiros)

---

## 9. Pricing

- **Integração para parceiros: GRATUITA**
- Sem custo por prescrição
- Memed Premium (direto ao médico): R$ 59,90/mês (WhatsApp delivery) — opcional, VoxClinic não paga
- **ROI máximo**: feature de alto valor a custo zero

---

## 10. Testing

### Staging
- URL: `https://integrations.api.memed.com.br/v1`
- **Indisponível:** midnight-6AM weekdays, finais de semana inteiros

### Unit Tests
- Memed client: mock HTTP, testar registro, token, PDF URL
- Server actions: mock client, verificar audit log, error handling
- Mapping do payload `prescricaoImpressa` para model Prescription

### Manual QA
- [ ] Registro de prescritor com CRM válido
- [ ] Módulo Memed carrega e mostra busca de medicamentos
- [ ] Alertas de interação aparecem
- [ ] Prescrição salva no banco após impressão no Memed
- [ ] PDF assinado acessível
- [ ] Badge Memed na lista de prescrições
- [ ] Prescrição manual continua funcionando
- [ ] Fallback quando Memed indisponível
- [ ] Substâncias controladas fluem corretamente

---

## API Reference

### Endpoints Principais

| Method | Endpoint | Propósito |
|--------|----------|-----------|
| POST | `/sinapse-prescricao/usuarios` | Registrar prescritor |
| GET | `/sinapse-prescricao/usuarios/{id}` | Buscar prescritor + token |
| GET | `/prescricoes/{id}/url-document/full` | URL do PDF assinado |
| GET | `/prescricoes/{id}/get-digital-prescription-link` | Link para paciente |

### Frontend Objects

| Objeto | Propósito |
|--------|-----------|
| `MdSinapsePrescricao` | Lifecycle do módulo (eventos de init) |
| `MdHub` | Comandos e eventos para prescrição |

### Fontes
- [Memed Docs](https://doc.memed.com.br/)
- [Memed Parceiro Software](https://memed.com.br/parceiro-software/)
- [memed-react](https://github.com/jonatassales/memed-react)

---

## Arquivos Críticos
- `prisma/schema.prisma` — MemedPrescriber model, campos em Prescription
- `src/server/actions/prescription.ts` — createMemedPrescription action
- `src/components/create-prescription-dialog.tsx` — botão Memed
- `src/app/(dashboard)/patients/[id]/tabs/prescricoes-tab.tsx` — badge Memed
- `src/lib/env.ts` — MEMED_* env vars
