/**
 * Seed script: populates the database with realistic mock data
 * for development and demo purposes.
 *
 * Usage: npx tsx prisma/seed-mock-data.ts
 *
 * IMPORTANT: This script requires an existing User + Workspace in the database.
 * It finds the first workspace and populates it with data.
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

// ─── Helpers ───────────────────────────────────────────────

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomCPF() {
  const n = () => randomInt(0, 9)
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`
}

function randomPhone() {
  return `(${randomInt(11, 99)}) 9${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addHours(date: Date, hours: number) {
  const d = new Date(date)
  d.setHours(d.getHours() + hours)
  return d
}

function setTime(date: Date, hour: number, minute: number) {
  const d = new Date(date)
  d.setHours(hour, minute, 0, 0)
  return d
}

// ─── Data pools ────────────────────────────────────────────

const FIRST_NAMES = [
  "Ana", "Maria", "João", "Carlos", "Fernanda", "Lucas", "Beatriz", "Pedro",
  "Juliana", "Rafael", "Camila", "Marcos", "Patricia", "Rodrigo", "Larissa",
  "Eduardo", "Gabriela", "André", "Isabela", "Thiago", "Amanda", "Felipe",
  "Letícia", "Diego", "Renata", "Bruno", "Daniela", "Gustavo", "Vanessa",
  "Leonardo", "Aline", "Mateus", "Natália", "Henrique", "Tatiane", "Vinícius",
  "Priscila", "Alexandre", "Mariana", "Ricardo", "Bianca", "Caio", "Lúcia",
  "Fábio", "Simone", "Hugo", "Raquel", "Murilo", "Débora", "Arthur",
]

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves",
  "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho",
  "Araújo", "Melo", "Barbosa", "Rocha", "Dias", "Nascimento", "Andrade",
  "Moreira", "Nunes", "Marques", "Vieira", "Monteiro", "Cavalcanti", "Freitas",
  "Campos", "Teixeira", "Pinto", "Lopes", "Correia", "Machado", "Azevedo",
]

const STREETS = [
  "Rua das Flores", "Av. Paulista", "Rua XV de Novembro", "Av. Brasil",
  "Rua São José", "Av. Getúlio Vargas", "Rua Dom Pedro II", "Rua Marechal Deodoro",
  "Av. Rio Branco", "Rua Tiradentes", "Rua Sete de Setembro", "Av. Beira Mar",
  "Rua Santos Dumont", "Av. Independência", "Rua Padre Anchieta",
]

const NEIGHBORHOODS = [
  "Centro", "Jardim América", "Vila Nova", "Bela Vista", "Santa Cruz",
  "São José", "Boa Vista", "Vila Maria", "Jardim Primavera", "Parque Industrial",
]

const CITIES = [
  "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Porto Alegre",
  "Florianópolis", "Recife", "Salvador", "Brasília", "Goiânia",
]

const STATES = ["SP", "RJ", "MG", "PR", "RS", "SC", "PE", "BA", "DF", "GO"]

const SOURCES = ["instagram", "google", "indicacao", "convenio", "site", "facebook", "outro"]

const GENDERS = ["masculino", "feminino", "masculino", "feminino", "outro"] // weighted

const TAGS = ["VIP", "Retorno", "Convênio", "Particular", "Idoso", "Gestante", "Criança", "Urgência"]

const INSURANCES = [null, null, "Unimed", "Bradesco Saúde", "SulAmérica", "Amil", "NotreDame", "Hapvida"]

const PROCEDURES_DENTIST = [
  { name: "Limpeza", price: 15000 },
  { name: "Restauração", price: 25000 },
  { name: "Extração", price: 35000 },
  { name: "Canal", price: 80000 },
  { name: "Clareamento", price: 120000 },
  { name: "Prótese", price: 200000 },
  { name: "Implante", price: 350000 },
  { name: "Ortodontia - Manutenção", price: 30000 },
  { name: "Radiografia", price: 8000 },
  { name: "Avaliação", price: 0 },
  { name: "Coroa", price: 150000 },
  { name: "Faceta", price: 180000 },
]

const PROCEDURES_MEDICO = [
  { name: "Consulta", price: 25000 },
  { name: "Retorno", price: 15000 },
  { name: "Check-up", price: 40000 },
  { name: "Eletrocardiograma", price: 12000 },
  { name: "Ultrassom", price: 20000 },
  { name: "Pequena Cirurgia", price: 80000 },
  { name: "Curativo", price: 8000 },
  { name: "Exame Físico Completo", price: 30000 },
]

const PROCEDURES_PSICO = [
  { name: "Sessão Individual", price: 20000 },
  { name: "Sessão de Casal", price: 30000 },
  { name: "Avaliação Psicológica", price: 35000 },
  { name: "Terapia Cognitivo-Comportamental", price: 22000 },
  { name: "Sessão Familiar", price: 35000 },
]

const APPOINTMENT_NOTES = [
  "Paciente relata melhora significativa desde a última consulta.",
  "Queixa de dor leve na região. Prescrito medicação para alívio.",
  "Acompanhamento de tratamento em andamento. Próximo retorno em 30 dias.",
  "Paciente apresenta boa evolução. Mantido plano terapêutico.",
  "Primeira consulta. Anamnese completa realizada.",
  "Solicitados exames complementares para investigação.",
  "Resultado dos exames dentro da normalidade.",
  "Paciente encaminhado para especialista.",
  "Tratamento concluído com sucesso. Alta terapêutica.",
  "Ajuste de medicação realizado. Retorno em 15 dias.",
  null, null, null, // some with no notes
]

const EXPENSE_DESCRIPTIONS = [
  "Aluguel do consultório",
  "Material de escritório",
  "Produtos de limpeza",
  "Internet e telefone",
  "Energia elétrica",
  "Água",
  "Software de gestão",
  "Material descartável",
  "Equipamento odontológico",
  "Manutenção ar condicionado",
  "Contador",
  "Marketing digital",
  "Seguro do consultório",
  "Plano de saúde funcionários",
  "Material de esterilização",
]

const EXPENSE_CATEGORY_DATA = [
  { name: "Aluguel", icon: "building-2", color: "#ef4444" },
  { name: "Material", icon: "package", color: "#f97316" },
  { name: "Utilities", icon: "zap", color: "#eab308" },
  { name: "Software", icon: "monitor", color: "#3b82f6" },
  { name: "Marketing", icon: "megaphone", color: "#8b5cf6" },
  { name: "Pessoal", icon: "users", color: "#ec4899" },
  { name: "Manutenção", icon: "wrench", color: "#6b7280" },
  { name: "Impostos", icon: "receipt", color: "#dc2626" },
]

const PAYMENT_METHODS = ["pix", "credito", "debito", "dinheiro", "boleto", "transferencia"]

const AGENDA_CONFIGS = [
  { name: "Agenda Principal", color: "#14B8A6", isDefault: true },
  { name: "Dr. Silva", color: "#3B82F6", isDefault: false },
  { name: "Dra. Santos", color: "#EC4899", isDefault: false },
  { name: "Sala 2", color: "#F97316", isDefault: false },
]

const BLOCKED_SLOT_TITLES = ["Almoço", "Reunião", "Intervalo", "Particular", "Treinamento"]

// ─── Config ────────────────────────────────────────────────

const NUM_PATIENTS = 120
const NUM_APPOINTMENTS_PAST = 400
const NUM_APPOINTMENTS_FUTURE = 60
const NUM_CHARGES = 300
const NUM_EXPENSES = 80
const NUM_TREATMENT_PLANS = 25
const NUM_BLOCKED_SLOTS = 30

// ─── Main seed function ────────────────────────────────────

async function main() {
  console.log("🔍 Finding workspace...")

  const targetId = process.argv[2] || "cmn6ew6g40002f6uwqf4xl8ne"

  const workspace = await db.workspace.findUnique({
    where: { id: targetId },
    include: { user: true, members: true },
  })

  if (!workspace) {
    console.error(`❌ Workspace ${targetId} not found.`)
    process.exit(1)
  }

  const clerkId = workspace.user.clerkId
  console.log(`✅ Found workspace: ${workspace.id} (user: ${workspace.user.name})`)

  // Determine profession for procedure type
  const profType = workspace.professionType?.toLowerCase() || "dentista"
  const PROCEDURES = profType.includes("psic") ? PROCEDURES_PSICO
    : profType.includes("medic") || profType.includes("clínic") ? PROCEDURES_MEDICO
    : PROCEDURES_DENTIST

  // ─── 1. Create Agendas ──────────────────────────────────

  console.log("📅 Creating agendas...")
  const existingAgendas = await db.agenda.findMany({ where: { workspaceId: workspace.id } })

  let agendas = existingAgendas
  if (existingAgendas.length < 2) {
    const newAgendas = AGENDA_CONFIGS.filter(
      (cfg) => !existingAgendas.some((a) => a.name === cfg.name)
    )
    for (const cfg of newAgendas) {
      const created = await db.agenda.create({
        data: { workspaceId: workspace.id, ...cfg },
      })
      agendas.push(created)
    }
  }
  console.log(`  → ${agendas.length} agendas`)

  // ─── 2. Create Patients ─────────────────────────────────

  console.log(`👥 Creating ${NUM_PATIENTS} patients...`)

  const existingPatientCount = await db.patient.count({ where: { workspaceId: workspace.id } })
  const patientsToCreate = Math.max(0, NUM_PATIENTS - existingPatientCount)

  const usedNames = new Set<string>()
  const patients: { id: string }[] = []

  for (let i = 0; i < patientsToCreate; i++) {
    let name: string
    do {
      name = `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`
    } while (usedNames.has(name))
    usedNames.add(name)

    const cityIdx = randomInt(0, CITIES.length - 1)
    const birthYear = randomInt(1950, 2010)
    const birthMonth = randomInt(1, 12)
    const birthDay = randomInt(1, 28)

    const patient = await db.patient.create({
      data: {
        workspaceId: workspace.id,
        name,
        document: randomCPF(),
        phone: randomPhone(),
        email: `${name.toLowerCase().replace(/ /g, ".").normalize("NFD").replace(/[\u0300-\u036f]/g, "")}@email.com`,
        birthDate: new Date(birthYear, birthMonth - 1, birthDay),
        gender: randomItem(GENDERS),
        address: {
          street: randomItem(STREETS),
          number: String(randomInt(1, 2000)),
          complement: Math.random() > 0.7 ? `Sala ${randomInt(1, 20)}` : null,
          neighborhood: randomItem(NEIGHBORHOODS),
          city: CITIES[cityIdx],
          state: STATES[cityIdx],
          zipCode: `${randomInt(10000, 99999)}-${randomInt(100, 999)}`,
        },
        insurance: randomItem(INSURANCES),
        source: randomItem(SOURCES),
        tags: Array.from({ length: randomInt(0, 3) }, () => randomItem(TAGS))
          .filter((v, i, a) => a.indexOf(v) === i),
        medicalHistory: {
          allergies: Math.random() > 0.7 ? [randomItem(["Dipirona", "Penicilina", "Latex", "AAS", "Ibuprofeno"])] : [],
          chronicDiseases: Math.random() > 0.8 ? [randomItem(["Diabetes", "Hipertensão", "Asma"])] : [],
          medications: Math.random() > 0.8 ? [randomItem(["Losartana 50mg", "Metformina 850mg", "Omeprazol 20mg"])] : [],
          bloodType: randomItem(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", null]),
          notes: Math.random() > 0.8 ? "Paciente com histórico familiar de cardiopatia" : "",
        },
        whatsappConsent: Math.random() > 0.3,
        isActive: Math.random() > 0.05,
      },
    })
    patients.push({ id: patient.id })

    if ((i + 1) % 20 === 0) console.log(`  → ${i + 1}/${patientsToCreate} patients`)
  }

  // Get all patients for appointments
  const allPatients = await db.patient.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true },
  })
  console.log(`  → ${allPatients.length} total patients`)

  // ─── 3. Create Past Appointments ────────────────────────

  console.log(`📋 Creating ${NUM_APPOINTMENTS_PAST} past appointments...`)

  const now = new Date()
  const threeMonthsAgo = addDays(now, -90)

  for (let i = 0; i < NUM_APPOINTMENTS_PAST; i++) {
    const date = randomDate(threeMonthsAgo, addDays(now, -1))
    const hour = randomInt(8, 17)
    const minute = randomItem([0, 15, 30, 45])
    const apptDate = setTime(date, hour, minute)
    const proc = randomItem(PROCEDURES)
    const status = randomItem(["completed", "completed", "completed", "completed", "cancelled", "no_show"])

    await db.appointment.create({
      data: {
        workspaceId: workspace.id,
        patientId: randomItem(allPatients).id,
        agendaId: randomItem(agendas).id,
        date: apptDate,
        procedures: [{ name: proc.name, price: proc.price }],
        notes: randomItem(APPOINTMENT_NOTES),
        status,
        price: proc.price,
        type: Math.random() > 0.85 ? "teleconsulta" : "presencial",
        aiSummary: status === "completed" && Math.random() > 0.5
          ? `Paciente atendido. Procedimento: ${proc.name}. Evolução satisfatória.`
          : null,
      },
    })

    if ((i + 1) % 50 === 0) console.log(`  → ${i + 1}/${NUM_APPOINTMENTS_PAST} past appointments`)
  }

  // ─── 4. Create Future Appointments ──────────────────────

  console.log(`📋 Creating ${NUM_APPOINTMENTS_FUTURE} future appointments...`)

  for (let i = 0; i < NUM_APPOINTMENTS_FUTURE; i++) {
    const date = randomDate(addDays(now, 1), addDays(now, 30))
    const hour = randomInt(8, 17)
    const minute = randomItem([0, 15, 30, 45])
    const apptDate = setTime(date, hour, minute)
    const proc = randomItem(PROCEDURES)

    await db.appointment.create({
      data: {
        workspaceId: workspace.id,
        patientId: randomItem(allPatients).id,
        agendaId: randomItem(agendas).id,
        date: apptDate,
        procedures: [{ name: proc.name, price: proc.price }],
        status: "scheduled",
        price: proc.price,
        type: Math.random() > 0.85 ? "teleconsulta" : "presencial",
      },
    })
  }

  // ─── 5. Create Blocked Slots ────────────────────────────

  console.log(`🚫 Creating ${NUM_BLOCKED_SLOTS} blocked slots...`)

  for (let i = 0; i < NUM_BLOCKED_SLOTS; i++) {
    const date = randomDate(addDays(now, -30), addDays(now, 30))
    const startHour = randomInt(12, 14)
    const startDate = setTime(date, startHour, 0)
    const endDate = addHours(startDate, randomInt(1, 2))

    await db.blockedSlot.create({
      data: {
        workspaceId: workspace.id,
        agendaId: randomItem(agendas).id,
        title: randomItem(BLOCKED_SLOT_TITLES),
        startDate,
        endDate,
        recurring: Math.random() > 0.6 ? "weekly" : null,
      },
    })
  }

  // ─── 6. Create Expense Categories ───────────────────────

  console.log("📁 Creating expense categories...")

  const expenseCategories: { id: string }[] = []
  for (const cat of EXPENSE_CATEGORY_DATA) {
    const existing = await db.expenseCategory.findFirst({
      where: { workspaceId: workspace.id, name: cat.name },
    })
    if (existing) {
      expenseCategories.push({ id: existing.id })
    } else {
      const created = await db.expenseCategory.create({
        data: { workspaceId: workspace.id, ...cat },
      })
      expenseCategories.push({ id: created.id })
    }
  }

  // ─── 7. Create Charges + Payments ───────────────────────

  console.log(`💰 Creating ${NUM_CHARGES} charges with payments...`)

  const completedAppts = await db.appointment.findMany({
    where: { workspaceId: workspace.id, status: "completed" },
    select: { id: true, patientId: true, price: true, procedures: true, date: true },
    take: NUM_CHARGES,
    orderBy: { date: "desc" },
  })

  for (let i = 0; i < Math.min(NUM_CHARGES, completedAppts.length); i++) {
    const appt = completedAppts[i]
    const procs = appt.procedures as any[]
    const totalAmount = appt.price || randomInt(10000, 50000)
    const discount = Math.random() > 0.8 ? randomInt(1000, 5000) : 0
    const netAmount = totalAmount - discount

    const isPaid = Math.random() > 0.25
    const isPartial = !isPaid && Math.random() > 0.5

    const charge = await db.charge.create({
      data: {
        workspaceId: workspace.id,
        patientId: appt.patientId,
        appointmentId: appt.id,
        description: procs.length > 0 ? procs.map((p: any) => p.name).join(", ") : "Consulta",
        totalAmount,
        discount,
        netAmount,
        status: isPaid ? "paid" : isPartial ? "partial" : Math.random() > 0.5 ? "pending" : "overdue",
        createdBy: clerkId,
        createdAt: appt.date,
      },
    })

    // Create payment(s)
    const numInstallments = Math.random() > 0.7 ? randomInt(2, 4) : 1
    const installmentAmount = Math.floor(netAmount / numInstallments)

    for (let j = 0; j < numInstallments; j++) {
      const dueDate = addDays(appt.date, j * 30)
      const shouldBePaid = isPaid || (isPartial && j === 0)

      await db.payment.create({
        data: {
          chargeId: charge.id,
          workspaceId: workspace.id,
          installmentNumber: j + 1,
          totalInstallments: numInstallments,
          amount: j === numInstallments - 1 ? netAmount - installmentAmount * (numInstallments - 1) : installmentAmount,
          dueDate,
          paidAt: shouldBePaid ? addDays(dueDate, randomInt(-2, 5)) : null,
          paidAmount: shouldBePaid ? installmentAmount : null,
          paymentMethod: shouldBePaid ? randomItem(PAYMENT_METHODS) : null,
          status: shouldBePaid ? "paid" : dueDate < now ? "overdue" : "pending",
        },
      })
    }

    if ((i + 1) % 50 === 0) console.log(`  → ${i + 1}/${Math.min(NUM_CHARGES, completedAppts.length)} charges`)
  }

  // ─── 8. Create Expenses ─────────────────────────────────

  console.log(`💸 Creating ${NUM_EXPENSES} expenses...`)

  for (let i = 0; i < NUM_EXPENSES; i++) {
    const date = randomDate(addDays(now, -90), addDays(now, 30))
    const amount = randomInt(5000, 500000)
    const isPaid = date < now && Math.random() > 0.2

    await db.expense.create({
      data: {
        workspaceId: workspace.id,
        categoryId: randomItem(expenseCategories).id,
        description: randomItem(EXPENSE_DESCRIPTIONS),
        amount,
        dueDate: date,
        paidAt: isPaid ? addDays(date, randomInt(0, 3)) : null,
        paidAmount: isPaid ? amount : null,
        paymentMethod: isPaid ? randomItem(PAYMENT_METHODS) : null,
        status: isPaid ? "paid" : date < now ? "overdue" : "pending",
        recurrence: Math.random() > 0.7 ? "monthly" : null,
        createdBy: clerkId,
      },
    })
  }

  // ─── 9. Create Treatment Plans ──────────────────────────

  console.log(`📝 Creating ${NUM_TREATMENT_PLANS} treatment plans...`)

  for (let i = 0; i < NUM_TREATMENT_PLANS; i++) {
    const totalSessions = randomInt(3, 12)
    const completedSessions = randomInt(0, totalSessions)
    const status = completedSessions >= totalSessions ? "completed"
      : completedSessions === 0 ? "active"
      : Math.random() > 0.9 ? "cancelled" : "active"

    const startDate = randomDate(addDays(now, -120), addDays(now, -10))
    const procs = Array.from({ length: randomInt(1, 3) }, () => randomItem(PROCEDURES))

    await db.treatmentPlan.create({
      data: {
        workspaceId: workspace.id,
        patientId: randomItem(allPatients).id,
        name: procs.map((p) => p.name).join(" + "),
        procedures: procs.map((p) => p.name),
        totalSessions,
        completedSessions,
        status,
        startDate,
        estimatedEndDate: addDays(startDate, totalSessions * 14),
        completedAt: status === "completed" ? addDays(startDate, totalSessions * 14) : null,
      },
    })
  }

  // ─── 10. Create Notifications ───────────────────────────

  console.log("🔔 Creating notifications...")

  const notifTypes = [
    { type: "appointment_soon", title: "Consulta em breve", body: "Consulta agendada para hoje às {hora}" },
    { type: "appointment_missed", title: "Paciente não compareceu", body: "O paciente não compareceu à consulta" },
    { type: "treatment_complete", title: "Tratamento concluído", body: "Plano de tratamento finalizado com sucesso" },
    { type: "system", title: "Backup realizado", body: "Backup automático dos dados concluído" },
  ]

  for (let i = 0; i < 30; i++) {
    const notif = randomItem(notifTypes)
    await db.notification.create({
      data: {
        workspaceId: workspace.id,
        userId: clerkId,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        read: Math.random() > 0.4,
        createdAt: randomDate(addDays(now, -14), now),
      },
    })
  }

  // ─── Summary ────────────────────────────────────────────

  const counts = await Promise.all([
    db.patient.count({ where: { workspaceId: workspace.id } }),
    db.appointment.count({ where: { workspaceId: workspace.id } }),
    db.charge.count({ where: { workspaceId: workspace.id } }),
    db.payment.count({ where: { workspaceId: workspace.id } }),
    db.expense.count({ where: { workspaceId: workspace.id } }),
    db.treatmentPlan.count({ where: { workspaceId: workspace.id } }),
    db.blockedSlot.count({ where: { workspaceId: workspace.id } }),
    db.agenda.count({ where: { workspaceId: workspace.id } }),
    db.notification.count({ where: { workspaceId: workspace.id } }),
  ])

  console.log("\n✅ Seed complete! Summary:")
  console.log(`  👥 Patients:        ${counts[0]}`)
  console.log(`  📋 Appointments:    ${counts[1]}`)
  console.log(`  💰 Charges:         ${counts[2]}`)
  console.log(`  💳 Payments:        ${counts[3]}`)
  console.log(`  💸 Expenses:        ${counts[4]}`)
  console.log(`  📝 Treatment Plans: ${counts[5]}`)
  console.log(`  🚫 Blocked Slots:   ${counts[6]}`)
  console.log(`  📅 Agendas:         ${counts[7]}`)
  console.log(`  🔔 Notifications:   ${counts[8]}`)
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
