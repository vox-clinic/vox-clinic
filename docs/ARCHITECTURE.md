# Architecture Reference

> Detailed architecture docs. CLAUDE.md points here. Read only when working on specific areas.

## Route Groups

- `src/app/(auth)/` — Sign-in/sign-up (Clerk)
- `src/app/(dashboard)/` — Authenticated pages (sidebar + bottom nav + auth guard)
  - `/dashboard` — Stat cards, today's agenda, recent activity, quick actions
  - `/patients` — Paginated list with search
  - `/patients/[id]` — Detail with tabs (Resumo, Historico, Tratamentos, Prescricoes, Documentos, Imagens, Gravacoes, Formularios)
  - `/patients/[id]/report` — Print-friendly report (Ctrl+P)
  - `/patients/new/voice` — Voice registration flow
  - `/patients/new/manual` — Manual registration form
  - `/calendar` — Modular calendar (week/day/month/list views, scheduling, DnD, conflict detection, recurring, time blocking, multiple agendas)
  - `/appointments/new` — Record consultation
  - `/appointments/review` — Review AI summary before confirming
  - `/appointments/[id]/receipt` — Print-friendly receipt
  - `/prescriptions/[id]` — Print-friendly prescription
  - `/certificates/[id]` — Print-friendly certificate (atestado/declaracao/encaminhamento/laudo)
  - `/financial` — Revenue, expenses, receivables, cash flow, NFS-e, TISS, inventory, price table
  - `/teleconsulta/[id]` — Video room (Daily.co)
  - `/settings` — Workspace config (procedures, agendas, booking, forms, gateway)
  - `/settings/tiss` — TISS billing + operadoras
  - `/settings/form-builder/[id]` — Visual form builder
  - `/settings/whatsapp` — WhatsApp Business setup wizard
  - `/mensagens` — WhatsApp inbox
- `src/app/(admin)/` — Superadmin panel (dashboard, workspaces, users, roadmap)
- `src/app/onboarding/` — 4-step wizard (profession > questions > clinic > AI preview)

### Public Pages (no auth)
- `/booking/[token]` — Online booking (supports iframe via `?mode=compact`)
- `/nps/[token]` — NPS survey
- `/sala/[token]` — Teleconsulta patient access (24h window)
- `/verificar/[token]` — Digital signature verification
- `/dpo` — LGPD data subject requests
- `/privacidade` — Privacy policy
- `/termos` — Terms of service
- `/docs` — Feature documentation

### API Routes
- `/api/webhooks/clerk` — User sync
- `/api/reminders` — Cron appointment reminders (WhatsApp > email)
- `/api/birthdays` — Cron birthday messages
- `/api/nps/*` — NPS survey API + cron sending
- `/api/booking/*` — Public booking + slots
- `/api/export/*` — Excel export (patients, reports)
- `/api/webhooks/daily` — Daily.co recording webhook
- `/api/webhooks/gateway` — Payment gateway webhook (Asaas)
- `/api/whatsapp/webhook` — WhatsApp incoming messages + status
- `/api/cid/search` — CID-10 search
- `/api/medications/search` — ANVISA medication search
- `/api/inngest` — Inngest function handler
- `/api/dpo` — DPO request submission

## Server Actions (`src/server/actions/`)

All mutations use `"use server"` directive. Auth via `auth()` from Clerk, workspace-scoped.

