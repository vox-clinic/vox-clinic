import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Termos de Uso - VoxClinic",
  description: "Termos de uso e condicoes gerais de utilizacao da plataforma VoxClinic.",
}

const lastUpdated = "28 de marco de 2026"

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-4xl flex items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white text-sm font-bold shadow-sm">V</div>
            <span className="text-sm font-bold text-slate-900">VoxClinic</span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/privacidade" className="text-slate-500 hover:text-slate-700 transition-colors">
              Privacidade
            </Link>
            <Link href="/sign-in" className="rounded-lg bg-teal-500 px-3 py-1.5 font-semibold text-white hover:bg-teal-600 transition-colors">
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {/* Hero */}
        <div className="text-center space-y-3 pb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Termos de Uso
          </h1>
          <p className="text-sm text-slate-500">
            Última atualização: {lastUpdated}
          </p>
        </div>

        <article className="prose prose-slate prose-sm sm:prose-base max-w-none [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-800 [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:text-slate-600 [&_p]:leading-relaxed [&_li]:text-slate-600 [&_li]:leading-relaxed [&_ul]:space-y-1 [&_ol]:space-y-1">

          <p>
            Estes Termos de Uso (&quot;Termos&quot;) regulam a utilizacao da plataforma <strong>VoxClinic</strong>, operada pela <strong>VoxClinic Tecnologia Ltda.</strong> (&quot;VoxClinic&quot;, &quot;nos&quot;). Ao criar uma conta e utilizar nossos servicos, voce (&quot;Usuario&quot;, &quot;Profissional&quot;) concorda integralmente com estes Termos.
          </p>

          {/* 1 */}
          <h2>1. Descricao do Servico</h2>
          <p>
            A VoxClinic e uma plataforma SaaS (Software as a Service) de CRM inteligente voltada para profissionais de saude e servicos (dentistas, medicos, nutricionistas, esteticistas, psicologos, advogados, entre outros). O servico inclui:
          </p>
          <ul>
            <li>Transcrição automática de consultas por voz com inteligencia artificial</li>
            <li>Extracao e estruturacao automatizada de dados clinicos</li>
            <li>Gerenciamento de prontuarios eletronicos de pacientes</li>
            <li>Agendamento de consultas com multiplas agendas</li>
            <li>Teleconsulta por video</li>
            <li>Emissao de prescricoes, atestados e certificados</li>
            <li>Gestao financeira (receitas, despesas, NFS-e)</li>
            <li>Comunicacao com pacientes (e-mail e WhatsApp)</li>
            <li>Relatórios analíticos e indicadores de desempenho</li>
            <li>Agendamento online para pacientes</li>
          </ul>

          {/* 2 */}
          <h2>2. Elegibilidade e Cadastro</h2>
          <p>
            Para utilizar a plataforma, o Usuario deve:
          </p>
          <ol>
            <li>Ser maior de 18 anos e possuir capacidade civil plena</li>
            <li>Ser profissional habilitado na area de atuacao declarada (quando aplicavel)</li>
            <li>Fornecer informacoes verdadeiras, completas e atualizadas no cadastro</li>
            <li>Completar o processo de onboarding (configuracao do workspace)</li>
          </ol>
          <p>
            O Usuario e responsavel por manter a confidencialidade de suas credenciais de acesso. Qualquer atividade realizada com suas credenciais sera de sua responsabilidade.
          </p>

          {/* 3 */}
          <h2>3. Responsabilidades do Usuario</h2>
          <p>
            O Usuario compromete-se a:
          </p>
          <ol>
            <li><strong>Veracidade dos dados:</strong> garantir que todas as informacoes inseridas na plataforma (incluindo dados de pacientes) sejam verdadeiras e precisas</li>
            <li><strong>Consentimento dos pacientes:</strong> obter o consentimento informado dos pacientes antes de realizar gravacoes de audio, em conformidade com a LGPD e as normas eticas de sua profissao</li>
            <li><strong>Revisao de dados de IA:</strong> revisar e confirmar todos os dados extraidos automaticamente pela inteligencia artificial antes de salva-los no prontuario. A IA e uma ferramenta auxiliar, e a responsabilidade clinica permanece integralmente com o profissional</li>
            <li><strong>Sigilo profissional:</strong> manter o sigilo profissional conforme o código de ética de sua categoria (CFM, CRO, CRN, etc.)</li>
            <li><strong>Uso licito:</strong> utilizar a plataforma apenas para fins licitos e em conformidade com a legislacao aplicavel</li>
            <li><strong>Seguranca da conta:</strong> manter suas credenciais seguras e notificar imediatamente a VoxClinic sobre qualquer uso nao autorizado</li>
            <li><strong>Backup:</strong> manter copias de seguranca dos dados criticos conforme exigido pela regulamentacao de sua profissao</li>
          </ol>

          {/* 4 */}
          <h2>4. Responsabilidades da VoxClinic</h2>
          <p>
            A VoxClinic compromete-se a:
          </p>
          <ol>
            <li><strong>Disponibilidade:</strong> manter a plataforma disponivel e funcional, conforme o nivel de servico descrito na Secao 8</li>
            <li><strong>Seguranca:</strong> adotar medidas tecnicas e organizacionais para proteger os dados armazenados na plataforma (criptografia, isolamento multi-tenant, autenticacao segura, logs de auditoria)</li>
            <li><strong>Privacidade:</strong> tratar os dados pessoais em conformidade com a LGPD e nossa <Link href="/privacidade" className="text-teal-600 hover:text-teal-700 underline">Politica de Privacidade</Link></li>
            <li><strong>Transparencia:</strong> informar sobre manutencoes programadas com antecedencia minima de 24 horas</li>
            <li><strong>Suporte:</strong> oferecer suporte tecnico nos canais disponiveis em horario comercial</li>
            <li><strong>Retencao legal:</strong> manter prontuarios medicos pelo prazo minimo de 20 anos conforme Resolucao CFM n. 1.821/2007</li>
          </ol>

          {/* 5 */}
          <h2>5. Inteligencia Artificial: Limitacoes e Responsabilidade</h2>
          <p>
            A plataforma utiliza modelos de inteligencia artificial (OpenAI Whisper para transcricao e Anthropic Claude para extracao de dados) como ferramentas auxiliares. E fundamental compreender que:
          </p>
          <ul>
            <li>Os resultados gerados pela IA sao <strong>sugestoes</strong> que devem ser revisados pelo profissional antes de serem confirmados</li>
            <li>A IA pode cometer erros de transcricao ou interpretacao, especialmente com termos tecnicos, sotaques regionais ou audio de baixa qualidade</li>
            <li>Nenhum dado extraido por IA e salvo automaticamente no prontuario — o profissional sempre deve revisar e confirmar</li>
            <li>A responsabilidade clinica, diagnostica e terapeutica permanece <strong>exclusivamente</strong> com o profissional de saude</li>
            <li>A VoxClinic nao se responsabiliza por decisoes clinicas tomadas com base nos dados extraidos pela IA</li>
          </ul>

          {/* 6 */}
          <h2>6. Propriedade Intelectual</h2>
          <h3>6.1. Da VoxClinic</h3>
          <p>
            A plataforma VoxClinic, incluindo seu código-fonte, design, marca, logotipos, textos, algoritmos e documentação, e de propriedade exclusiva da VoxClinic Tecnologia Ltda. O Usuario recebe uma licenca limitada, nao exclusiva, nao transferivel e revogavel para utilizar a plataforma durante a vigencia de sua assinatura.
          </p>
          <p>
            E expressamente proibido:
          </p>
          <ul>
            <li>Copiar, modificar, distribuir ou criar obras derivadas da plataforma</li>
            <li>Realizar engenharia reversa, descompilar ou desmontar qualquer parte do software</li>
            <li>Utilizar a marca VoxClinic sem autorizacao expressa</li>
            <li>Sublicenciar ou transferir o acesso a terceiros</li>
          </ul>

          <h3>6.2. Do Usuario</h3>
          <p>
            Os dados inseridos pelo Usuario na plataforma (incluindo dados de pacientes, gravacoes e documentos) permanecem de propriedade do Usuario. A VoxClinic nao utiliza esses dados para treinamento de modelos de IA, marketing ou qualquer finalidade alem da prestacao do servico contratado.
          </p>

          {/* 7 */}
          <h2>7. Planos e Pagamento</h2>
          <ul>
            <li>A VoxClinic oferece planos gratuitos e pagos, com diferentes limites de funcionalidades</li>
            <li>Os valores, limites e funcionalidades de cada plano estao descritos na pagina de precos da plataforma</li>
            <li>Planos pagos sao cobrados mensalmente ou anualmente, conforme a opcao do Usuario</li>
            <li>O nao pagamento pode resultar na suspensao do acesso as funcionalidades do plano contratado, mantendo-se o acesso somente-leitura aos dados existentes</li>
            <li>Os precos podem ser reajustados com aviso previo de 30 dias</li>
          </ul>

          {/* 8 */}
          <h2>8. Nivel de Servico (SLA)</h2>
          <p>
            A VoxClinic se compromete com uma meta de disponibilidade de <strong>99,5% (noventa e nove virgula cinco por cento)</strong> ao mes, calculada excluindo:
          </p>
          <ul>
            <li>Manutencoes programadas (previamente comunicadas com 24h de antecedencia)</li>
            <li>Indisponibilidades causadas por provedores terceiros (Supabase, Clerk, OpenAI, Anthropic, etc.)</li>
            <li>Casos de forca maior ou caso fortuito</li>
            <li>Problemas na conexao de internet ou equipamentos do Usuario</li>
          </ul>
          <p>
            Em caso de indisponibilidade superior ao limite, o Usuario tera direito a credito proporcional no valor da assinatura, mediante solicitacao por e-mail ao suporte.
          </p>

          {/* 9 */}
          <h2>9. Limitacao de Responsabilidade</h2>
          <p>
            Na extensao maxima permitida pela legislacao aplicavel:
          </p>
          <ol>
            <li>A VoxClinic <strong>nao se responsabiliza</strong> por danos indiretos, incidentais, consequentes, punitivos ou especiais decorrentes do uso ou impossibilidade de uso da plataforma</li>
            <li>A responsabilidade total da VoxClinic, por qualquer causa, sera limitada ao <strong>valor pago pelo Usuario nos ultimos 12 (doze) meses</strong></li>
            <li>A VoxClinic nao se responsabiliza por decisoes clinicas, diagnosticas ou terapeuticas tomadas pelo profissional</li>
            <li>A VoxClinic nao garante que os resultados gerados pela IA sejam livres de erros — a verificacao e responsabilidade do profissional</li>
            <li>A VoxClinic nao se responsabiliza por indisponibilidades causadas por provedores terceiros</li>
          </ol>

          {/* 10 */}
          <h2>10. Cancelamento e Exclusao de Dados</h2>
          <h3>10.1. Cancelamento pelo Usuario</h3>
          <p>
            O Usuario pode cancelar sua assinatura a qualquer momento pelas configuracoes da plataforma. Apos o cancelamento:
          </p>
          <ul>
            <li>O acesso as funcionalidades do plano sera mantido ate o final do periodo ja pago</li>
            <li>Apos o termino, a conta sera rebaixada para o plano gratuito (somente leitura)</li>
            <li>Os dados permanecem acessiveis por 6 (seis) meses apos o cancelamento</li>
            <li>Apos esse periodo, o Usuario pode solicitar a exportacao completa dos dados</li>
          </ul>

          <h3>10.2. Exclusao de Dados</h3>
          <p>
            O Usuario pode solicitar a exclusao completa de seus dados enviando e-mail para <strong>dpo@voxclinic.com</strong>. Observacoes importantes:
          </p>
          <ul>
            <li><strong>Prontuarios medicos</strong> estao sujeitos ao prazo legal de retencao de 20 anos (Resolucao CFM n. 1.821/2007) e nao podem ser excluidos antes desse prazo</li>
            <li><strong>Dados fiscais</strong> (NFS-e, recibos) estao sujeitos ao prazo de retencao de 5 anos conforme legislacao tributaria</li>
            <li><strong>Logs de auditoria</strong> sao retidos por 5 anos para fins de conformidade</li>
            <li>Dados nao sujeitos a retencao legal serao excluidos em ate 30 dias apos a solicitacao</li>
          </ul>

          <h3>10.3. Cancelamento pela VoxClinic</h3>
          <p>
            A VoxClinic reserva-se o direito de suspender ou cancelar a conta do Usuario em caso de:
          </p>
          <ul>
            <li>Violacao destes Termos de Uso</li>
            <li>Uso da plataforma para fins ilicitos</li>
            <li>Inadimplencia por periodo superior a 90 dias</li>
            <li>Inatividade por periodo superior a 12 meses (plano gratuito)</li>
          </ul>
          <p>
            Em todos os casos, o Usuario sera notificado com antecedencia minima de 30 dias e tera oportunidade de exportar seus dados.
          </p>

          {/* 11 */}
          <h2>11. Exportacao de Dados</h2>
          <p>
            O Usuario tem direito a exportar seus dados a qualquer momento. A plataforma oferece funcionalidades de exportacao em formatos padrao:
          </p>
          <ul>
            <li>Lista de pacientes em formato Excel (.xlsx)</li>
            <li>Relatórios financeiros e analíticos em formato Excel (.xlsx)</li>
            <li>Prontuario individual em formato PDF (via impressao)</li>
          </ul>
          <p>
            Para exportacoes completas (banco de dados integral), entre em contato pelo e-mail <strong>contato@voxclinic.com</strong>.
          </p>

          {/* 12 */}
          <h2>12. Comunicacoes</h2>
          <p>
            Ao utilizar a plataforma, o Usuario consente em receber comunicacoes por e-mail relacionadas a:
          </p>
          <ul>
            <li>Atualizacoes do servico e manutencoes programadas</li>
            <li>Alteracoes nos Termos de Uso ou Politica de Privacidade</li>
            <li>Informacoes sobre novos recursos e funcionalidades</li>
            <li>Questoes de seguranca e alertas importantes</li>
          </ul>
          <p>
            Comunicacoes de marketing sao enviadas apenas com consentimento expresso e podem ser canceladas a qualquer momento.
          </p>

          {/* 13 */}
          <h2>13. Alteracoes nos Termos</h2>
          <p>
            A VoxClinic pode alterar estes Termos a qualquer momento. Alteracoes significativas serao comunicadas com antecedencia minima de 30 dias por e-mail ou aviso na plataforma. O uso continuado da plataforma apos a entrada em vigor das alteracoes constitui aceitacao dos novos Termos.
          </p>

          {/* 14 */}
          <h2>14. Disposicoes Gerais</h2>
          <ul>
            <li><strong>Integralidade:</strong> estes Termos, juntamente com a <Link href="/privacidade" className="text-teal-600 hover:text-teal-700 underline">Politica de Privacidade</Link>, constituem o acordo integral entre as partes</li>
            <li><strong>Independencia das clausulas:</strong> se qualquer clausula for considerada invalida, as demais permanecem em pleno vigor</li>
            <li><strong>Tolerancia:</strong> a nao aplicacao de qualquer direito previsto nestes Termos nao constitui renuncia</li>
            <li><strong>Cessao:</strong> o Usuario nao pode ceder ou transferir seus direitos sob estes Termos sem autorizacao expressa</li>
          </ul>

          {/* 15 */}
          <h2>15. Legislacao Aplicavel e Foro</h2>
          <p>
            Estes Termos sao regidos pelas leis da Republica Federativa do Brasil. Para dirimir quaisquer controversias oriundas destes Termos, fica eleito o foro da <strong>Comarca de Sao Paulo, Estado de Sao Paulo</strong>, com exclusao de qualquer outro, por mais privilegiado que seja.
          </p>

          {/* 16 */}
          <h2>16. Contato</h2>
          <p>
            Para duvidas sobre estes Termos de Uso:
          </p>
          <ul>
            <li><strong>E-mail:</strong> contato@voxclinic.com</li>
            <li><strong>DPO (dados pessoais):</strong> dpo@voxclinic.com</li>
          </ul>

        </article>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-slate-200 text-center text-sm text-slate-400 space-y-2 pb-8">
          <p>&copy; 2026 VoxClinic Tecnologia Ltda. Todos os direitos reservados.</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/privacidade" className="hover:text-slate-600 transition-colors">Privacidade</Link>
            <span>|</span>
            <Link href="/docs" className="hover:text-slate-600 transition-colors">Documentacao</Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
