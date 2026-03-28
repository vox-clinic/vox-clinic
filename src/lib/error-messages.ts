// Mensagens de erro user-friendly em pt-BR
// Centraliza todas as mensagens para consistência e facilidade de manutenção

import { PermissionError } from "@/lib/permissions"

/**
 * Error class for expected/business-logic errors in server actions.
 *
 * IMPORTANTE — Next.js em produção sanitiza Error.message de server actions
 * por segurança. O client recebe apenas "An error occurred in the Server
 * Components render" em vez da mensagem real. O campo `digest` também é
 * substituído por um hash numérico interno.
 *
 * SOLUÇÃO OFICIAL (Next.js docs): "model expected errors as return values,
 * not thrown errors". Em vez de throw, retorne { error: "mensagem" }.
 *
 * Esta classe é usada DENTRO do wrapper `safeAction` para distinguir
 * erros esperados (retornados ao client) de erros inesperados (re-thrown
 * para error boundaries).
 *
 * @see https://nextjs.org/docs/app/getting-started/error-handling
 * @see https://joulev.dev/blogs/throwing-expected-errors-in-react-server-actions
 */
export class ActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ActionError"
  }
}

/**
 * Tipo de retorno padrão para server actions wrapped com safeAction.
 * O frontend deve verificar `result.error` antes de usar `result` como dado.
 */
export type SafeActionResult<T> =
  | (T & { error?: never })
  | { error: string }

/**
 * Wrapper para server actions que captura ActionError e retorna { error }
 * em vez de lançar — garantindo que a mensagem chega ao client em produção.
 *
 * Erros inesperados (não-ActionError) são re-thrown normalmente para
 * serem capturados por error boundaries.
 *
 * Uso no server action:
 *   export const myAction = safeAction(async (data) => {
 *     if (!valid) throw new ActionError("Mensagem para o usuário")
 *     return { id: "123" }
 *   })
 *
 * Uso no client:
 *   const result = await myAction(data)
 *   if (result.error) { toast.error(result.error); return }
 *   // result é o dado de sucesso
 */
export function safeAction<Args extends unknown[], Return extends Record<string, unknown>>(
  fn: (...args: Args) => Promise<Return>
): (...args: Args) => Promise<SafeActionResult<Return>> {
  return async (...args: Args) => {
    try {
      return await fn(...args)
    } catch (err) {
      if (err instanceof ActionError || err instanceof PermissionError) {
        return { error: err.message }
      }
      // Capture unexpected errors in Sentry (if configured)
      if (typeof window === "undefined") {
        import("@sentry/nextjs").then(Sentry => Sentry.captureException(err)).catch(() => {})
      }
      // Re-throw unexpected errors (Prisma, network, etc.)
      throw err
    }
  }
}

// ============================================================
// AUTH & WORKSPACE
// ============================================================
export const ERR_UNAUTHORIZED = "Você precisa estar logado para realizar esta ação."
export const ERR_USER_NOT_FOUND = "Sua conta não foi encontrada. Tente fazer login novamente."
export const ERR_WORKSPACE_NOT_CONFIGURED = "Seu espaço de trabalho ainda não foi configurado. Complete o onboarding primeiro."
export const ERR_WORKSPACE_NOT_FOUND = "Espaço de trabalho não encontrado. Tente fazer login novamente."
export const ERR_ACCESS_DENIED = "Você não tem permissão para acessar este recurso."

// ============================================================
// AUDIO & GRAVAÇÃO
// ============================================================
export const ERR_NO_AUDIO = "Nenhum arquivo de áudio foi enviado. Grave ou selecione um áudio."
export const ERR_AUDIO_TOO_LARGE = "O arquivo de áudio excede o limite de 25MB. Tente gravar um áudio mais curto."
export const ERR_RECORDING_NOT_FOUND = "Gravação não encontrada. Ela pode ter sido removida."
export const ERR_ALREADY_CONFIRMED = "Este registro já foi confirmado anteriormente."
export const ERR_PROCESSING_FAILED = "Ocorreu um erro ao processar o áudio. Tente novamente."
export const ERR_MIC_PERMISSION = "Permissão de microfone negada. Habilite o microfone nas configurações do navegador."

