import { describe, it, expect, vi } from 'vitest'

vi.mock('~/data/ncaaSchools.json', () => ({
  default: {
    D1: [
      { name: 'Stanford', conference: 'Pac-12' },
      { name: 'Duke', conference: 'ACC' },
    ],
    D2: [{ name: 'Rollins', conference: 'SSC' }],
    D3: [{ name: 'Williams' }],
  },
}))

describe('ncaaDatabase', () => {
  it('getAllSchools returns all schools across all divisions', async () => {
    const { getAllSchools } = await import('~/composables/ncaaDatabase')
    const all = getAllSchools()
    expect(all).toHaveLength(4)
  })

  it('getSchoolsByDivision("D1") returns only D1 schools', async () => {
    const { getSchoolsByDivision } = await import('~/composables/ncaaDatabase')
    const d1 = getSchoolsByDivision('D1')
    expect(d1).toHaveLength(2)
    expect(d1.map((s) => s.name)).toEqual(['Stanford', 'Duke'])
  })

  it('getSchoolsByDivision("D2") returns only D2 schools', async () => {
    const { getSchoolsByDivision } = await import('~/composables/ncaaDatabase')
    const d2 = getSchoolsByDivision('D2')
    expect(d2).toHaveLength(1)
    expect(d2[0].name).toBe('Rollins')
  })

  it('getSchoolsByDivision("D3") returns only D3 schools', async () => {
    const { getSchoolsByDivision } = await import('~/composables/ncaaDatabase')
    const d3 = getSchoolsByDivision('D3')
    expect(d3).toHaveLength(1)
    expect(d3[0].name).toBe('Williams')
  })

  it('findSchool returns the matching school object', async () => {
    const { findSchool } = await import('~/composables/ncaaDatabase')
    const school = findSchool('Stanford')
    expect(school).toEqual({ name: 'Stanford', conference: 'Pac-12' })
  })

  it('findSchool is case-insensitive', async () => {
    const { findSchool } = await import('~/composables/ncaaDatabase')
    const school = findSchool('stanford')
    expect(school).toEqual({ name: 'Stanford', conference: 'Pac-12' })
  })

  it('findSchool returns undefined for non-existent school', async () => {
    const { findSchool } = await import('~/composables/ncaaDatabase')
    expect(findSchool('NonExistent')).toBeUndefined()
  })

  it('findSchool finds a school in D3', async () => {
    const { findSchool } = await import('~/composables/ncaaDatabase')
    const school = findSchool('Williams')
    expect(school).toEqual({ name: 'Williams' })
  })

  it('isNcaaSchool returns true for existing school', async () => {
    const { isNcaaSchool } = await import('~/composables/ncaaDatabase')
    expect(isNcaaSchool('Stanford')).toBe(true)
  })

  it('isNcaaSchool returns false for non-existent school', async () => {
    const { isNcaaSchool } = await import('~/composables/ncaaDatabase')
    expect(isNcaaSchool('NonExistent')).toBe(false)
  })

  it('getSchoolsByConference filters by exact conference name', async () => {
    const { getSchoolsByConference } = await import('~/composables/ncaaDatabase')
    const pac12 = getSchoolsByConference('Pac-12')
    expect(pac12).toHaveLength(1)
    expect(pac12[0].name).toBe('Stanford')
  })

  it('getSchoolsByConference is case-insensitive', async () => {
    const { getSchoolsByConference } = await import('~/composables/ncaaDatabase')
    const pac12 = getSchoolsByConference('pac-12')
    expect(pac12).toHaveLength(1)
    expect(pac12[0].name).toBe('Stanford')
  })

  it('getSchoolsByConference returns empty array for unknown conference', async () => {
    const { getSchoolsByConference } = await import('~/composables/ncaaDatabase')
    expect(getSchoolsByConference('UnknownConf')).toEqual([])
  })

  it('getSchoolsByConference excludes schools without a conference', async () => {
    const { getSchoolsByConference } = await import('~/composables/ncaaDatabase')
    // Williams has no conference field
    const results = getSchoolsByConference('')
    expect(results).toEqual([])
  })
})
