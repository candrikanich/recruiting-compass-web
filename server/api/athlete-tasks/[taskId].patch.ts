/**
 * PATCH /api/athlete-tasks/[taskId]
 * Update athlete's task status
 */

import { defineEventHandler, readBody } from 'h3'
import { createServerSupabaseClient } from '~/server/utils/supabase'
import { requireAuth } from '~/server/utils/auth'
import { logCRUD, logError } from '~/server/utils/auditLog'
import type { AthleteTask, TaskStatus } from '~/types/timeline'

interface UpdateTaskBody {
  status: TaskStatus
}

interface UpdateTaskData {
  athlete_id: string
  task_id: string
  status: TaskStatus
  updated_at: string
  completed_at?: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const supabase = createServerSupabaseClient()
  const taskId = event.context.params?.taskId as string

  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID is required',
    })
  }

  try {
    const body = await readBody<UpdateTaskBody>(event)

    if (!body.status) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Status is required',
      })
    }

    // Validate status value
    const validStatuses = ['not_started', 'in_progress', 'completed', 'skipped']
    if (!validStatuses.includes(body.status)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid status value',
      })
    }

    // Prepare update data
    const updateData: UpdateTaskData = {
      athlete_id: user.id,
      task_id: taskId,
      status: body.status,
      updated_at: new Date().toISOString(),
    }

    // Set completed_at when marking completed
    if (body.status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    // Try to update existing record
    const { data: existingData, error: selectError } = await supabase
      .from('athlete_task')
      .select('id')
      .eq('athlete_id', user.id)
      .eq('task_id', taskId)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected
      console.error('Error checking existing athlete task:', selectError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update task status',
      })
    }

    let result
    let action: 'CREATE' | 'UPDATE' = 'UPDATE'

    if (existingData) {
      // Update existing record
      const { data, error } = await supabase
        .from('athlete_task')
        .update(updateData)
        .eq('id', existingData.id)
        .eq('athlete_id', user.id)
        .select()
        .single()

      if (error) {
        // Log failed update
        await logError(event, {
          userId: user.id,
          action: 'UPDATE',
          resourceType: 'athlete_tasks',
          resourceId: taskId,
          errorMessage: error.message,
          description: 'Failed to update task status',
        })

        console.error('Supabase error updating athlete task:', error)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to update task status',
        })
      }

      result = data
      action = 'UPDATE'
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('athlete_task')
        .insert({
          athlete_id: user.id,
          task_id: taskId,
          status: updateData.status,
          updated_at: updateData.updated_at,
          completed_at: updateData.completed_at,
        })
        .select()
        .single()

      if (error) {
        // Log failed create
        await logError(event, {
          userId: user.id,
          action: 'CREATE',
          resourceType: 'athlete_tasks',
          resourceId: taskId,
          errorMessage: error.message,
          description: 'Failed to create task status',
        })

        console.error('Supabase error creating athlete task:', error)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to create task status',
        })
      }

      result = data
      action = 'CREATE'
    }

    // Log successful operation
    await logCRUD(event, {
      userId: user.id,
      action,
      resourceType: 'athlete_tasks',
      resourceId: taskId,
      newValues: updateData,
      description: `${action === 'CREATE' ? 'Created' : 'Updated'} task status to ${body.status}`,
    })

    return result as AthleteTask
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'

    // Log any unexpected errors
    await logError(event, {
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'athlete_tasks',
      resourceId: taskId,
      errorMessage,
      description: 'Unexpected error updating task status',
    })

    if (err instanceof Error && err.message === 'Unauthorized') {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      })
    }

    if (err instanceof Error && 'statusCode' in err) {
      throw err
    }

    console.error('Error in PATCH /api/athlete-tasks/[taskId]:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update task status',
    })
  }
})
