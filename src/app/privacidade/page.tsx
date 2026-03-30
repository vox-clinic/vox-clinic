import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Politica de Privacidade - VoxClinic",
  description: "Politica de privacidade e protecao de dados do VoxClinic, em conformidade com a LGPD (Lei Geral de Protecao de Dados).",
}

const lastUpdated = "28 de marco de 2026"

export default function PrivacidadePage() {
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
            <Link href="/termos" className="text-slate-500 hover:text-slate-700 transition-colors">
              Termos de Uso
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
            Politica de Privacidade
          </h1>
          <p className="text-sm text-slate-500">
            Última atualização: {lastUpdated}
          </p>
        </div>

        <article className="prose prose-slate prose-sm sm:prose-base max-w-none [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-800 [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:text-slate-600 [&_p]:leading-relaxed [&_li]:text-slate-600 [&_li]:leading-relaxed [&_ul]:space-y-1 [&_ol]:space-y-1">

          <p>
            A <strong>VoxClinic Tecnologia Ltda.</strong> (&quot;VoxClinic&quot;, &quot;nos&quot;) tem o compromisso de proteger a privacidade e os dados pessoais dos usuarios de sua plataforma. Esta Politica de Privacidade descreve como coletamos, utilizamos, armazenamos e compartilhamos seus dados, em conformidade com a <strong>Lei Geral de Protecao de Dados (Lei n. 13.709/2018 - LGPD)</strong> e demais normas aplicaveis.
          </p>
          <p>
            Ao utilizar a plataforma VoxClinic, voce declara ter lido e compreendido esta Politica.
          </p>

          {/* 1 */}
          <h2>1. Controlador de Dados</h2>
          <p>
            O controlador dos dados pessoais tratados por meio da plataforma e:
          </p>
          <ul>
            <li><strong>Razao Social:</strong> VoxClinic Tecnologia Ltda.</li>
            <li><strong>E-mail de contato:</strong> contato@voxclinic.com</li>
            <li><strong>Site:</strong> https://app.voxclinic.com</li>
          </ul>

          {/* 2 */}
          <h2>2. Encarregado de Protecao de Dados (DPO)</h2>
          <p>
            Para questoes relacionadas ao tratamento de dados pessoais, entre em contato com nosso Encarregado de Protecao de Dados:
          </p>
          <ul>
            <li><strong>E-mail:</strong> dpo@voxclinic.com</li>
          </ul>

          {/* 3 */}
          <h2>3. Dados Coletados</h2>

          <h3>3.1. Dados Pessoais do Profissional (Usuario)</h3>
          <ul>
            <li>Nome completo, e-mail, telefone</li>
            <li>Dados profissionais (CRM, CRN, CRO ou registro equivalente)</li>
            <li>Nome da clinica ou consultorio</li>
            <li>Dados de autenticacao (gerenciados via Clerk)</li>
          </ul>

          <h3>3.2. Dados Pessoais de Pacientes</h3>
          <ul>
            <li>Nome completo, CPF, RG, data de nascimento, genero</li>
            <li>Endereco, telefone, e-mail</li>
            <li>Convenio (plano de saude) e origem do encaminhamento</li>
            <li>Nome do responsavel (para menores de idade)</li>
            <li>Tags e campos personalizados definidos pelo profissional</li>
          </ul>

          <h3>3.3. Dados Sensiveis de Saude (Art. 5, II, LGPD)</h3>
          <ul>
            <li>Histórico médico: alergias, doenças crônicas, medicamentos em uso, tipo sanguineo</li>
            <li>Resumos de consultas gerados por inteligencia artificial</li>
            <li>Prescricoes medicas (medicamentos, dosagens, posologia)</li>
            <li>Atestados e certificados medicos</li>
            <li>Planos de tratamento e evolucao de sessoes</li>
            <li>Anamnese e dados clinicos personalizados por profissao</li>
            <li>Dados de NPS (pesquisa de satisfacao pos-consulta)</li>
          </ul>

          <h3>3.4. Gravacoes de Audio</h3>
          <ul>
            <li>Gravacoes de voz realizadas durante ou apos consultas</li>
            <li>Transcricoes geradas a partir das gravacoes</li>
            <li>Dados extraidos automaticamente por IA (com revisao obrigatoria do profissional)</li>
          </ul>
          <p>
            <strong>Importante:</strong> As gravacoes de audio sao coletadas exclusivamente mediante consentimento previo e explicito (registro de consentimento LGPD armazenado em banco de dados). O paciente e informado antes de qualquer gravacao.
          </p>

          <h3>3.5. Gravacoes de Video (Teleconsulta)</h3>
          <ul>
            <li>Gravacoes de video das sessoes de teleconsulta (quando habilitado pelo profissional)</li>
            <li>Consentimento LGPD registrado antes do inicio da sessao</li>
          </ul>

          <h3>3.6. Dados de Uso e Tecnicos</h3>
          <ul>
            <li>Logs de acesso e auditoria (acoes realizadas na plataforma)</li>
            <li>Dados de navegacao (paginas acessadas, horarios)</li>
            <li>Informacoes do dispositivo e navegador</li>
          </ul>

          {/* 4 */}
          <h2>4. Bases Legais para o Tratamento (Arts. 7 e 11, LGPD)</h2>
          <p>
            O tratamento dos dados pessoais e realizados com fundamento nas seguintes bases legais:
          </p>

          <h3>4.1. Dados Pessoais Comuns (Art. 7)</h3>
          <ul>
            <li><strong>Execucao de contrato (Art. 7, V):</strong> para prestacao do servico contratado pelo profissional (CRM, agendamento, faturamento)</li>
            <li><strong>Consentimento (Art. 7, I):</strong> para gravacao de audio e coleta de dados alem do estritamente necessario</li>
            <li><strong>Exercicio regular de direitos (Art. 7, VI):</strong> para cumprimento de obrigacoes legais e regulatorias do profissional de saude</li>
            <li><strong>Interesse legitimo (Art. 7, IX):</strong> para melhoria do servico, seguranca e prevencao de fraudes</li>
          </ul>

          <h3>4.2. Dados Sensiveis de Saude (Art. 11)</h3>
          <ul>
            <li><strong>Tutela da saude (Art. 11, II, f):</strong> tratamento de dados de saude necessarios para a prestacao de servicos de saude pelo profissional habilitado</li>
            <li><strong>Consentimento (Art. 11, I):</strong> consentimento especifico e destacado para gravacao de audio e processamento por IA, coletado antes de cada gravacao</li>
          </ul>

          {/* 5 */}
          <h2>5. Finalidades do Tratamento</h2>
          <ul>
            <li>Transcrição de áudio e extração automatizada de dados clinicos via inteligencia artificial</li>
            <li>Gerenciamento de prontuarios eletronicos de pacientes</li>
            <li>Agendamento de consultas e envio de lembretes (e-mail e WhatsApp)</li>
            <li>Emissao de prescricoes, atestados e certificados medicos</li>
            <li>Realizacao de teleconsultas</li>
            <li>Emissao de Nota Fiscal de Servico Eletronica (NFS-e)</li>
            <li>Gerenciamento financeiro (receitas, despesas, fluxo de caixa)</li>
            <li>Geracao de relatorios e analiticos para o profissional</li>
            <li>Pesquisas de satisfacao (NPS)</li>
            <li>Mensagens de aniversario e comunicacao com pacientes</li>
            <li>Auditoria e rastreabilidade de acoes</li>
          </ul>

          {/* 6 */}
          <h2>6. Compartilhamento com Terceiros</h2>
          <p>
            Para viabilizar nossas funcionalidades, compartilhamos dados com os seguintes processadores (operadores), todos vinculados por contratos que garantem a protecao de dados:
          </p>

          <div className="overflow-x-auto not-prose my-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 pr-4 font-semibold text-slate-900">Provedor</th>
                  <th className="text-left py-2 pr-4 font-semibold text-slate-900">Finalidade</th>
                  <th className="text-left py-2 font-semibold text-slate-900">Localizacao</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">OpenAI (Whisper)</td>
                  <td className="py-2 pr-4">Transcrição de áudio para texto</td>
                  <td className="py-2">EUA</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">Anthropic (Claude)</td>
                  <td className="py-2 pr-4">Extracao de dados e geracao de resumos por IA</td>
                  <td className="py-2">EUA</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">Supabase</td>
                  <td className="py-2 pr-4">Banco de dados (PostgreSQL) e armazenamento de arquivos</td>
                  <td className="py-2">Brasil (sa-east-1)</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">Clerk</td>
                  <td className="py-2 pr-4">Autenticacao e gerenciamento de identidade</td>
                  <td className="py-2">EUA</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">Daily.co</td>
                  <td className="py-2 pr-4">Infraestrutura de video para teleconsultas</td>
                  <td className="py-2">EUA</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">Resend</td>
                  <td className="py-2 pr-4">Envio de e-mails transacionais (lembretes, confirmacoes)</td>
                  <td className="py-2">EUA</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">NuvemFiscal</td>
                  <td className="py-2 pr-4">Emissao de NFS-e (Nota Fiscal de Servico Eletronica)</td>
                  <td className="py-2">Brasil</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">Meta (WhatsApp Business)</td>
                  <td className="py-2 pr-4">Comunicacao com pacientes via WhatsApp</td>
                  <td className="py-2">EUA</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">Vercel</td>
                  <td className="py-2 pr-4">Hospedagem da aplicacao</td>
                  <td className="py-2">EUA / Global CDN</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            <strong>Nao vendemos, alugamos ou comercializamos dados pessoais de nossos usuarios ou de seus pacientes.</strong>
          </p>

          {/* 7 */}
          <h2>7. Transferencia Internacional de Dados</h2>
          <p>
            Alguns de nossos processadores estao localizados nos Estados Unidos da America (EUA). As transferencias internacionais de dados sao realizadas em conformidade com o Art. 33 da LGPD, com base em:
          </p>
          <ul>
            <li>Clausulas contratuais padrao (Standard Contractual Clauses) firmadas com os processadores</li>
            <li>Compromissos de protecao de dados equivalentes ou superiores aos exigidos pela LGPD</li>
            <li>Politicas de privacidade e termos de processamento de dados (DPAs) dos provedores</li>
          </ul>
          <p>
            Os dados de banco de dados e armazenamento de arquivos sao mantidos em infraestrutura localizada no <strong>Brasil (regiao sa-east-1)</strong> via Supabase. Apenas o processamento de IA (transcricao e extracao) e autenticacao envolvem transferencia temporaria para servidores nos EUA.
          </p>

          {/* 8 */}
          <h2>8. Direitos do Titular (Art. 18, LGPD)</h2>
          <p>
            Os titulares dos dados (profissionais usuarios e pacientes) possuem os seguintes direitos, que podem ser exercidos a qualquer momento:
          </p>
          <ol>
            <li><strong>Confirmacao e acesso:</strong> confirmar a existencia de tratamento e acessar seus dados</li>
            <li><strong>Correcao:</strong> solicitar a correcao de dados incompletos, inexatos ou desatualizados</li>
            <li><strong>Anonimizacao, bloqueio ou eliminacao:</strong> de dados desnecessarios, excessivos ou tratados em desconformidade</li>
            <li><strong>Portabilidade:</strong> solicitar a portabilidade dos dados a outro fornecedor (em formato estruturado)</li>
            <li><strong>Eliminacao:</strong> solicitar a eliminacao dos dados tratados com base no consentimento</li>
            <li><strong>Informacao sobre compartilhamento:</strong> saber com quais entidades publicas ou privadas os dados sao compartilhados</li>
            <li><strong>Revogacao do consentimento:</strong> revogar o consentimento a qualquer momento, sem prejuizo das acoes realizadas anteriormente</li>
            <li><strong>Oposicao:</strong> opor-se ao tratamento realizado com fundamento em hipotese de dispensa de consentimento, em caso de descumprimento da LGPD</li>
          </ol>
          <p>
            Para exercer qualquer desses direitos, entre em contato pelo e-mail <strong>dpo@voxclinic.com</strong>. Responderemos em ate <strong>15 (quinze) dias uteis</strong>, conforme Art. 18, paragrafos 3 e 5, da LGPD.
          </p>

          {/* 9 */}
          <h2>9. Tempo de Retencao dos Dados</h2>
          <ul>
            <li><strong>Prontuarios medicos:</strong> retidos por no minimo <strong>20 (vinte) anos</strong> apos o ultimo registro, conforme Resolucao CFM n. 1.821/2007 e Art. 6, IV, da LGPD (principio da necessidade). A exclusao antes desse prazo nao e possivel para registros clinicos</li>
            <li><strong>Dados de conta do profissional:</strong> mantidos enquanto a conta estiver ativa. Apos cancelamento, os dados sao retidos por 6 (seis) meses para eventual recuperacao, e entao eliminados</li>
            <li><strong>Gravacoes de audio:</strong> mantidas pelo mesmo periodo do prontuario ao qual estao vinculadas (20 anos). O profissional pode solicitar exclusao antecipada de gravacoes especificas, desde que o resumo clinico seja preservado</li>
            <li><strong>Logs de auditoria:</strong> retidos por 5 (cinco) anos para fins de conformidade e seguranca</li>
            <li><strong>Dados financeiros e fiscais:</strong> retidos conforme legislacao tributaria aplicavel (minimo 5 anos)</li>
          </ul>

          {/* 10 */}
          <h2>10. Seguranca dos Dados</h2>
          <p>
            Adotamos medidas tecnicas e organizacionais para proteger os dados pessoais:
          </p>
          <ul>
            <li><strong>Criptografia em transito:</strong> todas as comunicacoes utilizam TLS 1.2+ (HTTPS)</li>
            <li><strong>Criptografia em repouso:</strong> dados armazenados com criptografia AES-256 nos servidores do Supabase</li>
            <li><strong>URLs assinadas:</strong> acesso a arquivos de audio e documentos apenas via URLs temporarias com expiracao de 5 minutos</li>
            <li><strong>Isolamento multi-tenant:</strong> todos os dados sao isolados por workspace — nenhum profissional pode acessar dados de outro</li>
            <li><strong>Autenticacao segura:</strong> autenticacao gerenciada por Clerk com suporte a MFA (autenticacao multi-fator)</li>
            <li><strong>Logs de auditoria:</strong> todas as operações de criação, alteração e exclusão de dados sao registradas com identificação do usuario, data/hora e tipo de acao</li>
            <li><strong>Validacao de ambiente:</strong> todas as chaves de API sao validadas na inicializacao da aplicacao (fail-fast)</li>
            <li><strong>Sem cache local de audio:</strong> gravacoes de audio sao mantidas apenas em memoria durante o upload e nunca armazenadas no dispositivo do usuario</li>
            <li><strong>Consentimento registrado:</strong> cada gravacao de audio e precedida por um registro de consentimento LGPD no banco de dados</li>
          </ul>

          {/* 11 */}
          <h2>11. Cookies e Rastreamento</h2>
          <p>
            A plataforma VoxClinic utiliza os seguintes tipos de cookies:
          </p>
          <ul>
            <li><strong>Cookies essenciais:</strong> necessarios para autenticacao e funcionamento da plataforma (sessao do Clerk). Nao podem ser desabilitados</li>
            <li><strong>Cookies de preferencia:</strong> armazenam preferencias do usuario (tema claro/escuro)</li>
          </ul>
          <p>
            <strong>Nao utilizamos</strong> cookies de rastreamento, analytics de terceiros, pixels de conversao ou ferramentas de remarketing. Nao coletamos dados para fins publicitarios.
          </p>

          {/* 12 */}
          <h2>12. Dados de Menores de Idade</h2>
          <p>
            Quando pacientes menores de idade sao cadastrados na plataforma, seus dados sao registrados pelo profissional de saude com o consentimento do responsavel legal, conforme Art. 14 da LGPD. O campo &quot;responsavel&quot; e utilizado para identificar o representante legal do menor.
          </p>

          {/* 13 */}
          <h2>13. Incidentes de Seguranca</h2>
          <p>
            Em caso de incidente de seguranca que possa acarretar risco ou dano relevante aos titulares, a VoxClinic se compromete a:
          </p>
          <ol>
            <li>Comunicar a <strong>Autoridade Nacional de Protecao de Dados (ANPD)</strong> em prazo razoavel, conforme Art. 48 da LGPD</li>
            <li>Notificar os titulares afetados sobre a natureza dos dados comprometidos, os riscos envolvidos e as medidas adotadas</li>
            <li>Adotar medidas tecnicas para mitigar os efeitos do incidente</li>
          </ol>

          {/* 14 */}
          <h2>14. Alteracoes nesta Politica</h2>
          <p>
            Esta Politica de Privacidade pode ser atualizada periodicamente. Notificaremos os usuarios sobre alteracoes significativas por meio de aviso na plataforma ou por e-mail. A versao mais recente estara sempre disponivel nesta pagina.
          </p>

          {/* 15 */}
          <h2>15. Canal de Contato</h2>
          <p>
            Para duvidas, solicitacoes ou reclamacoes relacionadas a esta Politica de Privacidade ou ao tratamento de seus dados pessoais, entre em contato:
          </p>
          <ul>
            <li><strong>E-mail do DPO:</strong> dpo@voxclinic.com</li>
            <li><strong>E-mail geral:</strong> contato@voxclinic.com</li>
          </ul>
          <p>
            Caso nao fique satisfeito com nossa resposta, voce tem o direito de apresentar uma reclamacao junto a <strong>Autoridade Nacional de Protecao de Dados (ANPD)</strong> — <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 underline">www.gov.br/anpd</a>.
          </p>

          {/* 16 */}
          <h2>16. Legislacao Aplicavel e Foro</h2>
          <p>
            Esta Politica e regida pelas leis da Republica Federativa do Brasil. Para dirimir quaisquer controversias, fica eleito o foro da Comarca de Sao Paulo, Estado de Sao Paulo, com exclusao de qualquer outro, por mais privilegiado que seja.
          </p>

        </article>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-slate-200 text-center text-sm text-slate-400 space-y-2 pb-8">
          <p>&copy; 2026 VoxClinic Tecnologia Ltda. Todos os direitos reservados.</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/termos" className="hover:text-slate-600 transition-colors">Termos de Uso</Link>
            <span>|</span>
            <Link href="/docs" className="hover:text-slate-600 transition-colors">Documentacao</Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
