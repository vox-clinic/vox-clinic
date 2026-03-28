"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { NfseClient } from "@/lib/nfse/client"
import { logger } from "@/lib/logger"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_CONFIGURED, ActionError } from "@/lib/error-messages"

function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "")
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false

  const calc = (slice: string, factor: number) => {
    let sum = 0
    for (let i = 0; i < slice.length; i++) {
      sum += parseInt(slice[i]) * (factor - i)
    }
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  if (parseInt(digits[9]) !== calc(digits.slice(0, 9), 10)) return false
  if (parseInt(digits[10]) !== calc(digits.slice(0, 10), 11)) return false
  return true
}

function validateCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "")
  if (digits.length !== 14) return false
  if (/^(\d)\1{13}$/.test(digits)) return false

  const calc = (slice: string, weights: number[]) => {
    let sum = 0
    for (let i = 0; i < weights.length; i++) {
      sum += parseInt(slice[i]) * weights[i]
    }
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const d1 = calc(digits, w1)
  if (parseInt(digits[12]) !== d1) return false

  const d2 = calc(digits, w2)
  if (parseInt(digits[13]) !== d2) return false

  return true
}

function validateCpfCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, "")
  if (digits.length === 11) return validateCpf(digits)
  if (digits.length === 14) return validateCnpj(digits)
  return false
}

export async function getNfseConfig() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  const config = await db.nfseConfig.findUnique({
    where: { workspaceId },
  })

  if (!config) return null

  return {
    id: config.id,
    cnpj: config.cnpj,
    inscricaoMunicipal: config.inscricaoMunicipal,
    codigoServico: config.codigoServico,
    descricaoServico: config.descricaoServico,
    aliquotaISS: config.aliquotaISS,
    regimeTributario: config.regimeTributario,
    provider: config.provider,
    clientId: config.certificateId ?? '',
    clientSecret: config.apiKey ? `****${config.apiKey.slice(-4)}` : '',
    clinicCity: config.clinicCity,
    clinicState: config.clinicState,
    clinicCep: config.clinicCep,
    isActive: config.isActive,
  }
}

export async function saveNfseConfig(data: {
  cnpj: string
  inscricaoMunicipal: string
  codigoServico: string
  descricaoServico: string
  aliquotaISS: number
  regimeTributario: string
  provider: string
  clientId: string
  clientSecret: string
  clinicCity: string
  clinicState: string
  clinicCep: string
}) {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  // Validate all fields upfront and collect errors
  const errors: string[] = []
  const cnpjDigits = data.cnpj.replace(/\D/g, "")
  if (!cnpjDigits) errors.push("CPF/CNPJ e obrigatorio")
  else if (!validateCpfCnpj(cnpjDigits)) errors.push(cnpjDigits.length === 11 ? "CPF invalido (digito verificador incorreto)" : "CNPJ invalido (digito verificador incorreto)")
  if (!data.inscricaoMunicipal.trim()) errors.push("Inscricao Municipal e obrigatoria")
  if (!data.codigoServico.trim()) errors.push("Codigo de Servico e obrigatorio")
  if (!data.descricaoServico.trim()) errors.push("Descricao do Servico e obrigatoria")
  if (data.aliquotaISS < 0 || data.aliquotaISS > 1) errors.push("Aliquota ISS invalida (deve ser entre 0% e 100%)")
  if (!data.clientId.trim()) errors.push("Client ID e obrigatorio")
  const isMaskedSecret = data.clientSecret.startsWith('****')
  if (!isMaskedSecret && !data.clientSecret.trim()) errors.push("Client Secret e obrigatorio")
  if (!data.clinicCity.trim()) errors.push("Cidade e obrigatoria")
  if (!data.clinicState.trim()) errors.push("Estado e obrigatorio")
  const cepDigits = data.clinicCep.replace(/\D/g, "")
  if (!cepDigits) errors.push("CEP e obrigatorio")
  else if (cepDigits.length !== 8) errors.push("CEP deve ter exatamente 8 digitos")

  if (errors.length > 0) {
    return { error: errors.join(". ") }
  }

  // Only update clientSecret if the user provided a new (non-masked) value
  const secretToSave = isMaskedSecret ? undefined : data.clientSecret.trim()

  logger.info("saveNfseConfig: starting upsert", { action: "saveNfseConfig", workspaceId, entityType: "NfseConfig" })

  try {
  const config = await db.nfseConfig.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      cnpj: cnpjDigits,
      inscricaoMunicipal: data.inscricaoMunicipal.trim(),
      codigoServico: data.codigoServico.trim(),
      descricaoServico: data.descricaoServico.trim(),
      aliquotaISS: data.aliquotaISS,
      regimeTributario: data.regimeTributario,
      provider: data.provider,
      certificateId: data.clientId.trim(),
      apiKey: secretToSave ?? '',
      clinicCity: data.clinicCity.trim(),
      clinicState: data.clinicState.trim(),
      clinicCep: data.clinicCep.replace(/\D/g, ""),
    },
    update: {
      cnpj: cnpjDigits,
      inscricaoMunicipal: data.inscricaoMunicipal.trim(),
      codigoServico: data.codigoServico.trim(),
      descricaoServico: data.descricaoServico.trim(),
      aliquotaISS: data.aliquotaISS,
      regimeTributario: data.regimeTributario,
      provider: data.provider,
      certificateId: data.clientId.trim(),
      ...(secretToSave !== undefined ? { apiKey: secretToSave } : {}),
      clinicCity: data.clinicCity.trim(),
      clinicState: data.clinicState.trim(),
      clinicCep: data.clinicCep.replace(/\D/g, ""),
    },
  })

  logger.info("saveNfseConfig: success", { action: "saveNfseConfig", workspaceId, entityId: config.id })
  return { id: config.id }
  } catch (err) {
    logger.error("saveNfseConfig: upsert failed", { action: "saveNfseConfig", workspaceId }, err)
    return { error: "Erro ao salvar configuracao no banco de dados" }
  }
}

export async function testNfseConnection() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  const config = await db.nfseConfig.findUnique({
    where: { workspaceId },
  })

  if (!config) throw new ActionError("Configuracao NFS-e nao encontrada. Salve a configuracao primeiro.")
  if (!config.certificateId || !config.apiKey) throw new ActionError("Client ID e Client Secret nao configurados")

  const isSandbox = process.env.NFSE_AMBIENTE !== "producao"
  const client = new NfseClient(config.certificateId, config.apiKey, isSandbox)

  try {
    const ok = await client.testConnection()
    if (!ok) throw new ActionError("Falha na conexao")
    return { success: true, message: "Conexao com o provedor realizada com sucesso!" }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido"
    throw new ActionError(`Falha ao conectar com o provedor: ${message}`)
  }
}
