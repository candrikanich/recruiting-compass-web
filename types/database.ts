export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_links: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          initiator_role: string
          initiator_user_id: string
          invitation_token: string | null
          invited_at: string | null
          invited_email: string
          parent_user_id: string | null
          player_user_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          initiator_role: string
          initiator_user_id: string
          invitation_token?: string | null
          invited_at?: string | null
          invited_email: string
          parent_user_id?: string | null
          player_user_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          initiator_role?: string
          initiator_user_id?: string
          invitation_token?: string | null
          invited_at?: string | null
          invited_email?: string
          parent_user_id?: string | null
          player_user_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_links_initiator_user_id_fkey"
            columns: ["initiator_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_links_parent_user_id_fkey"
            columns: ["parent_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_links_player_user_id_fkey"
            columns: ["player_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_task: {
        Row: {
          athlete_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          is_recovery_task: boolean | null
          status: string | null
          task_id: string
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_recovery_task?: boolean | null
          status?: string | null
          task_id: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_recovery_task?: boolean | null
          status?: string | null
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_task_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_task_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_view_log: {
        Row: {
          athlete_id: string
          id: string
          parent_user_id: string
          viewed_at: string | null
          viewed_item_id: string | null
          viewed_item_type: string
        }
        Insert: {
          athlete_id: string
          id?: string
          parent_user_id: string
          viewed_at?: string | null
          viewed_item_id?: string | null
          viewed_item_type: string
        }
        Update: {
          athlete_id?: string
          id?: string
          parent_user_id?: string
          viewed_at?: string | null
          viewed_item_id?: string | null
          viewed_item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_view_log_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_view_log_parent_user_id_fkey"
            columns: ["parent_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion: {
        Row: {
          action_type: string | null
          athlete_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          dismissed: boolean | null
          dismissed_at: string | null
          id: string
          message: string
          pending_surface: boolean | null
          related_school_id: string | null
          related_task_id: string | null
          rule_type: string
          surfaced_at: string | null
          updated_at: string | null
          urgency: string
        }
        Insert: {
          action_type?: string | null
          athlete_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          message: string
          pending_surface?: boolean | null
          related_school_id?: string | null
          related_task_id?: string | null
          rule_type: string
          surfaced_at?: string | null
          updated_at?: string | null
          urgency: string
        }
        Update: {
          action_type?: string | null
          athlete_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          id?: string
          message?: string
          pending_surface?: boolean | null
          related_school_id?: string | null
          related_task_id?: string | null
          rule_type?: string
          surfaced_at?: string | null
          updated_at?: string | null
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_related_school_id_fkey"
            columns: ["related_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "task"
            referencedColumns: ["id"]
          },
        ]
      }
      task: {
        Row: {
          category: string
          created_at: string | null
          dependency_task_ids: string[] | null
          description: string | null
          division_applicability: string[] | null
          failure_risk: string | null
          grade_level: number
          id: string
          required: boolean | null
          title: string
          updated_at: string | null
          why_it_matters: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          dependency_task_ids?: string[] | null
          description?: string | null
          division_applicability?: string[] | null
          failure_risk?: string | null
          grade_level: number
          id?: string
          required?: boolean | null
          title: string
          updated_at?: string | null
          why_it_matters?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          dependency_task_ids?: string[] | null
          description?: string | null
          division_applicability?: string[] | null
          failure_risk?: string | null
          grade_level?: number
          id?: string
          required?: boolean | null
          title?: string
          updated_at?: string | null
          why_it_matters?: string | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          id: string
          user_id: string
          name: string
          location: string | null
          division: "D1" | "D2" | "D3" | "NAIA" | "JUCO" | null
          conference: string | null
          ranking: number | null
          is_favorite: boolean
          website: string | null
          twitter_handle: string | null
          instagram_handle: string | null
          status: "researching" | "contacted" | "interested" | "offer_received" | "declined" | "committed"
          amenities: Json | null
          pros: string[] | null
          cons: string[] | null
          notes: string | null
          private_notes: Json | null
          offer_details: Json | null
          academic_info: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          location?: string | null
          division?: "D1" | "D2" | "D3" | "NAIA" | "JUCO" | null
          conference?: string | null
          ranking?: number | null
          is_favorite?: boolean
          website?: string | null
          twitter_handle?: string | null
          instagram_handle?: string | null
          status?: "researching" | "contacted" | "interested" | "offer_received" | "declined" | "committed"
          amenities?: Json | null
          pros?: string[] | null
          cons?: string[] | null
          notes?: string | null
          private_notes?: Json | null
          offer_details?: Json | null
          academic_info?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          location?: string | null
          division?: "D1" | "D2" | "D3" | "NAIA" | "JUCO" | null
          conference?: string | null
          ranking?: number | null
          is_favorite?: boolean
          website?: string | null
          twitter_handle?: string | null
          instagram_handle?: string | null
          status?: "researching" | "contacted" | "interested" | "offer_received" | "declined" | "committed"
          amenities?: Json | null
          pros?: string[] | null
          cons?: string[] | null
          notes?: string | null
          private_notes?: Json | null
          offer_details?: Json | null
          academic_info?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coaches: {
        Row: {
          id: string
          school_id: string
          role: "head" | "assistant" | "recruiting"
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          twitter_handle: string | null
          instagram_handle: string | null
          notes: string | null
          responsiveness_score: number | null
          last_contact_date: string | null
          availability: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          school_id: string
          role: "head" | "assistant" | "recruiting"
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          twitter_handle?: string | null
          instagram_handle?: string | null
          notes?: string | null
          responsiveness_score?: number | null
          last_contact_date?: string | null
          availability?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          school_id?: string
          role?: "head" | "assistant" | "recruiting"
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          twitter_handle?: string | null
          instagram_handle?: string | null
          notes?: string | null
          responsiveness_score?: number | null
          last_contact_date?: string | null
          availability?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      interactions: {
        Row: {
          id: string
          school_id: string
          coach_id: string | null
          event_id: string | null
          type: "email" | "text" | "phone_call" | "in_person_visit" | "virtual_meeting" | "camp" | "showcase" | "tweet" | "dm"
          direction: "outbound" | "inbound"
          subject: string | null
          content: string | null
          sentiment: "positive" | "neutral" | "negative" | "very_positive" | null
          occurred_at: string
          logged_by: string
          attachments: string[] | null
          notification_settings: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          school_id: string
          coach_id?: string | null
          event_id?: string | null
          type: "email" | "text" | "phone_call" | "in_person_visit" | "virtual_meeting" | "camp" | "showcase" | "tweet" | "dm"
          direction: "outbound" | "inbound"
          subject?: string | null
          content?: string | null
          sentiment?: "positive" | "neutral" | "negative" | "very_positive" | null
          occurred_at: string
          logged_by: string
          attachments?: string[] | null
          notification_settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          school_id?: string
          coach_id?: string | null
          event_id?: string | null
          type?: "email" | "text" | "phone_call" | "in_person_visit" | "virtual_meeting" | "camp" | "showcase" | "tweet" | "dm"
          direction?: "outbound" | "inbound"
          subject?: string | null
          content?: string | null
          sentiment?: "positive" | "neutral" | "negative" | "very_positive" | null
          occurred_at?: string
          logged_by?: string
          attachments?: string[] | null
          notification_settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          school_id: string | null
          type: "showcase" | "camp" | "official_visit" | "unofficial_visit" | "game"
          name: string
          location: string | null
          start_date: string
          end_date: string
          coaches_present: string[] | null
          performance_notes: string | null
          stats_recorded: Json | null
          cost: number | null
          registered: boolean | null
          attended: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          school_id?: string | null
          type: "showcase" | "camp" | "official_visit" | "unofficial_visit" | "game"
          name: string
          location?: string | null
          start_date: string
          end_date: string
          coaches_present?: string[] | null
          performance_notes?: string | null
          stats_recorded?: Json | null
          cost?: number | null
          registered?: boolean | null
          attended?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          school_id?: string | null
          type?: "showcase" | "camp" | "official_visit" | "unofficial_visit" | "game"
          name?: string
          location?: string | null
          start_date?: string
          end_date?: string
          coaches_present?: string[] | null
          performance_notes?: string | null
          stats_recorded?: Json | null
          cost?: number | null
          registered?: boolean | null
          attended?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          id: string
          user_id: string
          recorded_date: string
          metric_type: string
          value: number
          unit: string | null
          event_id: string | null
          notes: string | null
          verified: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          recorded_date: string
          metric_type: string
          value: number
          unit?: string | null
          event_id?: string | null
          notes?: string | null
          verified?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          recorded_date?: string
          metric_type?: string
          value?: number
          unit?: string | null
          event_id?: string | null
          notes?: string | null
          verified?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          user_id: string
          type: "highlight_video" | "transcript" | "resume" | "rec_letter" | "questionnaire" | "stats_sheet"
          title: string
          description: string | null
          file_url: string | null
          file_type: string | null
          version: number | null
          school_id: string | null
          is_current: boolean | null
          shared_with_schools: string[] | null
          uploaded_by: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: "highlight_video" | "transcript" | "resume" | "rec_letter" | "questionnaire" | "stats_sheet"
          title: string
          description?: string | null
          file_url?: string | null
          file_type?: string | null
          version?: number | null
          school_id?: string | null
          is_current?: boolean | null
          shared_with_schools?: string[] | null
          uploaded_by: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: "highlight_video" | "transcript" | "resume" | "rec_letter" | "questionnaire" | "stats_sheet"
          title?: string
          description?: string | null
          file_url?: string | null
          file_type?: string | null
          version?: number | null
          school_id?: string | null
          is_current?: boolean | null
          shared_with_schools?: string[] | null
          uploaded_by?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: "follow_up_reminder" | "deadline_alert" | "daily_digest" | "inbound_interaction"
          title: string
          message: string | null
          related_entity_type: string | null
          related_entity_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          read_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: "follow_up_reminder" | "deadline_alert" | "daily_digest" | "inbound_interaction"
          title: string
          message?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          read_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: "follow_up_reminder" | "deadline_alert" | "daily_digest" | "inbound_interaction"
          title?: string
          message?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          read_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          current_phase: string | null
          email: string
          full_name: string | null
          icloud_sync_enabled: boolean | null
          id: string
          phase_milestone_data: Json | null
          phone: string | null
          recovery_mode_active: boolean | null
          recovery_plan_shown_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          status_label: string | null
          status_score: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_phase?: string | null
          email: string
          full_name?: string | null
          icloud_sync_enabled?: boolean | null
          id: string
          phase_milestone_data?: Json | null
          phone?: string | null
          recovery_mode_active?: boolean | null
          recovery_plan_shown_at?: string | null
          role: Database["public"]["Enums"]["user_role"]
          status_label?: string | null
          status_score?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_phase?: string | null
          email?: string
          full_name?: string | null
          icloud_sync_enabled?: boolean | null
          id?: string
          phase_milestone_data?: Json | null
          phone?: string | null
          recovery_mode_active?: boolean | null
          recovery_plan_shown_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status_label?: string | null
          status_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          id: string
          user_id: string
          school_id: string
          status: "pending" | "accepted" | "declined" | "expired"
          scholarship_amount: number | null
          conditions: string | null
          notes: string | null
          deadline_date: string | null
          received_date: string | null
          athletic_requirements: Json | null
          academic_requirements: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          school_id: string
          status?: "pending" | "accepted" | "declined" | "expired"
          scholarship_amount?: number | null
          conditions?: string | null
          notes?: string | null
          deadline_date?: string | null
          received_date?: string | null
          athletic_requirements?: Json | null
          academic_requirements?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          school_id?: string
          status?: "pending" | "accepted" | "declined" | "expired"
          scholarship_amount?: number | null
          conditions?: string | null
          notes?: string | null
          deadline_date?: string | null
          received_date?: string | null
          athletic_requirements?: Json | null
          academic_requirements?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          user_id: string
          notification_settings: Json | null
          communication_templates: Json | null
          dashboard_layout: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id: string
          notification_settings?: Json | null
          communication_templates?: Json | null
          dashboard_layout?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          notification_settings?: Json | null
          communication_templates?: Json | null
          dashboard_layout?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      communication_templates: {
        Row: {
          id: string
          user_id: string
          template_type: string
          name: string
          subject: string | null
          body: string | null
          variables: Json | null
          is_default: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          template_type: string
          name: string
          subject?: string | null
          body?: string | null
          variables?: Json | null
          is_default?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          template_type?: string
          name?: string
          subject?: string | null
          body?: string | null
          variables?: Json | null
          is_default?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      follow_up_reminders: {
        Row: {
          id: string
          user_id: string
          coach_id: string | null
          school_id: string | null
          interaction_id: string | null
          reminder_date: string
          reminder_type: "email" | "sms" | "phone_call" | null
          notes: string | null
          is_completed: boolean | null
          completed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          coach_id?: string | null
          school_id?: string | null
          interaction_id?: string | null
          reminder_date: string
          reminder_type?: "email" | "sms" | "phone_call" | null
          notes?: string | null
          is_completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          coach_id?: string | null
          school_id?: string | null
          interaction_id?: string | null
          reminder_date?: string
          reminder_type?: "email" | "sms" | "phone_call" | null
          notes?: string | null
          is_completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          id: string
          user_id: string
          name: string
          filters: Json | null
          is_default: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          filters?: Json | null
          is_default?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          filters?: Json | null
          is_default?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          id: string
          user_id: string
          search_term: string
          filters: Json | null
          result_count: number | null
          searched_at: string
        }
        Insert: {
          id?: string
          user_id: string
          search_term: string
          filters?: Json | null
          result_count?: number | null
          searched_at: string
        }
        Update: {
          id?: string
          user_id?: string
          search_term?: string
          filters?: Json | null
          result_count?: number | null
          searched_at?: string
        }
        Relationships: []
      }
      social_media_posts: {
        Row: {
          id: string
          coach_id: string | null
          school_id: string
          platform: "twitter" | "instagram"
          post_url: string
          post_content: string | null
          post_date: string | null
          is_recruiting_related: boolean | null
          flagged_for_review: boolean | null
          sentiment: "positive" | "neutral" | "negative" | "very_positive" | null
          engagement_count: number | null
          author_name: string | null
          author_handle: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          coach_id?: string | null
          school_id: string
          platform: "twitter" | "instagram"
          post_url: string
          post_content?: string | null
          post_date?: string | null
          is_recruiting_related?: boolean | null
          flagged_for_review?: boolean | null
          sentiment?: "positive" | "neutral" | "negative" | "very_positive" | null
          engagement_count?: number | null
          author_name?: string | null
          author_handle?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          coach_id?: string | null
          school_id?: string
          platform?: "twitter" | "instagram"
          post_url?: string
          post_content?: string | null
          post_date?: string | null
          is_recruiting_related?: boolean | null
          flagged_for_review?: boolean | null
          sentiment?: "positive" | "neutral" | "negative" | "very_positive" | null
          engagement_count?: number | null
          author_name?: string | null
          author_handle?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shared_records: {
        Row: {
          id: string
          shared_by_user_id: string
          shared_with_user_id: string
          record_type: string
          record_id: string
          access_level: "view" | "edit" | "admin"
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          shared_by_user_id: string
          shared_with_user_id: string
          record_type: string
          record_id: string
          access_level: "view" | "edit" | "admin"
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          shared_by_user_id?: string
          shared_with_user_id?: string
          record_type?: string
          record_id?: string
          access_level?: "view" | "edit" | "admin"
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      record_comments: {
        Row: {
          id: string
          shared_record_id: string
          user_id: string
          comment: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          shared_record_id: string
          user_id: string
          comment: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          shared_record_id?: string
          user_id?: string
          comment?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_tasks: {
        Row: {
          id: string
          user_id: string
          tasks: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          tasks?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          tasks?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recommendation_letters: {
        Row: {
          id: string
          user_id: string
          writer_name: string
          writer_title: string | null
          writer_email: string | null
          relationship: string | null
          requested_date: string | null
          due_date: string | null
          received_date: string | null
          status: "not_requested" | "requested" | "received" | "submitted"
          schools_submitted_to: string[] | null
          document_id: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          writer_name: string
          writer_title?: string | null
          writer_email?: string | null
          relationship?: string | null
          requested_date?: string | null
          due_date?: string | null
          received_date?: string | null
          status?: "not_requested" | "requested" | "received" | "submitted"
          schools_submitted_to?: string[] | null
          document_id?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          writer_name?: string
          writer_title?: string | null
          writer_email?: string | null
          relationship?: string | null
          requested_date?: string | null
          due_date?: string | null
          received_date?: string | null
          status?: "not_requested" | "requested" | "received" | "submitted"
          schools_submitted_to?: string[] | null
          document_id?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Enums: {
      user_role: "parent" | "student"
      school_division: "D1" | "D2" | "D3" | "NAIA" | "JUCO"
      school_status: "researching" | "contacted" | "interested" | "offer_received" | "declined" | "committed"
      coach_role: "head" | "assistant" | "recruiting"
      interaction_type: "email" | "text" | "phone_call" | "in_person_visit" | "virtual_meeting" | "camp" | "showcase" | "tweet" | "dm"
      interaction_direction: "outbound" | "inbound"
      interaction_sentiment: "positive" | "neutral" | "negative" | "very_positive"
      event_type: "showcase" | "camp" | "official_visit" | "unofficial_visit" | "game"
      document_type: "highlight_video" | "transcript" | "resume" | "rec_letter" | "questionnaire" | "stats_sheet"
      recommendation_status: "not_requested" | "requested" | "received" | "submitted"
      notification_type: "follow_up_reminder" | "deadline_alert" | "daily_digest" | "inbound_interaction"
      social_platform: "twitter" | "instagram"
    }
  }
}
