function baseLayout(content: string, clinicName: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VoxClinic</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#6366F1;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">VoxClinic</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e4e4e7;background-color:#fafafa;">
              <p style="margin:0;color:#71717a;font-size:13px;line-height:1.5;">
                ${clinicName}<br>
                Enviado por VoxClinic
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function appointmentReminder(data: {
  patientName: string
  appointmentDate: Date
  clinicName: string
}) {
  const { patientName, appointmentDate, clinicName } = data
  const dateStr = formatDate(appointmentDate)
  const timeStr = formatTime(appointmentDate)

  const content = `
    <h2 style="margin:0 0 16px;color:#18181b;font-size:22px;font-weight:600;">
      Lembrete de Consulta
    </h2>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Olá, <strong>${patientName}</strong>!
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Você tem uma consulta agendada para amanhã, <strong>${dateStr}</strong> às <strong>${timeStr}</strong>, na <strong>${clinicName}</strong>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#f4f4f5;border-radius:8px;width:100%;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 8px;color:#71717a;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Data</p>
          <p style="margin:0 0 16px;color:#18181b;font-size:15px;font-weight:500;">${dateStr}</p>
          <p style="margin:0 0 8px;color:#71717a;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Horário</p>
          <p style="margin:0 0 16px;color:#18181b;font-size:15px;font-weight:500;">${timeStr}</p>
          <p style="margin:0 0 8px;color:#71717a;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Local</p>
          <p style="margin:0;color:#18181b;font-size:15px;font-weight:500;">${clinicName}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#71717a;font-size:13px;line-height:1.5;">
      Em caso de dúvidas ou necessidade de reagendamento, entre em contato conosco.
    </p>
  `

  return baseLayout(content, clinicName)
}

export function appointmentConfirmation(data: {
  patientName: string
  appointmentDate: Date
  clinicName: string
}) {
  const { patientName, appointmentDate, clinicName } = data
  const dateStr = formatDate(appointmentDate)
  const timeStr = formatTime(appointmentDate)

  const content = `
    <h2 style="margin:0 0 16px;color:#18181b;font-size:22px;font-weight:600;">
      Consulta Agendada
    </h2>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Olá, <strong>${patientName}</strong>!
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Sua consulta foi agendada com sucesso.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;width:100%;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px;color:#15803d;font-size:14px;font-weight:600;">Confirmado</p>
          <p style="margin:0 0 8px;color:#71717a;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Data</p>
          <p style="margin:0 0 16px;color:#18181b;font-size:15px;font-weight:500;">${dateStr}</p>
          <p style="margin:0 0 8px;color:#71717a;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Horário</p>
          <p style="margin:0 0 16px;color:#18181b;font-size:15px;font-weight:500;">${timeStr}</p>
          <p style="margin:0 0 8px;color:#71717a;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Local</p>
          <p style="margin:0;color:#18181b;font-size:15px;font-weight:500;">${clinicName}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#71717a;font-size:13px;line-height:1.5;">
      Em caso de dúvidas ou necessidade de reagendamento, entre em contato conosco.
    </p>
  `

  return baseLayout(content, clinicName)
}

export function prescriptionEmail(data: {
  patientName: string
  clinicName: string
  doctorName: string
  medicationsSummary: string
  pdfUrl: string
  date: string
}) {
  const { patientName, clinicName, doctorName, medicationsSummary, pdfUrl, date } = data

  const content = `
    <h2 style="margin:0 0 16px;color:#18181b;font-size:22px;font-weight:600;">
      Sua Prescri\u00e7\u00e3o M\u00e9dica
    </h2>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Ol\u00e1, <strong>${patientName}</strong>!
    </p>
    <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.6;">
      Segue sua prescri\u00e7\u00e3o m\u00e9dica emitida por <strong>${doctorName}</strong> em <strong>${date}</strong>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;width:100%;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 8px;color:#71717a;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Medicamentos</p>
          <p style="margin:0;color:#18181b;font-size:15px;font-weight:500;">${medicationsSummary}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td>
          <a href="${pdfUrl}" target="_blank" style="display:inline-block;background-color:#14B8A6;color:#ffffff;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">
            Baixar Prescri\u00e7\u00e3o (PDF)
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#71717a;font-size:13px;line-height:1.5;">
      Este link expira em 24 horas. Em caso de d\u00favidas, entre em contato com a cl\u00ednica.
    </p>
  `

  return baseLayout(content, clinicName)
}
