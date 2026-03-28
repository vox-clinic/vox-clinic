# Gateway de Pagamento — Feature Document

## 1. Overview

VoxClinic ja possui um modulo financeiro completo (Contas a Receber, Fluxo de Caixa, NFS-e, TISS), porem os pagamentos sao registrados manualmente pelo profissional. O Gateway de Pagamento permite aceitar PIX, cartao de credito e boleto diretamente pela plataforma, eliminando a necessidade de cobrar externamente e registrar manualmente.

**Beneficios:**
- Profissional gera link de cobranca com 1 clique e envia ao paciente via WhatsApp/email
- Paciente paga online (PIX QR code, cartao, boleto)
- Webhook confirma pagamento automaticamente — Payment atualiza para "paid" sem intervencao manual
- Reducao de inadimplencia com cobrancas automatizadas
- Conciliacao financeira automatica

---

## 2. Analise de Provedores

| Criterio | Stripe | Asaas | PagSeguro | Mercado Pago |
|----------|--------|-------|-----------|--------------|
| PIX | Sim (beta BR) | Sim (nativo) | Sim | Sim |
| Boleto | Sim | Sim (nativo) | Sim | Sim |
| Cartao credito | Sim | Sim | Sim | Sim |
| Webhook confiavel | Excelente | Bom | Razoavel | Bom |
| API moderna/RESTful | Excelente | Muito boa | Legada (v4 melhor) | Boa |
| SDK Node.js | Oficial, tipado | Oficial | Oficial | Oficial |
| Ja integrado no VoxClinic | Sim (billing) | Nao | Nao | Nao |
| Split payment (marketplace) | Sim (Connect) | Sim | Nao | Sim |
| Taxa PIX | 0,80% | 0,99% | 0,99% | Gratis receber |
| Taxa cartao | 3,49% + R$0,39 | 2,99% | 3,99%-4,99% | 3,49%-4,99% |
| Taxa boleto | R$ 4,00 | R$ 1,99 | R$ 3,49 | R$ 3,49 |
| Foco mercado BR | Secundario | Primario | Primario | Primario |
| KYC/Onboarding | Complexo (Connect) | Simples | Medio | Medio |

### Recomendacao: Asaas (primario) + Stripe como fallback

**Justificativa:** Asaas e focado 100% no mercado brasileiro, tem a melhor experiencia para PIX e boleto (que representarao 80%+ dos pagamentos em clinicas brasileiras), taxas menores para PIX/boleto, API moderna com webhooks confiaveis, e onboarding simples para o profissional. O Stripe ja existe no codebase para billing da plataforma (planos pro/enterprise) e pode servir como fallback para clinicas que ja o utilizam. A arquitetura deve ser gateway-agnostica para facilitar adicao de provedores futuros.

---

## 3. Data Model

### Novos campos em Payment (existente)

```prisma
model Payment {
  // ... campos existentes ...
  
  // Gateway fields
  gatewayProvider   String?   // "asaas" | "stripe" | null (manual)
  gatewayChargeId   String?   // ID da cobranca no gateway (e.g., "pay_abc123")
  gatewayStatus     String?   // status raw do gateway
  paymentLink       String?   // URL de pagamento para o paciente
  pixQrCode         String?   // Base64 do QR code PIX
  pixCopiaECola     String?   // Codigo PIX copia-e-cola
  boletoUrl         String?   // URL do boleto PDF
  boletoBarcode     String?   // Codigo de barras do boleto
  webhookReceivedAt DateTime? // quando o webhook confirmou pagamento
}
```

### Novo Model: GatewayConfig

```prisma
model GatewayConfig {
  id            String    @id @default(cuid())
  workspaceId   String    @unique
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  provider      String    @default("asaas") // "asaas" | "stripe"
  apiKey        String    // encrypted (usar ENCRYPTION_KEY existente)
  walletId      String?   // Asaas wallet ID ou Stripe Connected Account ID
  webhookSecret String?   // para validar webhooks
  isActive      Boolean   @default(false)
  sandboxMode   Boolean   @default(true) // homologacao primeiro
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Novo Model: GatewayWebhookLog

```prisma
model GatewayWebhookLog {
  id          String   @id @default(cuid())
  workspaceId String
  provider    String
  eventType   String   // "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", etc.
  paymentId   String?  // FK para Payment
  rawPayload  Json
  processed   Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([workspaceId, createdAt])
  @@index([paymentId])
}
```

### Relacao com Workspace

```prisma
model Workspace {
  // ... campos existentes ...
  gatewayConfig   GatewayConfig?
  webhookLogs     GatewayWebhookLog[]
}
```

---

## 4. Fluxos

### 4.1 Fluxo Principal: Enviar Cobranca

```
Profissional na tab "Contas a Receber"
  → Expande cobranca → ve parcela pendente
    → Clica "Enviar Cobranca" na parcela
      → Dialog pergunta metodo: PIX | Cartao | Boleto | Link completo
        → Server Action createGatewayCharge(paymentId, method)
          → Chama Asaas API: POST /payments
            → Retorna paymentLink + pixQrCode (se PIX)
              → Salva no Payment
                → Exibe QR code / link no dialog
                  → Opcao "Enviar via WhatsApp" (usa sendTextMessage existente)
