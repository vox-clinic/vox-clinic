"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { NfseClient } from "@/lib/nfse/client"
import type { EmitNfseInput } from "@/lib/nfse/types"
import { ERR_UNAUTHORIZED, ERR_WORKSPACE_NOT_CONFIGURED, ERR_NFSE_NOT_CONFIGURED, ERR_NFSE_DISABLED, ERR_APPOINTMENT_NOT_FOUND, ERR_NFSE_NO_PRICE, ERR_NFSE_ALREADY_EXISTS, ERR_NFSE_NOT_FOUND, ERR_NFSE_ALREADY_CANCELLED, ERR_NFSE_CANCELLED_NO_UPDATE, ActionError, safeAction } from "@/lib/error-messages"

async function getWorkspaceId() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })

  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  return workspaceId
}

export const emitNfse = safeAction(async (appointmentId: string) => {
  const workspaceId = await getWorkspaceId()

  // Load NFS-e config
  const config = await db.nfseConfig.findUnique({
    where: { workspaceId },
  })
  if (!config) throw new ActionError(ERR_NFSE_NOT_CONFIGURED)
  if (!config.isActive) throw new ActionError(ERR_NFSE_DISABLED)

  // Load appointment with patient
  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, workspaceId },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          document: true,
          address: true,
        },
      },
    },
  })
  if (!appointment) throw new ActionError(ERR_APPOINTMENT_NOT_FOUND)
  if (!appointment.price) throw new ActionError(ERR_NFSE_NO_PRICE)

  // Narrow price after the guard above
  const appointmentPrice = appointment.price!

  // Use transaction to prevent duplicate NFS-e race condition
  return await db.$transaction(async (tx) => {
    // Check if NFS-e already exists for this appointment
    const existing = await tx.nfse.findFirst({
      where: {
        appointmentId,
        workspaceId,
        status: { notIn: ["cancelled", "error"] },
      },
    })
    if (existing) throw new ActionError(ERR_NFSE_ALREADY_EXISTS)

    // Build the NFS-e payload
    const valorBRL = appointmentPrice // already in BRL (Float)
    const aliquotaDecimal = config.aliquotaISS // e.g. 0.05 for 5%
    const issValorBRL = valorBRL * aliquotaDecimal

    // Parse patient address if available
    const address = appointment.patient.address as {
      logradouro?: string
      numero?: string
      bairro?: string
      codigoMunicipio?: string
      uf?: string
      cep?: string
    } | null

    // Build NFS-e Nacional DPS payload (Nuvem Fiscal /nfse/dps format)
    // Ref: https://suporte.nuvemfiscal.com.br/t/exemplo-montagem-nfs-e/2156
    const ambienteStr = process.env.NFSE_AMBIENTE === 'producao' ? 'producao' : 'homologacao'
    const tpAmb = process.env.NFSE_AMBIENTE === 'producao' ? 1 : 2
    const patientCpf = appointment.patient.document?.replace(/\D/g, "") || undefined
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD for dCompet
    const issValor = Math.round(valorBRL * aliquotaDecimal * 100) / 100

    const payload = {
      ambiente: ambienteStr,
      referencia: `vox-${appointment.id}`,
      infDPS: {
        tpAmb,
        dhEmi: new Date().toISOString(),
        dCompet: today,
        prest: {
          CNPJ: config.cnpj.length === 14 ? config.cnpj : undefined,
          CPF: config.cnpj.length === 11 ? config.cnpj : undefined,
          IM: config.inscricaoMunicipal,
        },
        toma: {
          CPF: patientCpf && patientCpf.length === 11 ? patientCpf : undefined,
          CNPJ: patientCpf && patientCpf.length === 14 ? patientCpf : undefined,
          xNome: appointment.patient.name,
          ...(address ? {
            end: {
              ...(address.codigoMunicipio ? {
                endNac: {
                  cMun: address.codigoMunicipio,
                  CEP: address.cep?.replace(/\D/g, ""),
                },
              } : {}),
              xLgr: address.logradouro,
              nro: address.numero || "S/N",
              xBairro: address.bairro,
            },
          } : {}),
        },
        serv: {
          cServ: {
            cTribNac: config.codigoServico,
            xDescServ: config.descricaoServico,
          },
        },
        valores: {
          vServPrest: {
            vServ: valorBRL,
            vReceb: valorBRL,
          },
          trib: {
            tribMun: {
              tribISSQN: 1, // 1=Operacao normal
              vBC: valorBRL,
              pAliq: aliquotaDecimal * 100, // API espera percentual (ex: 5.0 para 5%)
              vISSQN: issValor,
              vLiq: Math.round((valorBRL - issValor) * 100) / 100,
            },
            tribFed: {
              piscofins: {
                CST: "99", // Outras operacoes
                vBCPisCofins: 0,
                pAliqPis: 0,
                pAliqCofins: 0,
                vPis: 0,
                vCofins: 0,
              },
              vRetCP: 0,
              vRetIRRF: 0,
              vRetCSLL: 0,
            },
          },
        },
      },
    }

    // Call NFS-e API
    const client = new NfseClient(config.certificateId ?? '', config.apiKey, process.env.NFSE_AMBIENTE !== 'producao')

    let externalId: string | null = null
    let numero: string | null = null
    let codigoVerificacao: string | null = null
    let pdfUrl: string | null = null
    let xmlUrl: string | null = null
    let status = "pending"
    let errorMessage: string | null = null

    try {
      const response = await client.emit(payload)
      externalId = response.id
      numero = response.numero ?? null
      codigoVerificacao = response.codigoVerificacao ?? null
      pdfUrl = response.linkPdf ?? null
      xmlUrl = response.linkXml ?? null
      status = response.status === "autorizada" || response.status === "authorized"
        ? "authorized"
        : "processing"
    } catch (err) {
      status = "error"
      errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao emitir NFS-e"
    }

    // Store in database (centavos for valor and issValor)
    const valorCentavos = Math.round(valorBRL * 100)
    const issValorCentavos = Math.round(issValorBRL * 100)

    const nfse = await tx.nfse.create({
      data: {
        workspaceId,
        appointmentId,
        patientId: appointment.patient.id,
        valor: valorCentavos,
        issValor: issValorCentavos,
        description: config.descricaoServico,
        externalId,
        numero,
        codigoVerificacao,
        pdfUrl,
        xmlUrl,
        status,
        errorMessage,
        emittedAt: status !== "error" ? new Date() : null,
      },
      include: {
        patient: { select: { id: true, name: true } },
      },
    })

    return nfse
  })
})

