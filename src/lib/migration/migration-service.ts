import { db } from "@/lib/db"
import { normalizePatients } from "./normalizer"
import { validatePatients } from "./validator"
import { deduplicatePatients } from "./deduplicator"
import { loadMigration } from "./loader"
import { CsvAdapter, autoMapColumns } from "./adapters/csv.adapter"
import type {
  MigrationSource,
  MigrationAdapterConfig,
  MigrationPreview,
  MigrationResult,
  MigrationError,
  MigrationAdapter,
} from "./types"

const adapters: Record<string, () => MigrationAdapter> = {
  csv: () => new CsvAdapter(),
}

function getAdapter(source: MigrationSource): MigrationAdapter {
  const factory = adapters[source]
  if (!factory) throw new Error(`Adapter nao disponivel para fonte: ${source}`)
  return factory()
}

export async function startMigration(
  workspaceId: string,
  userId: string,
  source: MigrationSource,
  config: MigrationAdapterConfig,
  data: unknown,
  fileName?: string
): Promise<MigrationPreview> {
  // Create session
  const session = await db.migrationSession.create({
    data: {
      workspaceId,
      userId,
      source,
      status: "parsing",
      config: config as any,
      fileName,
    },
  })

  const allErrors: MigrationError[] = []

  try {
    // ── Phase 1: Parse ──
    const adapter = getAdapter(source)
    const configErrors = adapter.validateConfig(config)
    if (configErrors.some((e) => e.severity === "fatal")) {
      await updateSession(session.id, "failed", { errors: configErrors })
      return {
        sessionId: session.id,
        stats: emptyStats(),
        sampleConflicts: [],
        errors: configErrors,
        canProceed: false,
      }
    }

    const parseResult = await adapter.parse(data, config)
    allErrors.push(...parseResult.errors)

    await updateSession(session.id, "normalizing", {
      stats: { totalRows: parseResult.patients.length, parsed: parseResult.patients.length },
    })

    // ── Phase 2: Normalize ──
    const { patients: normalized, errors: normErrors } = normalizePatients(parseResult.patients)
    allErrors.push(...normErrors)

    await updateSession(session.id, "validating")

    // ── Phase 3: Validate ──
    const { valid, errors: valErrors } = validatePatients(normalized)
    allErrors.push(...valErrors)

    await updateSession(session.id, "deduplicating", {
      stats: { valid: valid.length },
    })

    // ── Phase 4: Deduplicate ──
    const { results: dedupResults, errors: dedupErrors } = await deduplicatePatients(valid, workspaceId)
    allErrors.push(...dedupErrors)

    // Build stats
    const stats = {
      totalRows: parseResult.patients.length,
      parsed: parseResult.patients.length,
      valid: valid.length,
      created: dedupResults.filter((r) => r.action === "create").length,
      updated: dedupResults.filter((r) => r.action === "update").length,
      skipped: dedupResults.filter((r) => r.action === "skip").length,
      errors: allErrors.filter((e) => e.severity === "error").length,
    }

    const conflicts = dedupResults.filter((r) => r.action === "conflict")
    const hasFatalErrors = allErrors.some((e) => e.severity === "fatal")
    const canProceed = !hasFatalErrors && valid.length > 0

    await updateSession(session.id, "pending_review", {
      stats,
      errors: allErrors,
      preview: dedupResults,
    })

    return {
      sessionId: session.id,
      stats,
      sampleConflicts: conflicts.slice(0, 20),
      errors: allErrors,
      canProceed,
    }
  } catch (err: any) {
    allErrors.push({
      phase: "parse",
      severity: "fatal",
      sourceRow: null,
      field: null,
      message: err.message || "Erro inesperado durante a migracao",
    })

    await updateSession(session.id, "failed", { errors: allErrors })

    return {
      sessionId: session.id,
      stats: emptyStats(),
      sampleConflicts: [],
      errors: allErrors,
      canProceed: false,
    }
  }
}

export async function confirmMigration(
  sessionId: string,
  workspaceId: string,
  userId: string,
  agendaId: string,
  resolutions: Record<string, "keep" | "overwrite" | "merge">
): Promise<MigrationResult> {
  const startTime = Date.now()

  const session = await db.migrationSession.findFirst({
    where: { id: sessionId, workspaceId, status: "pending_review" },
  })
  if (!session) throw new Error("Sessao de migracao nao encontrada ou ja processada")

  await updateSession(sessionId, "loading", { resolutions })

  try {
    const dedupResults = (session.preview as any[]) || []
    const result = await loadMigration(
      dedupResults,
      [], // appointments - future enhancement
      workspaceId,
      agendaId,
      userId,
      resolutions
    )

    await updateSession(sessionId, "completed", {
      stats: result.stats,
      errors: result.errors,
      completedAt: new Date(),
    })

    return {
      sessionId,
      stats: result.stats,
      errors: result.errors,
      duration: Date.now() - startTime,
    }
  } catch (err: any) {
    await updateSession(sessionId, "failed", {
      errors: [{
        phase: "load" as const,
        severity: "fatal" as const,
        sourceRow: null,
        field: null,
        message: err.message || "Erro ao carregar dados",
      }],
    })
    throw err
  }
}

export async function cancelMigration(sessionId: string, workspaceId: string): Promise<void> {
  await db.migrationSession.updateMany({
    where: { id: sessionId, workspaceId, status: { in: ["pending_review", "parsing", "normalizing", "validating", "deduplicating"] } },
    data: { status: "cancelled" },
  })
}

export async function getMigrationHistory(
  workspaceId: string,
  page = 1,
  limit = 10
): Promise<{ sessions: any[]; total: number }> {
  const [sessions, total] = await Promise.all([
    db.migrationSession.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.migrationSession.count({ where: { workspaceId } }),
  ])

  return { sessions, total }
}

// Re-export autoMapColumns for use in server actions
export { autoMapColumns } from "./adapters/csv.adapter"

// ── Helpers ──

async function updateSession(id: string, status: string, data?: Record<string, any>) {
  await db.migrationSession.update({
    where: { id },
    data: { status, ...data },
  })
}

function emptyStats() {
  return { totalRows: 0, parsed: 0, valid: 0, created: 0, updated: 0, skipped: 0, errors: 0 }
}
