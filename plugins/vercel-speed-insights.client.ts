import { injectSpeedInsights } from "@vercel/speed-insights";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  if (!config.public.isVercel) return;
  injectSpeedInsights();
});
