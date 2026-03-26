import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { ExtractedPatientData, WorkspaceConfig, AppointmentSummary } from '@/types'
import {
  ExtractedPatientDataSchema,
  WorkspaceConfigSchema,
  AppointmentSummarySchema,
} from '@/lib/schemas'
import { env } from '@/lib/env'

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  timeout: 30_000,
})

// ---------------------------------------------------------------------------
// Helper: extrai e valida JSON de resposta da IA (fallback)
// ---------------------------------------------------------------------------
function parseAIResponse<T>(text: string, schema: z.ZodSchema<T>): T {
  // Strip markdown fences first
  text = text.replace(/```json?\s*/g, '').replace(/```/g, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
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
// Helper: extract tool_use result from message
// ---------------------------------------------------------------------------
function extractToolResult<T>(
  message: Anthropic.Message,
  toolName: string,
  schema: z.ZodSchema<T>
): T {
  const toolBlock = message.content.find(
    (c): c is Anthropic.ToolUseBlock => c.type === 'tool_use' && c.name === toolName
  )

  if (!toolBlock) {
    // Fallback to text parsing if tool_use block not found
    const textBlock = message.content.find(
      (c): c is Anthropic.TextBlock => c.type === 'text'
    )
    if (textBlock) {
      return parseAIResponse(textBlock.text, schema)
    }
    throw new Error(`Resposta da IA nao contem tool_use '${toolName}' nem texto`)
  }

  const result = schema.safeParse(toolBlock.input)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(
      `Resposta da IA (tool_use) nao passou na validacao de schema:\n${issues}`
    )
  }

  return result.data
}

// ---------------------------------------------------------------------------
// Tool schemas for Claude tool_use
// ---------------------------------------------------------------------------
const EXTRACT_PATIENT_DATA_TOOL: Anthropic.Tool = {
  name: 'extract_patient_data',
  description: 'Extrair dados estruturados do paciente a partir da transcrição',
  input_schema: {
    type: 'object' as const,
    properties: {
      name: { type: ['string', 'null'], description: 'Nome do paciente' },
      document: { type: ['string', 'null'], description: 'CPF ou documento do paciente' },
      phone: { type: ['string', 'null'], description: 'Telefone do paciente' },
      email: { type: ['string', 'null'], description: 'Email do paciente' },
      birthDate: { type: ['string', 'null'], description: 'Data de nascimento (formato YYYY-MM-DD)' },
      age: { type: ['number', 'null'], description: 'Idade do paciente' },
      procedures: { type: 'array', items: { type: 'string' }, description: 'Procedimentos mencionados' },
      notes: { type: ['string', 'null'], description: 'Observações gerais' },
      alerts: { type: 'array', items: { type: 'string' }, description: 'Alertas médicos (alergias, etc)' },
      customData: { type: 'object', description: 'Dados customizados do workspace' },
      confidence: { type: 'object', description: 'Confiança (0-1) para cada campo extraído', additionalProperties: { type: 'number' } },
    },
    required: ['name', 'procedures', 'confidence'],
  },
}

const GENERATE_CONSULTATION_SUMMARY_TOOL: Anthropic.Tool = {
  name: 'generate_consultation_summary',
  description: 'Gerar resumo estruturado da consulta com separacao de dados clinicos e pessoais',
  input_schema: {
    type: 'object' as const,
    properties: {
      procedures: { type: 'array', items: { type: 'string' }, description: 'Procedimentos realizados' },
      observations: { type: ['string', 'null'], description: 'Observacoes clinicas relevantes (sinais, sintomas, evolucao, exame fisico)' },
      recommendations: { type: ['string', 'null'], description: 'Recomendacoes ao paciente' },
      nextAppointment: { type: ['string', 'null'], description: 'Sugestao para proxima consulta' },
      diagnosis: { type: ['string', 'null'], description: 'Diagnostico ou hipotese diagnostica mencionada' },
      medications: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nome do medicamento' },
            dosage: { type: 'string', description: 'Dosagem (ex: 500mg)' },
            frequency: { type: 'string', description: 'Frequencia (ex: 8/8h, 1x ao dia)' },
            notes: { type: 'string', description: 'Observacoes sobre o medicamento' },
          },
          required: ['name'],
        },
        description: 'Medicamentos prescritos ou mencionados na consulta',
      },
      patientInfoUpdates: {
        type: 'object',
        properties: {
          address: { type: ['string', 'null'], description: 'Endereco mencionado pelo paciente' },
          phone: { type: ['string', 'null'], description: 'Telefone mencionado pelo paciente' },
          insurance: { type: ['string', 'null'], description: 'Convenio/plano de saude mencionado' },
          allergies: { type: 'array', items: { type: 'string' }, description: 'Alergias mencionadas' },
          medications: { type: 'array', items: { type: 'string' }, description: 'Medicacoes de uso continuo mencionadas' },
          chronicDiseases: { type: 'array', items: { type: 'string' }, description: 'Doencas cronicas mencionadas' },
        },
        description: 'Dados pessoais do paciente mencionados na consulta que devem atualizar o cadastro (endereco, telefone, convenio, alergias, medicacoes cronicas, doencas)',
      },
    },
    required: ['procedures'],
  },
}

