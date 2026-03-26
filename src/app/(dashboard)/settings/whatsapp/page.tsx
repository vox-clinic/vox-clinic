"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  MessageSquare,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Shield,
  Bell,
  Bot,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveWhatsAppConfig, checkWhatsAppHealth } from "@/server/actions/whatsapp"

// ============================================
// WhatsApp Setup Wizard
// /settings/whatsapp
// ============================================

type Step = "intro" | "connect" | "verify" | "templates" | "done"

interface SetupData {
  phoneNumberId: string
  wabaId: string
  displayPhoneNumber: string
  businessName: string
  accessToken: string
}

export default function WhatsAppSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("intro")
  const [setupData, setSetupData] = useState<Partial<SetupData>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/settings")}
          className="gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Configuracoes
        </Button>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Progress */}
        <ProgressBar step={step} />

        {/* Steps */}
        {step === "intro" && <StepIntro onNext={() => setStep("connect")} />}
        {step === "connect" && (
          <StepConnect
            loading={loading}
            error={error}
            onConnect={async () => {
              setLoading(true)
              setError(null)
              try {
                const result = await launchEmbeddedSignup()
                setSetupData(result)
                setStep("verify")
              } catch (e) {
                setError(e instanceof Error ? e.message : "Erro na conexao")
              } finally {
                setLoading(false)
              }
            }}
            onManual={() => setStep("verify")}
          />
        )}
        {step === "verify" && (
          <StepVerify
            data={setupData}
            loading={loading}
            error={error}
            onUpdate={(data) => setSetupData({ ...setupData, ...data })}
            onNext={async () => {
              setLoading(true)
              setError(null)
              try {
                const result = await saveWhatsAppConfig(setupData as SetupData)
                if (!result.success) {
                  setError(result.error || "Erro ao salvar configuracao")
                  return
                }
                setStep("templates")
              } catch (e) {
                setError(e instanceof Error ? e.message : "Erro ao salvar")
              } finally {
                setLoading(false)
              }
            }}
            onBack={() => setStep("connect")}
          />
        )}
        {step === "templates" && (
          <StepTemplates
            onNext={() => setStep("done")}
            onSkip={() => setStep("done")}
          />
        )}
        {step === "done" && <StepDone />}
      </div>
    </div>
  )
}

// ============================================
// Step Components
// ============================================

function StepIntro({ onNext }: { onNext: () => void }) {
  return (
    <Card className="rounded-2xl border-border/40">
      <CardContent className="pt-8 pb-8">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center size-20 bg-vox-primary/10 rounded-2xl">
            <MessageSquare className="size-10 text-vox-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Conectar WhatsApp Business
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Integre seu WhatsApp Business ao VoxClinic para atender pacientes,
            enviar lembretes e automatizar conversas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
            <FeatureCard
              icon={<MessageSquare className="size-5 text-vox-primary" />}
              title="Atendimento"
              description="Receba e responda mensagens direto pelo CRM"
            />
            <FeatureCard
              icon={<Bell className="size-5 text-vox-primary" />}
              title="Notificacoes"
              description="Envie lembretes e atualizacoes via templates"
            />
            <FeatureCard
              icon={<Bot className="size-5 text-vox-primary" />}
              title="Automacao"
              description="Configure chatbots para atendimento 24/7"
            />
          </div>
          <Button
            onClick={onNext}
            className="bg-vox-primary text-white hover:bg-vox-primary/90 rounded-xl px-8 h-11"
          >
            Comecar Configuracao
            <ArrowRight className="size-4 ml-1.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StepConnect({
  loading,
  error,
  onConnect,
  onManual,
}: {
  loading: boolean
  error: string | null
  onConnect: () => void
  onManual: () => void
}) {
  return (
    <Card className="rounded-2xl border-border/40">
      <CardHeader>
        <CardTitle className="text-xl">Conectar sua conta</CardTitle>
        <p className="text-sm text-muted-foreground">
          Use o login do Facebook para conectar automaticamente, ou configure
          manualmente com seu token.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-vox-error/10 border border-vox-error/20 rounded-xl text-vox-error text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Embedded Signup */}
          <Button
            onClick={onConnect}
            disabled={loading}
            className="w-full h-12 bg-[#1877F2] text-white hover:bg-[#166FE5] rounded-xl gap-2"
          >
            {loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="size-5 fill-current">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            )}
            {loading ? "Conectando..." : "Conectar com Facebook"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-4 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Manual config */}
          <Button
            variant="outline"
            onClick={onManual}
            className="w-full h-12 rounded-xl"
          >
            Configurar Manualmente
          </Button>
        </div>

        <div className="p-4 bg-vox-warning/10 border border-vox-warning/20 rounded-xl">
          <h3 className="font-medium text-vox-warning text-sm mb-1">Pre-requisitos</h3>
          <ul className="text-xs text-vox-warning/80 space-y-1">
            <li>- Conta Meta Business verificada</li>
            <li>- Numero de telefone dedicado (nao pode estar no WhatsApp pessoal)</li>
            <li>- Acesso admin ao Meta Business Suite</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

