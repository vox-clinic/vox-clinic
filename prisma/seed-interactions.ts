/**
 * Seed DrugInteraction table with common drug-drug interactions.
 *
 * Usage:
 *   npx tsx prisma/seed-interactions.ts
 *
 * - Upserts each interaction by (drug1, drug2) pair (safe to re-run)
 * - drug1/drug2 are stored normalized (lowercase, trimmed)
 * - Pair is always sorted alphabetically so lookup is deterministic
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

interface Interaction {
  drug1: string
  drug2: string
  severity: "grave" | "moderada" | "leve"
  description: string
  source?: string
}

// Normalize: lowercase, trim, remove accents for consistent matching
function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

// Ensure drug1 < drug2 alphabetically for unique constraint consistency
function sortPair(a: string, b: string): [string, string] {
  const na = normalize(a)
  const nb = normalize(b)
  return na <= nb ? [na, nb] : [nb, na]
}

const interactions: Interaction[] = [
  // === GRAVE ===
  { drug1: "warfarina", drug2: "acido acetilsalicilico", severity: "grave", description: "Risco aumentado de sangramento grave. Monitorar INR rigorosamente.", source: "ANVISA" },
  { drug1: "fluoxetina", drug2: "tramadol", severity: "grave", description: "Risco de sindrome serotoninergica (agitacao, hipertermia, taquicardia).", source: "UpToDate" },
  { drug1: "ibuprofeno", drug2: "warfarina", severity: "grave", description: "AINEs aumentam risco de sangramento GI com anticoagulantes.", source: "ANVISA" },
  { drug1: "diclofenaco", drug2: "warfarina", severity: "grave", description: "AINEs aumentam risco de sangramento GI com anticoagulantes.", source: "ANVISA" },
  { drug1: "naproxeno", drug2: "warfarina", severity: "grave", description: "AINEs aumentam risco de sangramento GI com anticoagulantes.", source: "ANVISA" },
  { drug1: "metformina", drug2: "contraste iodado", severity: "grave", description: "Risco de acidose latica. Suspender metformina 48h antes do exame.", source: "ANVISA" },
  { drug1: "claritromicina", drug2: "ergotamina", severity: "grave", description: "Risco de ergotismo (vasoconstricao grave). Combinacao contraindicada.", source: "ANVISA" },
  { drug1: "sertralina", drug2: "iMAO", severity: "grave", description: "Risco de sindrome serotoninergica fatal. Intervalo minimo de 14 dias.", source: "UpToDate" },
  { drug1: "fluoxetina", drug2: "iMAO", severity: "grave", description: "Risco de sindrome serotoninergica fatal. Intervalo minimo de 5 semanas.", source: "UpToDate" },
  { drug1: "metronidazol", drug2: "alcool", severity: "grave", description: "Reacao tipo dissulfiram: nauseas, vomitos, cefaleia, hipotensao.", source: "ANVISA" },
  { drug1: "carbamazepina", drug2: "eritromicina", severity: "grave", description: "Eritromicina aumenta niveis de carbamazepina — risco de toxicidade.", source: "UpToDate" },
  { drug1: "digoxina", drug2: "amiodarona", severity: "grave", description: "Amiodarona aumenta niveis de digoxina. Risco de intoxicacao digitica.", source: "ANVISA" },
  { drug1: "sinvastatina", drug2: "eritromicina", severity: "grave", description: "Risco aumentado de rabdomiolise. Evitar combinacao.", source: "ANVISA" },
  { drug1: "clopidogrel", drug2: "omeprazol", severity: "grave", description: "Omeprazol reduz eficacia do clopidogrel. Preferir pantoprazol.", source: "UpToDate" },

  // === MODERADA ===
  { drug1: "enalapril", drug2: "cloreto de potassio", severity: "moderada", description: "Risco de hipercalemia. Monitorar potassio serico.", source: "ANVISA" },
  { drug1: "captopril", drug2: "cloreto de potassio", severity: "moderada", description: "Risco de hipercalemia. Monitorar potassio serico.", source: "ANVISA" },
  { drug1: "losartana", drug2: "cloreto de potassio", severity: "moderada", description: "Risco de hipercalemia. Monitorar potassio serico.", source: "ANVISA" },
  { drug1: "metformina", drug2: "alcool", severity: "moderada", description: "Risco de acidose latica. Orientar abstinencia ou moderacao.", source: "ANVISA" },
  { drug1: "ciprofloxacino", drug2: "teofilina", severity: "moderada", description: "Aumento dos niveis de teofilina. Risco de toxicidade (nauseas, convulsoes).", source: "UpToDate" },
  { drug1: "amoxicilina", drug2: "metotrexato", severity: "moderada", description: "Aumento da toxicidade do metotrexato por reducao da excrecao renal.", source: "ANVISA" },
  { drug1: "fluconazol", drug2: "sinvastatina", severity: "moderada", description: "Fluconazol aumenta niveis de sinvastatina. Risco de miopatia.", source: "UpToDate" },
  { drug1: "ibuprofeno", drug2: "lítio", severity: "moderada", description: "AINEs reduzem excrecao renal de litio. Monitorar litemia.", source: "ANVISA" },
  { drug1: "diclofenaco", drug2: "litio", severity: "moderada", description: "AINEs reduzem excrecao renal de litio. Monitorar litemia.", source: "ANVISA" },
  { drug1: "ciprofloxacino", drug2: "calcio", severity: "moderada", description: "Calcio reduz absorcao de ciprofloxacino. Separar administracao por 2h.", source: "ANVISA" },
  { drug1: "levotiroxina", drug2: "calcio", severity: "moderada", description: "Calcio reduz absorcao de levotiroxina. Separar por no minimo 4h.", source: "ANVISA" },
  { drug1: "levotiroxina", drug2: "sulfato ferroso", severity: "moderada", description: "Ferro reduz absorcao de levotiroxina. Separar por no minimo 4h.", source: "ANVISA" },
  { drug1: "espironolactona", drug2: "cloreto de potassio", severity: "moderada", description: "Risco de hipercalemia grave. Monitorar potassio serico.", source: "ANVISA" },
  { drug1: "fluoxetina", drug2: "ibuprofeno", severity: "moderada", description: "ISRS + AINEs aumentam risco de sangramento GI.", source: "UpToDate" },
  { drug1: "sertralina", drug2: "ibuprofeno", severity: "moderada", description: "ISRS + AINEs aumentam risco de sangramento GI.", source: "UpToDate" },

  // === LEVE ===
  { drug1: "amoxicilina", drug2: "anticoncepcional oral", severity: "leve", description: "Possivel reducao da eficacia do anticoncepcional. Orientar metodo adicional.", source: "manual" },
  { drug1: "paracetamol", drug2: "alcool", severity: "leve", description: "Uso cronico de alcool aumenta risco de hepatotoxicidade por paracetamol.", source: "ANVISA" },
  { drug1: "cefalexina", drug2: "anticoncepcional oral", severity: "leve", description: "Possivel reducao da eficacia do anticoncepcional. Orientar metodo adicional.", source: "manual" },
  { drug1: "omeprazol", drug2: "calcio", severity: "leve", description: "Uso prolongado de IBP pode reduzir absorcao de calcio.", source: "UpToDate" },
  { drug1: "omeprazol", drug2: "ferro", severity: "leve", description: "IBPs reduzem absorcao de ferro. Considerar suplementacao.", source: "UpToDate" },
]

async function main() {
  console.log(`Seeding ${interactions.length} drug interactions...\n`)

  let created = 0
  let updated = 0

  for (const ix of interactions) {
    const [d1, d2] = sortPair(ix.drug1, ix.drug2)

    const result = await db.drugInteraction.upsert({
      where: { drug1_drug2: { drug1: d1, drug2: d2 } },
      update: {
        severity: ix.severity,
        description: ix.description,
        source: ix.source ?? null,
      },
      create: {
        drug1: d1,
        drug2: d2,
        severity: ix.severity,
        description: ix.description,
        source: ix.source ?? null,
      },
    })

    // Check if it was a create or update (simple heuristic: createdAt === now-ish)
    const isNew = Date.now() - result.createdAt.getTime() < 5000
    if (isNew) created++
    else updated++
  }

  console.log(`Done! Created: ${created}, Updated: ${updated}`)
  console.log(`Total interactions in DB: ${await db.drugInteraction.count()}`)
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
