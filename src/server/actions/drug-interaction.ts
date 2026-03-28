"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { ERR_UNAUTHORIZED, ERR_USER_NOT_FOUND, ERR_WORKSPACE_NOT_CONFIGURED, ActionError, safeAction } from "@/lib/error-messages"

/** Normalize string for matching: lowercase, trim, strip accents */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

async function getAuthContext() {
  const { userId } = await auth()
  if (!userId) throw new Error(ERR_UNAUTHORIZED)

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: true, memberships: { select: { workspaceId: true }, take: 1 } },
  })
  if (!user) throw new Error(ERR_USER_NOT_FOUND)
  const workspaceId = user.workspace?.id ?? user.memberships?.[0]?.workspaceId
  if (!workspaceId) throw new Error(ERR_WORKSPACE_NOT_CONFIGURED)

  return { userId, workspaceId }
}

export interface DrugInteractionResult {
  drug1: string
  drug2: string
  severity: string
  description: string
}

/**
 * Check drug interactions for a list of medication names.
 *
 * 1. Resolves each medication name to its active ingredient via MedicationDatabase
 * 2. Checks all pairs against DrugInteraction table
 * 3. Returns found interactions sorted by severity (grave > moderada > leve)
 */
export const checkDrugInteractions = safeAction(async (medicationNames: string[]): Promise<{ interactions: DrugInteractionResult[] }> => {
  await getAuthContext()

  if (!medicationNames.length || medicationNames.length < 2) {
    return { interactions: [] }
  }

  // Deduplicate and normalize medication names
  const names = [...new Set(medicationNames.map((n) => n.trim()).filter(Boolean))]
  if (names.length < 2) return { interactions: [] }

  // Resolve each medication name to active ingredient(s)
  // First try exact match in MedicationDatabase, then use the name itself as fallback
  const activeIngredients: string[] = []

  // Batch query: find all medications matching any of the names (by name or active ingredient)
  const allMeds = await db.medicationDatabase.findMany({
    where: {
      OR: names.flatMap((name) => [
        { name: { contains: name, mode: "insensitive" as const } },
        { activeIngredient: { contains: name, mode: "insensitive" as const } },
      ]),
    },
    select: { name: true, activeIngredient: true },
  })

  for (const name of names) {
    const normalizedName = normalize(name)

    // Find the first matching medication for this name
    const med = allMeds.find(
      (m) =>
        m.name.toLowerCase().includes(name.toLowerCase()) ||
        m.activeIngredient.toLowerCase().includes(name.toLowerCase())
    )

    if (med) {
      // A medication may have combined active ingredients (e.g. "amoxicilina + clavulanato")
      const ingredients = med.activeIngredient.split("+").map((s) => normalize(s))
      activeIngredients.push(...ingredients)
    } else {
      // Fallback: use the name itself as active ingredient
      activeIngredients.push(normalizedName)
    }
  }

  // Deduplicate active ingredients
  const uniqueIngredients = [...new Set(activeIngredients)]
  if (uniqueIngredients.length < 2) return { interactions: [] }

  // Check all pairs against DrugInteraction table
  // For each pair (a, b), we need to check both (a,b) and (b,a) since they're stored sorted
  const interactions: DrugInteractionResult[] = []
  const checkedPairs = new Set<string>()

  for (let i = 0; i < uniqueIngredients.length; i++) {
    for (let j = i + 1; j < uniqueIngredients.length; j++) {
      const a = uniqueIngredients[i]
      const b = uniqueIngredients[j]
      const [d1, d2] = a <= b ? [a, b] : [b, a]
      const pairKey = `${d1}|${d2}`
      if (checkedPairs.has(pairKey)) continue
      checkedPairs.add(pairKey)

      // Search with LIKE for partial matching (e.g. "ibuprofeno" matches "ibuprofeno" in DB)
      const found = await db.drugInteraction.findFirst({
        where: {
          OR: [
            { drug1: { contains: d1, mode: "insensitive" }, drug2: { contains: d2, mode: "insensitive" } },
            { drug1: { contains: d2, mode: "insensitive" }, drug2: { contains: d1, mode: "insensitive" } },
          ],
        },
      })

      if (found) {
        interactions.push({
          drug1: found.drug1,
          drug2: found.drug2,
          severity: found.severity,
          description: found.description,
        })
      }
    }
  }

  // Sort by severity: grave > moderada > leve
  const severityOrder: Record<string, number> = { grave: 0, moderada: 1, leve: 2 }
  interactions.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3))

  return { interactions }
})
