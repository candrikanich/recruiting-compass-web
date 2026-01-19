import { createClient } from '@supabase/supabase-js'

let supabaseClient: ReturnType<typeof createClient> | null = null

export const useSupabase = () => {
  if (!supabaseClient) {
    // Read config from window.__NUXT_CONFIG__ injected by create-index.js
    const config = (typeof window !== 'undefined' && (window as any).__NUXT_CONFIG__) || {}
    const supabaseUrl = config.supabase?.url || ''
    const supabaseAnonKey = config.supabase?.anonKey || ''

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase config:', config)
      throw new Error('Supabase configuration is missing')
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }

  return supabaseClient as any
}
