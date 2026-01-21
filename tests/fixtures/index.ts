/**
 * Test Fixtures Index
 * Central export for all test fixtures and mock data factories
 */

export * from './documents.fixture'
export * from './search.fixture'

// Re-export commonly used utilities
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`
}

export function generateEmail(): string {
  return `user-${Math.random().toString(36).substring(2, 11)}@example.com`
}

export function generateTimestamp(daysAgo: number = 0): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
