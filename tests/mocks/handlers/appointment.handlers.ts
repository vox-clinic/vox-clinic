import { http, HttpResponse } from "msw"
import { createFakeAppointment } from "../../helpers/factories"

export const appointmentHandlers = [
  http.get("/api/appointments", () => {
    return HttpResponse.json({
      appointments: Array.from({ length: 5 }, () => createFakeAppointment()),
      total: 5,
    })
  }),

  http.get("/api/appointments/:id", ({ params }) => {
    return HttpResponse.json(createFakeAppointment({ id: params.id }))
  }),
]
