import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
// Temporarily disable database types to fix build
// import type { Database } from '~/types/database'

let supabaseClient: SupabaseClient<any> | null = null

export const useSupabase = (): SupabaseClient<any> => {
  if (!supabaseClient) {
    // Read config from window.__NUXT_CONFIG__ injected by create-index.js
    const config = (typeof window !== 'undefined' && (window as any).__NUXT_CONFIG__) || {}
    const supabaseUrl = config.supabase?.url || ''
    const supabaseAnonKey = config.supabase?.anonKey || ''

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase configuration is missing. Check NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY')
      throw new Error('Supabase configuration is missing')
    }

    supabaseClient = createClient<any>(supabaseUrl, supabaseAnonKey)
  }

  return supabaseClient
}
