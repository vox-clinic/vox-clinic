// Mensagens de erro user-friendly em pt-BR
// Centraliza todas as mensagens para consistencia e facilidade de manutencao

/**
 * Custom error class for server actions.
 * Next.js in production sanitizes regular Error messages from server actions.
 * This class stores the message in the `digest` property which IS forwarded to the client.
 */
export class ActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ActionError"
    // The digest property is forwarded to the client by Next.js
    this.digest = message
  }
  digest: string
}

// ============================================================
// AUTH & WORKSPACE
// ============================================================
export const ERR_UNAUTHORIZED = "Voce precisa estar logado para realizar esta acao."
export const ERR_USER_NOT_FOUND = "Sua conta nao foi encontrada. Tente fazer login novamente."
export const ERR_WORKSPACE_NOT_CONFIGURED = "Seu espaco de trabalho ainda nao foi configurado. Complete o onboarding primeiro."
export const ERR_WORKSPACE_NOT_FOUND = "Espaco de trabalho nao encontrado. Tente fazer login novamente."
export const ERR_ACCESS_DENIED = "Voce nao tem permissao para acessar este recurso."

// ============================================================
// AUDIO & GRAVACAO
// ============================================================
export const ERR_NO_AUDIO = "Nenhum arquivo de audio foi enviado. Grave ou selecione um audio."
export const ERR_AUDIO_TOO_LARGE = "O arquivo de audio excede o limite de 25MB. Tente gravar um audio mais curto."
export const ERR_RECORDING_NOT_FOUND = "Gravacao nao encontrada. Ela pode ter sido removida."
export const ERR_ALREADY_CONFIRMED = "Este registro ja foi confirmado anteriormente."
export const ERR_PROCESSING_FAILED = "Ocorreu um erro ao processar o audio. Tente novamente."
export const ERR_MIC_PERMISSION = "Permissao de microfone negada. Habilite o microfone nas configuracoes do navegador."

// ============================================================
// PACIENTE
// ============================================================
export const ERR_PATIENT_NOT_FOUND = "Paciente nao encontrado. Verifique se o cadastro existe."
export const ERR_DUPLICATE_PATIENT = "Ja existe um paciente com este CPF cadastrado."

// ============================================================
// CONSULTA & AGENDA
// ============================================================
export const ERR_APPOINTMENT_NOT_FOUND = "Consulta nao encontrada. Ela pode ter sido removida."
export const ERR_AGENDA_NOT_FOUND = "Agenda nao encontrada. Verifique suas configuracoes."
export const ERR_BLOCKED_SLOT_NOT_FOUND = "Bloqueio de horario nao encontrado."
export const ERR_SCHEDULE_CONFLICT = "Ja existe um agendamento neste horario."

// ============================================================
// DOCUMENTOS & PRESCRICOES
// ============================================================
export const ERR_DOCUMENT_NOT_FOUND = "Documento nao encontrado."
export const ERR_PRESCRIPTION_NOT_FOUND = "Prescricao nao encontrada."
export const ERR_CERTIFICATE_NOT_FOUND = "Documento medico nao encontrado."
export const ERR_FILE_TOO_LARGE = "Arquivo muito grande. O tamanho maximo permitido e 10MB."
export const ERR_FILE_TYPE_NOT_ALLOWED = "Tipo de arquivo nao permitido. Use imagens, PDF ou documentos Word."
export const ERR_NO_FILE = "Nenhum arquivo foi selecionado."

// ============================================================
// TRATAMENTOS
// ============================================================
export const ERR_TREATMENT_NOT_FOUND = "Plano de tratamento nao encontrado."

// ============================================================
// NFS-e / FISCAL
// ============================================================
export const ERR_NFSE_NOT_CONFIGURED = "NFS-e nao configurada. Acesse Configuracoes > Fiscal para configurar."
export const ERR_NFSE_DISABLED = "A emissao de NFS-e esta desativada nas configuracoes."
export const ERR_NFSE_NOT_FOUND = "Nota fiscal nao encontrada."
export const ERR_NFSE_ALREADY_EXISTS = "Ja existe uma nota fiscal emitida para esta consulta."
export const ERR_NFSE_ALREADY_CANCELLED = "Esta nota fiscal ja foi cancelada."
export const ERR_NFSE_CANCELLED_NO_UPDATE = "Notas fiscais canceladas nao podem ser atualizadas."
export const ERR_NFSE_NO_PRICE = "Consulta sem valor definido. Defina o preco antes de emitir a NFS-e."

// ============================================================
// FINANCEIRO
// ============================================================
export const ERR_RECEIVABLE_NOT_FOUND = "Cobranca nao encontrada."
export const ERR_PAYMENT_NOT_FOUND = "Pagamento nao encontrado."
export const ERR_PAYMENT_ALREADY_REGISTERED = "Este pagamento ja foi registrado."
export const ERR_PAYMENT_CANCELLED = "Este pagamento foi cancelado e nao pode ser alterado."
export const ERR_EXPENSE_NOT_FOUND = "Despesa nao encontrada."