// ============================================================
// PACIENTE
// ============================================================
export const ERR_PATIENT_NOT_FOUND = "Paciente não encontrado. Verifique se o cadastro existe."
export const ERR_DUPLICATE_PATIENT = "Já existe um paciente com este CPF cadastrado."

// ============================================================
// CONSULTA & AGENDA
// ============================================================
export const ERR_APPOINTMENT_NOT_FOUND = "Consulta não encontrada. Ela pode ter sido removida."
export const ERR_AGENDA_NOT_FOUND = "Agenda não encontrada. Verifique suas configurações."
export const ERR_BLOCKED_SLOT_NOT_FOUND = "Bloqueio de horário não encontrado."
export const ERR_SCHEDULE_CONFLICT = "Já existe um agendamento neste horário."

// ============================================================
// DOCUMENTOS & PRESCRIÇÕES
// ============================================================
export const ERR_DOCUMENT_NOT_FOUND = "Documento não encontrado."
export const ERR_PRESCRIPTION_NOT_FOUND = "Prescrição não encontrada."
export const ERR_MEDICATION_NOT_FOUND = "Medicamento não encontrado na base ANVISA."
export const ERR_CERTIFICATE_NOT_FOUND = "Documento médico não encontrado."
export const ERR_FILE_TOO_LARGE = "Arquivo muito grande. O tamanho máximo permitido é 10MB."
export const ERR_FILE_TYPE_NOT_ALLOWED = "Tipo de arquivo não permitido. Use imagens, PDF ou documentos Word."
export const ERR_NO_FILE = "Nenhum arquivo foi selecionado."

// ============================================================
// TRATAMENTOS
// ============================================================
export const ERR_TREATMENT_NOT_FOUND = "Plano de tratamento não encontrado."

// ============================================================
// NFS-e / FISCAL
// ============================================================
export const ERR_NFSE_NOT_CONFIGURED = "NFS-e não configurada. Acesse Configurações > Fiscal para configurar."
export const ERR_NFSE_DISABLED = "A emissão de NFS-e está desativada nas configurações."
export const ERR_NFSE_NOT_FOUND = "Nota fiscal não encontrada."
export const ERR_NFSE_ALREADY_EXISTS = "Já existe uma nota fiscal emitida para esta consulta."
export const ERR_NFSE_ALREADY_CANCELLED = "Esta nota fiscal já foi cancelada."
export const ERR_NFSE_CANCELLED_NO_UPDATE = "Notas fiscais canceladas não podem ser atualizadas."
export const ERR_NFSE_NO_PRICE = "Consulta sem valor definido. Defina o preço antes de emitir a NFS-e."

// ============================================================
// TISS — Faturamento Convenios
// ============================================================
export const ERR_TISS_NOT_CONFIGURED = "Configuracao TISS nao encontrada. Acesse Configuracoes > TISS para configurar."
export const ERR_TISS_GUIDE_NOT_FOUND = "Guia TISS nao encontrada."
export const ERR_TISS_MISSING_PROFESSIONAL = "Dados do profissional incompletos na configuracao TISS (conselho, numero, UF, CBOS)."
export const ERR_TISS_INVALID_STATUS_TRANSITION = "Transicao de status invalida para esta guia TISS."
export const ERR_OPERADORA_NOT_FOUND = "Operadora nao encontrada."
export const ERR_OPERADORA_DUPLICATE_ANS = "Ja existe uma operadora com este registro ANS neste workspace."

// ============================================================
// COMISSOES
// ============================================================
export const ERR_COMMISSION_RULE_NOT_FOUND = "Regra de comissao nao encontrada."
export const ERR_COMMISSION_ENTRY_NOT_FOUND = "Registro de comissao nao encontrado."

