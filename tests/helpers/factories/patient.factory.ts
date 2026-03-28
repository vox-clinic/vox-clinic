import { faker } from "@faker-js/faker/locale/pt_BR"

export function createFakePatient(overrides: Record<string, any> = {}) {
  return {
    id: faker.string.uuid(),
    workspaceId: faker.string.uuid(),
    name: faker.person.fullName(),
    document: faker.string.numeric(11),
    rg: faker.string.numeric(9),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    birthDate: faker.date.birthdate({ min: 1, max: 90, mode: "age" }),
    gender: faker.helpers.arrayElement(["male", "female", "other"]),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode(),
    },
    insurance: faker.helpers.arrayElement([
      "Unimed",
      "Bradesco Saude",
      "SulAmerica",
      "Amil",
      "Particular",
      null,
    ]),
    guardian: null,
    source: faker.helpers.arrayElement(["manual", "voice", "booking", null]),
    tags: [],
    medicalHistory: {},
    customData: {},
    alerts: [],
    whatsappConsent: false,
    whatsappConsentAt: null,
    isActive: true,
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }
}
