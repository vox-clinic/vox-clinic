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
    question: "O VoxClinic funciona para a minha especialidade?",
    answer:
      "Sim! Durante o onboarding, o VoxClinic cria templates customizados para sua profissão — médicos, dentistas, nutricionistas, fisioterapeutas, psicólogos e muitas outras. A IA se adapta ao vocabulário e aos campos específicos da sua área.",
  },
  {
    question: "Meus dados ficam seguros?",
    answer:
      "Totalmente. Utilizamos criptografia AES-256, servidores exclusivamente no Brasil (sa-east-1), conformidade total com a LGPD (consentimento, auditoria, DPO, direito de exclusão) e seguimos a resolução CFM 1.821/2007 para prontuários eletrônicos.",
  },
  {
    question: "Como funciona a IA? E se ela errar?",
    answer:
      "O áudio é transcrito pelo Whisper (OpenAI) e depois processado pelo Claude (Anthropic) para extrair dados estruturados como diagnósticos, medicações e procedimentos. O profissional SEMPRE revisa e confirma antes de qualquer dado ser salvo — a IA nunca grava nada automaticamente.",
  },
  {
    question: "Posso migrar meus dados de outro sistema?",
    answer:
      "Sim! O VoxClinic suporta importação via CSV e Excel com mapeamento automático de colunas. Nosso assistente de migração guia você passo a passo para trazer toda sua base de pacientes sem perder dados.",
  },
  {
    question: "Preciso de internet para usar?",
    answer:
      "Sim, o VoxClinic é uma aplicação web que funciona em qualquer navegador moderno (Chrome, Safari, Edge, Firefox). Basta estar conectado à internet — não é necessário instalar nada.",
  },
  {
    question: "Tem app para celular?",
    answer:
      "O VoxClinic é um PWA (Progressive Web App) totalmente responsivo. Ele funciona como um aplicativo nativo no celular — basta acessar pelo navegador e adicionar à tela inicial. Você pode gravar consultas, acessar prontuários e gerenciar a agenda direto do celular.",
  },
  {
    question: "Posso cancelar a qualquer momento?",
    answer:
      "Sim, sem multa e sem burocracia. Você pode cancelar quando quiser diretamente nas configurações da conta. Todos os seus dados podem ser exportados antes do cancelamento.",
  },
  {
    question: "Como funciona o suporte?",
    answer:
      "Oferecemos suporte via chat e email para todos os planos, além de uma base de conhecimento completa. Planos Clínica contam com suporte prioritário e tempo de resposta reduzido.",
  },
]

export function FAQSection() {
  return (
    <section
      id="faq"
      className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-20 md:py-28"
    >
      <BlurFade inView>
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-vox-primary tracking-wider uppercase mb-3">Perguntas frequentes</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Tudo que você precisa saber
          </h2>
        </div>
      </BlurFade>

      <Accordion defaultValue={[]}>
        {faqs.map((faq, i) => (
          <BlurFade key={i} inView delay={0.1 + i * 0.1}>
            <AccordionItem value={String(i)} className="border-white/[0.08]">
              <AccordionTrigger className="text-white [&_[data-slot=accordion-trigger-icon]]:text-gray-500">{faq.question}</AccordionTrigger>
              <AccordionContent>
                <p className="text-gray-400">{faq.answer}</p>
              </AccordionContent>
            </AccordionItem>
          </BlurFade>
        ))}
      </Accordion>
    </section>
  )
}
