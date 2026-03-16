import posthog from "posthog-js"
import { defineNuxtPlugin, useRuntimeConfig, useRouter } from "#app"

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  if (!config.public.posthogPublicKey) return

  posthog.init(config.public.posthogPublicKey as string, {
    api_host: config.public.posthogHost as string,
    autocapture: false,
    disable_session_recording: true,
    capture_pageview: false,
  })

  const router = useRouter()
  router.afterEach((to) => {
    if (to.name) {
      posthog.capture("page_view", { route_name: to.name })
    }
  })

  return {
    provide: { posthog },
  }
})
