/**
 * Server-side logging utility
 * Controls log output based on NODE_ENV
 * - Development: Full logging enabled
 * - Production: Minimal logging, no sensitive data
 */

type LogLevel = 'info' | 'warn' | 'error'

interface Logger {
  info: (message: string, data?: unknown) => void
  warn: (message: string, data?: unknown) => void
  error: (message: string, error?: unknown) => void
}

export const logger = createLogger('server')

export function createLogger(context: string): Logger {
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

  const log = (level: LogLevel, message: string, data?: unknown) => {
    if (isDevelopment) {
      const timestamp = new Date().toISOString()
      const prefix = `[${timestamp}] [${context}] [${level.toUpperCase()}]`

      if (data) {
        console[level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'](
          prefix,
          message,
          data
        )
      } else {
        console[level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'](prefix, message)
      }
    }
    // In production, logs are silently discarded (can integrate with Sentry/external service)
  }

  return {
    info: (message: string, data?: unknown) => log('info', message, data),
    warn: (message: string, data?: unknown) => log('warn', message, data),
    error: (message: string, error?: unknown) => log('error', message, error),
  }
}
