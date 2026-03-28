import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

// GET: Fetch survey data by token (public)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token obrigatorio" }, { status: 400 })
    }

    const survey = await db.npsSurvey.findUnique({ where: { token } })
    if (!survey) {
      return NextResponse.json({ error: "Pesquisa nao encontrada" }, { status: 404 })
    }

    if (survey.answeredAt) {
      return NextResponse.json({ answered: true, score: survey.score })
    }

    return NextResponse.json({ answered: false, token: survey.token })
  } catch (err) {
    logger.error("NPS survey GET failed", { action: "GET /api/nps" }, err)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}

// POST: Submit NPS answer (public, token-based)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token, score, comment } = body

    if (!token || score === undefined || score === null) {
      return NextResponse.json({ error: "Token e score obrigatorios" }, { status: 400 })
    }

    if (typeof score !== "number" || score < 0 || score > 10) {
      return NextResponse.json({ error: "Score deve ser entre 0 e 10" }, { status: 400 })
    }

    // Atomic conditional update — prevents race condition on double-submit
    const result = await db.npsSurvey.updateMany({
      where: { token, answeredAt: null },
      data: {
        score,
        comment: comment?.trim() || null,
        answeredAt: new Date(),
      },
    })

    if (result.count === 0) {
      const survey = await db.npsSurvey.findUnique({ where: { token } })
      if (!survey) {
        return NextResponse.json({ error: "Pesquisa nao encontrada" }, { status: 404 })
      }
      return NextResponse.json({ error: "Pesquisa ja respondida" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error("NPS survey POST failed", { action: "POST /api/nps" }, err)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
