import { ref } from 'vue'
import { useInteractions } from '~/composables/useInteractions'
import { useCoaches } from '~/composables/useCoaches'
import { useUserStore } from '~/stores/user'
import type { Coach, School } from '~/types/models'

/**
 * Composable for managing communication panel state and interaction logging
 * Provides a centralized, reusable pattern for email/text/twitter communication
 */
export const useCommunication = () => {
  const { createInteraction } = useInteractions()
  const { updateCoach } = useCoaches()
  const userStore = useUserStore()

  // State
  const showPanel = ref(false)
  const selectedCoach = ref<Coach | null>(null)
  const communicationType = ref<'email' | 'text' | 'twitter'>('email')

  /**
   * Open communication panel for a specific coach and communication type
   */
  const openCommunication = (coach: Coach, type: 'email' | 'text' | 'twitter') => {
    selectedCoach.value = coach
    communicationType.value = type
    showPanel.value = true
  }

  /**
   * Handle successful interaction logging
   * Creates database record and updates coach contact date
   * Caller is responsible for refreshing data after this completes
   */
  const handleInteractionLogged = async (
    interactionData: {
      type: 'email' | 'phone_call' | 'text' | 'in_person_visit' | 'virtual_meeting' | 'camp' | 'showcase' | 'tweet' | 'dm'
      subject?: string
      content?: string
      body?: string
    },
    onSuccess?: () => Promise<void>
  ) => {
    if (!selectedCoach.value) return

    try {
      // Create interaction record
      await createInteraction({
        coach_id: selectedCoach.value.id,
        school_id: selectedCoach.value.school_id,
        type: interactionData.type,
        direction: 'outbound',
        subject: interactionData.subject || '',
        content: interactionData.content || interactionData.body || '',
        logged_by: userStore.user?.id,
        occurred_at: new Date().toISOString(),
      })

      // Update last_contact_date on coach
      await updateCoach(selectedCoach.value.id, {
        last_contact_date: new Date().toISOString(),
      })

      // Call optional success callback for page-specific refresh logic
      if (onSuccess) {
        await onSuccess()
      }

      // Close panel and reset state
      showPanel.value = false
      selectedCoach.value = null
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to log interaction')
    }
  }

  return {
    // State
    showPanel,
    selectedCoach,
    communicationType,

    // Methods
    openCommunication,
    handleInteractionLogged,
  }
}
