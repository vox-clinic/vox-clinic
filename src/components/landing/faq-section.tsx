"use client"

import { BlurFade } from "@/components/ui/blur-fade"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "O VoxClinic funciona com minha especialidade?",
    answer:
      "Sim! O VoxClinic se adapta automaticamente a sua profissao durante o onboarding. Ja atendemos dentistas, medicos, nutricionistas, esteticistas e advogados, com vocabulario e campos especificos para cada area.",
  },
  {
    question: "Preciso de internet para gravar?",
    answer:
      "Sim, a gravacao e o processamento ocorrem online para garantir a melhor qualidade de transcricao. O audio e enviado diretamente para processamento, sem armazenamento local.",
  },
  {
    question: "Meus dados ficam seguros?",
    answer:
      "Absolutamente. Todos os dados sao armazenados em infraestrutura brasileira (sa-east-1), com consentimento LGPD obrigatorio, auditoria completa e URLs de audio com expiracao de 5 minutos.",
  },
  {
    question: "Posso experimentar antes de pagar?",
    answer:
      "Sim! O plano Gratis permite ate 50 consultas por mes sem necessidade de cartao de credito. Voce pode usar o tempo que precisar antes de decidir fazer upgrade.",
  },
  {
    question: "Como funciona a transcricao por voz?",
    answer:
      "Utilizamos a API Whisper da OpenAI com vocabulario medico em portugues. O audio e transcrito automaticamente, e a IA extrai dados estruturados como nome do paciente, procedimentos e observacoes.",
  },
  {
    question: "Posso importar meus pacientes existentes?",
    answer:
      "Sim! O VoxClinic suporta importacao via CSV com mapeamento automatico de colunas. Voce pode migrar sua base de pacientes em poucos minutos.",
  },
  {
    question: "O VoxClinic substitui meu prontuario eletronico?",
    answer:
      "O VoxClinic e um CRM inteligente com funcionalidades de prontuario. Para clinicas que ja possuem um sistema de prontuario eletronico, ele funciona como complemento focado em produtividade.",
  },
  {
    question: "Como funciona o suporte?",
    answer:
      "Oferecemos suporte via email para todos os planos. Planos Profissional e Clinica contam com suporte prioritario e tempo de resposta reduzido.",
  },
]

export function FAQSection() {
  return (
    <section
      id="faq"
      className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-20 md:py-28"
    >
      <BlurFade inView>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Perguntas frequentes
        </h2>
      </BlurFade>

      <BlurFade inView delay={0.15}>
        <Accordion defaultValue={[]}>
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={String(i)}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">{faq.answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </BlurFade>
    </section>
  )
}
