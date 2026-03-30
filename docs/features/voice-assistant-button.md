# Voice Assistant Button

Floating voice button that appears on every dashboard screen and allows the professional to add information to an existing patient by speaking, from any page in the system.

## What NOT to change
- Do not modify any existing function in src/server/actions/voice.ts
- Do not modify RecordButton component
- Do not modify transcribeAudio in src/lib/openai.ts
- Do not modify extractEntities in src/lib/claude.ts
- Do not modify any existing page or component

## What to build

### 1. New function in src/lib/claude.ts
Add a new exported async function called `extractPatientUpdateIntents`.

It receives:
- transcript: string
- patientName: string

It calls the existing Claude client (already configured in the file) with this system prompt:
"You are a clinical assistant for a dental clinic. Extract structured update actions from the professional's speech about an existing patient. Always respond with valid JSON only, no explanation, no markdown.

The JSON must follow this structure exactly:
{
  \"actions\": [
    {
      \"type\": \"ADD_NOTE\" | \"ADD_ALLERGY\" | \"ADD_MEDICAL_HISTORY\" | \"UNKNOWN\",
      \"value\": string,
      \"confidence\": number between 0 and 1
    }
  ]
}

Action type rules:
- ADD_NOTE: clinical observations, procedures performed, general notes
- ADD_ALLERGY: allergies or medication intolerances mentioned
- ADD_MEDICAL_HISTORY: chronic diseases, conditions, ongoing medications
- UNKNOWN: anything that cannot be mapped to the above types

Always extract at least one action. If nothing clinical is mentioned, use UNKNOWN."

The user message should be: `Patient: ${patientName}\n\nProfessional's speech: ${transcript}`

Return the parsed JSON as `{ actions: Array<{ type: string, value: string, confidence: number }> }`.

### 2. New server action in src/server/actions/voice.ts
Append a new exported server action called `processPatientVoiceUpdate`.

It receives a FormData with:
- audio: File
- patientId: string

Steps:
1. Auth check using the same pattern as processVoiceRegistration
2. Validate patientId exists and belongs to the workspace
3. Validate audio file (same size check as existing)
4. Upload audio using uploadAudio
5. Preprocess audio using preprocessAudio
6. Transcribe using transcribeAudio (reuse existing import)
7. Load patient name from db for context
8. Call extractPatientUpdateIntents with transcript and patient name
9. Create a Recording linked to the patient with status "processed", storing transcript and aiExtractedData
10. Log audit with action "recording.created"
11. Return { recordingId, transcript, intents, patientId }

On error: save Recording with status "error" same as existing pattern.

### 3. New server action in src/server/actions/voice.ts
Append a new exported server action called `confirmPatientVoiceUpdate`.

It receives:
- recordingId: string
- patientId: string
- actions: Array<{ type: string, value: string }>

For each action:
- ADD_NOTE: append to patient.medicalHistory.notes (it is a JSON field, read current value, append with timestamp prefix "[$date]: $value\n")
- ADD_ALLERGY: append to patient.medicalHistory.allergies array
- ADD_MEDICAL_HISTORY: append to patient.medicalHistory.chronicDiseases array

Execute all updates in a single db.$transaction.
Log audit with action "patient.updated" after transaction.
Call revalidateTag("patient-search", "max") and revalidateTag("dashboard", "max").
Return { success: true, patientId }.

### 4. New component: src/components/voice-assistant-button.tsx
A "use client" floating component.

Props:
- patientId?: string (optional — if not provided, show a patient search step first)

States: idle | recording | processing | confirming | success | error

Behavior:
- Renders as a fixed floating button, bottom-right corner, z-50
- Position it slightly above the existing UI so it does not overlap the bottom navigation
- idle: microphone icon, uses bg-vox-primary color
- recording: pulsing red, uses the existing RecordButton component with requireConsent={false} (consent already handled at workspace level)
- processing: shows a small loading spinner inside the button
- confirming: opens a Dialog (use existing Dialog component from @/components/ui/dialog)
- success: shows a brief checkmark then returns to idle
- error: shows error message near the button

The Dialog for confirming must show:
- The raw transcript in a muted text block
- A list of extracted actions, each showing the type label in Portuguese and the value
  - ADD_NOTE -> "Anotacao Clinica"
  - ADD_ALLERGY -> "Alergia"
  - ADD_MEDICAL_HISTORY -> "Historico Medico"
  - UNKNOWN -> "Nao identificado" (show grayed out, do not include in confirm)
- If patientId is not provided, show a simple text input for the professional to type the patient name and a dropdown to select from a list -- but for now just show an informational message "Selecione um paciente antes de usar o assistente de voz" and disable the confirm button
- A "Confirmar" button that calls confirmPatientVoiceUpdate
- A "Cancelar" button that closes the dialog and returns to idle

The component must call processPatientVoiceUpdate passing the audio blob and patientId as FormData.

### 5. Add VoiceAssistantButton to dashboard layout
In src/app/(dashboard)/layout.tsx, import VoiceAssistantButton and render it at the end of the layout body, without patientId (it will work in discovery mode for now — the patient context will be added in a future iteration).

## Constraints
- All code in English
- No comments in code
- Use existing imports and patterns found in the files you read
- Do not install new packages
- Do not create new UI components — use only what already exists in @/components/ui/
- Use the same error handling pattern (safeAction, ActionError) found in voice.ts
- Use the same audit logging pattern found in voice.ts
