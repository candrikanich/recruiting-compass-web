// Mock Nuxt #app module for vitest
export const useRuntimeConfig = () => ({
  public: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-anon-key-12345',
  },
})

export const useState = () => null
export const useFetch = () => null
export const useAsyncData = () => null
export const useRouter = () => ({
  push: () => {},
  replace: () => {},
})
export const useRoute = () => ({
  params: {},
  query: {},
})