| File | Functions |
|------|-----------|
| `admin.ts` | getAdminDashboard, getAdminWorkspaces, getAdminWorkspaceDetail, toggleWorkspaceStatus, getAdminUsers |
| `agenda.ts` | getAgendas, getDefaultAgendaId, getDefaultAgendaIdForWorkspace, createAgenda, updateAgenda, deleteAgenda |
| `appointment.ts` | getAppointments, getAppointmentsByDateRange, checkAppointmentConflicts, scheduleAppointment, updateAppointmentStatus, rescheduleAppointment, deleteAppointment, scheduleRecurringAppointments |
| `audit.ts` | getAuditLogs |
| `billing.ts` | createCheckoutSession, createPortalSession, getWorkspaceUsage, getBillingInfo |
| `blocked-slot.ts` | getBlockedSlots, createBlockedSlot, updateBlockedSlot, deleteBlockedSlot |
| `booking-config.ts` | getBookingConfig, toggleBooking, updateBookingConfig, regenerateBookingToken |
| `cashflow.ts` | getCashFlowData, getCashFlowProjection |
| `certificate.ts` | createCertificate, getCertificate, getPatientCertificates, deleteCertificate |
| `clinical-image.ts` | getPatientImages, uploadImage, updateImage, deleteImage, pairImages, unpairImage, getImageCount, getClinicalImageSignedUrl |
| `commission.ts` | getCommissionRules, createCommissionRule, updateCommissionRule, deleteCommissionRule, calculateCommissions, getCommissionReport, getCommissionEntries, markCommissionsPaid |
| `consultation.ts` | processConsultation, getRecordingForReview, confirmConsultation |
| `dashboard.ts` | getDashboardData |
| `document.ts` | getPatientDocuments, uploadPatientDocument, getDocumentSignedUrl, deletePatientDocument |
| `drug-interaction.ts` | checkDrugInteractions |
| `expense.ts` | seedDefaultCategories, getExpenseCategories, createExpenseCategory, createExpense, updateExpense, deleteExpense, payExpense, getExpenses |
| `export.ts` | exportPatientData |
| `financial.ts` | getFinancialData, updateAppointmentPrice, updateProcedurePrice, getWorkspaceProcedures |
| `form-response.ts` | getFormTemplates, getPatientFormResponses, getAppointmentFormResponses, createFormResponse, saveDraftFormResponse, completeFormResponse, submitFormResponse, deleteFormResponse |
| `form-template.ts` | getFormTemplates, getFormTemplate, createFormTemplate, updateFormTemplate, duplicateFormTemplate, deleteFormTemplate, importFromLibrary |
| `gateway.ts` | createGatewayCharge, checkGatewayStatus, cancelGatewayCharge, recordGatewayPayment |
| `gateway-config.ts` | getGatewayConfig, saveGatewayConfig, testGatewayConnection |
| `import.ts` | importPatients |
| `inventory.ts` | getInventoryCategories, createInventoryCategory, getInventoryItems, getInventoryItem, createInventoryItem, updateInventoryItem, deactivateInventoryItem, recordMovement, getMovements, getInventorySummary, getLowStockItems |
| `medication.ts` | searchMedications, getMedicationFavorites, upsertMedicationFavorite, removeMedicationFavorite |
| `messaging.ts` | getMessagingConfig, updateMessagingConfig, sendAppointmentMessage |
| `migration.ts` | startMigrationAction, confirmMigrationAction, cancelMigrationAction, getMigrationHistoryAction, getAutoColumnMapping |
| `nfse.ts` | emitNfse, getNfseList, searchAppointmentsForNfse, getNfseByAppointment, cancelNfse, refreshNfseStatus |
| `nfse-config.ts` | getNfseConfig, saveNfseConfig, uploadNfseCertificate, testNfseConnection |
| `notification.ts` | getNotifications, getUnreadCount, markAsRead, markAllAsRead, generateUpcomingNotifications |
| `operadora.ts` | getOperadoras, createOperadora, updateOperadora, deleteOperadora |
| `patient.ts` | searchPatients, getRecentPatients, getPatients, getPatient, updatePatient, createPatient, deactivatePatient, getAudioPlaybackUrl, mergePatients, grantWhatsAppConsent, revokeWhatsAppConsent, getDistinctInsurances, getAllPatientTags |
| `prescription.ts` | createPrescription, updatePrescription, getPrescription, getPatientPrescriptions, signPrescription, cancelPrescription, updatePrescriptionType, deletePrescription, generatePrescriptionPdfAction, sendPrescriptionWhatsApp, sendPrescriptionEmail |
| `prescription-template.ts` | getTemplates, createTemplate, applyTemplate, deleteTemplate, saveAsTemplate |
| `receipt.ts` | generateReceiptData |
| `receivable.ts` | createCharge, recordPayment, getCharges, getCharge, getPatientBalance, getReceivablesSummary, cancelCharge |
| `recording.ts` | getRecordingStatus |
| `reminder.ts` | sendAppointmentReminder, sendBulkReminders |
| `reports.ts` | getReportsData, getNpsSurveys |
| `team.ts` | getTeamMembers, inviteTeamMember, cancelInvite, updateMemberRole, removeMember, acceptInvite |
| `teleconsulta.ts` | createTeleconsultaRoom, recordTeleconsultaConsent, getPatientJoinInfo, endTeleconsulta, getTeleconsultaInfo |
| `tiss.ts` | createTissGuide, getTissGuides, getTissGuide, updateTissGuideStatus, generateTissBatch, searchAppointmentsForTiss |
| `tiss-config.ts` | getTissConfig, saveTissConfig |
| `tour.ts` | getTourState, updateTourStep, completeTour, resetTour |
| `treatment.ts` | getTreatmentPlans, createTreatmentPlan, addSessionToTreatment, updateTreatmentPlanStatus, deleteTreatmentPlan |
| `voice.ts` | processVoiceRegistration, confirmPatientRegistration, checkDuplicatePatient |
| `waitlist.ts` | getWaitlistEntries, getWaitlistCount, addToWaitlist, updateWaitlistEntry, cancelWaitlistEntry, findMatchesForSlot, scheduleFromWaitlist |
| `whatsapp.ts` | getWhatsAppConfig, saveWhatsAppConfig, disconnectWhatsApp, fetchConversations, fetchMessages, sendTextMessage, sendTemplateMessage, markConversationAsRead, fetchTemplates, checkWhatsAppHealth |
| `workspace.ts` | getWorkspace, updateWorkspace, generateWorkspace, getWorkspacePreview |

