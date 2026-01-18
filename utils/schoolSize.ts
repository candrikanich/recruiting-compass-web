/**
 * Calculate Carnegie Classification size category based on student enrollment
 * Based on official Carnegie Classification system
 */
export const getCarnegieSize = (studentSize: number | null | undefined): string | null => {
  if (!studentSize || studentSize <= 0) return null

  // Carnegie Classification size categories
  // Very Small: < 1,000
  // Small: 1,000 - 4,999
  // Medium: 5,000 - 9,999
  // Large: 10,000 - 19,999
  // Very Large: 20,000+

  if (studentSize < 1000) return 'Very Small'
  if (studentSize < 5000) return 'Small'
  if (studentSize < 10000) return 'Medium'
  if (studentSize < 20000) return 'Large'
  return 'Very Large'
}

/**
 * Get color class for size pill based on category
 */
export const getSizeColorClass = (size: string | null): string => {
  if (!size) return 'bg-gray-100 text-gray-700'

  switch (size) {
    case 'Very Small':
      return 'bg-green-100 text-green-700'
    case 'Small':
      return 'bg-blue-100 text-blue-700'
    case 'Medium':
      return 'bg-yellow-100 text-yellow-700'
    case 'Large':
      return 'bg-orange-100 text-orange-700'
    case 'Very Large':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
