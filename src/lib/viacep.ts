/**
 * Formata CEP como XXXXX-XXX
 */
export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

interface ViaCepResult {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

/**
 * Busca endereco pelo CEP via API publica do ViaCEP.
 * Retorna null se CEP invalido ou nao encontrado.
 */
export async function fetchAddressByCep(cep: string): Promise<ViaCepResult | null> {
  try {
    const digits = cep.replace(/\D/g, "")
    if (digits.length !== 8) return null
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = await res.json()
    if (data.erro) return null
    return {
      logradouro: data.logradouro || "",
      bairro: data.bairro || "",
      localidade: data.localidade || "",
      uf: data.uf || "",
    }
  } catch {
    return null
  }
}
