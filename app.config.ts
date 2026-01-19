export default defineAppConfig({
  supabase: {
    url: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
})
