# Módulo de Prescrição Eletrônica Avançada — Feature Document

> Adaptado para a realidade do VoxClinic. Leia CLAUDE.md antes de implementar.

## Contexto: O que JÁ EXISTE no VoxClinic

**NÃO comece do zero.** O VoxClinic já tem prescrição básica implementada:

### Prescrição Atual (funcional)
- **Model:** `Prescription` em `prisma/schema.prisma` — patientId, workspaceId, appointmentId?, medications (Json), notes
- **Campos Assinatura Digital:** signedPdfUrl, signedAt, signatureProvider, certificateSerial, certificateSubject, signedByUserId, verificationToken (@unique)
- **Server Actions:** `src/server/actions/prescription.ts` — createPrescription, getPrescription, getPatientPrescriptions, deletePrescription
- **Dialog:** `src/components/create-prescription-dialog.tsx` — modal com medication rows (add/remove)
- **Print Page:** `src/app/(dashboard)/prescriptions/[id]/page.tsx` — HTML render com window.print()
- **Tab Paciente:** `src/app/(dashboard)/patients/[id]/tabs/prescricoes-tab.tsx` — lista com indicador assinatura
- **Verificação:** `src/app/verificar/[token]/page.tsx` — página pública de verificação de documentos assinados

### Stack Exata
- **Framework:** Next.js 16.2.1 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui (Base UI)
- **ORM:** Prisma 6 com PostgreSQL via Supabase (PgBouncer 6543, direct 5432)
- **Auth:** Clerk (pt-BR), multi-tenant via workspaceId
- **AI:** Anthropic Claude (tool_use) + OpenAI Whisper
- **Storage:** Supabase Storage (signed URLs 5min)
- **Email:** Resend | **WhatsApp:** Meta Cloud API | **Video:** Daily.co
- **Fiscal:** NuvemFiscal (NFS-e) | **Pagamento:** Asaas gateway
- **Crypto:** `src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt
- **Errors:** `safeAction` wrapper + `ActionError` (NUNCA throw new Error em safeAction)
- **RBAC:** 5 roles (owner/admin/doctor/secretary/viewer), `src/lib/permissions.ts`

### Patterns OBRIGATÓRIOS (ver CLAUDE.md)
- Server Actions com `safeAction()` wrapper, `ActionError` para erros de negócio
- Auth via `auth()` do Clerk, workspace scoping em toda query
- Audit logging via `logAudit()` em todas as mutations
- Frontend: `'error' in result` check antes de usar resultado
- Design: teal primary (#14B8A6), rounded-xl, Inter font, shadcn components
- Feature doc primeiro → implementação → QA (tsc --noEmit zero errors) → docs update

---

## O que FALTA implementar (escopo deste módulo)

### Prioridade 1: Base de Medicamentos ANVISA
- Tabela `MedicationDatabase` com dados da ANVISA (nome, princípio ativo, concentração, forma, fabricante, tipo controle)
- Import/sync periódico dos dados abertos ANVISA
- Autocomplete de medicamentos com busca accent-insensitive (mesmo padrão do CID-10)
- Favoritos e recentes do profissional
- Suporte a medicamento manipulado (formulação livre)

### Prioridade 2: Editor de Prescrição Avançado
- Substituir o dialog simples atual por um PrescriptionEditor full-page
- Layout split: lista de medicamentos (esquerda) + preview em tempo real (direita)
- Header com dados do paciente + banner de alergias
- MedicationSearch com autocomplete inteligente (favoritos → recentes → ANVISA)
- Campos completos por item: concentração, forma, via, quantidade, posologia, duração, instruções
- Drag-and-drop para reordenar itens
- Autosave de rascunhos
- Keyboard shortcuts (Tab entre campos, Enter para adicionar)

### Prioridade 3: Interações Medicamentosas
- Tabela `DrugInteraction` com interações conhecidas
- Check automático ao adicionar medicamento
- Alert por severidade (leve/moderada/severa/contraindicada)
- Alerta cruzado com alergias do paciente (patient.medicalHistory.allergies)

### Prioridade 4: PDF Profissional
- Gerar PDF via pdf-lib (já planejado em docs/features/digital-signature.md)
- Layout: header clínica, dados paciente, medicamentos formatados, QR code, assinatura
- Diferenciação por tipo (simples branca, controlada, antimicrobiano)
- Armazenar PDF no Supabase Storage

### Prioridade 5: Assinatura Digital (já tem schema pronto)
- Reativar `SignatureConfig` model (já existe no schema)
- Server-side A1 signing (reusa certificado NFS-e se disponível)
- Cloud signing BirdID (OAuth2 flow)
- Verificação via `/verificar/[token]` (já existe)

### Prioridade 6: Templates de Prescrição
- Model `PrescriptionTemplate` — por profissional, compartilhável, por especialidade
- Salvar prescrição como template
- Aplicar template a nova prescrição
- Templates populares por especialidade

### Prioridade 7: Envio ao Paciente
- WhatsApp: reusar `sendTextMessage` existente + PDF como documento
- Email: reusar `sendEmail` existente + PDF em anexo
- Registro de envio no histórico (sentVia, sentAt)

---

## Data Model — Mudanças no Schema

### Estender Prescription (já existe)
```prisma
model Prescription {
  // ... campos existentes mantidos ...

  // Novos campos
  status          String    @default("draft") // draft|signed|sent|cancelled|expired
  type            String    @default("simple") // simple|special_control|antimicrobial|manipulated
  validUntil      DateTime? // 30 dias default
  sentVia         String[]  @default([])
  sentAt          DateTime?
  cancelledAt     DateTime?
  cancelReason    String?

  // Já existem: signedPdfUrl, signedAt, signatureProvider, etc.
}
```

### Estender medications JSON structure
```typescript
// Atual: [{ name, dosage, frequency, duration, notes }]
// Novo (backward compatible — campos opcionais):
interface PrescriptionMedication {
  name: string           // nome comercial ou princípio ativo
  dosage: string         // posologia completa
  frequency: string      // "8/8h", "12/12h", etc.
  duration: string       // "7 dias", "uso contínuo"
  notes?: string
  // Novos campos (opcionais para backward compat)
  activeIngredient?: string
  concentration?: string
  pharmaceuticalForm?: string
  quantity?: string
  route?: string
  anvisaCode?: string
  isContinuousUse?: boolean
  controlType?: string   // none|c1|c2|antimicrobial
  order?: number
}
```

### Novos Models
```prisma
model MedicationDatabase {
  id                String   @id @default(cuid())
  anvisaCode        String   @unique
  name              String
  activeIngredient  String
  concentration     String?
  pharmaceuticalForm String?
  manufacturer      String?
  category          String?  // referencia|generico|similar
  controlType       String   @default("none")
  requiresSpecialForm Boolean @default(false)
  isActive          Boolean  @default(true)
  updatedAt         DateTime @updatedAt

  @@index([name])
  @@index([activeIngredient])
  @@index([controlType])
  @@fulltext([name, activeIngredient]) // se suportado
}

