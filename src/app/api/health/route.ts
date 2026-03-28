import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch (err) {
    logger.error("Health check database query failed", { action: "GET /api/health" }, err)
    return Response.json({ status: 'unhealthy', timestamp: new Date().toISOString() }, { status: 503 })
  }
}
