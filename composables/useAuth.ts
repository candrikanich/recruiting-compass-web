import { ref, readonly, type Ref } from 'vue'
import { useSupabase } from '~/composables/useSupabase'
import { useUserStore } from '~/stores/user'

/**
 * Composable for authentication operations
 *
 * Provides login, logout, signup, and session management.
 * Does NOT auto-initialize—caller must invoke restoreSession() explicitly.
 * Use isInitialized guard to prevent redundant initialization.
 *
 * Supports both new API (login/logout/signup) and legacy API (signIn/signOut/signUp)
 * for backwards compatibility during refactoring.
 *
 * @example
 * const { restoreSession, login } = useAuth()
 * await restoreSession()  // Restore existing session
 * const result = await login('user@example.com', 'password')
 *
 * @returns Object with auth actions and readonly state
 */
interface AuthState {
  loading: Readonly<Ref<boolean>>
  error: Readonly<Ref<Error | null>>
  isInitialized: Readonly<Ref<boolean>>
  user: Readonly<Ref<any>>
  session: Readonly<Ref<any>>
}

interface AuthActions {
  restoreSession: () => Promise<any>
  login: (email: string, password: string) => Promise<{ data: any; error: any }>
  logout: () => Promise<void>
  signup: (email: string, password: string, fullName?: string, role?: string) => Promise<any>
  setupAuthListener: (callback: (user: any) => void) => () => void
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, fullName?: string, role?: string) => Promise<any>
}

export const useAuth = (): AuthState & AuthActions => {
  const supabase = useSupabase()
  const userStore = useUserStore()

  // State
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const isInitialized = ref(false) // Guard to prevent redundant initialization
  const user = ref<any>(null) // Legacy API support
  const session = ref<any>(null) // Legacy API support

  /**
   * Restores session from Supabase
   * Guards against redundant calls with isInitialized flag
   */
  const restoreSession = async () => {
    // Guard: prevent redundant calls
    if (isInitialized.value) {
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data: { session: sessionData }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      if (sessionData?.user) {
        await userStore.initializeUser()
        // Legacy API support
        user.value = sessionData.user
        session.value = sessionData
        isInitialized.value = true
        return sessionData
      }

      // Legacy API support
      user.value = null
      session.value = null
      isInitialized.value = true
      return null
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to restore session'
      error.value = err instanceof Error ? err : new Error(message)
      console.error(message)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string) => {
    loading.value = true
    error.value = null

    try {
      const trimmedEmail = email.trim()

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (signInError) {
        error.value = signInError
        return { data: null, error: signInError }
      }

      // Initialize user store after successful login
      if (data.session?.user) {
        await userStore.initializeUser()
        // Legacy API support
        user.value = data.session.user
        session.value = data.session
      }

      return { data, error: null }
    } catch (err: unknown) {
      const authError = err instanceof Error ? err : new Error('Login failed')
      error.value = authError
      throw authError
    } finally {
      loading.value = false
    }
  }

  // Legacy API alias
  const signIn = login

  /**
   * Logout current user
   */
  const logout = async () => {
    loading.value = true
    error.value = null

    try {
      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        throw signOutError
      }

      // Clear user store and legacy API support
      userStore.logout()
      user.value = null
      session.value = null
      isInitialized.value = false
    } catch (err: unknown) {
      const authError = err instanceof Error ? err : new Error('Logout failed')
      error.value = authError
      throw authError
    } finally {
      loading.value = false
    }
  }

  // Legacy API alias
  const signOut = logout

  /**
   * Sign up new user
   * Supports both new API (email, password) and legacy API (email, password, fullName, role)
   * Returns Supabase auth response for backwards compatibility
   */
  const signup = async (email: string, password: string, fullName?: string, role?: string) => {
    loading.value = true
    error.value = null

    try {
      const trimmedEmail = email.trim()

      const signUpParams: any = {
        email: trimmedEmail,
        password,
      }

      // Only add options if legacy params are provided
      if (fullName || role) {
        signUpParams.options = {
          data: {
            ...(fullName && { full_name: fullName }),
            ...(role && { role }),
          },
        }
      }

      const { data, error: signUpError } = await supabase.auth.signUp(signUpParams)

      if (signUpError) {
        error.value = signUpError
        // Return error response for backwards compatibility
        return { data: null, error: signUpError }
      }

      // Initialize user store after successful signup
      if (data.user) {
        await userStore.initializeUser()
        // Legacy API support
        user.value = data.user
      }

      // Return auth response (contains user, session, etc.)
      return data
    } catch (err: unknown) {
      const authError = err instanceof Error ? err : new Error('Signup failed')
      error.value = authError
      throw authError
    } finally {
      loading.value = false
    }
  }

  // Legacy API alias
  const signUp = signup

  /**
   * Set up auth state change listener
   * Returns unsubscribe function
   */
  const setupAuthListener = (callback: (user: any) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: any) => {
        callback(session?.user || null)
      }
    )

    // Return unsubscribe function
    return () => {
      subscription?.unsubscribe()
    }
  }

  return {
    // Readonly state
    loading: readonly(loading),
    error: readonly(error),
    isInitialized: readonly(isInitialized),

    // Legacy API refs
    user: readonly(user),
    session: readonly(session),

    // New API actions
    restoreSession,
    login,
    logout,
    signup,
    setupAuthListener,

    // Legacy API aliases
    signIn,
    signOut,
    signUp,
  }
}
