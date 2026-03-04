import posthog from "posthog-js"
import { defineNuxtPlugin, useRuntimeConfig, useRouter } from "#app"

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  if (!config.public.posthogKey) return

  posthog.init(config.public.posthogKey, {
    api_host: config.public.posthogHost,
    autocapture: false,
    disable_session_recording: true,
    capture_pageview: false,
  })

  const router = useRouter()
  router.afterEach((to) => {
    posthog.capture("page_view", { route_name: to.name })
  })

  return {
    provide: { posthog },
  }
})
