import { inject } from "@vercel/analytics";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  if (!config.public.isVercel) return;
  inject();
});
