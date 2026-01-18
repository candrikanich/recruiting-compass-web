/**
 * Social media handle validation utilities
 * Validates handles before sending to external APIs
 */

/**
 * Validate Twitter handle
 * Twitter handles:
 * - 1-30 characters
 * - Alphanumeric, underscores, no spaces
 * - Cannot start with number
 */
export function isValidTwitterHandle(handle: string): boolean {
  if (!handle || typeof handle !== 'string') return false
  const trimmed = handle.trim()
  // Twitter handles: @optional, alphanumeric + underscore, 1-30 chars
  const twitterRegex = /^@?[A-Za-z][A-Za-z0-9_]{0,29}$/
  return twitterRegex.test(trimmed)
}

/**
 * Validate Instagram handle
 * Instagram handles:
 * - 1-30 characters
 * - Alphanumeric, underscores, periods
 * - Must start with letter or number
 */
export function isValidInstagramHandle(handle: string): boolean {
  if (!handle || typeof handle !== 'string') return false
  const trimmed = handle.trim()
  // Instagram handles: alphanumeric, underscore, period, 1-30 chars
  const instagramRegex = /^[A-Za-z0-9._]{1,30}$/
  // Cannot start with period or underscore
  if (trimmed.startsWith('.') || trimmed.startsWith('_')) return false
  // Cannot have consecutive special characters
  if (/[._]{2,}/.test(trimmed)) return false
  return instagramRegex.test(trimmed)
}

/**
 * Normalize handle (remove @ and spaces)
 */
export function normalizeHandle(handle: string): string {
  if (!handle || typeof handle !== 'string') return ''
  return handle.replace(/^@+/, '').trim().toLowerCase()
}

/**
 * Validate and normalize handle
 */
export function validateAndNormalizeHandle(
  handle: string,
  platform: 'twitter' | 'instagram'
): { valid: boolean; normalized?: string; error?: string } {
  if (!handle) {
    return { valid: false, error: 'Handle is required' }
  }

  const normalized = normalizeHandle(handle)

  if (platform === 'twitter') {
    if (!isValidTwitterHandle(normalized)) {
      return {
        valid: false,
        error:
          'Invalid Twitter handle. Must be 1-30 characters, alphanumeric with underscores only.',
      }
    }
  } else if (platform === 'instagram') {
    if (!isValidInstagramHandle(normalized)) {
      return {
        valid: false,
        error:
          'Invalid Instagram handle. Must be 1-30 characters, alphanumeric, underscores, or periods.',
      }
    }
  }

  return { valid: true, normalized }
}

/**
 * Filter array of handles to only include valid ones
 */
export function filterValidHandles(
  handles: (string | null | undefined)[],
  platform: 'twitter' | 'instagram'
): string[] {
  return handles
    .filter((h) => h && typeof h === 'string')
    .map((h) => normalizeHandle(h as string))
    .filter((h) => {
      if (platform === 'twitter') return isValidTwitterHandle(h)
      if (platform === 'instagram') return isValidInstagramHandle(h)
      return false
    })
}
