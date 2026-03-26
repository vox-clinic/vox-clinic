// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// We need to test the rate limiter in isolation, so we import directly
// and also test the exported apiLimiter instance
describe("rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
  })

  it("should allow the first request", async () => {
    const { apiLimiter } = await import("@/lib/rate-limit")
    const result = apiLimiter.check(10, "user_1")
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(9)
  })

  it("should allow requests within the limit", async () => {
    const { apiLimiter } = await import("@/lib/rate-limit")
    const limit = 5
    const token = "user_within_limit"

    for (let i = 0; i < limit; i++) {
      const result = apiLimiter.check(limit, token)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(limit - i - 1)
    }
  })

  it("should block requests exceeding the limit", async () => {
    const { apiLimiter } = await import("@/lib/rate-limit")
    const limit = 3
    const token = "user_exceeded"

    // Use up all allowed requests
    for (let i = 0; i < limit; i++) {
      apiLimiter.check(limit, token)
    }

    // Next request should be blocked
    const result = apiLimiter.check(limit, token)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("should track different identifiers separately", async () => {
    const { apiLimiter } = await import("@/lib/rate-limit")
    const limit = 2

    // Exhaust limit for user_a
    apiLimiter.check(limit, "user_a")
    apiLimiter.check(limit, "user_a")
    const blockedA = apiLimiter.check(limit, "user_a")
    expect(blockedA.success).toBe(false)

    // user_b should still have quota
    const resultB = apiLimiter.check(limit, "user_b")
    expect(resultB.success).toBe(true)
    expect(resultB.remaining).toBe(1)
  })

  it("should reset after the interval window passes", async () => {
    const { apiLimiter } = await import("@/lib/rate-limit")
    const limit = 2
    const token = "user_reset"

    // Use up all requests
    apiLimiter.check(limit, token)
    apiLimiter.check(limit, token)
    expect(apiLimiter.check(limit, token).success).toBe(false)

    // Advance time past the 60s interval
    vi.advanceTimersByTime(61_000)

    // Should be allowed again (timestamps expired)
    const result = apiLimiter.check(limit, token)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(1)
  })

  it("should return remaining count correctly", async () => {
    const { apiLimiter } = await import("@/lib/rate-limit")
    const limit = 5
    const token = "user_remaining"

    expect(apiLimiter.check(limit, token).remaining).toBe(4)
    expect(apiLimiter.check(limit, token).remaining).toBe(3)
    expect(apiLimiter.check(limit, token).remaining).toBe(2)
    expect(apiLimiter.check(limit, token).remaining).toBe(1)
    expect(apiLimiter.check(limit, token).remaining).toBe(0)
    // Exceeded
    expect(apiLimiter.check(limit, token).remaining).toBe(0)
  })

  it("should handle sliding window - partial expiry", async () => {
    const { apiLimiter } = await import("@/lib/rate-limit")
    const limit = 3
    const token = "user_sliding"

    // t=0: first request
    apiLimiter.check(limit, token)

    // t=30s: second request
    vi.advanceTimersByTime(30_000)
    apiLimiter.check(limit, token)

    // t=40s: third request
    vi.advanceTimersByTime(10_000)
    apiLimiter.check(limit, token)

    // t=40s: should be blocked
    expect(apiLimiter.check(limit, token).success).toBe(false)

    // t=61s: first request expired (it was at t=0, window is 60s)
    vi.advanceTimersByTime(21_000)
    const result = apiLimiter.check(limit, token)
    expect(result.success).toBe(true)
  })
})