## Key Components

| Component | Purpose |
|-----------|---------|
| `record-button.tsx` | Audio recording with LGPD consent |
| `command-palette.tsx` | Ctrl+K global search |
| `notification-bell.tsx` | In-app notifications |
| `create-prescription-dialog.tsx` | Prescription creation (nativa) |
| `create-certificate-dialog.tsx` | Medical certificate creation |
| `medication-autocomplete.tsx` | ANVISA medication search with favorites |
| `prescription-template-picker.tsx` | Template picker para prescrições |
| `cid-autocomplete.tsx` | CID-10 code search |
| `form-renderer.tsx` | Dynamic form renderer (11 field types) |
| `teleconsulta-badge.tsx` | Teleconsulta status badge |
| `confirm-dialog.tsx` | Reusable confirmation dialog |
| `breadcrumb.tsx` | Breadcrumb navigation |
| `theme-toggle.tsx` | Dark/light theme toggle |
| `nav-sidebar.tsx` / `nav-bottom.tsx` | Navigation (desktop/mobile, RBAC filtered) |

## Calendar Components (`src/app/(dashboard)/calendar/`)

Decomposed modular architecture:
- `types.ts` / `helpers.ts` — Shared types and helpers
- `components/week-view.tsx` — DnD, memo'd, O(1) lookup via Map
- `components/day-view.tsx` / `month-view.tsx` / `list-view.tsx` — All memo'd
- `components/schedule-form.tsx` / `block-time-form.tsx` — Forms
- `components/appointment-card.tsx` — Status actions, memo'd
- `components/conflict-dialog.tsx` — AlertDialog for conflicts

## AI Pipeline

- `src/lib/openai.ts` — Whisper transcription (60s timeout, pt-BR, vocabulary hints)
- `src/lib/claude.ts` — Claude tool_use for structured extraction (30s timeout, temperature:0)
- `src/lib/schemas.ts` — Zod validation for AI responses
- `src/data/cid10-index.ts` — CID-10 search (1022 codes, accent-insensitive)
- `src/data/medications-index.ts` — ANVISA medications (248 curated, DB-backed in production)

## Integration Modules

| Module | Files | Purpose |
|--------|-------|---------|
| NFS-e | `src/lib/nfse/client.ts` | NuvemFiscal API (DPS Nacional) |
| Payment | `src/lib/gateway/` | Asaas gateway (charges, PIX, boleto) |
| TISS | `src/lib/tiss/` | ANS billing XML generation |
| WhatsApp | `src/lib/whatsapp/` | Meta Cloud API |
| Inngest | `src/inngest/` | Background job processing |