// ============================================================
// FINANCEIRO
// ============================================================
export const ERR_RECEIVABLE_NOT_FOUND = "Cobrança não encontrada."
export const ERR_PAYMENT_NOT_FOUND = "Pagamento não encontrado."
export const ERR_PAYMENT_ALREADY_REGISTERED = "Este pagamento já foi registrado."
export const ERR_PAYMENT_CANCELLED = "Este pagamento foi cancelado e não pode ser alterado."
export const ERR_EXPENSE_NOT_FOUND = "Despesa não encontrada."

// ============================================================
// EQUIPE
// ============================================================
export const ERR_TEAM_PERMISSION = "Apenas proprietários e administradores podem gerenciar a equipe."
export const ERR_ALREADY_MEMBER = "Este usuário já faz parte da equipe."
export const ERR_IS_OWNER = "Não é possível alterar o proprietário do workspace."
export const ERR_INVITE_PENDING = "Já existe um convite pendente para este email."
export const ERR_INVITE_NOT_FOUND = "Convite não encontrado ou expirado."
export const ERR_INVITE_USED = "Este convite já foi utilizado."
export const ERR_INVITE_EXPIRED = "Este convite expirou. Solicite um novo convite."
export const ERR_INVITE_WRONG_EMAIL = "Este convite foi enviado para outro email."
export const ERR_MEMBER_NOT_FOUND = "Membro da equipe não encontrado."
export const ERR_ALREADY_IN_WORKSPACE = "Você já faz parte deste espaço de trabalho."

// ============================================================
// WHATSAPP & MENSAGENS
// ============================================================
export const ERR_WHATSAPP_NOT_CONFIGURED = "WhatsApp não configurado. Acesse Configurações > WhatsApp para configurar."
export const ERR_PATIENT_NO_WHATSAPP_CONSENT = "Este paciente não autorizou o recebimento de mensagens via WhatsApp. Ative a autorização na ficha do paciente."
export const ERR_PATIENT_NO_EMAIL = "Este paciente não tem email cadastrado."
export const ERR_PATIENT_NO_PHONE = "Este paciente não tem telefone cadastrado."
export const ERR_INVALID_CHANNEL = "Canal de mensagem inválido."

// ============================================================
// TELECONSULTA
// ============================================================
export const ERR_TELECONSULTA_NOT_FOUND = "Teleconsulta não encontrada."
export const ERR_TELECONSULTA_ROOM_FAILED = "Erro ao criar a sala de teleconsulta. Tente novamente."
export const ERR_TELECONSULTA_NOT_READY = "A teleconsulta ainda não está disponível. Tente novamente mais perto do horário agendado."
export const ERR_TELECONSULTA_EXPIRED = "O horário desta teleconsulta já expirou."
export const ERR_TELECONSULTA_ROOM_NOT_CONFIGURED = "A sala de vídeo não está configurada para esta consulta."

// ============================================================
// LISTA DE ESPERA
// ============================================================
export const ERR_WAITLIST_ENTRY_NOT_FOUND = "Entrada na lista de espera nao encontrada."
export const ERR_WAITLIST_PATIENT_ALREADY_WAITING = "Este paciente ja esta na lista de espera para esta agenda/procedimento."

// ============================================================
// FORMULARIOS
// ============================================================
export const ERR_FORM_TEMPLATE_NOT_FOUND = "Modelo de formulario nao encontrado."
export const ERR_FORM_RESPONSE_NOT_FOUND = "Resposta de formulario nao encontrada."
export const ERR_FORM_ALREADY_COMPLETED = "Este formulario ja foi preenchido e nao pode ser alterado."

// ============================================================
// BILLING
// ============================================================
export const ERR_NO_SUBSCRIPTION = "Nenhuma assinatura encontrada. Assine um plano primeiro."

// ============================================================
// ESTOQUE (Inventory)
// ============================================================
export const ERR_INVENTORY_ITEM_NOT_FOUND = "Item de estoque não encontrado."
export const ERR_INVENTORY_INSUFFICIENT_STOCK = "Estoque insuficiente para esta operação."
export const ERR_INVENTORY_CATEGORY_NOT_FOUND = "Categoria de estoque não encontrada."