export async function getNfseList(filters?: {
  status?: string
  patientId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}) {
  const workspaceId = await getWorkspaceId()

  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 20
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = { workspaceId }

  if (filters?.status && filters.status !== "all") {
    where.status = filters.status
  }
  if (filters?.patientId) {
    where.patientId = filters.patientId
  }
  if (filters?.startDate || filters?.endDate) {
    const dateFilter: Record<string, Date> = {}
    if (filters?.startDate) dateFilter.gte = new Date(filters.startDate)
    if (filters?.endDate) {
      const end = new Date(filters.endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }
    where.createdAt = dateFilter
  }

  const [nfses, total] = await Promise.all([
    db.nfse.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
        appointment: { select: { id: true, date: true, procedures: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.nfse.count({ where }),
  ])

  return {
    nfses,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function searchAppointmentsForNfse(patientQuery: string) {
  const workspaceId = await getWorkspaceId()

  if (!patientQuery.trim()) return []

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  // Search appointments with or without price — show all completed appointments
  const appointments = await db.appointment.findMany({
    where: {
      workspaceId,
      status: { in: ["completed", "scheduled"] },
      date: { gte: sixMonthsAgo },
      patient: {
        name: { contains: patientQuery, mode: "insensitive" },
        isActive: true,
      },
    },
    include: {
      patient: { select: { id: true, name: true } },
      nfses: {
        where: { status: { notIn: ["cancelled", "error"] } },
        select: { id: true },
      },
    },
    orderBy: { date: "desc" },
    take: 20,
  })

  return appointments.map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    price: a.price,
    status: a.status,
    procedures: a.procedures,
    patient: a.patient,
    hasNfse: a.nfses.length > 0,
  }))
}

export async function getNfseByAppointment(appointmentId: string) {
  const workspaceId = await getWorkspaceId()

  return db.nfse.findFirst({
    where: { appointmentId, workspaceId },
    include: {
      patient: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export const cancelNfse = safeAction(async (nfseId: string, motivo: string) => {
  const workspaceId = await getWorkspaceId()

  if (!motivo.trim()) throw new ActionError("Motivo do cancelamento e obrigatorio")

  const nfse = await db.nfse.findFirst({
    where: { id: nfseId, workspaceId },
  })
  if (!nfse) throw new ActionError(ERR_NFSE_NOT_FOUND)
  if (nfse.status === "cancelled") throw new ActionError(ERR_NFSE_ALREADY_CANCELLED)

  // Load config to get API key
  const config = await db.nfseConfig.findUnique({
    where: { workspaceId },
  })
  if (!config) throw new ActionError(ERR_NFSE_NOT_CONFIGURED)

  // Call cancel on API if we have an external ID
  if (nfse.externalId) {
    const client = new NfseClient(config.certificateId ?? '', config.apiKey, process.env.NFSE_AMBIENTE !== 'producao')
    try {
      await client.cancel(nfse.externalId, motivo)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido"
      throw new ActionError(`Falha ao cancelar NFS-e no provedor: ${message}`)
    }
  }

  // Update local record
  const updated = await db.nfse.update({
    where: { id: nfseId },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
    },
    include: {
      patient: { select: { id: true, name: true } },
    },
  })

  return updated
})

export const refreshNfseStatus = safeAction(async (nfseId: string) => {
  const workspaceId = await getWorkspaceId()

  const nfse = await db.nfse.findFirst({
    where: { id: nfseId, workspaceId },
  })
  if (!nfse) throw new ActionError(ERR_NFSE_NOT_FOUND)
  if (!nfse.externalId) throw new ActionError("NFS-e sem referencia externa")
  if (nfse.status === "cancelled") throw new ActionError(ERR_NFSE_CANCELLED_NO_UPDATE)

  const config = await db.nfseConfig.findUnique({
    where: { workspaceId },
  })
  if (!config) throw new ActionError(ERR_NFSE_NOT_CONFIGURED)

  const client = new NfseClient(config.certificateId ?? '', config.apiKey, process.env.NFSE_AMBIENTE !== 'producao')
  const response = await client.getStatus(nfse.externalId)

  // Map API status to our status
  let newStatus = nfse.status
  if (response.status === "autorizada" || response.status === "authorized") {
    newStatus = "authorized"
  } else if (response.status === "rejeitada" || response.status === "rejected" || response.status === "erro") {
    newStatus = "error"
  } else if (response.status === "processando" || response.status === "processing") {
    newStatus = "processing"
  } else if (response.status === "cancelada" || response.status === "cancelled") {
    newStatus = "cancelled"
  }

  const errorMsg = response.mensagens?.map((m) => `${m.codigo}: ${m.descricao}`).join("; ") || null

  const updated = await db.nfse.update({
    where: { id: nfseId },
    data: {
      status: newStatus,
      numero: response.numero ?? nfse.numero,
      codigoVerificacao: response.codigoVerificacao ?? nfse.codigoVerificacao,
      errorMessage: errorMsg ?? nfse.errorMessage,
    },
    include: {
      patient: { select: { id: true, name: true } },
    },
  })

  return updated
})
