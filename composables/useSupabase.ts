import { createClient } from '@supabase/supabase-js'
import { useRuntimeConfig } from '#app'

let supabaseClient: ReturnType<typeof createClient> | null = null

export const useSupabase = () => {
  const config = useRuntimeConfig()

  if (!supabaseClient) {
    const supabaseUrl = config.public.supabaseUrl
    const supabaseAnonKey = config.public.supabaseAnonKey

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration is missing')
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }

  return supabaseClient as any
}
