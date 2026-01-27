import { computed } from "vue"
import type { School } from "~/types/models"
import { useSchools } from "~/composables/useSchools"

/**
 * @deprecated Use `useSchools()` instead. All duplicate detection functions
 * have been consolidated into the useSchools composable.
 * This composable will be removed in a future version.
 *
 * Migration: Replace `useSchoolDuplication()` with `useSchools()` and access
 * the duplicate detection functions from the same composable.
 *
 * Before:
 *   const { findDuplicate } = useSchoolDuplication();
 *
 * After:
 *   const { findDuplicate } = useSchools();
 */

/**
 * Composable for detecting duplicate schools
 * Checks for duplicates by name, NCAA ID, and website domain
 */
export const useSchoolDuplication = () => {
  const { schools } = useSchools()

  /**
   * Normalize URL to extract domain
   */
  const extractDomain = (url: string | null | undefined): string | null => {
    if (!url) return null
    try {
      const domain = new URL(url).hostname.replace(/^www\./, "")
      return domain
    } catch {
      return null
    }
  }

  /**
   * Check if a school name matches an existing school (case-insensitive)
   */
  const isNameDuplicate = (newName: string | undefined): School | null => {
    if (!newName) return null
    const normalized = newName.trim().toLowerCase()
    return (
      schools.value.find(
        (s) => s.name.toLowerCase() === normalized,
      ) || null
    )
  }

  /**
   * Check if NCAA ID matches an existing school
   */
  const isNCAAAIDuplicate = (
    ncaaId: string | null | undefined,
  ): School | null => {
    if (!ncaaId) return null
    const normalizedId = ncaaId.trim().toLowerCase()
    return (
      schools.value.find((s) => {
        if (!s.ncaa_id) return false
        return s.ncaa_id.toLowerCase() === normalizedId
      }) || null
    )
  }

  /**
   * Check if website domain matches an existing school
   */
  const isDomainDuplicate = (
    website: string | null | undefined,
  ): School | null => {
    if (!website) return null
    const newDomain = extractDomain(website)
    if (!newDomain) return null

    return (
      schools.value.find((s) => {
        const existingDomain = extractDomain(s.website)
        return existingDomain && existingDomain === newDomain
      }) || null
    )
  }

  /**
   * Find duplicate school by any matching criteria
   * Returns the first match found (name > domain > NCAA ID)
   */
  const findDuplicate = (
    schoolData: Partial<School> | Record<string, string | null | undefined>,
  ): {
    duplicate: School | null
    matchType: "name" | "domain" | "ncaa_id" | null
  } => {
    // Check name first (most reliable)
    const nameDuplicate = isNameDuplicate(schoolData.name)
    if (nameDuplicate) {
      return { duplicate: nameDuplicate, matchType: "name" }
    }

    // Check domain second
    const domainDuplicate = isDomainDuplicate(schoolData.website)
    if (domainDuplicate) {
      return { duplicate: domainDuplicate, matchType: "domain" }
    }

    // Check NCAA ID last
    const ncaaIdDuplicate = isNCAAAIDuplicate(schoolData.ncaa_id)
    if (ncaaIdDuplicate) {
      return { duplicate: ncaaIdDuplicate, matchType: "ncaa_id" }
    }

    return { duplicate: null, matchType: null }
  }

  /**
   * Check if school data would create a duplicate
   */
  const hasDuplicate = computed(() => (schoolData: Partial<School>) => {
    return findDuplicate(schoolData).duplicate !== null
  })

  return {
    findDuplicate,
    hasDuplicate,
    isNameDuplicate,
    isDomainDuplicate,
    isNCAAAIDuplicate,
  }
}
