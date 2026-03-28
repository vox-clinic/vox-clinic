/**
 * Seed MedicationDatabase table from ANVISA JSON data.
 *
 * Usage:
 *   npx tsx prisma/seed-medications.ts
 *
 * - Reads src/data/medications-anvisa.json
 * - Upserts each entry by anvisaCode (safe to re-run)
 * - Batches of 100 inside a $transaction for performance
 * - Sets requiresSpecialForm based on controlType (c1, c2)
 * - Logs progress to stdout
 */

import { PrismaClient } from "@prisma/client"
import medications from "../src/data/medications-anvisa.json"

const BATCH_SIZE = 100

async function main() {
  const db = new PrismaClient()

  try {
    console.log(`Found ${medications.length} medications in ANVISA dataset`)
    console.log(`Seeding in batches of ${BATCH_SIZE}...\n`)

    let seeded = 0

    for (let i = 0; i < medications.length; i += BATCH_SIZE) {
      const batch = medications.slice(i, i + BATCH_SIZE)

      await db.$transaction(
        batch.map((med) => {
          const controlType = med.controlType ?? "none"
          const requiresSpecialForm = controlType === "c1" || controlType === "c2"

          const data = {
            name: med.name,
            activeIngredient: med.activeIngredient,
            concentration: med.concentration ?? null,
            pharmaceuticalForm: med.pharmaceuticalForm ?? null,
            manufacturer: med.manufacturer ?? null,
            category: med.category ?? null,
            controlType,
            requiresSpecialForm,
            isActive: true,
          }

          return db.medicationDatabase.upsert({
            where: { anvisaCode: med.anvisaCode },
            update: data,
            create: {
              anvisaCode: med.anvisaCode,
              ...data,
            },
          })
        })
      )

      seeded += batch.length
      console.log(`  ${seeded} of ${medications.length} medications seeded`)
    }

    console.log(`\nDone! ${seeded} medications seeded successfully.`)
  } catch (error) {
    console.error("Seed failed:", error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main()