model PrescriptionTemplate {
  id              String   @id @default(cuid())
  workspaceId     String
  workspace       Workspace @relation(...)
  professionalId  String?  // null = workspace-wide
  name            String
  description     String?
  specialty       String?
  items           Json     // PrescriptionMedication[]
  isShared        Boolean  @default(false)
  usageCount      Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([workspaceId])
  @@index([workspaceId, specialty])
}

model DrugInteraction {
  id            String   @id @default(cuid())
  drug1         String   // princípio ativo 1
  drug2         String   // princípio ativo 2
  severity      String   // mild|moderate|severe|contraindicated
  description   String
  recommendation String?
  source        String   // ANVISA|DrugBank
  updatedAt     DateTime @updatedAt

  @@unique([drug1, drug2])
  @@index([drug1])
  @@index([drug2])
}

model MedicationFavorite {
  id              String   @id @default(cuid())
  workspaceId     String
  userId          String   // clerkId
  medicationName  String
  defaultDosage   String?
  defaultQuantity String?
  usageCount      Int      @default(1)
  lastUsedAt      DateTime @default(now())
  createdAt       DateTime @default(now())

  @@unique([workspaceId, userId, medicationName])
  @@index([workspaceId, userId])
}
```

---

## Arquivos-Chave para Implementação

| O que | Onde | Ação |
|-------|------|------|
| Prescription model | `prisma/schema.prisma` | Estender com novos campos |
| Prescription CRUD | `src/server/actions/prescription.ts` | Estender com status, type, validUntil |
| Prescription dialog | `src/components/create-prescription-dialog.tsx` | Substituir por PrescriptionEditor page |
| Prescription print | `src/app/(dashboard)/prescriptions/[id]/page.tsx` | Evoluir para PDF generation |
| Patient tab | `src/app/(dashboard)/patients/[id]/tabs/prescricoes-tab.tsx` | Já funcional, adicionar status badges |
| Digital signature | `docs/features/digital-signature.md` | Schema pronto, implementar signing |
| Verification page | `src/app/verificar/[token]/page.tsx` | Já existe |
| WhatsApp | `src/server/actions/whatsapp.ts` + `messaging.ts` | Reusar para envio |
| Storage | `src/lib/storage.ts` | Reusar uploadSignedPdf |
| CID-10 | `src/data/cid10.json` + `src/components/cid-autocomplete.tsx` | Mesmo padrão para medicamentos |
| Error handling | `src/lib/error-messages.ts` | Adicionar ERR_PRESCRIPTION_* |
| Permissions | `src/lib/permissions.ts` | clinical.prescriptions já existe |

---

## Ordem de Implementação

```
1. Feature doc review (este documento) ✓
2. Schema changes (estender Prescription + novos models)
3. Base ANVISA (MedicationDatabase + import + autocomplete)
4. MedicationSearch component (mesmo padrão CidAutocomplete)
5. PrescriptionEditor page (split view: editor + preview)
6. Interações medicamentosas (DrugInteraction + check + alerts)
7. PDF generation (pdf-lib)
8. Templates (PrescriptionTemplate CRUD + UI)
9. Assinatura digital (A1 server-side → BirdID cloud)
10. Envio WhatsApp/email
11. QA + docs + roadmap update
```

---

## Decisões Importantes

### Prescrição 100% Nativa
- Memed foi removido — prescrição é inteiramente nativa
- Base ANVISA como fonte principal de medicamentos (~60k)
- DrugInteraction model para interações (fonte: DrugBank/open source)
- Assinatura digital via ICP-Brasil (A1 server-side ou BirdID cloud)

### PDF Library
- **pdf-lib** (já planejado em digital-signature.md) — leve, funciona em Node.js, suporta assinatura PAdES
- NÃO usar puppeteer (pesado para serverless)
- NÃO usar @react-pdf/renderer (não suporta assinatura digital nativa)
