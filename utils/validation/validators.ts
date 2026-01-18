import { z } from 'zod'
import { sanitizeHtml, sanitizeUrl, stripHtml } from './sanitize'

/**
 * Email schema with format validation and normalization
 */
export const emailSchema = z.string()
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must not exceed 255 characters')
  .email('Please enter a valid email address')
  .toLowerCase()
  .trim()

/**
 * URL schema with protocol validation
 * Rejects javascript:, data:, and other dangerous protocols
 */
export const urlSchema = z.string()
  .url('Please enter a valid URL')
  .refine(
    (url) => {
      const sanitized = sanitizeUrl(url)
      return sanitized !== null
    },
    'URL must start with http:// or https://'
  )

/**
 * Phone number schema with flexible format validation
 * Accepts: (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890
 */
export const phoneSchema = z.string()
  .regex(
    /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
    'Please enter a valid phone number'
  )
  .or(z.literal(''))
  .optional()

/**
 * Twitter handle schema
 * Accepts: @username or username (1-15 characters)
 */
export const twitterHandleSchema = z.string()
  .regex(
    /^@?[A-Za-z0-9_]{1,15}$/,
    'Invalid Twitter handle (1-15 characters, letters/numbers/underscore)'
  )
  .transform((val) => val.startsWith('@') ? val.slice(1) : val)
  .or(z.literal(''))
  .optional()

/**
 * Instagram handle schema
 * Accepts: @username or username (1-30 characters, allows . and _)
 */
export const instagramHandleSchema = z.string()
  .regex(
    /^@?[A-Za-z0-9_.]{1,30}$/,
    'Invalid Instagram handle (1-30 characters, letters/numbers/dots/underscore)'
  )
  .transform((val) => val.startsWith('@') ? val.slice(1) : val)
  .or(z.literal(''))
  .optional()

/**
 * TikTok handle schema
 * Accepts: @username or username (1-30 characters)
 */
export const tiktokHandleSchema = z.string()
  .regex(
    /^@?[A-Za-z0-9_.]{1,30}$/,
    'Invalid TikTok handle (1-30 characters)'
  )
  .transform((val) => val.startsWith('@') ? val.slice(1) : val)
  .or(z.literal(''))
  .optional()

/**
 * Facebook handle schema
 * Accepts: username or custom URL (1-50 characters)
 */
export const facebookHandleSchema = z.string()
  .min(1, 'Facebook handle required')
  .max(50, 'Facebook handle must not exceed 50 characters')
  .or(z.literal(''))
  .optional()

/**
 * Sanitized text schema
 * Removes all HTML tags, limits length
 */
export const sanitizedTextSchema = (maxLength: number = 1000) =>
  z.string()
    .max(maxLength, `Text must not exceed ${maxLength} characters`)
    .transform((val) => stripHtml(val).trim())
    .or(z.literal(''))
    .optional()

/**
 * Rich text schema with sanitization
 * Allows safe HTML tags (paragraphs, bold, italic, links, lists)
 */
export const richTextSchema = (maxLength: number = 5000) =>
  z.string()
    .max(maxLength, `Text must not exceed ${maxLength} characters`)
    .transform((val) => sanitizeHtml(val).trim())
    .or(z.literal(''))
    .optional()

/**
 * US state code schema (2-letter abbreviation)
 */
export const stateSchema = z.string()
  .length(2, 'State must be 2 letters')
  .toUpperCase()
  .or(z.literal(''))
  .optional()

/**
 * Percentage schema (0-100)
 */
export const percentageSchema = z.number()
  .min(0, 'Percentage must be at least 0')
  .max(100, 'Percentage must not exceed 100')
  .or(z.null())
  .optional()

/**
 * Currency amount schema (positive numbers up to 100,000)
 */
export const currencySchema = z.number()
  .min(0, 'Amount must be positive')
  .max(100000, 'Amount must not exceed $100,000')
  .or(z.null())
  .optional()

/**
 * GPA schema (0-5 scale)
 */
export const gpaSchema = z.number()
  .min(0, 'GPA must be at least 0')
  .max(5, 'GPA must not exceed 5.0')
  .or(z.null())
  .optional()

/**
 * SAT score schema (400-1600)
 */
export const satSchema = z.number()
  .min(400, 'SAT score must be at least 400')
  .max(1600, 'SAT score must not exceed 1600')
  .or(z.null())
  .optional()

/**
 * ACT score schema (1-36)
 */
export const actSchema = z.number()
  .min(1, 'ACT score must be at least 1')
  .max(36, 'ACT score must not exceed 36')
  .or(z.null())
  .optional()

/**
 * Height in inches schema (48-96 inches / 4-8 feet)
 */
export const heightSchema = z.number()
  .min(48, 'Height must be at least 4 feet')
  .max(96, 'Height must not exceed 8 feet')
  .or(z.null())
  .optional()

/**
 * Weight in pounds schema (100-400 pounds)
 */
export const weightSchema = z.number()
  .min(100, 'Weight must be at least 100 lbs')
  .max(400, 'Weight must not exceed 400 lbs')
  .or(z.null())
  .optional()

/**
 * Graduation year schema (reasonable range)
 */
export const graduationYearSchema = z.number()
  .int()
  .min(new Date().getFullYear(), 'Graduation year must be current year or later')
  .max(new Date().getFullYear() + 10, 'Graduation year must be within 10 years')
  .or(z.null())
  .optional()

/**
 * UUID schema
 */
export const uuidSchema = z.string()
  .uuid('Invalid ID format')
  .optional()
  .or(z.null())

/**
 * Date-time schema
 */
export const dateTimeSchema = z.string()
  .datetime('Invalid date-time format')

/**
 * Date schema (YYYY-MM-DD)
 */
export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
