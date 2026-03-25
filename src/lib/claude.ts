import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { ExtractedPatientData, WorkspaceConfig, AppointmentSummary } from '@/types'
import {
  ExtractedPatientDataSchema,
  WorkspaceConfigSchema,
  AppointmentSummarySchema,
} from '@/lib/schemas'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ---------------------------------------------------------------------------
// Helper: extrai e valida JSON de resposta da IA
// ---------------------------------------------------------------------------
function parseAIResponse<T>(text: string, schema: z.ZodSchema<T>): T {
  // Tenta parse direto (caso a resposta seja JSON puro)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // Se falhar, tenta extrair o primeiro objeto JSON via regex nao-gulosa
    const jsonMatch = text.match(/\{[\s\S]*?\}(?=[^}]*$)/)
    // Fallback: regex gulosa limitada ao ultimo } para objetos aninhados
    const match = jsonMatch ?? text.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error(
        'Nao foi possivel extrair JSON da resposta da IA. Resposta recebida:\n' +
        text.slice(0, 500)
      )
    }
    try {
      parsed = JSON.parse(match[0])
    } catch (parseErr) {
      throw new Error(
        'JSON extraido da resposta da IA e invalido: ' +
        (parseErr instanceof Error ? parseErr.message : String(parseErr))
      )
    }
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(
      `Resposta da IA nao passou na validacao de schema:\n${issues}`
    )
  }

  return result.data
}

// ---------------------------------------------------------------------------
// extractEntities
// ---------------------------------------------------------------------------
export async function extractEntities(
  transcript: string,
  workspaceConfig: { customFields: any[]; procedures: any[] }
): Promise<ExtractedPatientData> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: `Voce e um assistente especializado em extrair dados estruturados de transcricoes de consultas medicas/clinicas.

Campos disponiveis no workspace: ${JSON.stringify(workspaceConfig.customFields)}
Procedimentos disponiveis: ${JSON.stringify(workspaceConfig.procedures)}

Retorne APENAS um JSON valido com esta estrutura:
{
  "name": string | null,
  "document": string | null,
  "phone": string | null,
  "email": string | null,
  "birthDate": string | null,
  "age": number | null,
  "procedures": string[],
  "notes": string | null,
  "alerts": string[],
  "customData": {},
  "confidence": { "name": 0-1, "document": 0-1, ... }
}

Inclua um campo "confidence" com valor 0 a 1 para cada campo extraido, indicando sua certeza.
Retorne APENAS o JSON, sem explicacoes.`,
    messages: [{
      role: 'user',
      content: `Transcricao do audio:\n"${transcript}"`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return parseAIResponse(text, ExtractedPatientDataSchema) as ExtractedPatientData
}

// ---------------------------------------------------------------------------
// generateWorkspaceSuggestions
// ---------------------------------------------------------------------------
export async function generateWorkspaceSuggestions(
  profession: string,
  answers: Record<string, string>
): Promise<WorkspaceConfig> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `Voce e um assistente especializado em configurar sistemas de gestao para profissionais de saude e servicos.

Gere um workspace personalizado em JSON com:
{
  "procedures": [{ "id": string, "name": string, "category": string }],
  "customFields": [{ "id": string, "name": string, "type": "text"|"number"|"boolean"|"date"|"select", "required": boolean, "options": string[]? }],
  "anamnesisTemplate": [{ "id": string, "question": string, "type": "text"|"boolean"|"select", "options": string[]? }],
  "categories": [{ "id": string, "name": string }]
}

Gere dados realistas e completos para a profissao. Inclua pelo menos 10 procedimentos, 8 campos customizados e 10 perguntas de anamnese. Use terminologia profissional correta em portugues brasileiro.
Retorne APENAS o JSON, sem explicacoes.`,
    messages: [{
      role: 'user',
      content: `Profissao: ${profession}\nRespostas do profissional: ${JSON.stringify(answers)}`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return parseAIResponse(text, WorkspaceConfigSchema) as WorkspaceConfig
}

// ---------------------------------------------------------------------------
// generateConsultationSummary
// ---------------------------------------------------------------------------
export async function generateConsultationSummary(
  transcript: string,
  workspaceProcedures: any[]
): Promise<AppointmentSummary> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: `Voce e um assistente especializado em resumir consultas medicas/clinicas.

Procedimentos disponiveis no workspace: ${JSON.stringify(workspaceProcedures)}

Retorne APENAS um JSON valido com esta estrutura:
{
  "procedures": ["lista de procedimentos realizados na consulta"],
  "observations": "observacoes clinicas relevantes",
  "recommendations": "recomendacoes ao paciente",
  "nextAppointment": "sugestao de data/prazo para proxima consulta ou null"
}

Identifique os procedimentos realizados comparando com a lista disponivel. Se um procedimento mencionado nao estiver na lista, inclua-o mesmo assim. Seja conciso e objetivo nas observacoes e recomendacoes. Use portugues brasileiro.
Retorne APENAS o JSON, sem explicacoes.`,
    messages: [{
      role: 'user',
      content: `Transcricao da consulta:\n"${transcript}"`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return parseAIResponse(text, AppointmentSummarySchema) as AppointmentSummary
}
