import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .startsWith('postgresql://', 'DATABASE_URL must start with "postgresql://"'),
  DIRECT_URL: z
    .string()
    .startsWith('postgresql://', 'DIRECT_URL must start with "postgresql://"'),
  ANTHROPIC_API_KEY: z
    .string()
    .startsWith('sk-ant-', 'ANTHROPIC_API_KEY must start with "sk-ant-"'),
  OPENAI_API_KEY: z
    .string()
    .min(1, 'OPENAI_API_KEY must not be empty'),
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY must not be empty'),
  CLERK_WEBHOOK_SECRET: z
    .string()
    .optional()
    .default(''),
  RESEND_API_KEY: z
    .string()
    .optional()
    .default(''),
  CRON_SECRET: z
    .string()
    .optional()
    .default(''),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^([0-9a-f]{64})?$/, 'ENCRYPTION_KEY must be 64 hex chars (32 bytes) or empty')
    .optional()
    .default(''),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z
    .string()
    .optional()
    .default(''),
  SUPERADMIN_EMAILS: z
    .string()
    .optional()
    .default(''),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .optional()
    .default('https://app.voxclinic.com'),
  STRIPE_SECRET_KEY: z
    .string()
    .optional()
    .default(''),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .optional()
    .default(''),
  STRIPE_PRICE_PRO: z
    .string()
    .optional()
    .default(''),
  STRIPE_PRICE_ENTERPRISE: z
    .string()
    .optional()
    .default(''),
  DAILY_API_KEY: z
    .string()
    .optional()
    .default(''),
  DAILY_WEBHOOK_SECRET: z
    .string()
    .optional()
    .default(''),
  UPSTASH_REDIS_REST_URL: z
    .string()
    .optional()
    .default(''),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .optional()
    .default(''),
  INNGEST_EVENT_KEY: z
    .string()
    .optional()
    .default(''),
  INNGEST_SIGNING_KEY: z
    .string()
    .optional()
    .default(''),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new Error(
      `\n\nEnvironment variable validation failed:\n${errors}\n\n` +
        'Please check your .env file or environment configuration.\n' +
        'See .env.example for the required variables.\n'
    )
  }

  return result.data
}

export const env = validateEnv()
