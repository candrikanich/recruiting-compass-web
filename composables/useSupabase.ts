import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useAppConfig } from '#app'
// Temporarily disable database types to fix build
// import type { Database } from '~/types/database'

let supabaseClient: SupabaseClient<any> | null = null

export const useSupabase = (): SupabaseClient<any> => {
  const appConfig = useAppConfig()

  if (!supabaseClient) {
    const supabaseUrl = appConfig.supabase.url
    const supabaseAnonKey = appConfig.supabase.anonKey

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase configuration is missing. Check NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY')
      throw new Error('Supabase configuration is missing')
    }

    supabaseClient = createClient<any>(supabaseUrl, supabaseAnonKey)
  }

  return supabaseClient
}
