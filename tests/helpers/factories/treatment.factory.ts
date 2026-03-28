import { faker } from "@faker-js/faker/locale/pt_BR"

export function createFakeTreatmentPlan(
  overrides: Record<string, any> = {}
) {
  const totalSessions = faker.number.int({ min: 1, max: 12 })
  return {
    id: faker.string.uuid(),
    patientId: faker.string.uuid(),
    workspaceId: faker.string.uuid(),
    name: faker.helpers.arrayElement([
      "Tratamento ortodontico",
      "Fisioterapia pos-operatoria",
      "Terapia comportamental",
    ]),
    procedures: [
      {
        name: "Sessao",
        price: faker.number.int({ min: 5000, max: 30000 }),
      },
    ],
    totalSessions,
    completedSessions: faker.number.int({ min: 0, max: totalSessions }),
    status: faker.helpers.arrayElement(["active", "completed", "cancelled"]),
    notes: faker.lorem.sentence(),
    startDate: faker.date.recent(),
    estimatedEndDate: faker.date.future(),
    completedAt: null,
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }
}
