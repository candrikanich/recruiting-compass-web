export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
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
      coaches: {
        Row: {
          availability: Json | null;
          created_at: string | null;
          created_by: string | null;
          email: string | null;
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
      documents: {
        Row: {
          created_at: string | null;
          description: string | null;
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
      interactions: {
        Row: {
          attachments: string[] | null;
          coach_id: string | null;
          content: string | null;
          created_at: string | null;
          direction: Database["public"]["Enums"]["interaction_direction"];
          event_id: string | null;
          id: string;
          logged_by: string;
          occurred_at: string;
          school_id: string;
          sentiment: Database["public"]["Enums"]["interaction_sentiment"] | null;
          subject: string | null;
          type: Database["public"]["Enums"]["interaction_type"];
          updated_by: string | null;
        };
        Insert: {
          attachments?: string[] | null;
          coach_id?: string | null;
          content?: string | null;
          created_at?: string | null;
          direction: Database["public"]["Enums"]["interaction_direction"];
          event_id?: string | null;
          id?: string;
          logged_by: string;
          occurred_at: string;
          school_id: string;
          sentiment?:
            | Database["public"]["Enums"]["interaction_sentiment"]
            | null;
          subject?: string | null;
          type: Database["public"]["Enums"]["interaction_type"];
          updated_by?: string | null;
        };
        Update: {
          attachments?: string[] | null;
          coach_id?: string | null;
          content?: string | null;
          created_at?: string | null;
          direction?: Database["public"]["Enums"]["interaction_direction"];
          event_id?: string | null;
          id?: string;
          logged_by?: string;
          occurred_at?: string;
          school_id?: string;
          sentiment?:
            | Database["public"]["Enums"]["interaction_sentiment"]
            | null;
          subject?: string | null;
          type?: Database["public"]["Enums"]["interaction_type"];
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
      performance_metrics: {
        Row: {
          created_at: string | null;
          event_id: string | null;
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
            foreignKeyName: "performance_metrics_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
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
      users: {
        Row: {
          created_at: string | null;
          current_phase: string | null;
          email: string;
          full_name: string | null;
          graduation_year: number | null;
          id: string;
          is_admin: boolean | null;
          role: Database["public"]["Enums"]["user_role"];
          status_label: string | null;
          status_score: number | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          current_phase?: string | null;
          email: string;
          full_name?: string | null;
          graduation_year?: number | null;
          id: string;
          is_admin?: boolean | null;
          role: Database["public"]["Enums"]["user_role"];
          status_label?: string | null;
          status_score?: number | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          current_phase?: string | null;
          email?: string;
          full_name?: string | null;
          graduation_year?: number | null;
          id?: string;
          is_admin?: boolean | null;
          role?: Database["public"]["Enums"]["user_role"];
          status_label?: string | null;
          status_score?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      expire_old_invitations: { Args: Record<string, never>; Returns: undefined };
      get_linked_user_ids: {
        Args: Record<string, never>;
        Returns: {
          user_id: string;
        }[];
      };
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
        | "dm";
      notification_type:
        | "follow_up_reminder"
        | "deadline_alert"
        | "daily_digest"
        | "inbound_interaction";
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
      user_role: "admin" | "parent" | "student";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
