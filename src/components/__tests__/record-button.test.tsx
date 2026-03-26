import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("@/lib/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}))

// Mock MediaRecorder and getUserMedia since happy-dom doesn't have them
const mockStop = vi.fn()
const mockStart = vi.fn()

class MockMediaRecorder {
  state = "inactive"
  ondataavailable: ((e: any) => void) | null = null
  onstop: (() => void) | null = null

  constructor(_stream: any, _options?: any) {}

  start(_timeslice?: number) {
    mockStart(_timeslice)
    this.state = "recording"
  }

  stop() {
    mockStop()
    this.state = "inactive"
    // Simulate onstop callback
    if (this.onstop) this.onstop()
  }

  addEventListener = vi.fn()
  removeEventListener = vi.fn()

  static isTypeSupported = vi.fn().mockReturnValue(true)
}

vi.stubGlobal("MediaRecorder", MockMediaRecorder)

const mockGetUserMedia = vi.fn().mockResolvedValue({
  getTracks: () => [{ stop: vi.fn() }],
})

vi.stubGlobal("navigator", {
  mediaDevices: { getUserMedia: mockGetUserMedia },
})

// Mock AudioContext
class MockAudioContext {
  createMediaStreamSource() {
    return { connect: vi.fn() }
  }
  createAnalyser() {
    return {
      fftSize: 0,
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn(),
    }
  }
  close = vi.fn()
}

vi.stubGlobal("AudioContext", MockAudioContext)

import { RecordButton } from "../record-button"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("RecordButton", () => {
  it("renders microphone button", () => {
    render(<RecordButton onRecordingComplete={vi.fn()} />)
    expect(screen.getByLabelText("Iniciar gravacao")).toBeInTheDocument()
  })

  it("button is disabled when disabled prop is true", () => {
    render(<RecordButton onRecordingComplete={vi.fn()} disabled={true} />)
    expect(screen.getByLabelText("Iniciar gravacao")).toBeDisabled()
  })

  it("button is enabled when disabled prop is false", () => {
    render(<RecordButton onRecordingComplete={vi.fn()} disabled={false} />)
    expect(screen.getByLabelText("Iniciar gravacao")).not.toBeDisabled()
  })

  it("shows LGPD consent modal when requireConsent=true and button clicked", async () => {
    const user = userEvent.setup()
    render(
      <RecordButton onRecordingComplete={vi.fn()} requireConsent={true} />
    )

    await user.click(screen.getByLabelText("Iniciar gravacao"))

    expect(
      screen.getByText("Consentimento para Gravacao")
    ).toBeInTheDocument()
    expect(screen.getByText("Concordo e Gravar")).toBeInTheDocument()
    expect(screen.getByText("Cancelar")).toBeInTheDocument()
  })

  it("does not show consent modal when requireConsent=false", async () => {
    const user = userEvent.setup()
    render(
      <RecordButton onRecordingComplete={vi.fn()} requireConsent={false} />
    )

    await user.click(screen.getByLabelText("Iniciar gravacao"))

    expect(
      screen.queryByText("Consentimento para Gravacao")
    ).not.toBeInTheDocument()
  })

  it("consent modal Cancelar button closes the modal", async () => {
    const user = userEvent.setup()
    render(
      <RecordButton onRecordingComplete={vi.fn()} requireConsent={true} />
    )

    await user.click(screen.getByLabelText("Iniciar gravacao"))
    expect(
      screen.getByText("Consentimento para Gravacao")
    ).toBeInTheDocument()

    await user.click(screen.getByText("Cancelar"))
    expect(
      screen.queryByText("Consentimento para Gravacao")
    ).not.toBeInTheDocument()
  })

  it("consent modal Concordo e Gravar starts recording", async () => {
    const user = userEvent.setup()
    render(
      <RecordButton onRecordingComplete={vi.fn()} requireConsent={true} />
    )

    await user.click(screen.getByLabelText("Iniciar gravacao"))
    await user.click(screen.getByText("Concordo e Gravar"))

    // After consenting, recording should start (getUserMedia called)
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
    // Button should now show "Parar gravacao"
    expect(screen.getByLabelText("Parar gravacao")).toBeInTheDocument()
  })

  it("clicking during recording stops recording", async () => {
    const user = userEvent.setup()
    render(
      <RecordButton onRecordingComplete={vi.fn()} requireConsent={false} />
    )

    // Start recording
    await user.click(screen.getByLabelText("Iniciar gravacao"))
    expect(screen.getByLabelText("Parar gravacao")).toBeInTheDocument()

    // Stop recording
    await user.click(screen.getByLabelText("Parar gravacao"))
    expect(screen.getByLabelText("Iniciar gravacao")).toBeInTheDocument()
  })

  it("LGPD consent text mentions LGPD law", async () => {
    const user = userEvent.setup()
    render(
      <RecordButton onRecordingComplete={vi.fn()} requireConsent={true} />
    )

    await user.click(screen.getByLabelText("Iniciar gravacao"))

    expect(
      screen.getByText(/LGPD \(Lei 13\.709\/2018\)/)
    ).toBeInTheDocument()
  })
})
