import { describe, it, expect } from 'vitest'
import { useLoadingStates } from '~/composables/useLoadingStates'

describe('useLoadingStates', () => {
  it('returns all 4 keys', () => {
    const result = useLoadingStates()
    expect(result).toHaveProperty('loading')
    expect(result).toHaveProperty('validating')
    expect(result).toHaveProperty('setLoading')
    expect(result).toHaveProperty('setValidating')
  })

  it('initial loading state is false', () => {
    const { loading } = useLoadingStates()
    expect(loading.value).toBe(false)
  })

  it('initial validating state is false', () => {
    const { validating } = useLoadingStates()
    expect(validating.value).toBe(false)
  })

  it('setLoading(true) sets loading to true', () => {
    const { loading, setLoading } = useLoadingStates()
    setLoading(true)
    expect(loading.value).toBe(true)
  })

  it('setLoading(false) sets loading to false', () => {
    const { loading, setLoading } = useLoadingStates()
    setLoading(true)
    setLoading(false)
    expect(loading.value).toBe(false)
  })

  it('setValidating(true) sets validating to true', () => {
    const { validating, setValidating } = useLoadingStates()
    setValidating(true)
    expect(validating.value).toBe(true)
  })

  it('setValidating(false) sets validating to false', () => {
    const { validating, setValidating } = useLoadingStates()
    setValidating(true)
    setValidating(false)
    expect(validating.value).toBe(false)
  })

  it('loading and validating are independent refs', () => {
    const { loading, validating, setLoading } = useLoadingStates()
    setLoading(true)
    expect(loading.value).toBe(true)
    expect(validating.value).toBe(false)
  })

  it('each call returns independent state instances', () => {
    const a = useLoadingStates()
    const b = useLoadingStates()
    a.setLoading(true)
    expect(a.loading.value).toBe(true)
    expect(b.loading.value).toBe(false)
  })
})
