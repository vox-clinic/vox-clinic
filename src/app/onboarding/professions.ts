import { Stethoscope, Cross } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { WorkspaceConfig } from "@/types"

export interface ProfessionOption {
  id: string
  name: string
  icon: LucideIcon
}

export type ProfessionConfig = WorkspaceConfig

export const professions: ProfessionOption[] = [
  { id: "medico", name: "Médico", icon: Stethoscope },
  { id: "dentista", name: "Dentista", icon: Cross },
]

export const professionConfigs = {
  medico: {
    categories: [
      { id: "cat_consulta", name: "Consulta" },
      { id: "cat_exame", name: "Exame" },
      { id: "cat_procedimento", name: "Procedimento" },
      { id: "cat_retorno", name: "Retorno" },
    ],
    procedures: [
      { id: "proc_consulta", name: "Consulta", category: "Consulta" },
      { id: "proc_retorno", name: "Retorno", category: "Retorno" },
      { id: "proc_primeira_consulta", name: "Primeira consulta", category: "Consulta" },
      { id: "proc_consulta_urgencia", name: "Consulta de urgência", category: "Consulta" },
      { id: "proc_eletro", name: "Eletrocardiograma", category: "Exame" },
      { id: "proc_espirometria", name: "Espirometria", category: "Exame" },
      { id: "proc_holter", name: "Holter 24h", category: "Exame" },
      { id: "proc_mapa", name: "MAPA", category: "Exame" },
      { id: "proc_exame_sangue", name: "Solicitação de exames laboratoriais", category: "Exame" },
      { id: "proc_pequena_cirurgia", name: "Pequena cirurgia", category: "Procedimento" },
      { id: "proc_sutura", name: "Sutura", category: "Procedimento" },
      { id: "proc_infiltracao", name: "Infiltração articular", category: "Procedimento" },
      { id: "proc_nebulizacao", name: "Nebulização", category: "Procedimento" },
      { id: "proc_curativo", name: "Curativo", category: "Procedimento" },
    ],
    customFields: [
      { id: "cf_convenio", name: "Convênio", type: "text" as const, required: false },
      { id: "cf_numero_carteirinha", name: "Número da carteirinha", type: "text" as const, required: false },
      { id: "cf_tipo_sanguineo", name: "Tipo sanguíneo", type: "select" as const, required: false, options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
      { id: "cf_peso", name: "Peso (kg)", type: "number" as const, required: false },
      { id: "cf_altura", name: "Altura (cm)", type: "number" as const, required: false },
      { id: "cf_profissao", name: "Profissão", type: "text" as const, required: false },
      { id: "cf_encaminhado_por", name: "Encaminhado por", type: "text" as const, required: false },
    ],
    anamnesisTemplate: [
      { id: "an_queixa", question: "Qual a queixa principal?", type: "text" },
      { id: "an_inicio", question: "Quando os sintomas começaram?", type: "text" },
      { id: "an_medicamentos", question: "Usa algum medicamento atualmente?", type: "text" },
      { id: "an_alergias", question: "Possui alergia a algum medicamento?", type: "text" },
      { id: "an_cirurgias", question: "Já realizou cirurgias? Quais?", type: "text" },
      { id: "an_doencas_cronicas", question: "Possui doenças crônicas?", type: "boolean" },
      { id: "an_fumante", question: "É fumante?", type: "boolean" },
      { id: "an_etilista", question: "Consome bebida alcoólica regularmente?", type: "boolean" },
      { id: "an_historico_familiar", question: "Histórico familiar relevante (diabetes, hipertensão, câncer)?", type: "text" },
      { id: "an_atividade_fisica", question: "Pratica atividade física?", type: "boolean" },
    ],
  },
  dentista: {
    categories: [
      { id: "cat_consulta", name: "Consulta" },
      { id: "cat_prevencao", name: "Prevenção" },
      { id: "cat_restauracao", name: "Restauração" },
      { id: "cat_endodontia", name: "Endodontia" },
      { id: "cat_cirurgia", name: "Cirurgia" },
      { id: "cat_ortodontia", name: "Ortodontia" },
      { id: "cat_protese", name: "Prótese" },
      { id: "cat_estetica", name: "Estética" },
      { id: "cat_periodontia", name: "Periodontia" },
    ],
    procedures: [
      { id: "proc_avaliacao", name: "Avaliação inicial", category: "Consulta" },
      { id: "proc_retorno", name: "Retorno", category: "Consulta" },
      { id: "proc_urgencia", name: "Urgência", category: "Consulta" },
      { id: "proc_limpeza", name: "Profilaxia (limpeza)", category: "Prevenção" },
      { id: "proc_fluor", name: "Aplicação de flúor", category: "Prevenção" },
      { id: "proc_selante", name: "Selante", category: "Prevenção" },
      { id: "proc_restauracao_resina", name: "Restauração em resina", category: "Restauração" },
      { id: "proc_restauracao_amalgama", name: "Restauração em amálgama", category: "Restauração" },
      { id: "proc_bloco", name: "Bloco/Onlay", category: "Restauração" },
      { id: "proc_canal", name: "Tratamento de canal", category: "Endodontia" },
      { id: "proc_retratamento", name: "Retratamento endodôntico", category: "Endodontia" },
      { id: "proc_extracao", name: "Extração simples", category: "Cirurgia" },
      { id: "proc_siso", name: "Extração de siso", category: "Cirurgia" },
      { id: "proc_implante", name: "Implante dentário", category: "Cirurgia" },
      { id: "proc_enxerto", name: "Enxerto ósseo", category: "Cirurgia" },
      { id: "proc_aparelho", name: "Instalação de aparelho", category: "Ortodontia" },
      { id: "proc_manutencao_orto", name: "Manutenção ortodôntica", category: "Ortodontia" },
      { id: "proc_contencao", name: "Contenção", category: "Ortodontia" },
      { id: "proc_protese_total", name: "Prótese total", category: "Prótese" },
      { id: "proc_protese_parcial", name: "Prótese parcial removível", category: "Prótese" },
      { id: "proc_coroa", name: "Coroa", category: "Prótese" },
      { id: "proc_faceta", name: "Faceta/Lente de contato", category: "Estética" },
      { id: "proc_clareamento", name: "Clareamento", category: "Estética" },
      { id: "proc_gengivoplastia", name: "Gengivoplastia", category: "Estética" },
      { id: "proc_raspagem", name: "Raspagem subgengival", category: "Periodontia" },
      { id: "proc_manutencao_perio", name: "Manutenção periodontal", category: "Periodontia" },
    ],
    customFields: [
      { id: "cf_convenio", name: "Convênio", type: "text" as const, required: false },
      { id: "cf_numero_carteirinha", name: "Número da carteirinha", type: "text" as const, required: false },
      { id: "cf_tipo_sanguineo", name: "Tipo sanguíneo", type: "select" as const, required: false, options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
      { id: "cf_indicacao", name: "Indicado por", type: "text" as const, required: false },
      { id: "cf_ultima_visita", name: "Última visita ao dentista", type: "date" as const, required: false },
    ],
    anamnesisTemplate: [
      { id: "an_queixa", question: "Qual a queixa principal?", type: "text" },
      { id: "an_ultima_consulta", question: "Quando foi sua última consulta odontológica?", type: "text" },
      { id: "an_medicamentos", question: "Usa algum medicamento atualmente?", type: "text" },
      { id: "an_alergias", question: "Possui alergia a algum medicamento ou anestésico?", type: "text" },
      { id: "an_doencas", question: "Possui alguma doença sistêmica (diabetes, hipertensão, cardiopatia)?", type: "text" },
      { id: "an_anticoagulante", question: "Usa anticoagulante?", type: "boolean" },
      { id: "an_gravida", question: "Está grávida ou amamentando?", type: "boolean" },
      { id: "an_fumante", question: "É fumante?", type: "boolean" },
      { id: "an_bruxismo", question: "Range ou aperta os dentes (bruxismo)?", type: "boolean" },
      { id: "an_sangramento", question: "Gengiva sangra ao escovar?", type: "boolean" },
      { id: "an_cirurgias", question: "Já realizou cirurgias na boca? Quais?", type: "text" },
    ],
  },
} satisfies Record<string, ProfessionConfig>
