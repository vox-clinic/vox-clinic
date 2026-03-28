import { http, HttpResponse } from "msw"
import { createFakePatient } from "../../helpers/factories"

export const patientHandlers = [
  http.get("/api/patients", () => {
    return HttpResponse.json({
      patients: Array.from({ length: 10 }, () => createFakePatient()),
      total: 10,
    })
  }),

  http.get("/api/patients/:id", ({ params }) => {
    return HttpResponse.json(createFakePatient({ id: params.id }))
  }),

  http.post("/api/patients", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(createFakePatient(body), { status: 201 })
  }),
]
