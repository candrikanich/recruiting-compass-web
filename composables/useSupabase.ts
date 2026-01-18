import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useRuntimeConfig } from '#app'
// Temporarily disable database types to fix build
// import type { Database } from '~/types/database'

let supabaseClient: SupabaseClient<any> | null = null

export const useSupabase = (): SupabaseClient<any> => {
  const config = useRuntimeConfig()

  if (!supabaseClient) {
    const supabaseUrl = config.public.supabaseUrl
    const supabaseAnonKey = config.public.supabaseAnonKey

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration is missing')
    }

    supabaseClient = createClient<any>(supabaseUrl, supabaseAnonKey)
  }

  return supabaseClient
}
