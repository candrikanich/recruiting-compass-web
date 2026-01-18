import { useUserStore } from '~/stores/user'

export default defineNuxtPlugin(async (nuxtApp) => {
  try {
    const userStore = useUserStore()

    // Initialize user session on app load
    try {
      await userStore.initializeUser()
    } catch (error) {
      console.error('Failed to initialize user:', error)
    }

    // Register route guards after app hydration
    nuxtApp.hook('app:mounted', () => {
      const router = useRouter()
      const publicRoutes = ['/login', '/signup', '/']

      router.beforeEach((to, from, next) => {
        const isPublic = publicRoutes.includes(to.path)

        // Allow public routes
        if (isPublic) {
          return next()
        }

        // Check if user is logged in
        if (!userStore.isLoggedIn) {
          return next('/login')
        }

        return next()
      })
    })
  } catch (error) {
    console.error('Auth plugin initialization failed:', error)
  }
})