// ============================================================
// EQUIPE
// ============================================================
export const ERR_TEAM_PERMISSION = "Apenas proprietarios e administradores podem gerenciar a equipe."
export const ERR_ALREADY_MEMBER = "Este usuario ja faz parte da equipe."
export const ERR_IS_OWNER = "Nao e possivel alterar o proprietario do workspace."
export const ERR_INVITE_PENDING = "Ja existe um convite pendente para este email."
export const ERR_INVITE_NOT_FOUND = "Convite nao encontrado ou expirado."
export const ERR_INVITE_USED = "Este convite ja foi utilizado."
export const ERR_INVITE_EXPIRED = "Este convite expirou. Solicite um novo convite."
export const ERR_INVITE_WRONG_EMAIL = "Este convite foi enviado para outro email."
export const ERR_MEMBER_NOT_FOUND = "Membro da equipe nao encontrado."
export const ERR_ALREADY_IN_WORKSPACE = "Voce ja faz parte deste espaco de trabalho."

// ============================================================
// WHATSAPP & MENSAGENS
// ============================================================
export const ERR_WHATSAPP_NOT_CONFIGURED = "WhatsApp nao configurado. Acesse Configuracoes > WhatsApp para configurar."
export const ERR_PATIENT_NO_EMAIL = "Este paciente nao tem email cadastrado."
export const ERR_PATIENT_NO_PHONE = "Este paciente nao tem telefone cadastrado."
export const ERR_INVALID_CHANNEL = "Canal de mensagem invalido."

// ============================================================
// TELECONSULTA
// ============================================================
export const ERR_TELECONSULTA_NOT_FOUND = "Teleconsulta nao encontrada."
export const ERR_TELECONSULTA_ROOM_FAILED = "Erro ao criar a sala de teleconsulta. Tente novamente."
export const ERR_TELECONSULTA_NOT_READY = "A teleconsulta ainda nao esta disponivel. Tente novamente mais perto do horario agendado."
export const ERR_TELECONSULTA_EXPIRED = "O horario desta teleconsulta ja expirou."
export const ERR_TELECONSULTA_ROOM_NOT_CONFIGURED = "A sala de video nao esta configurada para esta consulta."

// ============================================================
// BILLING
// ============================================================
export const ERR_NO_SUBSCRIPTION = "Nenhuma assinatura encontrada. Assine um plano primeiro."

// ============================================================
// VALIDACAO GENERICA
// ============================================================
export const ERR_REQUIRED_FIELD = (field: string) => `O campo "${field}" e obrigatorio.`
export const ERR_INVALID_VALUE = (field: string) => `O valor informado para "${field}" e invalido.`

// ============================================================
// FALLBACKS PARA FRONTEND
// ============================================================
export const ERR_GENERIC = "Ocorreu um erro inesperado. Tente novamente."
export const ERR_CONNECTION = "Erro de conexao. Verifique sua internet e tente novamente."
export const ERR_SAVE_FAILED = "Erro ao salvar. Tente novamente."
export const ERR_LOAD_FAILED = "Erro ao carregar dados. Tente novamente."
export const ERR_DELETE_FAILED = "Erro ao excluir. Tente novamente."

// ============================================================
// HELPER: traduz erros tecnicos para mensagens amigaveis
// ============================================================
const ERROR_MAP: Record<string, string> = {
  // Auth (ingles → portugues)
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
  "NEXT_NOT_FOUND": "A pagina solicitada nao foi encontrada.",
}

/**
 * Traduz mensagens de erro tecnicas para mensagens amigaveis ao usuario.
 * Usa o mapa de traducao e fallback para a mensagem original se ja estiver em pt-BR.
 */
export function friendlyError(error: unknown, fallback?: string): string {
  // Check for ActionError digest first (Next.js forwards this to client)
  const digest = (error as any)?.digest
  if (typeof digest === "string" && digest.length > 0 && digest.length < 200) {
    // Check if digest looks like a real message (not a Next.js internal hash)
    if (!/^[a-z0-9]{20,}$/i.test(digest) && !digest.startsWith("NEXT_")) {
      if (ERROR_MAP[digest]) return ERROR_MAP[digest]
      for (const [key, friendly] of Object.entries(ERROR_MAP)) {
        if (digest.includes(key)) return friendly
      }
      return digest
    }
  }

  const message = error instanceof Error ? error.message : String(error || "")

  // Verifica match exato no mapa
  if (ERROR_MAP[message]) return ERROR_MAP[message]

  // Verifica match parcial (para erros que contem texto tecnico)
  for (const [key, friendly] of Object.entries(ERROR_MAP)) {
    if (message.includes(key)) return friendly
  }

  // Se a mensagem ja esta em portugues (contem acentos ou palavras pt-BR), usa ela
  if (message && /[a-zA-Z]/.test(message) && !/^[A-Z_]+$/.test(message)) {
    // Se parece ser uma mensagem legivel (nao um code/stack trace), retorna
    if (message.length < 200 && !message.includes("\n") && !message.includes("at ")) {
      return message
    }
  }

  return fallback || ERR_GENERIC
}
