/**
 * GET /api/tasks
 * Fetch all tasks with optional filters
 * Performance: Cached for 1 hour (tasks rarely change)
 * Cache hit: Saves ~200-300ms database round trip
 */

import { defineEventHandler, getQuery } from 'h3'
import { createServerSupabaseClient } from '~/server/utils/supabase'
import { getCached } from '~/server/utils/cache'
import type { Task } from '~/types/timeline'

export default defineEventHandler(async (event) => {
  const supabase = createServerSupabaseClient()

  try {
    const query = getQuery(event)
    const gradeLevel = query.gradeLevel ? parseInt(query.gradeLevel as string) : undefined
    const category = query.category as string | undefined
    const division = query.division as string | undefined

    // Generate cache key based on filters
    const cacheKey = `tasks:${gradeLevel || 'all'}:${category || 'all'}:${division || 'all'}`

    // Try to get from cache first
    const cached = getCached<Task[]>(cacheKey)
    if (cached) {
      return cached
    }

    let request = supabase.from('task').select('*')

    // Apply filters
    if (gradeLevel) {
      request = request.eq('grade_level', gradeLevel)
    }
    if (category) {
      request = request.eq('category', category)
    }
    if (division) {
      request = request.contains('division_applicability', [division])
    }

    // Order by grade level and category
    request = request.order('grade_level', { ascending: true }).order('category', { ascending: true })

    const { data, error } = await request

    if (error) {
      console.error('Supabase error fetching tasks:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch tasks',
      })
    }

    const tasks = data as Task[]

    // Cache for 1 hour (3600 seconds) - tasks rarely change
    if (tasks) {
      const { setCached } = await import('~/server/utils/cache')
      setCached(cacheKey, tasks, 3600)
    }

    return tasks
  } catch (err) {
    console.error('Error in GET /api/tasks:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch tasks',
    })
  }
})
