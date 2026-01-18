import { describe, it, expect, beforeEach } from 'vitest'
import { useCommunicationTemplates } from '~/composables/useCommunicationTemplates'

describe('useCommunicationTemplates', () => {
  let composable: ReturnType<typeof useCommunicationTemplates>

  beforeEach(() => {
    composable = useCommunicationTemplates()
  })

  it('should initialize', () => {
    expect(composable).toBeDefined()
  })

  it('should have required state', () => {
    expect(composable.templates).toBeDefined()
  })
})
