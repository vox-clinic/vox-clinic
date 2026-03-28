import { faker } from "@faker-js/faker/locale/pt_BR"

export function createFakePrescription(overrides: Record<string, any> = {}) {
  return {
    id: faker.string.uuid(),
    patientId: faker.string.uuid(),
    workspaceId: faker.string.uuid(),
    appointmentId: null,
    medications: [
      {
        name: faker.helpers.arrayElement([
          "Amoxicilina 500mg",
          "Ibuprofeno 600mg",
          "Paracetamol 750mg",
        ]),
        dosage: "1 comprimido",
        frequency: "8/8h",
        duration: "7 dias",
        instructions: faker.helpers.arrayElement([
          "Tomar apos as refeicoes",
          "Tomar em jejum",
          "",
        ]),
      },
    ],
    notes: faker.lorem.sentence(),
    source: "manual",
    status: faker.helpers.arrayElement(["draft", "signed", "cancelled"]),
    type: "simple",
    validUntil: faker.date.future(),
    sentVia: [],
    sentAt: null,
    cancelledAt: null,
    cancelReason: null,
    signedAt: null,
    signatureProvider: null,
    verificationToken: null,
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }
}
