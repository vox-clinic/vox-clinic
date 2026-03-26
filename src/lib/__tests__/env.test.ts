// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

describe("env validation", () => {
  const VALID_ENV = {
    DATABASE_URL: "postgresql://user:pass@host:6543/db",
    DIRECT_URL: "postgresql://user:pass@host:5432/db",
    ANTHROPIC_API_KEY: "sk-ant-test-key-123",
    OPENAI_API_KEY: "sk-test-openai-key",
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9",
  }

  beforeEach(() => {
    vi.resetModules()
  })

  it("should pass with all required env vars", async () => {
    vi.stubEnv("DATABASE_URL", VALID_ENV.DATABASE_URL)
    vi.stubEnv("DIRECT_URL", VALID_ENV.DIRECT_URL)
    vi.stubEnv("ANTHROPIC_API_KEY", VALID_ENV.ANTHROPIC_API_KEY)
    vi.stubEnv("OPENAI_API_KEY", VALID_ENV.OPENAI_API_KEY)
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", VALID_ENV.NEXT_PUBLIC_SUPABASE_URL)
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", VALID_ENV.SUPABASE_SERVICE_ROLE_KEY)

    const { env } = await import("@/lib/env")
    expect(env.DATABASE_URL).toBe(VALID_ENV.DATABASE_URL)
    expect(env.ANTHROPIC_API_KEY).toBe(VALID_ENV.ANTHROPIC_API_KEY)
  })

  it("should throw when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "")
    vi.stubEnv("DIRECT_URL", VALID_ENV.DIRECT_URL)
    vi.stubEnv("ANTHROPIC_API_KEY", VALID_ENV.ANTHROPIC_API_KEY)
    vi.stubEnv("OPENAI_API_KEY", VALID_ENV.OPENAI_API_KEY)
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", VALID_ENV.NEXT_PUBLIC_SUPABASE_URL)
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", VALID_ENV.SUPABASE_SERVICE_ROLE_KEY)

    await expect(import("@/lib/env")).rejects.toThrow("Environment variable validation failed")
  })

  it("should throw when DATABASE_URL has wrong prefix", async () => {
    vi.stubEnv("DATABASE_URL", "mysql://user:pass@host:3306/db")
    vi.stubEnv("DIRECT_URL", VALID_ENV.DIRECT_URL)
    vi.stubEnv("ANTHROPIC_API_KEY", VALID_ENV.ANTHROPIC_API_KEY)
    vi.stubEnv("OPENAI_API_KEY", VALID_ENV.OPENAI_API_KEY)
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", VALID_ENV.NEXT_PUBLIC_SUPABASE_URL)
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", VALID_ENV.SUPABASE_SERVICE_ROLE_KEY)

    await expect(import("@/lib/env")).rejects.toThrow('must start with "postgresql://"')
  })

  it("should throw when ANTHROPIC_API_KEY has wrong prefix", async () => {
    vi.stubEnv("DATABASE_URL", VALID_ENV.DATABASE_URL)
    vi.stubEnv("DIRECT_URL", VALID_ENV.DIRECT_URL)
    vi.stubEnv("ANTHROPIC_API_KEY", "wrong-prefix-key")
    vi.stubEnv("OPENAI_API_KEY", VALID_ENV.OPENAI_API_KEY)
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", VALID_ENV.NEXT_PUBLIC_SUPABASE_URL)
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", VALID_ENV.SUPABASE_SERVICE_ROLE_KEY)

    await expect(import("@/lib/env")).rejects.toThrow('must start with "sk-ant-"')
  })

  it("should throw when NEXT_PUBLIC_SUPABASE_URL is not a valid URL", async () => {
    vi.stubEnv("DATABASE_URL", VALID_ENV.DATABASE_URL)
    vi.stubEnv("DIRECT_URL", VALID_ENV.DIRECT_URL)
    vi.stubEnv("ANTHROPIC_API_KEY", VALID_ENV.ANTHROPIC_API_KEY)
    vi.stubEnv("OPENAI_API_KEY", VALID_ENV.OPENAI_API_KEY)
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-url")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", VALID_ENV.SUPABASE_SERVICE_ROLE_KEY)

    await expect(import("@/lib/env")).rejects.toThrow("must be a valid URL")
  })

  it("should throw when OPENAI_API_KEY is empty", async () => {
    vi.stubEnv("DATABASE_URL", VALID_ENV.DATABASE_URL)
    vi.stubEnv("DIRECT_URL", VALID_ENV.DIRECT_URL)
    vi.stubEnv("ANTHROPIC_API_KEY", VALID_ENV.ANTHROPIC_API_KEY)
    vi.stubEnv("OPENAI_API_KEY", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", VALID_ENV.NEXT_PUBLIC_SUPABASE_URL)
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", VALID_ENV.SUPABASE_SERVICE_ROLE_KEY)

    await expect(import("@/lib/env")).rejects.toThrow("Environment variable validation failed")
  })

  it("should default optional vars to empty string", async () => {
    vi.stubEnv("DATABASE_URL", VALID_ENV.DATABASE_URL)
    vi.stubEnv("DIRECT_URL", VALID_ENV.DIRECT_URL)
    vi.stubEnv("ANTHROPIC_API_KEY", VALID_ENV.ANTHROPIC_API_KEY)
    vi.stubEnv("OPENAI_API_KEY", VALID_ENV.OPENAI_API_KEY)
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", VALID_ENV.NEXT_PUBLIC_SUPABASE_URL)
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", VALID_ENV.SUPABASE_SERVICE_ROLE_KEY)
    // Do not set optional vars
    delete process.env.CLERK_WEBHOOK_SECRET
    delete process.env.RESEND_API_KEY
    delete process.env.CRON_SECRET

    const { env } = await import("@/lib/env")
    expect(env.CLERK_WEBHOOK_SECRET).toBe("")
    expect(env.RESEND_API_KEY).toBe("")
    expect(env.CRON_SECRET).toBe("")
  })

  it("should pass when optional vars are provided", async () => {
    vi.stubEnv("DATABASE_URL", VALID_ENV.DATABASE_URL)
    vi.stubEnv("DIRECT_URL", VALID_ENV.DIRECT_URL)
    vi.stubEnv("ANTHROPIC_API_KEY", VALID_ENV.ANTHROPIC_API_KEY)
    vi.stubEnv("OPENAI_API_KEY", VALID_ENV.OPENAI_API_KEY)
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", VALID_ENV.NEXT_PUBLIC_SUPABASE_URL)
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", VALID_ENV.SUPABASE_SERVICE_ROLE_KEY)
    vi.stubEnv("CLERK_WEBHOOK_SECRET", "whsec_test")
    vi.stubEnv("RESEND_API_KEY", "re_test")
    vi.stubEnv("CRON_SECRET", "cron_test")

    const { env } = await import("@/lib/env")
    expect(env.CLERK_WEBHOOK_SECRET).toBe("whsec_test")
    expect(env.RESEND_API_KEY).toBe("re_test")
    expect(env.CRON_SECRET).toBe("cron_test")
  })
})
