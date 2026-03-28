import { faker } from "@faker-js/faker/locale/pt_BR"

export function createFakeRecording(overrides: Record<string, any> = {}) {
  return {
    id: faker.string.uuid(),
    workspaceId: faker.string.uuid(),
    appointmentId: null,
    patientId: faker.string.uuid(),
    audioUrl: `audio/${faker.string.uuid()}.webm`,
    transcript: faker.lorem.paragraphs(2),
    aiExtractedData: {
      name: faker.person.fullName(),
      procedures: ["Consulta"],
      observations: faker.lorem.sentence(),
    },
    status: faker.helpers.arrayElement([
      "pending",
      "processing",
      "completed",
      "error",
    ]),
    errorMessage: null,
    duration: faker.number.int({ min: 30, max: 600 }),
    fileSize: faker.number.int({ min: 10000, max: 5000000 }),
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }
}