```

### 4.2 Fluxo PIX (Instantaneo)

```
Paciente recebe link via WhatsApp
  → Abre link → ve QR code PIX
    → Escaneia com app banco → paga
      → Asaas recebe confirmacao do BC
        → Webhook POST /api/webhooks/gateway
          → Valida assinatura
            → Encontra Payment por gatewayChargeId
              → Atualiza Payment: status="paid", paidAt=now, paidAmount
                → Atualiza Charge status (mesmo logica de recordPayment existente)
                  → Cria Notification para o profissional: "Pagamento PIX confirmado"
```

### 4.3 Fluxo Webhook

```
POST /api/webhooks/gateway
  → Identifica provider pelo header/payload
    → Valida assinatura (webhookSecret do GatewayConfig)
      → Loga em GatewayWebhookLog
        → Switch event type:
          PAYMENT_RECEIVED → recordPayment automatico
          PAYMENT_OVERDUE → atualiza Payment status para "overdue"
          PAYMENT_REFUNDED → atualiza Payment status para "refunded"
```

---

## 5. PIX: QR Code e Confirmacao Instantanea

- **Geracao:** Asaas API retorna `encodedImage` (base64 PNG) e `payload` (copia-e-cola) no response de criacao de cobranca PIX
- **Exibicao:** Dialog com QR code grande + botao copiar copia-e-cola + timer de validade
- **Confirmacao:** Webhook `PAYMENT_RECEIVED` chega em 5-15 segundos apos pagamento
- **Polling fallback:** Se webhook falhar, cron job a cada 5 min consulta status de PIX pendentes das ultimas 24h
- **Validade:** QR code PIX valido por 24h (configuravel)

---

## 6. UI/UX

### 6.1 Botao "Enviar Cobranca" na receivables-tab.tsx

Na lista de parcelas de cada Charge expandida, adicionar botao ao lado de "Registrar Pagamento":
- **Se GatewayConfig ativo:** Mostra botao "Enviar Cobranca" (icone Send)
- **Se nao configurado:** Botao desabilitado com tooltip "Configure gateway em Configuracoes"
- **Parcelas ja pagas/canceladas:** Botao nao aparece

### 6.2 Dialog de Cobranca

- Selecao de metodo: PIX (default) | Cartao | Boleto | Link Multi-metodo
- Preview do valor, paciente, vencimento
- Apos criacao: exibe QR code (PIX) ou link
- Botoes: "Copiar Link", "Enviar via WhatsApp", "Enviar via Email"
- Status em tempo real (polling a cada 5s enquanto dialog aberto)

### 6.3 Indicadores de Status

Badge no Payment:
- `gateway: "asaas"` → icone Asaas
- `paymentLink` preenchido → icone de link clicavel
- `webhookReceivedAt` preenchido → badge "Confirmado automaticamente"

### 6.4 Settings: Configuracao do Gateway

Nova secao em `/settings` — "Gateway de Pagamento":
- Toggle ativar/desativar
- Selecao de provedor (Asaas / Stripe)
- Campo API Key (masked)
- Botao "Testar Conexao"
- Modo sandbox toggle (para homologacao)
- Link para documentacao do provedor

---

## 7. Integracao com Sistema Existente

### receivable.ts
- `createGatewayCharge(paymentId, method)` — nova server action
- `checkGatewayPaymentStatus(paymentId)` — consulta status no gateway
- `cancelGatewayCharge(paymentId)` — cancela cobranca no gateway
- Reutiliza logica de `recordPayment` para atualizar Payment + Charge status

### billing.ts
- Stripe continua exclusivo para billing de planos VoxClinic (pro/enterprise)
- Gateway de pagamento (Asaas) e para cobrancas de pacientes — dominio separado

### messaging.ts / whatsapp.ts
- Reutilizar `sendTextMessage` para enviar link de pagamento via WhatsApp
- Template WhatsApp para cobranca (se aprovado pela Meta)

### notification.ts
- Nova notificacao tipo "payment_confirmed" quando webhook recebe confirmacao

---

## 8. Seguranca

- API keys encriptadas com ENCRYPTION_KEY existente (AES-256-GCM)
- Webhook signature validation obrigatoria
- Webhook log completo para auditoria
- Rate limiting no endpoint de webhook (reuso de rate-limit.ts)
- Nunca expor API key no frontend
- Audit log para todas as operacoes de gateway

---

## 9. Implementation Plan

### Fase 1: Infraestrutura (3-4 dias)

| Step | Task | Arquivo |
|------|------|---------|
| 1.1 | Schema: GatewayConfig, GatewayWebhookLog, campos em Payment | `prisma/schema.prisma` |
| 1.2 | Env vars: ASAAS_API_KEY (opcional), gateway defaults | `src/lib/env.ts` |
| 1.3 | Asaas API client (create charge, get status, cancel) | `src/lib/gateway/asaas-client.ts` |
| 1.4 | Gateway interface (provider-agnostic) | `src/lib/gateway/types.ts` |
| 1.5 | Gateway factory (asaas/stripe switch) | `src/lib/gateway/index.ts` |
| 1.6 | Crypto helpers para encrypt/decrypt API key | Reutilizar `src/lib/crypto.ts` |

### Fase 2: Backend — Server Actions (2-3 dias)

| Step | Task | Arquivo |
|------|------|---------|
| 2.1 | createGatewayCharge, checkGatewayStatus, cancelGatewayCharge | `src/server/actions/gateway.ts` |
| 2.2 | saveGatewayConfig, getGatewayConfig, testGatewayConnection | `src/server/actions/gateway-config.ts` |
| 2.3 | Webhook route: validate, log, process events | `src/app/api/webhooks/gateway/route.ts` |
| 2.4 | Cron fallback para pagamentos PIX pendentes | `src/app/api/gateway/check-pending/route.ts` |

### Fase 3: UI — Settings (1-2 dias)

| Step | Task | Arquivo |
|------|------|---------|
| 3.1 | Secao Gateway em settings | `src/app/(dashboard)/settings/sections/gateway-section.tsx` |
| 3.2 | Registrar na settings page | `src/app/(dashboard)/settings/page.tsx` |

### Fase 4: UI — Cobrancas (3-4 dias)

| Step | Task | Arquivo |
|------|------|---------|
| 4.1 | Dialog "Enviar Cobranca" com selecao de metodo | `src/app/(dashboard)/financial/send-charge-dialog.tsx` |
| 4.2 | Componente QR Code PIX | `src/components/pix-qr-code.tsx` |
| 4.3 | Botao na receivables-tab | `src/app/(dashboard)/financial/receivables-tab.tsx` |
| 4.4 | Badge gateway nos pagamentos | `src/app/(dashboard)/financial/receivables-tab.tsx` |
| 4.5 | Notificacao de pagamento confirmado | `src/server/actions/notification.ts` |

### Fase 5: Polish (2 dias)

| Step | Task |
|------|------|
| 5.1 | Error handling e fallback (gateway offline → manual) |
| 5.2 | Audit logging para operacoes de gateway |
| 5.3 | Modo sandbox para testes |
| 5.4 | Documentacao para clinicas (como obter chave Asaas) |

**Esforco total: 11-15 dias**

---

## 10. Testing

### Sandbox
- Asaas sandbox: `https://sandbox.asaas.com` (gratuito, sem transacoes reais)
- Criar conta sandbox, gerar API key de teste
- PIX sandbox simula confirmacao instantanea

### Unit Tests
- Gateway client: mock HTTP, testar create/get/cancel
- Webhook handler: payloads validos/invalidos, signature validation
- Integracao Payment: confirmar que recordPayment logica funciona via webhook

### Manual QA
- Criar cobranca PIX → gerar QR → simular pagamento no sandbox → confirmar webhook
- Criar cobranca boleto → verificar URL do PDF
- Gateway desconfigurado → fallback para manual sem erros
- Webhook com signature invalida → rejeitar com 400
