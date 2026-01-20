import { describe, it, expect } from 'vitest'
import { getCarnegieSize, getSizeColorClass } from '~/utils/schoolSize'

describe('schoolSize utilities', () => {
  describe('getCarnegieSize', () => {
    describe('Very Small (< 1,000)', () => {
      it('should return "Very Small" for enrollment < 1000', () => {
        expect(getCarnegieSize(500)).toBe('Very Small')
        expect(getCarnegieSize(999)).toBe('Very Small')
        expect(getCarnegieSize(1)).toBe('Very Small')
      })

      it('should return "Very Small" for boundary at 999', () => {
        expect(getCarnegieSize(999)).toBe('Very Small')
      })
    })

    describe('Small (1,000 - 4,999)', () => {
      it('should return "Small" for enrollment 1000-4999', () => {
        expect(getCarnegieSize(1000)).toBe('Small')
        expect(getCarnegieSize(2500)).toBe('Small')
        expect(getCarnegieSize(4999)).toBe('Small')
      })

      it('should return "Small" at boundaries', () => {
        expect(getCarnegieSize(1000)).toBe('Small')
        expect(getCarnegieSize(4999)).toBe('Small')
      })
    })

    describe('Medium (5,000 - 9,999)', () => {
      it('should return "Medium" for enrollment 5000-9999', () => {
        expect(getCarnegieSize(5000)).toBe('Medium')
        expect(getCarnegieSize(7500)).toBe('Medium')
        expect(getCarnegieSize(9999)).toBe('Medium')
      })

      it('should return "Medium" at boundaries', () => {
        expect(getCarnegieSize(5000)).toBe('Medium')
        expect(getCarnegieSize(9999)).toBe('Medium')
      })
    })

    describe('Large (10,000 - 19,999)', () => {
      it('should return "Large" for enrollment 10000-19999', () => {
        expect(getCarnegieSize(10000)).toBe('Large')
        expect(getCarnegieSize(15000)).toBe('Large')
        expect(getCarnegieSize(19999)).toBe('Large')
      })

      it('should return "Large" at boundaries', () => {
        expect(getCarnegieSize(10000)).toBe('Large')
        expect(getCarnegieSize(19999)).toBe('Large')
      })
    })

    describe('Very Large (20,000+)', () => {
      it('should return "Very Large" for enrollment 20000+', () => {
        expect(getCarnegieSize(20000)).toBe('Very Large')
        expect(getCarnegieSize(50000)).toBe('Very Large')
        expect(getCarnegieSize(100000)).toBe('Very Large')
      })

      it('should return "Very Large" for very large schools', () => {
        expect(getCarnegieSize(20000)).toBe('Very Large')
      })
    })

    describe('Edge cases', () => {
      it('should return null for null enrollment', () => {
        expect(getCarnegieSize(null)).toBeNull()
      })

      it('should return null for undefined enrollment', () => {
        expect(getCarnegieSize(undefined)).toBeNull()
      })

      it('should return null for zero enrollment', () => {
        expect(getCarnegieSize(0)).toBeNull()
      })

      it('should return null for negative enrollment', () => {
        expect(getCarnegieSize(-100)).toBeNull()
      })

      it('should handle decimal enrollment values', () => {
        expect(getCarnegieSize(2500.5)).toBe('Small')
        expect(getCarnegieSize(9999.9)).toBe('Medium')
      })

      it('should handle very large numbers', () => {
        expect(getCarnegieSize(999999)).toBe('Very Large')
      })

      it('should handle fractional values correctly', () => {
        expect(getCarnegieSize(999.99)).toBe('Very Small')
        expect(getCarnegieSize(1000.01)).toBe('Small')
      })
    })

    describe('Carnegie Classification accuracy', () => {
      it('should match official Carnegie Classification ranges', () => {
        // Very Small: < 1,000
        expect(getCarnegieSize(999)).toBe('Very Small')
        // Small: 1,000 - 4,999
        expect(getCarnegieSize(1000)).toBe('Small')
        expect(getCarnegieSize(4999)).toBe('Small')
        // Medium: 5,000 - 9,999
        expect(getCarnegieSize(5000)).toBe('Medium')
        expect(getCarnegieSize(9999)).toBe('Medium')
        // Large: 10,000 - 19,999
        expect(getCarnegieSize(10000)).toBe('Large')
        expect(getCarnegieSize(19999)).toBe('Large')
        // Very Large: 20,000+
        expect(getCarnegieSize(20000)).toBe('Very Large')
      })
    })

    describe('Real world examples', () => {
      it('should classify Ivy League schools correctly', () => {
        // Harvard, Yale, Princeton, etc. typically 5000-15000
        expect(getCarnegieSize(8500)).toBe('Medium')
      })

      it('should classify large state universities correctly', () => {
        // Florida, Ohio State, etc. typically 40000+
        expect(getCarnegieSize(50000)).toBe('Very Large')
      })

      it('should classify small liberal arts colleges correctly', () => {
        // Williams, Amherst, etc. typically 1500-2000
        expect(getCarnegieSize(1800)).toBe('Small')
      })

      it('should classify regional state universities correctly', () => {
        // Regional campuses typically 10000-20000
        expect(getCarnegieSize(15000)).toBe('Large')
      })
    })
  })

  describe('getSizeColorClass', () => {
    describe('Very Small', () => {
      it('should return green color class for "Very Small"', () => {
        const result = getSizeColorClass('Very Small')
        expect(result).toBe('bg-green-100 text-green-700')
        expect(result).toContain('green')
      })
    })

    describe('Small', () => {
      it('should return blue color class for "Small"', () => {
        const result = getSizeColorClass('Small')
        expect(result).toBe('bg-blue-100 text-blue-700')
        expect(result).toContain('blue')
      })
    })

    describe('Medium', () => {
      it('should return yellow color class for "Medium"', () => {
        const result = getSizeColorClass('Medium')
        expect(result).toBe('bg-yellow-100 text-yellow-700')
        expect(result).toContain('yellow')
      })
    })

    describe('Large', () => {
      it('should return orange color class for "Large"', () => {
        const result = getSizeColorClass('Large')
        expect(result).toBe('bg-orange-100 text-orange-700')
        expect(result).toContain('orange')
      })
    })

    describe('Very Large', () => {
      it('should return red color class for "Very Large"', () => {
        const result = getSizeColorClass('Very Large')
        expect(result).toBe('bg-red-100 text-red-700')
        expect(result).toContain('red')
      })
    })

    describe('Edge cases', () => {
      it('should return gray for null', () => {
        expect(getSizeColorClass(null)).toBe('bg-gray-100 text-gray-700')
      })

      it('should return gray for undefined', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(getSizeColorClass(undefined as any)).toBe('bg-gray-100 text-gray-700')
      })

      it('should return gray for empty string', () => {
        expect(getSizeColorClass('')).toBe('bg-gray-100 text-gray-700')
      })

      it('should return gray for unknown value', () => {
        expect(getSizeColorClass('Unknown Size')).toBe('bg-gray-100 text-gray-700')
      })

      it('should be case-sensitive', () => {
        expect(getSizeColorClass('very small')).toBe('bg-gray-100 text-gray-700')
        expect(getSizeColorClass('VERY SMALL')).toBe('bg-gray-100 text-gray-700')
      })
    })

    describe('Integration with getCarnegieSize', () => {
      it('should work together correctly for small school', () => {
        const size = getCarnegieSize(2000)
        const color = getSizeColorClass(size)
        expect(size).toBe('Small')
        expect(color).toContain('blue')
      })

      it('should work together correctly for large school', () => {
        const size = getCarnegieSize(15000)
        const color = getSizeColorClass(size)
        expect(size).toBe('Large')
        expect(color).toContain('orange')
      })

      it('should work together correctly for very large school', () => {
        const size = getCarnegieSize(50000)
        const color = getSizeColorClass(size)
        expect(size).toBe('Very Large')
        expect(color).toContain('red')
      })

      it('should return gray when size is null', () => {
        const size = getCarnegieSize(null)
        const color = getSizeColorClass(size)
        expect(size).toBeNull()
        expect(color).toBe('bg-gray-100 text-gray-700')
      })
    })

    describe('UI color consistency', () => {
      it('should use appropriate Tailwind color progression', () => {
        const colors = [
          getSizeColorClass('Very Small'),
          getSizeColorClass('Small'),
          getSizeColorClass('Medium'),
          getSizeColorClass('Large'),
          getSizeColorClass('Very Large'),
        ]

        // All should have Tailwind classes
        colors.forEach(color => {
          expect(color).toMatch(/bg-\w+-100 text-\w+-700/)
        })
      })

      it('should provide distinct colors for each category', () => {
        const colors = [
          getSizeColorClass('Very Small'),
          getSizeColorClass('Small'),
          getSizeColorClass('Medium'),
          getSizeColorClass('Large'),
          getSizeColorClass('Very Large'),
        ]

        // All should be unique
        expect(new Set(colors).size).toBe(5)
      })
    })
  })

  describe('Round-trip consistency', () => {
    it('should consistently classify the same enrollment', () => {
      const enrollment = 7500
      const result1 = getCarnegieSize(enrollment)
      const result2 = getCarnegieSize(enrollment)

      expect(result1).toBe(result2)
    })

    it('should have consistent color mapping', () => {
      const size = getCarnegieSize(7500)
      const color1 = getSizeColorClass(size)
      const color2 = getSizeColorClass(size)

      expect(color1).toBe(color2)
    })
  })
})
