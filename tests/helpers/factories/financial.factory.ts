import { faker } from "@faker-js/faker/locale/pt_BR"

export function createFakeCharge(overrides: Record<string, any> = {}) {
  const totalAmount = faker.number.int({ min: 5000, max: 100000 })
  const discount = faker.helpers.arrayElement([0, 0, 0, 1000, 2000, 5000])
  return {
    id: faker.string.uuid(),
    workspaceId: faker.string.uuid(),
    patientId: faker.string.uuid(),
    appointmentId: null,
    treatmentPlanId: null,
    description: faker.helpers.arrayElement([
      "Consulta",
      "Limpeza",
      "Exame",
      "Retorno",
    ]),
    totalAmount,
    discount,
    netAmount: totalAmount - discount,
    status: faker.helpers.arrayElement(["pending", "partial", "paid", "cancelled"]),
    createdBy: faker.string.uuid(),
    notes: null,
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }
}

export function createFakePayment(overrides: Record<string, any> = {}) {
  return {
    id: faker.string.uuid(),
    chargeId: faker.string.uuid(),
    workspaceId: faker.string.uuid(),
    installmentNumber: 1,
    totalInstallments: 1,
    amount: faker.number.int({ min: 5000, max: 50000 }),
    dueDate: faker.date.future(),
    paidAt: null,
    paidAmount: null,
    paymentMethod: faker.helpers.arrayElement([
      "pix",
      "credit_card",
      "debit_card",
      "cash",
      "bank_transfer",
    ]),
    status: faker.helpers.arrayElement(["pending", "paid", "overdue"]),
    notes: null,
    gatewayProvider: null,
    gatewayChargeId: null,
    gatewayStatus: null,
    ...overrides,
  }
}
