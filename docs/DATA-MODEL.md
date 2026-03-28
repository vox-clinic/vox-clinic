# Data Model Reference

> Prisma schema summary. Read `prisma/schema.prisma` for full details.

## Core Models

- **User**: clerkId, role (user/superadmin), profession, clinicName, onboardingComplete, tourCompleted → has one Workspace
- **Workspace**: professionType, customFields (JSON), procedures (JSON), plan (free/starter/professional/clinic), planStatus → has many Patients, Appointments, Recordings
- **Patient**: name, document (CPF, unique per workspace), phone, email, birthDate, gender, address (JSON), insurance, guardian, source, tags[], medicalHistory (JSON), customData (JSON), alerts (JSON), isActive (soft delete), whatsappConsent
- **Appointment**: links Patient + Workspace + Agenda. date, procedures, notes, aiSummary, audioUrl, transcript, status (scheduled/completed/cancelled/no_show), price, cidCodes
- **Recording**: audioUrl, transcript, aiExtractedData, status (pending/processing/processed/error), fileSize, duration
- **Agenda**: name, color (hex), isDefault, isActive. Multiple per workspace
- **BlockedSlot**: agendaId, title, startDate, endDate, allDay, recurring (null/"weekly")

## Clinical Models

- **Prescription**: medications (JSON), notes, source, status (draft/signed/sent/cancelled/expired), type (simple/special_control/antimicrobial/manipulated), validUntil, sentVia, cancelReason. ICP-Brasil digital signature fields
- **MedicalCertificate**: type (atestado/declaracao_comparecimento/encaminhamento/laudo), content, days?, cid?. ICP-Brasil fields
- **TreatmentPlan**: name, procedures, totalSessions, completedSessions, status
- **ClinicalImage**: url, bodyRegion, category (before/after/progress/general), pairedImageId (before/after link)
- **FormTemplate**: fields (JSON), sections (JSON), category, isActive, version
- **FormResponse**: answers (JSON), status (draft/completed)

## Financial Models

- **Charge**: totalAmount (centavos), discount, netAmount, status. Has many Payments
- **Payment**: amount (centavos), dueDate, paidAt, paymentMethod, status. Gateway fields (Asaas)
- **Expense**: amount (centavos), recurrence (null/monthly/weekly/yearly)
- **ExpenseCategory**: name, color, icon
- **NfseConfig** / **Nfse**: NFS-e emission via NuvemFiscal
- **GatewayConfig**: provider (asaas/stripe), apiKey (encrypted)
- **InventoryItem** / **InventoryMovement**: stock management

## TISS/Insurance Models

- **Operadora**: registroAns, nome, cnpj
- **TissConfig**: CNES, CBO, council
- **TissGuide**: type (consulta/sp_sadt), procedimentos (JSON), status, xmlContent

## ANVISA Medication Models

- **MedicationDatabase**: anvisaCode (unique), name, activeIngredient, concentration, pharmaceuticalForm, controlType (none/c1/c2/antimicrobial)
- **MedicationFavorite**: per-user favorites with usage count

## Communication Models

- **WhatsAppConfig** / **WhatsAppConversation** / **WhatsAppMessage**: WhatsApp Business API
- **NpsSurvey**: score (0-10), comment, token-based public access

## System Models

- **WorkspaceMember**: role (admin/doctor/secretary/viewer)
- **WorkspaceInvite**: email, role, token, status, expiresAt
- **AuditLog**: action, entityType, entityId, details
- **ConsentRecord**: consentType, givenBy, givenAt
- **UsageRecord**: period, metric, value
- **Notification**: type, title, body, read
- **DpoRequest**: LGPD data subject requests
- **SignatureConfig**: digital signing config (ICP-Brasil)
- **BookingConfig**: public booking page config

## Prescription Models

- **PrescriptionTemplate**: name, description, specialty, items (JSON), notes, isShared, usageCount, createdBy. Per workspace
- **DrugInteraction**: drug1, drug2, severity (mild/moderate/severe/contraindicated), description, recommendation, source. @@unique([drug1, drug2])

## Migration Models

- **MigrationSession**: source, status, mapping (JSON), importedCount, errorLog

## Gateway Models

- **GatewayConfig**: provider (asaas/stripe), apiKey (encrypted)
- **GatewayWebhookLog**: provider, eventType, payload, processedAt

## Clinical Image Models

- **ClinicalImage**: url, bodyRegion, category (before/after/progress/general), pairedImageId (before/after link), description, tags

## Commission Models

- **CommissionRule**: professionalId, procedureName, type (percentage/fixed), value
- **CommissionEntry**: professionalId, appointmentId, amount, status (pending/paid), paidAt

## Key Constraints

- `@@unique([workspaceId, document])` on Patient — CPF unique per workspace
- `@@index([workspaceId, date])` on Appointment — calendar queries
- `@@index([agendaId, status, date])` on Appointment — agenda filtering
- Multi-tenant isolation: all queries scoped by workspaceId
