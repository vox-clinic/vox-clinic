import { faker } from "@faker-js/faker/locale/pt_BR"

export function createFakeAppointment(overrides: Record<string, any> = {}) {
  return {
    id: faker.string.uuid(),
    patientId: faker.string.uuid(),
    workspaceId: faker.string.uuid(),
    agendaId: faker.string.uuid(),
    date: faker.date.future(),
    procedures: [
      {
        name: faker.helpers.arrayElement([
          "Consulta",
          "Retorno",
          "Limpeza",
          "Exame",
        ]),
        price: faker.number.int({ min: 5000, max: 50000 }),
      },
    ],
    notes: faker.lorem.sentence(),
    aiSummary: null,
    audioUrl: null,
    transcript: null,
    price: faker.number.int({ min: 5000, max: 50000 }),
    source: faker.helpers.arrayElement(["manual", "voice", "booking", null]),
    status: faker.helpers.arrayElement([
      "scheduled",
      "confirmed",
      "completed",
      "cancelled",
    ]),
    type: faker.helpers.arrayElement(["presencial", "teleconsulta", null]),
    videoRoomName: null,
    videoRoomUrl: null,
    videoRecordingUrl: null,
    videoToken: null,
    cidCodes: [],
    reminderSentAt: null,
    professionalId: null,
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }
}
