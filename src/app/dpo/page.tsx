"use client"

import { useState } from "react"
import Link from "next/link"

const REQUEST_TYPES = [
  { value: "acesso", label: "Acesso aos meus dados" },
  { value: "correcao", label: "Correcao de dados incorretos" },
  { value: "exclusao", label: "Exclusao dos meus dados" },
  { value: "portabilidade", label: "Portabilidade dos dados" },
  { value: "revogacao", label: "Revogacao de consentimento" },
  { value: "informacao", label: "Informações sobre tratamento de dados" },
  { value: "oposicao", label: "Oposicao ao tratamento" },
  { value: "outro", label: "Outra solicitacao" },
] as const

type FormStatus = "idle" | "submitting" | "success" | "error"

export default function DpoPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [requestType, setRequestType] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<FormStatus>("idle")

  const canSubmit = name.trim() && email.trim() && requestType && description.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setStatus("submitting")
    try {
      const res = await fetch("/api/dpo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, requestType, description }),
      })
      if (res.ok) {
        setStatus("success")
        setName("")
        setEmail("")
        setRequestType("")
        setDescription("")
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 to-white">
      {/* Header */}
      <header className="border-b border-teal-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-teal-600 hover:text-teal-700 transition-colors">
            VoxClinic
          </Link>
          <span className="text-xs text-slate-400 hidden sm:block">Protecao de Dados Pessoais</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12 space-y-8">
        {/* Title Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-teal-50 border border-teal-100 mb-2">
            <svg className="size-7 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Encarregado de Protecao de Dados (DPO)
          </h1>
          <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Em conformidade com a Lei Geral de Protecao de Dados (LGPD — Lei 13.709/2018),
            disponibilizamos este canal para que voce possa exercer seus direitos como titular de dados pessoais.
          </p>
        </div>

        {/* DPO Info Card */}
        <div className="rounded-2xl border border-teal-100 bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Informacoes do Encarregado</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 size-8 shrink-0 rounded-lg bg-teal-50 flex items-center justify-center">
                <svg className="size-4 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400">Nome</p>
                <p className="text-sm font-medium text-slate-700">Encarregado de Protecao de Dados</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 size-8 shrink-0 rounded-lg bg-teal-50 flex items-center justify-center">
                <svg className="size-4 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400">E-mail</p>
                <a href="mailto:dpo@voxclinic.com" className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
                  dpo@voxclinic.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Rights Section */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Seus Direitos como Titular (Art. 18 LGPD)</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { title: "Confirmacao e acesso", desc: "Saber se tratamos seus dados e obter copia deles" },
              { title: "Correcao", desc: "Corrigir dados incompletos, inexatos ou desatualizados" },
              { title: "Exclusao", desc: "Solicitar a eliminacao de dados desnecessarios ou tratados sem consentimento" },
              { title: "Portabilidade", desc: "Transferir seus dados a outro fornecedor de servico" },
              { title: "Revogacao", desc: "Revogar o consentimento previamente concedido" },
              { title: "Informacao", desc: "Saber com quem compartilhamos seus dados" },
              { title: "Oposicao", desc: "Opor-se ao tratamento em caso de descumprimento da LGPD" },
              { title: "Anonimizacao", desc: "Solicitar anonimizacao ou bloqueio de dados excessivos" },
            ].map((right) => (
              <div key={right.title} className="flex items-start gap-2.5 rounded-xl border border-slate-50 p-3 hover:border-slate-100 transition-colors">
                <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-teal-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{right.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{right.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3">
            <p className="text-xs text-amber-700">
              <strong>Prazo de resposta:</strong> Atenderemos sua solicitacao em ate <strong>15 dias</strong> contados
              da data do requerimento, conforme Art. 18, §5 da LGPD.
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Enviar Solicitacao</h2>
          <p className="text-xs text-slate-400 mb-5">
            Preencha o formulario abaixo ou envie um e-mail diretamente para{" "}
            <a href="mailto:dpo@voxclinic.com" className="text-teal-600 hover:underline">dpo@voxclinic.com</a>.
          </p>

          {status === "success" ? (
            <div className="rounded-xl bg-teal-50 border border-teal-100 p-6 text-center space-y-2">
              <div className="inline-flex items-center justify-center size-10 rounded-full bg-teal-100 mb-1">
                <svg className="size-5 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-teal-800">Solicitacao enviada com sucesso</p>
              <p className="text-xs text-teal-600">
                Voce recebera uma resposta em ate 15 dias no e-mail informado.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="mt-3 text-xs text-teal-600 hover:text-teal-700 font-medium underline underline-offset-2"
              >
                Enviar nova solicitacao
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="dpo-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nome completo
                  </label>
                  <input
                    id="dpo-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    required
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="dpo-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    E-mail
                  </label>
                  <input
                    id="dpo-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="dpo-type" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tipo de solicitacao
                </label>
                <select
                  id="dpo-type"
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  required
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all appearance-none bg-white"
                >
                  <option value="" disabled>Selecione o tipo</option>
                  {REQUEST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dpo-desc" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Descricao da solicitacao
                </label>
                <textarea
                  id="dpo-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva detalhadamente sua solicitacao..."
                  rows={4}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all resize-none"
                />
              </div>

              {status === "error" && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-3">
                  <p className="text-xs text-red-600">
                    Ocorreu um erro ao enviar sua solicitacao. Tente novamente ou envie um e-mail para dpo@voxclinic.com.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || status === "submitting"}
                className="w-full h-10 rounded-xl bg-teal-500 text-white font-medium text-sm transition-all hover:bg-teal-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "submitting" ? "Enviando..." : "Enviar Solicitacao"}
              </button>
            </form>
          )}
        </div>

        {/* Additional Info */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Informacoes Adicionais</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              A VoxClinic trata dados pessoais e dados pessoais sensiveis (dados de saude) de pacientes
              em nome dos profissionais de saude que utilizam a plataforma. Os profissionais sao os
              <strong> controladores</strong> dos dados de seus pacientes, e a VoxClinic atua como
              <strong> operadora</strong> desses dados.
            </p>
            <p>
              Para solicitacoes relacionadas a dados tratados no contexto de atendimentos medicos,
              recomendamos que voce entre em contato diretamente com o profissional de saude responsavel.
              Para questoes sobre a plataforma VoxClinic em si, utilize o formulario acima.
            </p>
            <p>
              Caso nao obtenha resposta satisfatoria, voce tem o direito de apresentar reclamacao perante a
              <strong> Autoridade Nacional de Protecao de Dados (ANPD)</strong> em{" "}
              <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                www.gov.br/anpd
              </a>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-100 pt-6 pb-8 text-center space-y-1">
          <p className="text-xs text-slate-400">
            VoxClinic — CRM inteligente com IA para clinicas e consultorios
          </p>
          <p className="text-[10px] text-slate-300">
            LGPD — Lei 13.709/2018 · Art. 41 (Encarregado) · Art. 18 (Direitos do Titular)
          </p>
        </footer>
      </main>
    </div>
  )
}
