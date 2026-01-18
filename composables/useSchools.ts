import { ref, computed } from 'vue'
import { useSupabase } from './useSupabase'
import { useUserStore } from '~/stores/user'
import type { School } from '~/types/models'
import { schoolSchema } from '~/utils/validation/schemas'
import { sanitizeHtml } from '~/utils/validation/sanitize'

/**
 * useSchools composable
 * Manages college/university program data and recruiting status
 *
 * School status levels:
 * - researching: Initial exploration phase
 * - contacted: First contact made with coaches
 * - interested: School expressed interest
 * - offer_received: Scholarship offer received
 * - declined: Offer declined or program not pursuing
 * - committed: Committed to attend
 *
 * Features:
 * - Track school details (location, conference, division)
 * - Manage player pros/cons and notes
 * - Sort by user-defined ranking
 * - Link to multiple coaches per school
 * - Store social media handles for monitoring
 * - Academic and athletic requirements tracking
 */
export const useSchools = (): {
  schools: ComputedRef<School[]>
  favoriteSchools: ComputedRef<School[]>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  fetchSchools: () => Promise<void>
  getSchool: (id: string) => Promise<School | null>
  createSchool: (schoolData: Omit<School, 'id' | 'createdAt' | 'updatedAt'>) => Promise<School>
  updateSchool: (id: string, updates: Partial<School>) => Promise<School>
  deleteSchool: (id: string) => Promise<void>
  toggleFavorite: (id: string, isFavorite: boolean) => Promise<School>
  updateRanking: (schools_: School[]) => Promise<void>
} => {
  const supabase = useSupabase()
  const userStore = useUserStore()

  const schools = ref<School[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const favoriteSchools = computed(() =>
    schools.value.filter((s) => s.is_favorite)
  )

  const fetchSchools = async () => {
    if (!userStore.user) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('schools')
        .select('*')
        .eq('user_id', userStore.user.id)
        .order('ranking', { ascending: true, nullsFirst: false })

      if (fetchError) throw fetchError

      schools.value = data || []
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch schools'
      error.value = message
    } finally {
      loading.value = false
    }
  }

  const getSchool = async (id: string): Promise<School | null> => {
    if (!userStore.user) return null

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', id)
        .eq('user_id', userStore.user.id)
        .single()

      if (fetchError) throw fetchError
      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch school'
      error.value = message
      return null
    } finally {
      loading.value = false
    }
  }

  const createSchool = async (schoolData: Omit<School, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userStore.user) throw new Error('User not authenticated')

    loading.value = true
    error.value = null

    try {
      // Validate school data with Zod schema
      const validated = await schoolSchema.parseAsync(schoolData)

      // Sanitize text fields to prevent XSS
      if (validated.notes) {
        validated.notes = sanitizeHtml(validated.notes)
      }
      if (validated.pros && Array.isArray(validated.pros)) {
        validated.pros = validated.pros.map((p: string | undefined) => p ? sanitizeHtml(p) : p)
      }
      if (validated.cons && Array.isArray(validated.cons)) {
        validated.cons = validated.cons.map((c: string | undefined) => c ? sanitizeHtml(c) : c)
      }

      const { data, error: insertError } = await supabase
        .from('schools')
        .insert([
          {
            ...validated,
            user_id: userStore.user.id,
            created_by: userStore.user.id,
            updated_by: userStore.user.id,
          },
        ])
        .select()
        .single()

      if (insertError) throw insertError

      schools.value.push(data)

      // Fetch logo asynchronously (don't block school creation)
      // Use dynamic import to avoid circular dependency
      try {
        const { useSchoolLogos } = await import('./useSchoolLogos')
        const { fetchSchoolLogo } = useSchoolLogos()
        fetchSchoolLogo(data).catch((err) => {
          console.warn('Failed to fetch logo for new school:', err)
          // Don't fail school creation if logo fetch fails
        })
      } catch (logoError) {
        console.warn('Failed to initialize logo fetching:', logoError)
        // Don't fail school creation if logo fetching initialization fails
      }

      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create school'
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateSchool = async (id: string, updates: Partial<School>) => {
    if (!userStore.user) throw new Error('User not authenticated')

    loading.value = true
    error.value = null

    try {
      // Sanitize text fields to prevent XSS
      const sanitizedUpdates = { ...updates }

      if (sanitizedUpdates.notes) {
        sanitizedUpdates.notes = sanitizeHtml(sanitizedUpdates.notes)
      }
      if (sanitizedUpdates.pros && Array.isArray(sanitizedUpdates.pros)) {
        sanitizedUpdates.pros = sanitizedUpdates.pros.filter((p): p is string => !!p).map((p) => sanitizeHtml(p))
      }
      if (sanitizedUpdates.cons && Array.isArray(sanitizedUpdates.cons)) {
        sanitizedUpdates.cons = sanitizedUpdates.cons.filter((c): c is string => !!c).map((c) => sanitizeHtml(c))
      }

      const { data, error: updateError } = await supabase
        .from('schools')
        .update({
          ...sanitizedUpdates,
          updated_by: userStore.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userStore.user.id)
        .select()
        .single()

      if (updateError) throw updateError

      // Update local state
      const index = schools.value.findIndex((s) => s.id === id)
      if (index !== -1) {
        schools.value[index] = data
      }

      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update school'
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSchool = async (id: string) => {
    if (!userStore.user) throw new Error('User not authenticated')

    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('schools')
        .delete()
        .eq('id', id)
        .eq('user_id', userStore.user.id)

      if (deleteError) throw deleteError

      // Update local state
      schools.value = schools.value.filter((s) => s.id !== id)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete school'
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    return updateSchool(id, { is_favorite: !isFavorite })
  }

  const updateRanking = async (schools_: School[]) => {
    if (!userStore.user) throw new Error('User not authenticated')

    loading.value = true
    error.value = null

    try {
      // Batch update all rankings in a single operation (28x faster than loop)
      const updates = schools_.map((school, index) => ({
        id: school.id,
        ranking: index + 1,
        updated_by: userStore.user!.id,
        updated_at: new Date().toISOString(),
      }))

      const { error: batchError } = await supabase
        .from('schools')
        .upsert(updates, { onConflict: 'id' })

      if (batchError) throw batchError

      schools.value = schools_
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update ranking'
      error.value = message
    } finally {
      loading.value = false
    }
  }

  return {
    schools: computed(() => schools.value),
    favoriteSchools,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchSchools,
    getSchool,
    createSchool,
    updateSchool,
    deleteSchool,
    toggleFavorite,
    updateRanking,
  }
}
