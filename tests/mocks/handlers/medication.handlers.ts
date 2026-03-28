import { http, HttpResponse } from "msw"

export const medicationHandlers = [
  http.get("/api/medications/search", ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get("q") ?? ""

    const medications = [
      { id: "1", name: "Amoxicilina 500mg", activeIngredient: "Amoxicilina" },
      { id: "2", name: "Ibuprofeno 600mg", activeIngredient: "Ibuprofeno" },
      { id: "3", name: "Paracetamol 750mg", activeIngredient: "Paracetamol" },
      { id: "4", name: "Azitromicina 500mg", activeIngredient: "Azitromicina" },
    ].filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))

    return HttpResponse.json({ medications })
  }),
]
