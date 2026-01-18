import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { z } from 'zod'

export interface ValidationError {
  field: string
  message: string
}

export interface UseValidationReturn<T> {
  errors: Ref<ValidationError[]>
  fieldErrors: ComputedRef<Record<string, string>>
  validate: (data: unknown) => Promise<T | null>
  validateField: (field: string, fieldSchema: z.ZodSchema) => (value: unknown) => Promise<boolean>
  clearErrors: () => void
  clearFieldError: (field: string) => void
  hasErrors: ComputedRef<boolean>
  setErrors: (newErrors: ValidationError[]) => void
}

/**
 * Composable for form validation using Zod schemas.
 * Provides reactive error state, field-level and form-level validation.
 *
 * @param schema Zod schema to validate against
 * @returns Object with validation methods and reactive error state
 *
 * @example
 * const { validate, errors, fieldErrors } = useValidation(schoolSchema)
 * const validated = await validate(formData)
 * if (validated) {
 *   await createSchool(validated)
 * }
 */
export function useValidation<T>(schema: z.ZodSchema<T>): UseValidationReturn<T> {
  const errors = ref<ValidationError[]>([])

  const fieldErrors = computed(() => {
    const result: Record<string, string> = {}
    errors.value.forEach(err => {
      result[err.field] = err.message
    })
    return result
  })

  const hasErrors = computed(() => errors.value.length > 0)

  /**
   * Validates entire form data against schema
   */
  const validate = async (data: unknown): Promise<T | null> => {
    try {
      const validated = await schema.parseAsync(data)
      errors.value = []
      return validated
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        errors.value = err.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))
      } else {
        errors.value = [{ field: 'form', message: 'Validation failed' }]
      }
      return null
    }
  }

  /**
   * Creates a validator function for a single field
   * Returns a function that validates the field value
   */
  const validateField = (field: string, fieldSchema: z.ZodSchema) => {
    return async (value: unknown): Promise<boolean> => {
      try {
        await fieldSchema.parseAsync(value)
        clearFieldError(field)
        return true
      } catch (err: unknown) {
        if (err instanceof z.ZodError) {
          const message = err.issues[0]?.message || 'Invalid value'
          const existingIndex = errors.value.findIndex(e => e.field === field)

          if (existingIndex >= 0) {
            errors.value[existingIndex].message = message
          } else {
            errors.value.push({ field, message })
          }
        }
        return false
      }
    }
  }

  const clearErrors = () => {
    errors.value = []
  }

  const clearFieldError = (field: string) => {
    errors.value = errors.value.filter(e => e.field !== field)
  }

  const setErrors = (newErrors: ValidationError[]) => {
    errors.value = newErrors
  }

  return {
    errors,
    fieldErrors,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    hasErrors,
    setErrors,
  }
}
