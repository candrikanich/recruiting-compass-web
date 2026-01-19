export default defineAppConfig({
  supabase: {
    url: import.meta.env.NUXT_PUBLIC_SUPABASE_URL || '',
    anonKey: import.meta.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
})