// ============================================================
// IMAGENS CLÍNICAS
// ============================================================
export const ERR_IMAGE_NOT_FOUND = "Imagem clínica não encontrada."
export const ERR_IMAGE_TOO_LARGE = "A imagem excede o limite de 10MB. Reduza o tamanho ou comprima antes de enviar."
export const ERR_IMAGE_INVALID_TYPE = "Tipo de imagem não permitido. Use JPEG, PNG ou WebP."

// ============================================================
// GATEWAY DE PAGAMENTO
// ============================================================
export const ERR_GATEWAY_NOT_CONFIGURED = "Gateway de pagamento não configurado. Acesse Configurações > Pagamento para configurar."
export const ERR_GATEWAY_CHARGE_FAILED = "Erro ao criar cobrança no gateway. Tente novamente."
export const ERR_GATEWAY_PAYMENT_NOT_FOUND = "Cobrança não encontrada no gateway."

// ============================================================
// VALIDAÇÃO GENÉRICA
// ============================================================
export const ERR_REQUIRED_FIELD = (field: string) => `O campo "${field}" é obrigatório.`
export const ERR_INVALID_VALUE = (field: string) => `O valor informado para "${field}" é inválido.`

// ============================================================
// FALLBACKS PARA FRONTEND
// ============================================================
export const ERR_GENERIC = "Ocorreu um erro inesperado. Tente novamente."
export const ERR_CONNECTION = "Erro de conexão. Verifique sua internet e tente novamente."
export const ERR_SAVE_FAILED = "Erro ao salvar. Tente novamente."
export const ERR_LOAD_FAILED = "Erro ao carregar dados. Tente novamente."
export const ERR_DELETE_FAILED = "Erro ao excluir. Tente novamente."

// ============================================================
// HELPER: traduz erros técnicos para mensagens amigáveis
// ============================================================
const ERROR_MAP: Record<string, string> = {
  // Auth (inglês → português)
  "Unauthorized": ERR_UNAUTHORIZED,
  "User not found": ERR_USER_NOT_FOUND,
  "Workspace not configured": ERR_WORKSPACE_NOT_CONFIGURED,
  "Workspace not found": ERR_WORKSPACE_NOT_FOUND,
  "Acesso negado": ERR_ACCESS_DENIED,
  // Audio
  "No audio file provided": ERR_NO_AUDIO,
  "Recording not found": ERR_RECORDING_NOT_FOUND,
  "Appointment not found": ERR_APPOINTMENT_NOT_FOUND,
  // Prisma / DB
  "Unique constraint failed": ERR_DUPLICATE_PATIENT,
  // Network
  "fetch failed": ERR_CONNECTION,
  "Failed to fetch": ERR_CONNECTION,
  "Network request failed": ERR_CONNECTION,
  "NEXT_NOT_FOUND": "A página solicitada não foi encontrada.",
}

/**
 * Traduz mensagens de erro técnicas para mensagens amigáveis ao usuário.
 * Usa o mapa de tradução e fallback para a mensagem original se já estiver em pt-BR.
 *
 * Aceita tanto Error objects quanto strings ou { error: string } de safeAction.
 */
export function friendlyError(error: unknown, fallback?: string): string {
  // SafeAction retorna { error: string } — extrair a mensagem
  if (error && typeof error === "object" && "error" in error && typeof (error as any).error === "string") {
    return (error as any).error
  }

  const message = error instanceof Error ? error.message : String(error || "")

  // Verifica match exato no mapa
  if (ERROR_MAP[message]) return ERROR_MAP[message]

  // Verifica match parcial (para erros que contém texto técnico)
  for (const [key, friendly] of Object.entries(ERROR_MAP)) {
    if (message.includes(key)) return friendly
  }

  // Se a mensagem já está em português (contém acentos ou palavras pt-BR), usa ela
  if (message && /[a-zA-Z]/.test(message) && !/^[A-Z_]+$/.test(message)) {
    // Se parece ser uma mensagem legível (não um code/stack trace), retorna
    if (message.length < 200 && !message.includes("\n") && !message.includes("at ")) {
      return message
    }
  }

  return fallback || ERR_GENERIC
}
