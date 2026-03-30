"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Calendar,
  ClipboardList,
  User,
  Pill,
  FileImage,
  Receipt,
  DollarSign,
} from "lucide-react"
import type { PatientData, CustomFieldDef, AnamnesisQuestionDef } from "./tabs/types"

export type { PatientData, CustomFieldDef, AnamnesisQuestionDef }

function TabSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )
}

const ResumoTab = dynamic(() => import("./tabs/resumo-tab"), { ssr: false, loading: TabSkeleton })
const HistoricoTab = dynamic(() => import("./tabs/historico-tab"), { ssr: false, loading: TabSkeleton })
const PrescricoesTab = dynamic(() => import("./tabs/prescricoes-tab"), { ssr: false, loading: TabSkeleton })
const DocumentosTab = dynamic(() => import("./tabs/documentos-tab"), { ssr: false, loading: TabSkeleton })
const FichaClinicaTab = dynamic(() => import("./tabs/ficha-clinica-tab"), { ssr: false, loading: TabSkeleton })
const OrcamentosTab = dynamic(() => import("./tabs/orcamentos-tab"), { ssr: false, loading: TabSkeleton })
const FinanceiroTab = dynamic(() => import("./tabs/financeiro-tab"), { ssr: false, loading: TabSkeleton })

const tabs = [
  { id: "resumo" as const, label: "Resumo", icon: User },
  { id: "ficha-clinica" as const, label: "Ficha Clínica", icon: ClipboardList },
  { id: "orcamentos" as const, label: "Orçamentos", icon: Receipt },
  { id: "financeiro" as const, label: "Financeiro", icon: DollarSign },
  { id: "historico" as const, label: "Histórico", icon: Calendar },
  { id: "prescricoes" as const, label: "Prescrições", icon: Pill },
  { id: "documentos" as const, label: "Documentos", icon: FileImage },
]

type TabId = "resumo" | "ficha-clinica" | "orcamentos" | "financeiro" | "historico" | "prescricoes" | "documentos"

export function PatientTabs({ patient, customFields }: { patient: PatientData; customFields?: CustomFieldDef[] }) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab") as TabId | null
  const [activeTab, setActiveTab] = useState<TabId>(
    tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : "resumo"
  )

  useEffect(() => {
    if (tabParam && tabs.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-muted p-1 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Abas do paciente">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              aria-label={tab.label}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-vox-primary/50 focus-visible:ring-offset-1",
                activeTab === tab.id
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === "resumo" && <ResumoTab patient={patient} customFields={customFields} />}
        {activeTab === "historico" && <HistoricoTab appointments={patient.appointments} patientId={patient.id} />}
        {activeTab === "prescricoes" && <PrescricoesTab patientId={patient.id} />}
        {activeTab === "documentos" && <DocumentosTab patientId={patient.id} />}
        {activeTab === "ficha-clinica" && <FichaClinicaTab patientId={patient.id} />}
        {activeTab === "orcamentos" && <OrcamentosTab patientId={patient.id} />}
        {activeTab === "financeiro" && <FinanceiroTab patientId={patient.id} />}
      </div>
    </div>
  )
}
