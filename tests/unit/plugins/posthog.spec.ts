import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock posthog-js before any imports
const mockCapture = vi.fn()
const mockInit = vi.fn().mockReturnValue({ capture: mockCapture })

vi.mock("posthog-js", () => ({
  default: {
    init: mockInit,
    capture: mockCapture,
  },
}))

// Mock Nuxt composables
const mockAfterEach = vi.fn()
vi.mock("#app", () => ({
  defineNuxtPlugin: (fn: (ctx: unknown) => unknown) => fn,
  useRuntimeConfig: vi.fn(),
  useRouter: vi.fn(),
}))

import { useRuntimeConfig, useRouter } from "#app"

describe("posthog plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not initialize when posthogKey is empty", async () => {
    vi.mocked(useRuntimeConfig).mockReturnValue({
      public: { posthogKey: "", posthogHost: "https://us.i.posthog.com" },
    } as ReturnType<typeof useRuntimeConfig>)
    vi.mocked(useRouter).mockReturnValue({ afterEach: mockAfterEach } as ReturnType<typeof useRouter>)

    const { default: plugin } = await import("~/plugins/posthog.client")
    plugin({ provide: vi.fn() } as never)

    expect(mockInit).not.toHaveBeenCalled()
  })

  it("initializes posthog with correct privacy settings when key is set", async () => {
    vi.mocked(useRuntimeConfig).mockReturnValue({
      public: { posthogKey: "phc_test123", posthogHost: "https://us.i.posthog.com" },
    } as ReturnType<typeof useRuntimeConfig>)
    vi.mocked(useRouter).mockReturnValue({ afterEach: mockAfterEach } as ReturnType<typeof useRouter>)

    const { default: plugin } = await import("~/plugins/posthog.client")
    plugin({ provide: vi.fn() } as never)

    expect(mockInit).toHaveBeenCalledWith(
      "phc_test123",
      expect.objectContaining({
        api_host: "https://us.i.posthog.com",
        autocapture: false,
        disable_session_recording: true,
        capture_pageview: false,
      }),
    )
  })

  it("registers router afterEach hook for page tracking", async () => {
    vi.mocked(useRuntimeConfig).mockReturnValue({
      public: { posthogKey: "phc_test123", posthogHost: "https://us.i.posthog.com" },
    } as ReturnType<typeof useRuntimeConfig>)
    vi.mocked(useRouter).mockReturnValue({ afterEach: mockAfterEach } as ReturnType<typeof useRouter>)

    const { default: plugin } = await import("~/plugins/posthog.client")
    plugin({ provide: vi.fn() } as never)

    expect(mockAfterEach).toHaveBeenCalledOnce()
    // Simulate a route change
    const hook = mockAfterEach.mock.calls[0][0]
    hook({ name: "dashboard" })
    expect(mockCapture).toHaveBeenCalledWith("page_view", { route_name: "dashboard" })
  })

  it("does not capture page_view when route name is null", async () => {
    vi.mocked(useRuntimeConfig).mockReturnValue({
      public: { posthogKey: "phc_test123", posthogHost: "https://us.i.posthog.com" },
    } as ReturnType<typeof useRuntimeConfig>)
    vi.mocked(useRouter).mockReturnValue({ afterEach: mockAfterEach } as ReturnType<typeof useRouter>)

    const { default: plugin } = await import("~/plugins/posthog.client")
    plugin({ provide: vi.fn() } as never)

    const hook = mockAfterEach.mock.calls[0][0]
    hook({ name: null })
    expect(mockCapture).not.toHaveBeenCalled()
  })
})
