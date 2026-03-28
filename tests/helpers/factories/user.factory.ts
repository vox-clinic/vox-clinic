import { faker } from "@faker-js/faker/locale/pt_BR"

export function createFakeUser(overrides: Record<string, any> = {}) {
  return {
    id: faker.string.uuid(),
    clerkId: `clerk_${faker.string.alphanumeric(20)}`,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    profession: faker.helpers.arrayElement([
      "Dentista",
      "Medico",
      "Fisioterapeuta",
      "Psicologo",
    ]),
    clinicName: faker.company.name(),
    onboardingComplete: true,
    role: "user",
    tourCompleted: true,
    tourStep: 0,
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }
}

export function createFakeWorkspace(overrides: Record<string, any> = {}) {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    professionType: faker.helpers.arrayElement([
      "dentist",
      "physician",
      "physiotherapist",
      "psychologist",
    ]),
    timezone: "America/Sao_Paulo",
    customFields: [],
    procedures: [
      { name: "Consulta", price: 15000 },
      { name: "Retorno", price: 0 },
    ],
    anamnesisTemplate: [],
    categories: [],
    plan: "free",
    planStatus: "active",
    stripeCustomerId: null,
    stripeSubId: null,
    trialEndsAt: null,
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }
}

export function createFakeWorkspaceMember(
  overrides: Record<string, any> = {}
) {
  return {
    id: faker.string.uuid(),
    workspaceId: faker.string.uuid(),
    userId: faker.string.uuid(),
    role: faker.helpers.arrayElement([
      "owner",
      "admin",
      "doctor",
      "secretary",
      "viewer",
    ]),
    invitedAt: faker.date.recent(),
    ...overrides,
  }
}
