"use client"
import { useEffect } from "react"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[ErrorBoundary] Global', error) }, [error])
  return (
    <html>
      <body>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Algo deu errado</h2>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.5rem" }}>
              {error.digest ? `Erro: ${error.digest}` : "Ocorreu um erro inesperado."}
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: "1rem",
                borderRadius: "0.75rem",
                backgroundColor: "#14B8A6",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
