import type { LucideIcon } from "lucide-react"
import {
  Stethoscope,
  Cross,
  Apple,
  Sparkles,
  Scale,
  Plus,
} from "lucide-react"

export interface ProfessionOption {
  id: string
  name: string
  icon: LucideIcon
}

export interface Question {
  id: string
  label: string
  type: "select" | "multi-select" | "boolean"
  options?: string[]
}

export const professions: ProfessionOption[] = [
  { id: "medico", name: "Medico", icon: Stethoscope },
  { id: "dentista", name: "Dentista", icon: Cross },
  { id: "nutricionista", name: "Nutricionista", icon: Apple },
  { id: "esteticista", name: "Esteticista", icon: Sparkles },
  { id: "advogado", name: "Advogado", icon: Scale },
  { id: "outro", name: "Outro", icon: Plus },
]

export const questionsByProfession: Record<string, Question[]> = {
  dentista: [
    {
      id: "procedimentos",
      label: "Quais procedimentos voce mais realiza?",
      type: "multi-select",
      options: [
        "Limpeza",
        "Clareamento",
        "Restauracao",
        "Extracao",
        "Implante",
        "Ortodontia",
        "Endodontia",
        "Protese",
        "Estetica dental",
      ],
    },
    {
      id: "cadeiras",
      label: "Quantas cadeiras tem seu consultorio?",
      type: "select",
      options: ["1", "2", "3-5", "Mais de 5"],
    },
    {
      id: "esteticos",
      label: "Voce realiza procedimentos esteticos (botox, preenchimento)?",
      type: "boolean",
    },
  ],
  nutricionista: [
    {
      id: "area_atuacao",
      label: "Qual sua area de atuacao principal?",
      type: "select",
      options: ["Clinica", "Esportiva", "Comportamental", "Materno-infantil"],
    },
    {
      id: "planos_personalizados",
      label: "Voce trabalha com planos alimentares personalizados?",
      type: "boolean",
    },
    {
      id: "avaliacoes",
      label: "Quais avaliacoes voce realiza?",
      type: "multi-select",
      options: [
        "Bioimpedancia",
        "Antropometria",
        "Recordatorio alimentar",
        "Exames bioquimicos",
      ],
    },
  ],
  medico: [
    {
      id: "especialidade",
      label: "Qual sua especialidade?",
      type: "select",
      options: [
        "Clinica geral",
        "Cardiologia",
        "Dermatologia",
        "Ginecologia",
        "Ortopedia",
        "Pediatria",
        "Psiquiatria",
        "Outra",
      ],
    },
    {
      id: "volume_atendimento",
      label: "Quantos pacientes atende por dia em media?",
      type: "select",
      options: ["1-5", "6-10", "11-20", "Mais de 20"],
    },
    {
      id: "prontuario_eletronico",
      label: "Voce ja utiliza prontuario eletronico?",
      type: "boolean",
    },
  ],
  esteticista: [
    {
      id: "procedimentos",
      label: "Quais procedimentos voce mais realiza?",
      type: "multi-select",
      options: [
        "Limpeza de pele",
        "Peeling",
        "Microagulhamento",
        "Laser",
        "Radiofrequencia",
        "Criolipise",
        "Drenagem linfatica",
        "Depilacao a laser",
      ],
    },
    {
      id: "volume_atendimento",
      label: "Quantos atendimentos realiza por dia?",
      type: "select",
      options: ["1-5", "6-10", "11-15", "Mais de 15"],
    },
    {
      id: "protocolos",
      label: "Voce trabalha com protocolos de tratamento personalizados?",
      type: "boolean",
    },
  ],
  advogado: [
    {
      id: "area_atuacao",
      label: "Qual sua area de atuacao?",
      type: "select",
      options: [
        "Trabalhista",
        "Civil",
        "Criminal",
        "Tributario",
        "Empresarial",
        "Familia",
        "Outra",
      ],
    },
    {
      id: "volume_clientes",
      label: "Quantos clientes ativos voce tem em media?",
      type: "select",
      options: ["1-10", "11-30", "31-50", "Mais de 50"],
    },
    {
      id: "consultoria",
      label: "Voce realiza consultoria preventiva?",
      type: "boolean",
    },
  ],
  outro: [
    {
      id: "profissao_especifica",
      label: "Qual sua profissao?",
      type: "select",
      options: [
        "Fisioterapeuta",
        "Psicologo",
        "Fonoaudiologo",
        "Terapeuta ocupacional",
        "Veterinario",
        "Outra",
      ],
    },
    {
      id: "volume_atendimento",
      label: "Quantos atendimentos realiza por dia?",
      type: "select",
      options: ["1-5", "6-10", "11-20", "Mais de 20"],
    },
    {
      id: "fichas_customizadas",
      label: "Voce precisa de fichas de atendimento customizadas?",
      type: "boolean",
    },
  ],
}
