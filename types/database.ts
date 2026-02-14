export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      account_links: {
        Row: {
          accepted_at: string | null;
          confirmed_at: string | null;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          initiator_role: string;
          initiator_user_id: string;
          invitation_token: string | null;
          invited_at: string | null;
          invited_email: string;
          parent_user_id: string | null;
          player_user_id: string | null;
          relationship_type: string | null;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          initiator_role: string;
          initiator_user_id: string;
          invitation_token?: string | null;
          invited_at?: string | null;
          invited_email: string;
          parent_user_id?: string | null;
          player_user_id?: string | null;
          relationship_type?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          initiator_role?: string;
          initiator_user_id?: string;
          invitation_token?: string | null;
          invited_at?: string | null;
          invited_email?: string;
          parent_user_id?: string | null;
          player_user_id?: string | null;
          relationship_type?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "account_links_initiator_user_id_fkey";
            columns: ["initiator_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_links_parent_user_id_fkey";
            columns: ["parent_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_links_player_user_id_fkey";
            columns: ["player_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      athlete_task: {
        Row: {
          athlete_id: string;
          completed_at: string | null;
          created_at: string | null;
          id: string;
          is_recovery_task: boolean | null;
          status: string | null;
          task_id: string;
          updated_at: string | null;
        };
        Insert: {
          athlete_id: string;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          is_recovery_task?: boolean | null;
          status?: string | null;
          task_id: string;
          updated_at?: string | null;
        };
        Update: {
          athlete_id?: string;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          is_recovery_task?: boolean | null;
          status?: string | null;
          task_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "athlete_task_athlete_id_fkey";
            columns: ["athlete_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "athlete_task_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "task";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          created_at: string | null;
          description: string | null;
          error_message: string | null;
          expires_at: string | null;
          id: string;
          ip_address: unknown;
          metadata: Json | null;
          new_values: Json | null;
          old_values: Json | null;
          resource_id: string | null;
          resource_type: string;
          status: string | null;
          table_name: string | null;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          description?: string | null;
          error_message?: string | null;
          expires_at?: string | null;
          id?: string;
          ip_address?: unknown;
          metadata?: Json | null;
          new_values?: Json | null;
          old_values?: Json | null;
          resource_id?: string | null;
          resource_type: string;
          status?: string | null;
          table_name?: string | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          description?: string | null;
          error_message?: string | null;
          expires_at?: string | null;
          id?: string;
          ip_address?: unknown;
          metadata?: Json | null;
          new_values?: Json | null;
          old_values?: Json | null;
          resource_id?: string | null;
          resource_type?: string;
          status?: string | null;
          table_name?: string | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      coaches: {
        Row: {
          availability: Json | null;
          created_at: string | null;
          created_by: string | null;
          email: string | null;
          family_unit_id: string | null;
          first_name: string;
          id: string;
          instagram_handle: string | null;
          last_contact_date: string | null;
          last_name: string;
          notes: string | null;
          phone: string | null;
          private_notes: string | null;
          responsiveness_score: number | null;
          role: Database["public"]["Enums"]["coach_role"];
          school_id: string;
          twitter_handle: string | null;
          updated_at: string | null;
          updated_by: string | null;
          user_id: string;
        };
        Insert: {
          availability?: Json | null;
          created_at?: string | null;
          created_by?: string | null;
          email?: string | null;
          family_unit_id?: string | null;
          first_name: string;
          id?: string;
          instagram_handle?: string | null;
          last_contact_date?: string | null;
          last_name: string;
          notes?: string | null;
          phone?: string | null;
          private_notes?: string | null;
          responsiveness_score?: number | null;
          role: Database["public"]["Enums"]["coach_role"];
          school_id: string;
          twitter_handle?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          user_id: string;
        };
        Update: {
          availability?: Json | null;
          created_at?: string | null;
          created_by?: string | null;
          email?: string | null;
          family_unit_id?: string | null;
          first_name?: string;
          id?: string;
          instagram_handle?: string | null;
          last_contact_date?: string | null;
          last_name?: string;
          notes?: string | null;
          phone?: string | null;
          private_notes?: string | null;
          responsiveness_score?: number | null;
          role?: Database["public"]["Enums"]["coach_role"];
          school_id?: string;
          twitter_handle?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coaches_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coaches_family_unit_id_fkey";
            columns: ["family_unit_id"];
            isOneToOne: false;
            referencedRelation: "family_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coaches_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coaches_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coaches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      coaches_backup_pre_family: {
        Row: {
          availability: Json | null;
          created_at: string | null;
          created_by: string | null;
          email: string | null;
          family_unit_id: string | null;
          first_name: string | null;
          id: string | null;
          instagram_handle: string | null;
          last_contact_date: string | null;
          last_name: string | null;
          notes: string | null;
          phone: string | null;
          private_notes: string | null;
          responsiveness_score: number | null;
          role: Database["public"]["Enums"]["coach_role"] | null;
          school_id: string | null;
          twitter_handle: string | null;
          updated_at: string | null;
          updated_by: string | null;
          user_id: string | null;
        };
        Insert: {
          availability?: Json | null;
          created_at?: string | null;
          created_by?: string | null;
          email?: string | null;
          family_unit_id?: string | null;
          first_name?: string | null;
          id?: string | null;
          instagram_handle?: string | null;
          last_contact_date?: string | null;
          last_name?: string | null;
          notes?: string | null;
          phone?: string | null;
          private_notes?: string | null;
          responsiveness_score?: number | null;
          role?: Database["public"]["Enums"]["coach_role"] | null;
          school_id?: string | null;
          twitter_handle?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          user_id?: string | null;
        };
        Update: {
          availability?: Json | null;
          created_at?: string | null;
          created_by?: string | null;
          email?: string | null;
          family_unit_id?: string | null;
          first_name?: string | null;
          id?: string | null;
          instagram_handle?: string | null;
          last_contact_date?: string | null;
          last_name?: string | null;
          notes?: string | null;
          phone?: string | null;
          private_notes?: string | null;
          responsiveness_score?: number | null;
          role?: Database["public"]["Enums"]["coach_role"] | null;
          school_id?: string | null;
          twitter_handle?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      communication_templates: {
        Row: {
          body: string;
          created_at: string | null;
          description: string | null;
          id: string;
          is_favorite: boolean | null;
          is_predefined: boolean | null;
          name: string;
          subject: string | null;
          tags: string[] | null;
          type: string;
          unlock_conditions: Json | null;
          updated_at: string | null;
          use_count: number | null;
          user_id: string | null;
        };
        Insert: {
          body: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_favorite?: boolean | null;
          is_predefined?: boolean | null;
          name: string;
          subject?: string | null;
          tags?: string[] | null;
          type: string;
          unlock_conditions?: Json | null;
          updated_at?: string | null;
          use_count?: number | null;
          user_id?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_favorite?: boolean | null;
          is_predefined?: boolean | null;
          name?: string;
          subject?: string | null;
          tags?: string[] | null;
          type?: string;
          unlock_conditions?: Json | null;
          updated_at?: string | null;
          use_count?: number | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "communication_templates_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      data_ownership_snapshot: {
        Row: {
          created_at: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          link_id: string;
          original_owner_id: string;
        };
        Insert: {
          created_at?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          link_id: string;
          original_owner_id: string;
        };
        Update: {
          created_at?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          link_id?: string;
          original_owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "data_ownership_snapshot_link_id_fkey";
            columns: ["link_id"];
            isOneToOne: false;
            referencedRelation: "account_links";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "data_ownership_snapshot_original_owner_id_fkey";
            columns: ["original_owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          created_at: string | null;
          description: string | null;
          family_unit_id: string | null;
          file_type: string | null;
          file_url: string;
          health_status: string | null;
          id: string;
          is_current: boolean | null;
          last_health_check: string | null;
          school_id: string | null;
          shared_with_schools: string[] | null;
          title: string;
          type: Database["public"]["Enums"]["document_type"];
          updated_at: string | null;
          uploaded_by: string;
          user_id: string;
          version: number | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          family_unit_id?: string | null;
          file_type?: string | null;
          file_url: string;
          health_status?: string | null;
          id?: string;
          is_current?: boolean | null;
          last_health_check?: string | null;
          school_id?: string | null;
          shared_with_schools?: string[] | null;
          title: string;
          type: Database["public"]["Enums"]["document_type"];
          updated_at?: string | null;
          uploaded_by: string;
          user_id: string;
          version?: number | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          family_unit_id?: string | null;
          file_type?: string | null;
          file_url?: string;
          health_status?: string | null;
          id?: string;
          is_current?: boolean | null;
          last_health_check?: string | null;
          school_id?: string | null;
          shared_with_schools?: string[] | null;
          title?: string;
          type?: Database["public"]["Enums"]["document_type"];
          updated_at?: string | null;
          uploaded_by?: string;
          user_id?: string;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_family_unit_id_fkey";
            columns: ["family_unit_id"];
            isOneToOne: false;
            referencedRelation: "family_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      documents_backup_pre_family: {
        Row: {
          created_at: string | null;
          description: string | null;
          family_unit_id: string | null;
          file_type: string | null;
          file_url: string | null;
          health_status: string | null;
          id: string | null;
          is_current: boolean | null;
          last_health_check: string | null;
          school_id: string | null;
          shared_with_schools: string[] | null;
          title: string | null;
          type: Database["public"]["Enums"]["document_type"] | null;
          updated_at: string | null;
          uploaded_by: string | null;
          user_id: string | null;
          version: number | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          family_unit_id?: string | null;
          file_type?: string | null;
          file_url?: string | null;
          health_status?: string | null;
          id?: string | null;
          is_current?: boolean | null;
          last_health_check?: string | null;
          school_id?: string | null;
          shared_with_schools?: string[] | null;
          title?: string | null;
          type?: Database["public"]["Enums"]["document_type"] | null;
          updated_at?: string | null;
          uploaded_by?: string | null;
          user_id?: string | null;
          version?: number | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          family_unit_id?: string | null;
          file_type?: string | null;
          file_url?: string | null;
          health_status?: string | null;
          id?: string | null;
          is_current?: boolean | null;
          last_health_check?: string | null;
          school_id?: string | null;
          shared_with_schools?: string[] | null;
          title?: string | null;
          type?: Database["public"]["Enums"]["document_type"] | null;
          updated_at?: string | null;
          uploaded_by?: string | null;
          user_id?: string | null;
          version?: number | null;
        };
        Relationships: [];
      };
      events: {
        Row: {
          address: string | null;
          attended: boolean | null;
          checkin_time: string | null;
          city: string | null;
          coaches_present: string[] | null;
          cost: number | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          end_date: string | null;
          end_time: string | null;
          event_source: string | null;
          family_unit_id: string | null;
          id: string;
          location: string | null;
          name: string;
          performance_notes: string | null;
          registered: boolean | null;
          school_id: string | null;
          start_date: string;
          start_time: string | null;
          state: string | null;
          stats_recorded: Json | null;
          type: Database["public"]["Enums"]["event_type"];
          updated_at: string | null;
          updated_by: string | null;
          url: string | null;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          attended?: boolean | null;
          checkin_time?: string | null;
          city?: string | null;
          coaches_present?: string[] | null;
          cost?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          end_date?: string | null;
          end_time?: string | null;
          event_source?: string | null;
          family_unit_id?: string | null;
          id?: string;
          location?: string | null;
          name: string;
          performance_notes?: string | null;
          registered?: boolean | null;
          school_id?: string | null;
          start_date: string;
          start_time?: string | null;
          state?: string | null;
          stats_recorded?: Json | null;
          type: Database["public"]["Enums"]["event_type"];
          updated_at?: string | null;
          updated_by?: string | null;
          url?: string | null;
          user_id: string;
        };
        Update: {
          address?: string | null;
          attended?: boolean | null;
          checkin_time?: string | null;
          city?: string | null;
          coaches_present?: string[] | null;
          cost?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          end_date?: string | null;
          end_time?: string | null;
          event_source?: string | null;
          family_unit_id?: string | null;
          id?: string;
          location?: string | null;
          name?: string;
          performance_notes?: string | null;
          registered?: boolean | null;
          school_id?: string | null;
          start_date?: string;
          start_time?: string | null;
          state?: string | null;
          stats_recorded?: Json | null;
          type?: Database["public"]["Enums"]["event_type"];
          updated_at?: string | null;
          updated_by?: string | null;
          url?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_family_unit_id_fkey";
            columns: ["family_unit_id"];
            isOneToOne: false;
            referencedRelation: "family_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      events_backup_pre_family: {
        Row: {
          address: string | null;
          attended: boolean | null;
          checkin_time: string | null;
          city: string | null;
          coaches_present: string[] | null;
          cost: number | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          end_date: string | null;
          end_time: string | null;
          event_source: string | null;
          family_unit_id: string | null;
          id: string | null;
          location: string | null;
          name: string | null;
          performance_notes: string | null;
          registered: boolean | null;
          school_id: string | null;
          start_date: string | null;
          start_time: string | null;
          state: string | null;
          stats_recorded: Json | null;
          type: Database["public"]["Enums"]["event_type"] | null;
          updated_at: string | null;
          updated_by: string | null;
          url: string | null;
          user_id: string | null;
        };
        Insert: {
          address?: string | null;
          attended?: boolean | null;
          checkin_time?: string | null;
          city?: string | null;
          coaches_present?: string[] | null;
          cost?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          end_date?: string | null;
          end_time?: string | null;
          event_source?: string | null;
          family_unit_id?: string | null;
          id?: string | null;
          location?: string | null;
          name?: string | null;
          performance_notes?: string | null;
          registered?: boolean | null;
          school_id?: string | null;
          start_date?: string | null;
          start_time?: string | null;
          state?: string | null;
          stats_recorded?: Json | null;
          type?: Database["public"]["Enums"]["event_type"] | null;
          updated_at?: string | null;
          updated_by?: string | null;
          url?: string | null;
          user_id?: string | null;
        };
        Update: {
          address?: string | null;
          attended?: boolean | null;
          checkin_time?: string | null;
          city?: string | null;
          coaches_present?: string[] | null;
          cost?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          end_date?: string | null;
          end_time?: string | null;
          event_source?: string | null;
          family_unit_id?: string | null;
          id?: string | null;
          location?: string | null;
          name?: string | null;
          performance_notes?: string | null;
          registered?: boolean | null;
          school_id?: string | null;
          start_date?: string | null;
          start_time?: string | null;
          state?: string | null;
          stats_recorded?: Json | null;
          type?: Database["public"]["Enums"]["event_type"] | null;
          updated_at?: string | null;
          updated_by?: string | null;
          url?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      family_code_usage_log: {
        Row: {
          action: string;
          code_used: string;
          created_at: string | null;
          family_unit_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          action: string;
          code_used: string;
          created_at?: string | null;
          family_unit_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          action?: string;
          code_used?: string;
          created_at?: string | null;
          family_unit_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "family_code_usage_log_family_unit_id_fkey";
            columns: ["family_unit_id"];
            isOneToOne: false;
            referencedRelation: "family_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "family_code_usage_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      family_members: {
        Row: {
          added_at: string | null;
          family_unit_id: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          added_at?: string | null;
          family_unit_id: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          added_at?: string | null;
          family_unit_id?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "family_members_family_unit_id_fkey";
            columns: ["family_unit_id"];
            isOneToOne: false;
            referencedRelation: "family_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "family_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      family_units: {
        Row: {
          code_generated_at: string | null;
          created_at: string | null;
          family_code: string | null;
          family_name: string | null;
          id: string;
          player_user_id: string;
          updated_at: string | null;
        };
        Insert: {
          code_generated_at?: string | null;
          created_at?: string | null;
          family_code?: string | null;
          family_name?: string | null;
          id?: string;
          player_user_id: string;
          updated_at?: string | null;
        };
        Update: {
          code_generated_at?: string | null;
          created_at?: string | null;
          family_code?: string | null;
          family_name?: string | null;
          id?: string;
          player_user_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "family_units_student_user_id_fkey";
            columns: ["player_user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_up_reminders: {
        Row: {
          coach_id: string | null;
          completed_at: string | null;
          created_at: string | null;
          description: string | null;
          due_date: string;
          id: string;
          interaction_id: string | null;
          is_completed: boolean;
          notification_sent: boolean;
          priority: string;
          reminder_type: string;
          school_id: string | null;
          title: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          coach_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date: string;
          id?: string;
          interaction_id?: string | null;
          is_completed?: boolean;
          notification_sent?: boolean;
          priority?: string;
          reminder_type: string;
          school_id?: string | null;
          title: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          coach_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string;
          id?: string;
          interaction_id?: string | null;
          is_completed?: boolean;
          notification_sent?: boolean;
          priority?: string;
          reminder_type?: string;
          school_id?: string | null;
          title?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_up_reminders_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "coaches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_reminders_interaction_id_fkey";
            columns: ["interaction_id"];
            isOneToOne: false;
            referencedRelation: "interactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_reminders_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_reminders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      interactions: {
        Row: {
          attachments: string[] | null;
          coach_id: string | null;
          content: string | null;
          created_at: string | null;
          direction: Database["public"]["Enums"]["interaction_direction"];
          event_id: string | null;
          family_unit_id: string | null;
          id: string;
          logged_by: string;
          occurred_at: string;
          school_id: string;
          sentiment:
            | Database["public"]["Enums"]["interaction_sentiment"]
            | null;
          subject: string | null;
          type: Database["public"]["Enums"]["interaction_type"];
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          attachments?: string[] | null;
          coach_id?: string | null;
          content?: string | null;
          created_at?: string | null;
          direction: Database["public"]["Enums"]["interaction_direction"];
          event_id?: string | null;
          family_unit_id?: string | null;
          id?: string;
          logged_by: string;
          occurred_at: string;
          school_id: string;
          sentiment?:
            | Database["public"]["Enums"]["interaction_sentiment"]
            | null;
          subject?: string | null;
          type: Database["public"]["Enums"]["interaction_type"];
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          attachments?: string[] | null;
          coach_id?: string | null;
          content?: string | null;
          created_at?: string | null;
          direction?: Database["public"]["Enums"]["interaction_direction"];
          event_id?: string | null;
          family_unit_id?: string | null;
          id?: string;
          logged_by?: string;
          occurred_at?: string;
          school_id?: string;
          sentiment?:
            | Database["public"]["Enums"]["interaction_sentiment"]
            | null;
          subject?: string | null;
          type?: Database["public"]["Enums"]["interaction_type"];
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_interactions_event_id";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interactions_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "coaches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interactions_family_unit_id_fkey";
            columns: ["family_unit_id"];
            isOneToOne: false;
            referencedRelation: "family_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interactions_logged_by_fkey";
            columns: ["logged_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interactions_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interactions_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      interactions_backup_pre_family: {
        Row: {
          attachments: string[] | null;
          coach_id: string | null;
          content: string | null;
          created_at: string | null;
          direction:
            | Database["public"]["Enums"]["interaction_direction"]
            | null;
          event_id: string | null;
          family_unit_id: string | null;
          id: string | null;
          logged_by: string | null;
          occurred_at: string | null;
          school_id: string | null;
          sentiment:
            | Database["public"]["Enums"]["interaction_sentiment"]
            | null;
          subject: string | null;
          type: Database["public"]["Enums"]["interaction_type"] | null;
          updated_by: string | null;
        };
        Insert: {
          attachments?: string[] | null;
          coach_id?: string | null;
          content?: string | null;
          created_at?: string | null;
          direction?:
            | Database["public"]["Enums"]["interaction_direction"]
            | null;
          event_id?: string | null;
          family_unit_id?: string | null;
          id?: string | null;
          logged_by?: string | null;
          occurred_at?: string | null;
          school_id?: string | null;
          sentiment?:
            | Database["public"]["Enums"]["interaction_sentiment"]
            | null;
          subject?: string | null;
          type?: Database["public"]["Enums"]["interaction_type"] | null;
          updated_by?: string | null;
        };
        Update: {
          attachments?: string[] | null;
          coach_id?: string | null;
          content?: string | null;
          created_at?: string | null;
          direction?:
            | Database["public"]["Enums"]["interaction_direction"]
            | null;
          event_id?: string | null;
          family_unit_id?: string | null;
          id?: string | null;
          logged_by?: string | null;
          occurred_at?: string | null;
          school_id?: string | null;
          sentiment?:
            | Database["public"]["Enums"]["interaction_sentiment"]
            | null;
          subject?: string | null;
          type?: Database["public"]["Enums"]["interaction_type"] | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          created_at: string | null;
          email_sent: boolean | null;
          email_sent_at: string | null;
          id: string;
          message: string | null;
          priority: string | null;
          read_at: string | null;
          related_entity_id: string | null;
          related_entity_type: string | null;
          scheduled_for: string | null;
          sent_at: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          email_sent?: boolean | null;
          email_sent_at?: string | null;
          id?: string;
          message?: string | null;
          priority?: string | null;
          read_at?: string | null;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          scheduled_for?: string | null;
          sent_at?: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          email_sent?: boolean | null;
          email_sent_at?: string | null;
          id?: string;
          message?: string | null;
          priority?: string | null;
          read_at?: string | null;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          scheduled_for?: string | null;
          sent_at?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      offers: {
        Row: {
          coach_id: string | null;
          conditions: string | null;
          created_at: string | null;
          deadline_date: string | null;
          family_unit_id: string | null;
          id: string;
          notes: string | null;
          offer_date: string;
          offer_type: string;
          scholarship_amount: number | null;
          scholarship_percentage: number | null;
          school_id: string;
          status: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          coach_id?: string | null;
          conditions?: string | null;
          created_at?: string | null;
          deadline_date?: string | null;
          family_unit_id?: string | null;
          id?: string;
          notes?: string | null;
          offer_date?: string;
          offer_type: string;
          scholarship_amount?: number | null;
          scholarship_percentage?: number | null;
          school_id: string;
          status?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          coach_id?: string | null;
          conditions?: string | null;
          created_at?: string | null;
          deadline_date?: string | null;
          family_unit_id?: string | null;
          id?: string;
          notes?: string | null;
          offer_date?: string;
          offer_type?: string;
          scholarship_amount?: number | null;
          scholarship_percentage?: number | null;
          school_id?: string;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offers_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "coaches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_family_unit_id_fkey";
            columns: ["family_unit_id"];
            isOneToOne: false;
            referencedRelation: "family_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      parent_view_log: {
        Row: {
          athlete_id: string;
          id: string;
          parent_user_id: string;
          viewed_at: string | null;
          viewed_item_id: string | null;
          viewed_item_type: string;
        };
        Insert: {
          athlete_id: string;
          id?: string;
          parent_user_id: string;
          viewed_at?: string | null;
          viewed_item_id?: string | null;
          viewed_item_type: string;
        };
        Update: {
          athlete_id?: string;
          id?: string;
          parent_user_id?: string;
          viewed_at?: string | null;
          viewed_item_id?: string | null;
          viewed_item_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parent_view_log_athlete_id_fkey";
            columns: ["athlete_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parent_view_log_parent_user_id_fkey";
            columns: ["parent_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      performance_metrics: {
        Row: {
          created_at: string | null;
          event_id: string | null;
          family_unit_id: string | null;
          id: string;
          metric_type: string;
          notes: string | null;
          recorded_date: string;
          unit: string | null;
          user_id: string;
          value: number;
          verified: boolean | null;
        };
        Insert: {
          created_at?: string | null;
          event_id?: string | null;
          family_unit_id?: string | null;
          id?: string;
          metric_type: string;
          notes?: string | null;
          recorded_date: string;
          unit?: string | null;
          user_id: string;
          value: number;
          verified?: boolean | null;
        };
        Update: {
          created_at?: string | null;
          event_id?: string | null;
          family_unit_id?: string | null;
          id?: string;
          metric_type?: string;
          notes?: string | null;
          recorded_date?: string;
          unit?: string | null;
          user_id?: string;
          value?: number;
          verified?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "performance_metrics_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "performance_metrics_family_unit_id_fkey";
            columns: ["family_unit_id"];
            isOneToOne: false;
            referencedRelation: "family_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "performance_metrics_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      performance_metrics_backup_pre_family: {
        Row: {
          created_at: string | null;
          event_id: string | null;
          family_unit_id: string | null;
          id: string | null;
          metric_type: string | null;
          notes: string | null;
          recorded_date: string | null;
          unit: string | null;
          user_id: string | null;
          value: number | null;
          verified: boolean | null;
        };
        Insert: {
          created_at?: string | null;
          event_id?: string | null;
          family_unit_id?: string | null;
          id?: string | null;
          metric_type?: string | null;
          notes?: string | null;
          recorded_date?: string | null;
          unit?: string | null;
          user_id?: string | null;
          value?: number | null;
          verified?: boolean | null;
        };
        Update: {
          created_at?: string | null;
          event_id?: string | null;
          family_unit_id?: string | null;
          id?: string | null;
          metric_type?: string | null;
          notes?: string | null;
          recorded_date?: string | null;
          unit?: string | null;
          user_id?: string | null;
          value?: number | null;
          verified?: boolean | null;
        };
        Relationships: [];
      };
      positions: {
        Row: {
          created_at: string | null;
          display_order: number;
          id: string;
          name: string;
          sport_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          display_order?: number;
          id?: string;
          name: string;
          sport_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          display_order?: number;
          id?: string;
          name?: string;
          sport_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "positions_sport_id_fkey";
            columns: ["sport_id"];
            isOneToOne: false;
            referencedRelation: "sports";
            referencedColumns: ["id"];
          },
        ];
      };
      preference_history: {
        Row: {
          category: string;
          changed_by: string;
          changed_fields: string[];
          created_at: string | null;
          id: string;
          new_value: Json | null;
          old_value: Json | null;
          user_id: string;
        };
        Insert: {
          category: string;
          changed_by: string;
          changed_fields?: string[];
          created_at?: string | null;
          id?: string;
          new_value?: Json | null;
          old_value?: Json | null;
          user_id: string;
        };
        Update: {
          category?: string;
          changed_by?: string;
          changed_fields?: string[];
          created_at?: string | null;
          id?: string;
          new_value?: Json | null;
          old_value?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "preference_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      recommendation_letters: {
        Row: {
          created_at: string | null;
          document_id: string | null;
          due_date: string | null;
          id: string;
          notes: string | null;
          received_date: string | null;
          relationship: string | null;
          requested_date: string | null;
          schools_submitted_to: string[] | null;
          status: Database["public"]["Enums"]["recommendation_status"] | null;
          updated_at: string | null;
          user_id: string;
          writer_email: string | null;
          writer_name: string;
          writer_title: string | null;
        };
        Insert: {
          created_at?: string | null;
          document_id?: string | null;
          due_date?: string | null;
          id?: string;
          notes?: string | null;
          received_date?: string | null;
          relationship?: string | null;
          requested_date?: string | null;
          schools_submitted_to?: string[] | null;
          status?: Database["public"]["Enums"]["recommendation_status"] | null;
          updated_at?: string | null;
          user_id: string;
          writer_email?: string | null;
          writer_name: string;
          writer_title?: string | null;
        };
        Update: {
          created_at?: string | null;
          document_id?: string | null;
          due_date?: string | null;
          id?: string;
          notes?: string | null;
          received_date?: string | null;
          relationship?: string | null;
          requested_date?: string | null;
          schools_submitted_to?: string[] | null;
          status?: Database["public"]["Enums"]["recommendation_status"] | null;
          updated_at?: string | null;
          user_id?: string;
          writer_email?: string | null;
          writer_name?: string;
          writer_title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recommendation_letters_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recommendation_letters_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      school_status_history: {
        Row: {
          changed_at: string;
          changed_by: string;
          created_at: string | null;
          id: string;
          new_status: string;
          notes: string | null;
          previous_status: string | null;
          school_id: string;
        };
        Insert: {
          changed_at?: string;
          changed_by: string;
          created_at?: string | null;
          id?: string;
          new_status: string;
          notes?: string | null;
          previous_status?: string | null;
          school_id: string;
        };
        Update: {
          changed_at?: string;
          changed_by?: string;
          created_at?: string | null;
          id?: string;
          new_status?: string;
          notes?: string | null;
          previous_status?: string | null;
          school_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "school_status_history_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      schools: {
        Row: {
          academic_info: Json | null;
          amenities: Json | null;
          coaching_philosophy: string | null;
          coaching_style: string | null;
          communication_style: string | null;
          conference: string | null;
          cons: string[] | null;
          created_at: string | null;
          created_by: string | null;
          division: Database["public"]["Enums"]["school_division"] | null;
          family_unit_id: string | null;
          favicon_url: string | null;
          fit_score: number | null;
          fit_score_data: Json | null;
          fit_tier: string | null;
          id: string;
          instagram_handle: string | null;
          is_favorite: boolean | null;
          location: string | null;
          name: string;
          notes: string | null;
          offer_details: Json | null;
          priority_tier: string | null;
          private_notes: Json | null;
          pros: string[] | null;
          ranking: number | null;
          recruiting_approach: string | null;
          status: Database["public"]["Enums"]["school_status"] | null;
          status_changed_at: string | null;
          success_metrics: string | null;
          twitter_handle: string | null;
          updated_at: string | null;
          updated_by: string | null;
          user_id: string;
          website: string | null;
        };
        Insert: {
          academic_info?: Json | null;
          amenities?: Json | null;
          coaching_philosophy?: string | null;
          coaching_style?: string | null;
          communication_style?: string | null;
          conference?: string | null;
          cons?: string[] | null;
          created_at?: string | null;
          created_by?: string | null;
          division?: Database["public"]["Enums"]["school_division"] | null;
          family_unit_id?: string | null;
          favicon_url?: string | null;
          fit_score?: number | null;
          fit_score_data?: Json | null;
          fit_tier?: string | null;
          id?: string;
          instagram_handle?: string | null;
          is_favorite?: boolean | null;
          location?: string | null;
          name: string;
          notes?: string | null;
          offer_details?: Json | null;
          priority_tier?: string | null;
          private_notes?: Json | null;
          pros?: string[] | null;
          ranking?: number | null;
          recruiting_approach?: string | null;
          status?: Database["public"]["Enums"]["school_status"] | null;
          status_changed_at?: string | null;
          success_metrics?: string | null;
          twitter_handle?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          user_id: string;
          website?: string | null;
        };
        Update: {
          academic_info?: Json | null;
          amenities?: Json | null;
          coaching_philosophy?: string | null;
          coaching_style?: string | null;
          communication_style?: string | null;
          conference?: string | null;
          cons?: string[] | null;
          created_at?: string | null;
          created_by?: string | null;
          division?: Database["public"]["Enums"]["school_division"] | null;
          family_unit_id?: string | null;
          favicon_url?: string | null;
          fit_score?: number | null;
          fit_score_data?: Json | null;
          fit_tier?: string | null;
          id?: string;
          instagram_handle?: string | null;
          is_favorite?: boolean | null;
          location?: string | null;
          name?: string;
          notes?: string | null;
          offer_details?: Json | null;
          priority_tier?: string | null;
          private_notes?: Json | null;
          pros?: string[] | null;
          ranking?: number | null;
          recruiting_approach?: string | null;
          status?: Database["public"]["Enums"]["school_status"] | null;
          status_changed_at?: string | null;
          success_metrics?: string | null;
          twitter_handle?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          user_id?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "schools_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schools_family_unit_id_fkey";
            columns: ["family_unit_id"];
            isOneToOne: false;
            referencedRelation: "family_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schools_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schools_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      schools_backup_pre_family: {
        Row: {
          academic_info: Json | null;
          amenities: Json | null;
          coaching_philosophy: string | null;
          coaching_style: string | null;
          communication_style: string | null;
          conference: string | null;
          cons: string[] | null;
          created_at: string | null;
          created_by: string | null;
          division: Database["public"]["Enums"]["school_division"] | null;
          family_unit_id: string | null;
          favicon_url: string | null;
          fit_score: number | null;
          fit_score_data: Json | null;
          fit_tier: string | null;
          id: string | null;
          instagram_handle: string | null;
          is_favorite: boolean | null;
          location: string | null;
          name: string | null;
          notes: string | null;
          offer_details: Json | null;
          priority_tier: string | null;
          private_notes: Json | null;
          pros: string[] | null;
          ranking: number | null;
          recruiting_approach: string | null;
          status: Database["public"]["Enums"]["school_status"] | null;
          status_changed_at: string | null;
          success_metrics: string | null;
          twitter_handle: string | null;
          updated_at: string | null;
          updated_by: string | null;
          user_id: string | null;
          website: string | null;
        };
        Insert: {
          academic_info?: Json | null;
          amenities?: Json | null;
          coaching_philosophy?: string | null;
          coaching_style?: string | null;
          communication_style?: string | null;
          conference?: string | null;
          cons?: string[] | null;
          created_at?: string | null;
          created_by?: string | null;
          division?: Database["public"]["Enums"]["school_division"] | null;
          family_unit_id?: string | null;
          favicon_url?: string | null;
          fit_score?: number | null;
          fit_score_data?: Json | null;
          fit_tier?: string | null;
          id?: string | null;
          instagram_handle?: string | null;
          is_favorite?: boolean | null;
          location?: string | null;
          name?: string | null;
          notes?: string | null;
          offer_details?: Json | null;
          priority_tier?: string | null;
          private_notes?: Json | null;
          pros?: string[] | null;
          ranking?: number | null;
          recruiting_approach?: string | null;
          status?: Database["public"]["Enums"]["school_status"] | null;
          status_changed_at?: string | null;
          success_metrics?: string | null;
          twitter_handle?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          user_id?: string | null;
          website?: string | null;
        };
        Update: {
          academic_info?: Json | null;
          amenities?: Json | null;
          coaching_philosophy?: string | null;
          coaching_style?: string | null;
          communication_style?: string | null;
          conference?: string | null;
          cons?: string[] | null;
          created_at?: string | null;
          created_by?: string | null;
          division?: Database["public"]["Enums"]["school_division"] | null;
          family_unit_id?: string | null;
          favicon_url?: string | null;
          fit_score?: number | null;
          fit_score_data?: Json | null;
          fit_tier?: string | null;
          id?: string | null;
          instagram_handle?: string | null;
          is_favorite?: boolean | null;
          location?: string | null;
          name?: string | null;
          notes?: string | null;
          offer_details?: Json | null;
          priority_tier?: string | null;
          private_notes?: Json | null;
          pros?: string[] | null;
          ranking?: number | null;
          recruiting_approach?: string | null;
          status?: Database["public"]["Enums"]["school_status"] | null;
          status_changed_at?: string | null;
          success_metrics?: string | null;
          twitter_handle?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          user_id?: string | null;
          website?: string | null;
        };
        Relationships: [];
      };
      social_media_posts: {
        Row: {
          author_handle: string | null;
          author_name: string | null;
          coach_id: string | null;
          created_at: string | null;
          engagement_count: number | null;
          flagged_for_review: boolean | null;
          id: string;
          is_recruiting_related: boolean | null;
          notes: string | null;
          platform: Database["public"]["Enums"]["social_platform"];
          post_content: string | null;
          post_date: string | null;
          post_url: string;
          school_id: string;
          sentiment: string | null;
          updated_at: string | null;
        };
        Insert: {
          author_handle?: string | null;
          author_name?: string | null;
          coach_id?: string | null;
          created_at?: string | null;
          engagement_count?: number | null;
          flagged_for_review?: boolean | null;
          id?: string;
          is_recruiting_related?: boolean | null;
          notes?: string | null;
          platform: Database["public"]["Enums"]["social_platform"];
          post_content?: string | null;
          post_date?: string | null;
          post_url: string;
          school_id: string;
          sentiment?: string | null;
          updated_at?: string | null;
        };
        Update: {
          author_handle?: string | null;
          author_name?: string | null;
          coach_id?: string | null;
          created_at?: string | null;
          engagement_count?: number | null;
          flagged_for_review?: boolean | null;
          id?: string;
          is_recruiting_related?: boolean | null;
          notes?: string | null;
          platform?: Database["public"]["Enums"]["social_platform"];
          post_content?: string | null;
          post_date?: string | null;
          post_url?: string;
          school_id?: string;
          sentiment?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "social_media_posts_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "coaches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_media_posts_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      sports: {
        Row: {
          created_at: string | null;
          display_order: number;
          has_position_list: boolean;
          id: string;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          display_order?: number;
          has_position_list?: boolean;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          display_order?: number;
          has_position_list?: boolean;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      suggestion: {
        Row: {
          action_type: string | null;
          athlete_id: string;
          completed: boolean | null;
          completed_at: string | null;
          created_at: string | null;
          dismissed: boolean | null;
          dismissed_at: string | null;
          id: string;
          message: string;
          pending_surface: boolean | null;
          related_school_id: string | null;
          related_task_id: string | null;
          rule_type: string;
          surfaced_at: string | null;
          updated_at: string | null;
          urgency: string;
        };
        Insert: {
          action_type?: string | null;
          athlete_id: string;
          completed?: boolean | null;
          completed_at?: string | null;
          created_at?: string | null;
          dismissed?: boolean | null;
          dismissed_at?: string | null;
          id?: string;
          message: string;
          pending_surface?: boolean | null;
          related_school_id?: string | null;
          related_task_id?: string | null;
          rule_type: string;
          surfaced_at?: string | null;
          updated_at?: string | null;
          urgency: string;
        };
        Update: {
          action_type?: string | null;
          athlete_id?: string;
          completed?: boolean | null;
          completed_at?: string | null;
          created_at?: string | null;
          dismissed?: boolean | null;
          dismissed_at?: string | null;
          id?: string;
          message?: string;
          pending_surface?: boolean | null;
          related_school_id?: string | null;
          related_task_id?: string | null;
          rule_type?: string;
          surfaced_at?: string | null;
          updated_at?: string | null;
          urgency?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suggestion_athlete_id_fkey";
            columns: ["athlete_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suggestion_related_school_id_fkey";
            columns: ["related_school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suggestion_related_task_id_fkey";
            columns: ["related_task_id"];
            isOneToOne: false;
            referencedRelation: "task";
            referencedColumns: ["id"];
          },
        ];
      };
      task: {
        Row: {
          category: string;
          created_at: string | null;
          dependency_task_ids: string[] | null;
          description: string | null;
          division_applicability: string[] | null;
          failure_risk: string | null;
          grade_level: number;
          id: string;
          required: boolean | null;
          title: string;
          updated_at: string | null;
          why_it_matters: string | null;
        };
        Insert: {
          category: string;
          created_at?: string | null;
          dependency_task_ids?: string[] | null;
          description?: string | null;
          division_applicability?: string[] | null;
          failure_risk?: string | null;
          grade_level: number;
          id?: string;
          required?: boolean | null;
          title: string;
          updated_at?: string | null;
          why_it_matters?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string | null;
          dependency_task_ids?: string[] | null;
          description?: string | null;
          division_applicability?: string[] | null;
          failure_risk?: string | null;
          grade_level?: number;
          id?: string;
          required?: boolean | null;
          title?: string;
          updated_at?: string | null;
          why_it_matters?: string | null;
        };
        Relationships: [];
      };
      user_notes: {
        Row: {
          created_at: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          note_content: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          note_content?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          note_content?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          category: string;
          created_at: string | null;
          data: Json;
          id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          category: string;
          created_at?: string | null;
          data?: Json;
          id?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string | null;
          data?: Json;
          id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey1";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences_v1_backup: {
        Row: {
          communication_templates: Json | null;
          created_at: string | null;
          dashboard_layout: Json | null;
          home_location: Json | null;
          notification_settings: Json | null;
          player_details: Json | null;
          preference_history: Json | null;
          school_preferences: Json | null;
          social_sync_settings: Json | null;
          updated_at: string | null;
          user_id: string;
          user_tasks: Json | null;
        };
        Insert: {
          communication_templates?: Json | null;
          created_at?: string | null;
          dashboard_layout?: Json | null;
          home_location?: Json | null;
          notification_settings?: Json | null;
          player_details?: Json | null;
          preference_history?: Json | null;
          school_preferences?: Json | null;
          social_sync_settings?: Json | null;
          updated_at?: string | null;
          user_id: string;
          user_tasks?: Json | null;
        };
        Update: {
          communication_templates?: Json | null;
          created_at?: string | null;
          dashboard_layout?: Json | null;
          home_location?: Json | null;
          notification_settings?: Json | null;
          player_details?: Json | null;
          preference_history?: Json | null;
          school_preferences?: Json | null;
          social_sync_settings?: Json | null;
          updated_at?: string | null;
          user_id?: string;
          user_tasks?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          act_score: number | null;
          created_at: string | null;
          current_phase: string | null;
          email: string;
          full_name: string | null;
          gpa: number | null;
          graduation_year: number | null;
          icloud_sync_enabled: boolean | null;
          id: string;
          is_admin: boolean | null;
          is_preview_mode: boolean;
          onboarding_completed: boolean;
          phase_milestone_data: Json | null;
          phone: string | null;
          primary_position_custom: string | null;
          primary_position_id: string | null;
          primary_sport_id: string | null;
          profile_completeness: number | null;
          recovery_mode_active: boolean | null;
          recovery_plan_shown_at: string | null;
          role: Database["public"]["Enums"]["user_role"];
          sat_score: number | null;
          secondary_position_custom: string | null;
          secondary_position_id: string | null;
          secondary_sport_id: string | null;
          status_label: string | null;
          status_score: number | null;
          updated_at: string | null;
          zip_code: string | null;
        };
        Insert: {
          act_score?: number | null;
          created_at?: string | null;
          current_phase?: string | null;
          email: string;
          full_name?: string | null;
          gpa?: number | null;
          graduation_year?: number | null;
          icloud_sync_enabled?: boolean | null;
          id: string;
          is_admin?: boolean | null;
          is_preview_mode?: boolean;
          onboarding_completed?: boolean;
          phase_milestone_data?: Json | null;
          phone?: string | null;
          primary_position_custom?: string | null;
          primary_position_id?: string | null;
          primary_sport_id?: string | null;
          profile_completeness?: number | null;
          recovery_mode_active?: boolean | null;
          recovery_plan_shown_at?: string | null;
          role: Database["public"]["Enums"]["user_role"];
          sat_score?: number | null;
          secondary_position_custom?: string | null;
          secondary_position_id?: string | null;
          secondary_sport_id?: string | null;
          status_label?: string | null;
          status_score?: number | null;
          updated_at?: string | null;
          zip_code?: string | null;
        };
        Update: {
          act_score?: number | null;
          created_at?: string | null;
          current_phase?: string | null;
          email?: string;
          full_name?: string | null;
          gpa?: number | null;
          graduation_year?: number | null;
          icloud_sync_enabled?: boolean | null;
          id?: string;
          is_admin?: boolean | null;
          is_preview_mode?: boolean;
          onboarding_completed?: boolean;
          phase_milestone_data?: Json | null;
          phone?: string | null;
          primary_position_custom?: string | null;
          primary_position_id?: string | null;
          primary_sport_id?: string | null;
          profile_completeness?: number | null;
          recovery_mode_active?: boolean | null;
          recovery_plan_shown_at?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          sat_score?: number | null;
          secondary_position_custom?: string | null;
          secondary_position_id?: string | null;
          secondary_sport_id?: string | null;
          status_label?: string | null;
          status_score?: number | null;
          updated_at?: string | null;
          zip_code?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_primary_position_id_fkey";
            columns: ["primary_position_id"];
            isOneToOne: false;
            referencedRelation: "positions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "users_primary_sport_id_fkey";
            columns: ["primary_sport_id"];
            isOneToOne: false;
            referencedRelation: "sports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "users_secondary_position_id_fkey";
            columns: ["secondary_position_id"];
            isOneToOne: false;
            referencedRelation: "positions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "users_secondary_sport_id_fkey";
            columns: ["secondary_sport_id"];
            isOneToOne: false;
            referencedRelation: "sports";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_audit_log: {
        Args: {
          p_action: string;
          p_description?: string;
          p_error_message?: string;
          p_ip_address?: unknown;
          p_metadata?: Json;
          p_new_values?: Json;
          p_old_values?: Json;
          p_resource_id?: string;
          p_resource_type: string;
          p_status?: string;
          p_table_name?: string;
          p_user_agent?: string;
          p_user_id: string;
        };
        Returns: string;
      };
      delete_expired_audit_logs: {
        Args: never;
        Returns: {
          deleted_count: number;
        }[];
      };
      duplicate_data_on_unlink: {
        Args: { p_link_id: string; p_user_keeping_copy: string };
        Returns: undefined;
      };
      expire_old_invitations: { Args: never; Returns: undefined };
      get_accessible_athletes: {
        Args: never;
        Returns: {
          athlete_id: string;
          family_unit_id: string;
        }[];
      };
      get_athlete_status: {
        Args: { p_user_id: string };
        Returns: {
          academic_standing_score: number;
          coach_interest_score: number;
          completed_task_count: number;
          interaction_frequency_score: number;
          last_interaction_date: string;
          school_count: number;
          task_completion_rate: number;
        }[];
      };
      get_linked_user_ids: {
        Args: never;
        Returns: {
          user_id: string;
        }[];
      };
      get_primary_family_id: { Args: never; Returns: string };
      get_user_family_ids: {
        Args: never;
        Returns: {
          family_unit_id: string;
        }[];
      };
      is_data_owner: { Args: { target_user_id: string }; Returns: boolean };
      is_parent_viewing_athlete: {
        Args: { target_athlete_id: string };
        Returns: boolean;
      };
      is_parent_viewing_linked_athlete: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
      safe_jsonb_extract: { Args: { key: string; obj: Json }; Returns: Json };
      snapshot_data_ownership: {
        Args: { p_link_id: string; p_parent_id: string; p_player_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      coach_role: "head" | "assistant" | "recruiting";
      document_type:
        | "highlight_video"
        | "transcript"
        | "resume"
        | "rec_letter"
        | "questionnaire"
        | "stats_sheet";
      event_type:
        | "showcase"
        | "camp"
        | "official_visit"
        | "unofficial_visit"
        | "game";
      interaction_direction: "outbound" | "inbound";
      interaction_sentiment:
        | "positive"
        | "neutral"
        | "negative"
        | "very_positive";
      interaction_type:
        | "email"
        | "text"
        | "phone_call"
        | "in_person_visit"
        | "virtual_meeting"
        | "camp"
        | "showcase"
        | "tweet"
        | "dm"
        | "game"
        | "unofficial_visit"
        | "official_visit"
        | "other";
      notification_type:
        | "follow_up_reminder"
        | "deadline_alert"
        | "daily_digest"
        | "inbound_interaction";
      recommendation_status:
        | "not_requested"
        | "requested"
        | "received"
        | "submitted";
      school_division: "D1" | "D2" | "D3" | "NAIA" | "JUCO";
      school_status:
        | "researching"
        | "contacted"
        | "interested"
        | "offer_received"
        | "declined"
        | "committed"
        | "camp_invite"
        | "recruited"
        | "official_visit_invited"
        | "official_visit_scheduled"
        | "not_pursuing";
      social_platform: "twitter" | "instagram";
      user_role: "admin" | "parent" | "player";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      coach_role: ["head", "assistant", "recruiting"],
      document_type: [
        "highlight_video",
        "transcript",
        "resume",
        "rec_letter",
        "questionnaire",
        "stats_sheet",
      ],
      event_type: [
        "showcase",
        "camp",
        "official_visit",
        "unofficial_visit",
        "game",
      ],
      interaction_direction: ["outbound", "inbound"],
      interaction_sentiment: [
        "positive",
        "neutral",
        "negative",
        "very_positive",
      ],
      interaction_type: [
        "email",
        "text",
        "phone_call",
        "in_person_visit",
        "virtual_meeting",
        "camp",
        "showcase",
        "tweet",
        "dm",
        "game",
        "unofficial_visit",
        "official_visit",
        "other",
      ],
      notification_type: [
        "follow_up_reminder",
        "deadline_alert",
        "daily_digest",
        "inbound_interaction",
      ],
      recommendation_status: [
        "not_requested",
        "requested",
        "received",
        "submitted",
      ],
      school_division: ["D1", "D2", "D3", "NAIA", "JUCO"],
      school_status: [
        "researching",
        "contacted",
        "interested",
        "offer_received",
        "declined",
        "committed",
        "camp_invite",
        "recruited",
        "official_visit_invited",
        "official_visit_scheduled",
        "not_pursuing",
      ],
      social_platform: ["twitter", "instagram"],
      user_role: ["admin", "parent", "player"],
    },
  },
} as const;
