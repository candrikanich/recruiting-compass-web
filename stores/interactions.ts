import { defineStore } from 'pinia'
import type { Interaction } from '~/types/models'
import { useUserStore } from './user'

export interface InteractionFilters {
  schoolId?: string
  coachId?: string
  type?: string
  direction?: string
  sentiment?: string
  startDate?: string
  endDate?: string
}

export interface InteractionState {
  interactions: Interaction[]
  loading: boolean
  error: string | null
  isFetched: boolean
  filters: InteractionFilters
  pagination: {
    page: number
    limit: number
    total: number
  }
}

/**
 * Interactions store - Manages all interaction (communication) data
 *
 * Provides centralized state management for:
 * - Interaction CRUD operations
 * - Filtering by school, coach, type, direction, sentiment
 * - Date range filtering
 * - CSV export functionality
 * - Attachment management
 *
 * @example
 * const interactionStore = useInteractionStore()
 * await interactionStore.fetchInteractions({ schoolId })
 * const csv = interactionStore.exportToCSV()
 */
export const useInteractionStore = defineStore('interactions', {
  state: (): InteractionState => ({
    interactions: [],
    loading: false,
    error: null,
    isFetched: false,
    filters: {
      schoolId: undefined,
      coachId: undefined,
      type: undefined,
      direction: undefined,
      sentiment: undefined,
      startDate: undefined,
      endDate: undefined,
    },
    pagination: {
      page: 1,
      limit: 50,
      total: 0,
    },
  }),

  getters: {
    /**
     * Get interactions for a specific school
     */
    interactionsBySchool: (state) => (schoolId: string) =>
      state.interactions.filter(i => i.school_id === schoolId),

    /**
     * Get interactions for a specific coach
     */
    interactionsByCoach: (state) => (coachId: string) =>
      state.interactions.filter(i => i.coach_id === coachId),

    /**
     * Get interactions filtered by current filter state
     */
    filteredInteractions: (state) =>
      state.interactions.filter(i => {
        if (state.filters.schoolId && i.school_id !== state.filters.schoolId) return false
        if (state.filters.coachId && i.coach_id !== state.filters.coachId) return false
        if (state.filters.type && i.type !== state.filters.type) return false
        if (state.filters.direction && i.direction !== state.filters.direction) return false
        if (state.filters.sentiment && i.sentiment !== state.filters.sentiment) return false
        if (state.filters.startDate && i.occurred_at) {
          const interactionDate = new Date(i.occurred_at)
          const filterDate = new Date(state.filters.startDate)
          if (interactionDate < filterDate) return false
        }
        if (state.filters.endDate && i.occurred_at) {
          const interactionDate = new Date(i.occurred_at)
          const filterDate = new Date(state.filters.endDate)
          if (interactionDate > filterDate) return false
        }
        return true
      }),

    /**
     * Get interactions by type
     */
    interactionsByType: (state) => (type: Interaction['type']) =>
      state.interactions.filter(i => i.type === type),

    /**
     * Get inbound interactions only
     */
    inboundInteractions: (state) =>
      state.interactions.filter(i => i.direction === 'inbound'),

    /**
     * Get outbound interactions only
     */
    outboundInteractions: (state) =>
      state.interactions.filter(i => i.direction === 'outbound'),

    /**
     * Get interactions by sentiment
     */
    interactionsBySentiment: (state) => (sentiment: Interaction['sentiment']) =>
      state.interactions.filter(i => i.sentiment === sentiment),

    /**
     * Get recent interactions (last N)
     */
    recentInteractions: (state) => (limit: number = 10) =>
      [...state.interactions]
        .sort((a, b) => {
          if (!a.occurred_at || !b.occurred_at) return 0
          return new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
        })
        .slice(0, limit),
  },

  actions: {
    /**
     * Fetch interactions with optional filters
     */
    async fetchInteractions(filters?: InteractionFilters) {
      // Guard: don't refetch if already loaded
      if (this.isFetched && this.interactions.length > 0 && !filters) return

      this.loading = true
      this.error = null

      try {
        const { useSupabase } = await import('~/composables/useSupabase')
        const supabase = useSupabase()

        let query = supabase
          .from('interactions')
          .select('*')
          .order('occurred_at', { ascending: false })

        if (filters?.schoolId) {
          query = query.eq('school_id', filters.schoolId)
        }

        if (filters?.coachId) {
          query = query.eq('coach_id', filters.coachId)
        }

        if (filters?.type) {
          query = query.eq('type', filters.type)
        }

        if (filters?.direction) {
          query = query.eq('direction', filters.direction)
        }

        if (filters?.sentiment) {
          query = query.eq('sentiment', filters.sentiment)
        }

        // Move date filtering to SQL (more efficient)
        if (filters?.startDate) {
          query = query.gte('occurred_at', new Date(filters.startDate).toISOString())
        }

        if (filters?.endDate) {
          query = query.lte('occurred_at', new Date(filters.endDate).toISOString())
        }

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError

        this.interactions = data || []
        this.isFetched = true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch interactions'
        this.error = message
        console.error(message)
      } finally {
        this.loading = false
      }
    },

    /**
     * Get a single interaction by ID
     */
    async getInteraction(id: string): Promise<Interaction | null> {
      const { useSupabase } = await import('~/composables/useSupabase')
      const supabase = useSupabase()

      this.loading = true
      this.error = null

      try {
        const { data, error: fetchError } = await supabase
          .from('interactions')
          .select('*')
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError
        return data
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch interaction'
        this.error = message
        return null
      } finally {
        this.loading = false
      }
    },

    /**
     * Create a new interaction with optional file attachments
     */
    async createInteraction(interactionData: Omit<Interaction, 'id' | 'created_at'>, files?: File[]) {
      const { useSupabase } = await import('~/composables/useSupabase')
      const { sanitizeHtml } = await import('~/utils/validation/sanitize')
      const userStore = useUserStore()
      const supabase = useSupabase()

      this.loading = true
      this.error = null

      try {
        if (!userStore.user) {
          throw new Error('User not authenticated')
        }

        // Sanitize content fields
        const sanitized = { ...interactionData }
        if (sanitized.subject) {
          sanitized.subject = sanitizeHtml(sanitized.subject)
        }
        if (sanitized.content) {
          sanitized.content = sanitizeHtml(sanitized.content)
        }

        const { data, error: insertError } = await supabase
          .from('interactions')
          .insert([
            {
              ...sanitized,
              logged_by: userStore.user.id,
            },
          ])
          .select()
          .single()

        if (insertError) throw insertError

        // Upload attachments if provided
        if (files && files.length > 0) {
          const uploadedPaths = await this.uploadAttachments(files, data.id)
          if (uploadedPaths.length > 0) {
            const { error: updateError } = await supabase
              .from('interactions')
              .update({ attachments: uploadedPaths })
              .eq('id', data.id)
            if (updateError) console.error('Failed to update attachment paths:', updateError)
          }
        }

        // Create inbound interaction alert if enabled
        if (data.direction === 'inbound' && userStore.user) {
          try {
            const { data: prefs } = await supabase
              .from('user_preferences')
              .select('notification_settings')
              .eq('user_id', userStore.user.id)
              .single()

            if (prefs?.notification_settings?.enableInboundInteractionAlerts) {
              let coachName = 'A coach'
              if (data.coach_id) {
                const { data: coach } = await supabase
                  .from('coaches')
                  .select('first_name, last_name')
                  .eq('id', data.coach_id)
                  .single()

                if (coach) {
                  coachName = `${coach.first_name} ${coach.last_name}`.trim()
                }
              }

              await supabase.from('notifications').insert([
                {
                  user_id: userStore.user.id,
                  type: 'inbound_interaction',
                  priority: 'high',
                  title: `New Contact from ${coachName}`,
                  message: `${coachName} reached out via ${data.type}. View the interaction to see details.`,
                  related_entity_type: 'interaction',
                  related_entity_id: data.id,
                  scheduled_for: new Date().toISOString(),
                },
              ])
            }
          } catch (err) {
            console.error('Failed to create inbound interaction alert:', err)
          }
        }

        this.interactions.unshift(data)
        return data
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create interaction'
        this.error = message
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Update an existing interaction
     */
    async updateInteraction(id: string, updates: Partial<Interaction>) {
      const { useSupabase } = await import('~/composables/useSupabase')
      const { sanitizeHtml } = await import('~/utils/validation/sanitize')
      const userStore = useUserStore()
      const supabase = useSupabase()

      this.loading = true
      this.error = null

      try {
        if (!userStore.user) {
          throw new Error('User not authenticated')
        }

        // Sanitize content fields
        const sanitized = { ...updates }
        if (sanitized.subject) {
          sanitized.subject = sanitizeHtml(sanitized.subject)
        }
        if (sanitized.content) {
          sanitized.content = sanitizeHtml(sanitized.content)
        }

        const { data, error: updateError } = await supabase
          .from('interactions')
          .update(sanitized)
          .eq('id', id)
          .eq('logged_by', userStore.user.id)
          .select()
          .single()

        if (updateError) throw updateError

        // Update local state
        const index = this.interactions.findIndex(i => i.id === id)
        if (index !== -1) {
          this.interactions[index] = data
        }

        return data
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update interaction'
        this.error = message
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Delete an interaction
     */
    async deleteInteraction(id: string) {
      const { useSupabase } = await import('~/composables/useSupabase')
      const userStore = useUserStore()
      const supabase = useSupabase()

      this.loading = true
      this.error = null

      try {
        if (!userStore.user) {
          throw new Error('User not authenticated')
        }

        const { error: deleteError } = await supabase
          .from('interactions')
          .delete()
          .eq('id', id)
          .eq('logged_by', userStore.user.id)

        if (deleteError) throw deleteError

        // Update local state
        this.interactions = this.interactions.filter(i => i.id !== id)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete interaction'
        this.error = message
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Upload file attachments for an interaction
     */
    async uploadAttachments(files: File[], interactionId: string): Promise<string[]> {
      const { useSupabase } = await import('~/composables/useSupabase')
      const supabase = useSupabase()

      const ALLOWED_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
      ]
      const MAX_SIZE = 10 * 1024 * 1024 // 10MB

      const uploadedPaths: string[] = []

      for (const file of files) {
        try {
          if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error(`File type ${file.type} not allowed`)
          }

          if (file.size > MAX_SIZE) {
            throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 10MB`)
          }

          const timestamp = Date.now()
          const filename = `${timestamp}-${file.name}`
          const filepath = `interactions/${interactionId}/${filename}`

          const { data, error: uploadError } = await supabase.storage
            .from('interaction-attachments')
            .upload(filepath, file)

          if (uploadError) throw uploadError
          if (data) {
            uploadedPaths.push(data.path)
          }
        } catch (err) {
          console.error(`Failed to upload file ${file.name}:`, err)
        }
      }

      return uploadedPaths
    },

    /**
     * Export interactions to CSV format
     */
    exportToCSV(): string {
      if (this.interactions.length === 0) return ''

      const headers = ['Date', 'Type', 'Direction', 'School', 'Coach', 'Subject', 'Content', 'Sentiment']
      const rows = this.interactions.map((i) => [
        i.occurred_at ? new Date(i.occurred_at).toLocaleDateString() : '',
        i.type,
        i.direction,
        i.school_id || '',
        i.coach_id || '',
        i.subject || '',
        (i.content || '').replace(/"/g, '""'),
        i.sentiment || '',
      ])

      const csvContent = [
        headers.map((h) => `"${h}"`).join(','),
        ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
      ].join('\n')

      return csvContent
    },

    /**
     * Download interactions as CSV file
     */
    downloadCSV() {
      const csv = this.exportToCSV()
      if (!csv) return

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `interactions-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },

    /**
     * Set filter state
     */
    setFilters(newFilters: Partial<InteractionFilters>) {
      this.filters = { ...this.filters, ...newFilters }
    },

    /**
     * Reset all filters
     */
    resetFilters() {
      this.filters = {
        schoolId: undefined,
        coachId: undefined,
        type: undefined,
        direction: undefined,
        sentiment: undefined,
        startDate: undefined,
        endDate: undefined,
      }
    },

    /**
     * Clear error state
     */
    clearError() {
      this.error = null
    },
  },
})
