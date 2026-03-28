"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { NfseClient } from "@/lib/nfse/client"
import type { EmitNfseInput } from "@/lib/nfse/types"

async function getWorkspaceId() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })

  const workspaceId = user?.workspace?.id ?? user?.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error("Workspace not configured")

  return workspaceId
}

export async function emitNfse(appointmentId: string) {
  const workspaceId = await getWorkspaceId()

  // Load NFS-e config
  const config = await db.nfseConfig.findUnique({
    where: { workspaceId },
  })
  if (!config) throw new Error("Configuracao NFS-e nao encontrada. Configure em Configuracoes > Fiscal.")
  if (!config.isActive) throw new Error("Emissao de NFS-e esta desativada.")

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
  if (!appointment) throw new Error("Consulta nao encontrada")
  if (!appointment.price) throw new Error("Consulta sem valor definido. Defina o preco antes de emitir NFS-e.")

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
    if (existing) throw new Error("Ja existe uma NFS-e para esta consulta.")

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

    const payload: EmitNfseInput = {
      ambiente: process.env.NFSE_AMBIENTE === 'producao' ? 'producao' : 'homologacao',
      prestador: {
        cpfCnpj: config.cnpj,
        inscricaoMunicipal: config.inscricaoMunicipal,
      },
      tomador: {
        cpfCnpj: appointment.patient.document?.replace(/\D/g, "") || undefined,
        razaoSocial: appointment.patient.name,
        endereco: address
          ? {
              logradouro: address.logradouro,
              numero: address.numero,
              bairro: address.bairro,
              codigoMunicipio: address.codigoMunicipio,
              uf: address.uf,
              cep: address.cep,
            }
          : undefined,
      },
      servico: {
        descricao: config.descricaoServico,
        codigoServico: config.codigoServico,
        valorServicos: valorBRL,
        aliquotaIss: aliquotaDecimal,
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
}

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

  const appointments = await db.appointment.findMany({
    where: {
      workspaceId,
      status: "completed",
      price: { not: null, gt: 0 },
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

export async function cancelNfse(nfseId: string, motivo: string) {
  const workspaceId = await getWorkspaceId()

  if (!motivo.trim()) throw new Error("Motivo do cancelamento e obrigatorio")

  const nfse = await db.nfse.findFirst({
    where: { id: nfseId, workspaceId },
  })
  if (!nfse) throw new Error("NFS-e nao encontrada")
  if (nfse.status === "cancelled") throw new Error("NFS-e ja esta cancelada")

  // Load config to get API key
  const config = await db.nfseConfig.findUnique({
    where: { workspaceId },
  })
  if (!config) throw new Error("Configuracao NFS-e nao encontrada")

  // Call cancel on API if we have an external ID
  if (nfse.externalId) {
    const client = new NfseClient(config.certificateId ?? '', config.apiKey, process.env.NFSE_AMBIENTE !== 'producao')
    try {
      await client.cancel(nfse.externalId, motivo)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido"
      throw new Error(`Falha ao cancelar NFS-e no provedor: ${message}`)
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
}

export async function refreshNfseStatus(nfseId: string) {
  const workspaceId = await getWorkspaceId()

  const nfse = await db.nfse.findFirst({
    where: { id: nfseId, workspaceId },
  })
  if (!nfse) throw new Error("NFS-e nao encontrada")
  if (!nfse.externalId) throw new Error("NFS-e sem referencia externa")
  if (nfse.status === "cancelled") throw new Error("NFS-e cancelada nao pode ser atualizada")

  const config = await db.nfseConfig.findUnique({
    where: { workspaceId },
  })
  if (!config) throw new Error("Configuracao NFS-e nao encontrada")

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
}
