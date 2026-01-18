/**
 * Database type helpers for Supabase tables
 */

import type { Database } from '~/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

export type DatabaseTableNames = keyof Database['public']['Tables']
export type AthleteTask = Database['public']['Tables']['athlete_task']['Row']
export type AthleteTaskInsert = Database['public']['Tables']['athlete_task']['Insert']
export type AthleteTaskUpdate = Database['public']['Tables']['athlete_task']['Update']

export type SocialMediaPost = Database['public']['Tables']['social_media_posts']['Row']
export type SocialMediaPostInsert = Database['public']['Tables']['social_media_posts']['Insert']

// Temporarily define audit_log types since they're missing from generated types
export interface AuditLog {
  id: string
  user_id: string
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT'
  resource_type: string
  resource_id: string | null
  table_name: string | null
  description: string | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  status: 'success' | 'failure'
  error_message: string | null
  metadata: Record<string, any>
  created_at: string | null
  expires_at: string | null
}

export interface AuditLogInsert {
  user_id: string
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT'
  resource_type: string
  resource_id?: string | null
  table_name?: string | null
  description?: string | null
  old_values?: Record<string, any> | null
  new_values?: Record<string, any> | null
  ip_address?: string | null
  user_agent?: string | null
  status?: 'success' | 'failure'
  error_message?: string | null
  metadata?: Record<string, any>
  created_at?: string | null
  expires_at?: string | null
}

export type Users = Database['public']['Tables']['users']['Row']
export type Schools = Database['public']['Tables']['schools']['Row']

// Create a School interface that matches database but includes additional fields for backward compatibility
export interface School extends Omit<Schools, 'academic_info'> {
  academic_info?: AcademicInfo | null
  favicon_url: string | null
}

export interface AcademicInfo {
  [key: string]: any
  address?: string
  baseball_facility_address?: string
  mascot?: string
  undergrad_size?: string | number
  student_size?: number
  carnegie_size?: string
  enrollment_all?: number
  admission_rate?: number
  graduation_rate?: number
  sat_requirement?: number
  act_requirement?: number
  gpa_requirement?: number
  distance_from_home?: number | null
  latitude?: number
  longitude?: number
  additional_requirements?: string[]
}

// Helper function to create a typed Supabase client
export function createTypedSupabaseClient(supabase: SupabaseClient<Database>) {
  return supabase
}