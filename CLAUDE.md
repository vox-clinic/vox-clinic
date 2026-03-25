# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoxClinic is a voice-powered intelligent CRM for healthcare and service professionals (dentists, nutritionists, aestheticians, doctors, lawyers). Professionals speak during or after appointments, and the system automatically transcribes, extracts structured data via AI, and populates patient records. The key differentiator is an AI-driven onboarding that generates a fully customized workspace per profession.

## Planned Tech Stack

- **Frontend:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **Backend/API:** Next.js API Routes (tRPC or REST)
- **Database:** PostgreSQL via Supabase (with Row Level Security for multi-tenant isolation)
- **ORM:** Prisma or Drizzle ORM
- **Auth:** Clerk or NextAuth.js
- **Speech-to-Text:** OpenAI Whisper API or Deepgram
- **AI/LLM:** Anthropic Claude API (Sonnet) — entity extraction, workspace generation, clinical summaries
- **Storage:** AWS S3 or Supabase Storage (encrypted audio files)
- **Deploy:** Vercel (frontend) + Railway or Fly.io (workers) — region sa-east-1 (São Paulo)
- **Payments:** Stripe BR or Pagar.me (BRL, Pix, boleto, recurring billing)

## Architecture Notes

- **Multi-tenant via RLS:** Each professional's data is isolated at the database level using Supabase Row Level Security. Every query must be scoped to the user's workspace.
- **JSONB for dynamic fields:** Patient records, procedures, anamnesis templates, and custom fields use JSONB columns to support profession-specific schemas without migrations per profession.
- **Audio pipeline:** Browser MediaRecorder API → upload to encrypted storage → worker sends to Whisper/Deepgram → transcription sent to Claude API with profession-specific prompt → structured JSON returned → confirmation screen → save to PostgreSQL.
- **Confirmation-before-save:** AI-extracted data is never saved automatically. The professional must review and approve on a confirmation screen.

## Key Domain Entities

- **User** (professional): owns a Workspace
- **Workspace**: profession-specific config (custom_fields, procedures, anamnesis_template as JSONB)
- **Patient**: belongs to a Workspace, has custom_data (JSONB) and alerts (JSONB)
- **Appointment**: links Patient to procedures, notes, AI summary, audio, transcript
- **Recording**: audio file + transcript + AI-extracted data + processing status
- **MedicalRecord**: versioned clinical entries (never overwritten, full audit trail)
- **Anamnesis**: patient intake form, source can be voice/form/remote
- **Document**: TCLE, consent forms, contracts — with content hash for integrity
- **Signature**: touch/voice/remote_link methods with full audit metadata

## Regulatory Requirements (Brazil)

- **LGPD (Lei 13.709/2018):** Handles sensitive health data (Art. 5, II). Requires specific highlighted consent before audio recording. Patient rights (access, correction, deletion, portability) must be exercisable in-app.
- **CFM Resolução 1.821/2007:** Medical records must be retained for minimum 20 years.
- **Audio consent:** Verbal notice + signed TCLE required before any recording. Audio never cached locally — direct upload to encrypted storage.
- **Encryption:** TLS 1.3 in transit, AES-256 at rest (disk + column-level for sensitive fields), KMS for key management, SHA-256 for document hashing.
- **Data residency:** All data must remain in Brazilian infrastructure (AWS sa-east-1).

## UI/UX Principles

- Mobile-first, minimal interface. Voice recording button is the primary UI element (floating action button, always accessible).
- Design references: Linear (minimalism), Otter.ai (transcription UX).
- Palette: primary blue (#1A73E8), Inter/Geist Sans typography, 12px border-radius, Lucide/Phosphor icons.
- Dark mode supported from MVP.
- WCAG AA compliance required (4.5:1 contrast, 44x44px touch targets).
- Fields with AI confidence < threshold must be visually highlighted (amber) for review.

## Language

- All UI, terms, notifications, and emails in Brazilian Portuguese (pt-BR).
- Currency in BRL (R$), dates in DD/MM/AAAA, phone with DDD (+55), CPF validation.
- Support Brazilian timezones (BRT, AMT, ACT, FNT) with auto-detection.

## Reference Document

Full product requirements are in `VoxClinic_PRD_v1.2.docx` at the repo root.