const GENERATE_WORKSPACE_CONFIG_TOOL: Anthropic.Tool = {
  name: 'generate_workspace_config',
  description: 'Gerar configuração de workspace personalizada para a profissão',
  input_schema: {
    type: 'object' as const,
    properties: {
      procedures: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            category: { type: 'string' },
          },
          required: ['id', 'name'],
        },
        description: 'Lista de procedimentos',
      },
      customFields: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['text', 'number', 'boolean', 'date', 'select'] },
            required: { type: 'boolean' },
            options: { type: 'array', items: { type: 'string' } },
          },
          required: ['id', 'name', 'type'],
        },
        description: 'Campos customizados do paciente',
      },
      anamnesisTemplate: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            question: { type: 'string' },
            type: { type: 'string', enum: ['text', 'boolean', 'select'] },
            options: { type: 'array', items: { type: 'string' } },
          },
          required: ['id', 'question', 'type'],
        },
        description: 'Template de anamnese',
      },
      categories: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
          required: ['id', 'name'],
        },
        description: 'Categorias de procedimentos',
      },
    },
    required: ['procedures', 'customFields', 'anamnesisTemplate', 'categories'],
  },
}

// ---------------------------------------------------------------------------
// extractEntities
// ---------------------------------------------------------------------------
export async function extractEntities(
  transcript: string,
  workspaceConfig: { customFields: any[]; procedures: any[] }
): Promise<ExtractedPatientData> {
  if (!transcript || transcript.trim().length < 10) {
    throw new Error('Transcrição muito curta para extração de dados')
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    temperature: 0,
    tools: [EXTRACT_PATIENT_DATA_TOOL],
    tool_choice: { type: 'tool', name: 'extract_patient_data' },
    system: `Voce e um assistente especializado em extrair dados estruturados de transcricoes de consultas medicas/clinicas.

Extraia os dados do paciente da transcricao fornecida. Inclua um campo "confidence" com valor 0 a 1 para cada campo extraido, indicando sua certeza.
Para campos nao mencionados na transcricao, retorne null.`,
    messages: [{
      role: 'user',
      content: `Campos disponiveis no workspace: ${JSON.stringify(workspaceConfig.customFields)}
Procedimentos disponiveis: ${JSON.stringify(workspaceConfig.procedures)}

Transcricao do audio:
"${transcript}"`,
    }],
  })

  return extractToolResult(message, 'extract_patient_data', ExtractedPatientDataSchema) as ExtractedPatientData
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
    tools: [GENERATE_WORKSPACE_CONFIG_TOOL],
    tool_choice: { type: 'tool', name: 'generate_workspace_config' },
    system: `Voce e um assistente especializado em configurar sistemas de gestao para profissionais de saude e servicos.

Gere um workspace personalizado para a profissao indicada. Inclua pelo menos 10 procedimentos, 8 campos customizados e 10 perguntas de anamnese. Use terminologia profissional correta em portugues brasileiro.`,
    messages: [{
      role: 'user',
      content: `Profissao: ${profession}\nRespostas do profissional: ${JSON.stringify(answers)}`,
    }],
  })

  return extractToolResult(message, 'generate_workspace_config', WorkspaceConfigSchema) as WorkspaceConfig
}

// ---------------------------------------------------------------------------
// generateConsultationSummary
// ---------------------------------------------------------------------------
export async function generateConsultationSummary(
  transcript: string,
  workspaceProcedures: any[]
): Promise<AppointmentSummary> {
  if (!transcript || transcript.trim().length < 10) {
    throw new Error('Transcrição muito curta para extração de dados')
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    temperature: 0,
    tools: [GENERATE_CONSULTATION_SUMMARY_TOOL],
    tool_choice: { type: 'tool', name: 'generate_consultation_summary' },
    system: `Voce e um assistente especializado em resumir consultas medicas/clinicas.

Regras de extracao:
1. Identifique os procedimentos realizados comparando com a lista disponivel. Se um procedimento mencionado nao estiver na lista, inclua-o mesmo assim.
2. Separe observacoes clinicas (sinais, sintomas, evolucao, exame fisico) de dados pessoais do paciente.
3. Se houver diagnostico ou hipotese diagnostica, extraia no campo "diagnosis".
4. Se houver medicamentos prescritos ou mencionados, extraia cada um com dosagem e frequencia quando disponiveis.
5. Se o paciente mencionar dados pessoais (endereco, telefone, convenio, alergias, medicacoes de uso continuo, doencas cronicas), extraia em "patientInfoUpdates". NAO coloque esses dados em "observations".
6. Seja conciso e objetivo. Use portugues brasileiro.`,
    messages: [{
      role: 'user',
      content: `Procedimentos disponiveis no workspace: ${JSON.stringify(workspaceProcedures)}

Transcricao da consulta:
"${transcript}"`,
    }],
  })

  return extractToolResult(message, 'generate_consultation_summary', AppointmentSummarySchema) as AppointmentSummary
}
