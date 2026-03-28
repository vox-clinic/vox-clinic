import { render, RenderOptions } from "@testing-library/react"
import { ReactElement } from "react"

// Wrapper with providers used by the app
// Add providers here as needed (e.g. ClerkProvider mock, QueryClient, etc.)
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

export * from "@testing-library/react"
export { renderWithProviders as render }