function StepVerify({
  data,
  loading,
  error,
  onUpdate,
  onNext,
  onBack,
}: {
  data: Partial<SetupData>
  loading: boolean
  error: string | null
  onUpdate: (data: Partial<SetupData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const [showToken, setShowToken] = useState(false)

  return (
    <Card className="rounded-2xl border-border/40">
      <CardHeader>
        <CardTitle className="text-xl">Verificar Configuracao</CardTitle>
        <p className="text-sm text-muted-foreground">
          Confirme os dados da sua conta WhatsApp Business.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-vox-error/10 border border-vox-error/20 rounded-xl text-vox-error text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Phone Number ID</Label>
            <Input
              value={data.phoneNumberId || ""}
              onChange={(e) => onUpdate({ phoneNumberId: e.target.value })}
              placeholder="Ex: 123456789012345"
              className="rounded-xl"
            />
            <p className="text-[11px] text-muted-foreground">
              Encontrado no Meta for Developers &rarr; WhatsApp &rarr; API Setup
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">WhatsApp Business Account ID</Label>
            <Input
              value={data.wabaId || ""}
              onChange={(e) => onUpdate({ wabaId: e.target.value })}
              placeholder="Ex: 123456789012345"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Numero de Telefone</Label>
            <Input
              value={data.displayPhoneNumber || ""}
              onChange={(e) => onUpdate({ displayPhoneNumber: e.target.value })}
              placeholder="Ex: +55 11 99999-9999"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nome do Negocio</Label>
            <Input
              value={data.businessName || ""}
              onChange={(e) => onUpdate({ businessName: e.target.value })}
              placeholder="Ex: Clinica Exemplo"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Access Token (permanente)</Label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                value={data.accessToken || ""}
                onChange={(e) => onUpdate({ accessToken: e.target.value })}
                placeholder="EAAxxxxxx..."
                className="rounded-xl pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Use um System User Token com permissoes de WhatsApp
            </p>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="ghost" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
          <Button
            onClick={onNext}
            disabled={loading || !data.phoneNumberId || !data.accessToken}
            className="bg-vox-primary text-white hover:bg-vox-primary/90 rounded-xl gap-1.5"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Shield className="size-4" />
            )}
            Salvar e Continuar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StepTemplates({
  onNext,
  onSkip,
}: {
  onNext: () => void
  onSkip: () => void
}) {
  return (
    <Card className="rounded-2xl border-border/40">
      <CardHeader>
        <CardTitle className="text-xl">Templates de Mensagem</CardTitle>
        <p className="text-sm text-muted-foreground">
          Templates sao obrigatorios para iniciar conversas com clientes.
          Eles precisam ser aprovados pela Meta antes do uso.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-xl border border-border/40">
          <h3 className="font-semibold text-sm text-foreground">Templates sugeridos:</h3>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="size-4 text-vox-success mt-0.5 shrink-0" />
              <div>
                <strong className="text-foreground">Boas-vindas</strong> — Envie quando um novo paciente e cadastrado
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="size-4 text-vox-success mt-0.5 shrink-0" />
              <div>
                <strong className="text-foreground">Lembrete de agendamento</strong> — Notifique sobre consultas
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="size-4 text-vox-success mt-0.5 shrink-0" />
              <div>
                <strong className="text-foreground">Follow-up</strong> — Reengaje pacientes inativos
              </div>
            </li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Voce pode criar templates a qualquer momento em Configuracoes &rarr;
          WhatsApp &rarr; Templates, ou diretamente na{" "}
          <a
            href="https://business.facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-vox-primary hover:underline inline-flex items-center gap-0.5"
          >
            Meta Business Suite
            <ExternalLink className="size-3" />
          </a>
          .
        </p>

        <div className="flex justify-between pt-4">
          <Button variant="ghost" onClick={onSkip}>
            Pular por agora
          </Button>
          <Button
            onClick={onNext}
            className="bg-vox-primary text-white hover:bg-vox-primary/90 rounded-xl gap-1.5"
          >
            Criar Templates
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StepDone() {
  const router = useRouter()

  return (
    <Card className="rounded-2xl border-border/40">
      <CardContent className="pt-8 pb-8">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center size-20 bg-vox-success/10 rounded-full">
            <CheckCircle className="size-10 text-vox-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Tudo Pronto!</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Seu WhatsApp Business esta conectado ao VoxClinic. As mensagens
            recebidas serao processadas automaticamente.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              onClick={() => router.push("/settings")}
              className="bg-vox-primary text-white hover:bg-vox-primary/90 rounded-xl"
            >
              Voltar para Configuracoes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// UI Components
// ============================================

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-4 bg-muted/50 rounded-xl border border-border/40">
      <div className="mb-2">{icon}</div>
      <h3 className="font-semibold text-sm text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function ProgressBar({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "intro", label: "Inicio" },
    { key: "connect", label: "Conectar" },
    { key: "verify", label: "Verificar" },
    { key: "templates", label: "Templates" },
    { key: "done", label: "Concluido" },
  ]
  const currentIdx = steps.findIndex((s) => s.key === step)

  return (
    <div className="flex items-center justify-between px-4">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div
            className={`size-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              i <= currentIdx
                ? "bg-vox-primary text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i < currentIdx ? (
              <CheckCircle className="size-4" />
            ) : (
              i + 1
            )}
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-12 md:w-20 h-0.5 mx-1 transition-colors ${
                i < currentIdx ? "bg-vox-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================
// Facebook Embedded Signup
// ============================================

async function launchEmbeddedSignup(): Promise<SetupData> {
  if (typeof window === "undefined") {
    throw new Error("Embedded signup requer o navegador")
  }

  // Carrega Facebook SDK se ainda nao carregou
  if (!(window as unknown as Record<string, unknown>).FB) {
    await loadFacebookSDK()
  }

  return new Promise((resolve, reject) => {
    const FB = (window as unknown as Record<string, unknown>).FB as {
      login: (callback: (response: { authResponse?: { code: string } }) => void, options: Record<string, unknown>) => void
    }

    FB.login(
      (response) => {
        if (response.authResponse) {
          exchangeToken(response.authResponse.code)
            .then(resolve)
            .catch(reject)
        } else {
          reject(new Error("Login cancelado pelo usuario"))
        }
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: 2,
        },
      }
    )
  })
}

function loadFacebookSDK(): Promise<void> {
  return new Promise((resolve) => {
    const script = document.createElement("script")
    script.src = "https://connect.facebook.net/pt_BR/sdk.js"
    script.async = true
    script.defer = true
    script.onload = () => {
      const FB = (window as unknown as Record<string, unknown>).FB as {
        init: (options: Record<string, unknown>) => void
      }
      FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      })
      resolve()
    }
    document.body.appendChild(script)
  })
}

async function exchangeToken(code: string): Promise<SetupData> {
  const res = await fetch("/api/whatsapp/exchange-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  })

  if (!res.ok) throw new Error("Erro ao trocar token")
  return res.json()
}
