import type { EmitNfseInput, EmitNfseResponse, NfseStatusResponse } from "./types"
import { logger } from "@/lib/logger"

const AUTH_URL = "https://auth.nuvemfiscal.com.br/oauth/token"
const API_URL_PROD = "https://api.nuvemfiscal.com.br"
const API_URL_SANDBOX = "https://api.sandbox.nuvemfiscal.com.br"

export class NfseClient {
  private clientId: string
  private clientSecret: string
  private baseUrl: string
  private accessToken: string | null = null
  private tokenExpiresAt: number = 0

  constructor(clientId: string, clientSecret: string, sandbox = true) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.baseUrl = sandbox ? API_URL_SANDBOX : API_URL_PROD
  }

  /** Get OAuth2 access token via client_credentials flow */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: "empresa nfse cep cnpj",
        }).toString(),
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown")
        throw new Error(`OAuth token request failed (${res.status}): ${errorText}`)
      }

      const data = await res.json()
      this.accessToken = data.access_token
      this.tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000

      return this.accessToken!
    } finally {
      clearTimeout(timeout)
    }
  }

  private async request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      })
      if (!res.ok) {
        const error = await res.text().catch(() => "Unknown error")
        throw new Error(`NFS-e API error (${res.status}): ${error}`)
      }
      return res.json() as Promise<T>
    } finally {
      clearTimeout(timeout)
    }
  }

  async emit(data: unknown): Promise<EmitNfseResponse> {
    return this.request<EmitNfseResponse>("/nfse/dps", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getStatus(id: string): Promise<NfseStatusResponse> {
    return this.request<NfseStatusResponse>(`/nfse/${id}`)
  }

  async cancel(id: string, motivo: string): Promise<void> {
    await this.request(`/nfse/${id}/cancelamento`, {
      method: "POST",
      body: JSON.stringify({ justificativa: motivo }),
    })
  }

  async getPdfBytes(id: string): Promise<ArrayBuffer> {
    const token = await this.getAccessToken()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const res = await fetch(`${this.baseUrl}/nfse/${id}/pdf`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Failed to get PDF: ${res.status}`)
      return res.arrayBuffer()
    } finally {
      clearTimeout(timeout)
    }
  }

  /** Register or update company in NuvemFiscal (required before emitting NFS-e) */
  async registerCompany(data: {
    cpf_cnpj: string
    inscricao_municipal?: string
    nome_razao_social: string
    email?: string
    endereco?: {
      logradouro?: string
      numero?: string
      complemento?: string
      bairro?: string
      codigo_municipio?: string
      codigo_pais?: string
      uf?: string
      cep?: string
    }
  }): Promise<unknown> {
    // Try to create; if already exists (400/409), update instead
    try {
      return await this.request("/empresas", {
        method: "POST",
        body: JSON.stringify(data),
      })
    } catch (err) {
      if (err instanceof Error && (err.message.includes("409") || err.message.includes("AlreadyExists"))) {
        return await this.request(`/empresas/${data.cpf_cnpj}`, {
          method: "PUT",
          body: JSON.stringify(data),
        })
      }
      throw err
    }
  }

  /** Configure NFS-e settings for a company (series, batch number, environment) */
  async configureNfse(cpfCnpj: string, data: {
    rps?: { lote?: number; serie?: string; numero?: number }
    ambiente?: string
  }): Promise<unknown> {
    return this.request(`/empresas/${cpfCnpj}/nfse`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  /** Test connectivity by fetching the token (validates credentials) */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccessToken()
      return true
    } catch (err) {
      logger.error("NFS-e connection test failed", { action: "testConnection" }, err)
      return false
    }
  }
}
