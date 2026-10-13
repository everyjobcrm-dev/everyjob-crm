export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      client_role_rates: {
        Row: {
          bill_rate: number
          client_id: string
          effective_from: string
          id: string
          role_name: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          bill_rate: number
          client_id: string
          effective_from?: string
          id?: string
          role_name: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          bill_rate?: number
          client_id?: string
          effective_from?: string
          id?: string
          role_name?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: [
          {
            foreignKeyName: "client_role_rates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company_id: string | null
          contacts: Json
          created_at: string
          created_by: string | null
          id: string
          industry: string | null
          min_billable_hours: number | null
          name: string
          notes: string | null
          overtime_threshold_hours: number | null
          preferred_roles: Json
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id?: string | null
          contacts?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          min_billable_hours?: number | null
          name: string
          notes?: string | null
          overtime_threshold_hours?: number | null
          preferred_roles?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string | null
          contacts?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          min_billable_hours?: number | null
          name?: string
          notes?: string | null
          overtime_threshold_hours?: number | null
          preferred_roles?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          employee_id: string
          file_url: string | null
          id: string
          status: Database["public"]["Enums"]["doc_status"]
          submitted_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          employee_id: string
          file_url?: string | null
          id?: string
          status?: Database["public"]["Enums"]["doc_status"]
          submitted_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          doc_type?: Database["public"]["Enums"]["doc_type"]
          employee_id?: string
          file_url?: string | null
          id?: string
          status?: Database["public"]["Enums"]["doc_status"]
          submitted_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_ratings: {
        Row: {
          created_at: string | null
          employee_id: string
          event_id: string | null
          id: string
          rater_id: string
          rating: number
          review_notes: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          event_id?: string | null
          id?: string
          rater_id: string
          rating: number
          review_notes?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          event_id?: string | null
          id?: string
          rater_id?: string
          rating?: number
          review_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_ratings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_ratings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_ratings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_ratings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_role_skills: {
        Row: {
          approved_at: string
          approved_by: string | null
          employee_id: string
          role_name: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          employee_id: string
          role_name: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          employee_id?: string
          role_name?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: [
          {
            foreignKeyName: "employee_role_skills_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_role_skills_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_role_skills_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_role_skills_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_role_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_role_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_role_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_role_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      event_closures: {
        Row: {
          actual_expense: number
          actual_income: number
          closed_at: string
          closed_by: string | null
          event_id: string
          total_hours_reported: number
          travel_charged_to_client: number
          travel_paid_to_workers: number
        }
        Insert: {
          actual_expense?: number
          actual_income?: number
          closed_at?: string
          closed_by?: string | null
          event_id: string
          total_hours_reported?: number
          travel_charged_to_client?: number
          travel_paid_to_workers?: number
        }
        Update: {
          actual_expense?: number
          actual_income?: number
          closed_at?: string
          closed_by?: string | null
          event_id?: string
          total_hours_reported?: number
          travel_charged_to_client?: number
          travel_paid_to_workers?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_closures_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_closures_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_closures_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_closures_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "event_closures_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_closures_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          cancellation_requested_at: string | null
          created_at: string
          created_by: string | null
          event_id: string
          event_role_id: string | null
          hours_reported: number | null
          id: string
          rate_set_at: string | null
          rate_set_by: string | null
          recruiter_id: string | null
          status: Database["public"]["Enums"]["registration_status"]
          user_id: string
          wage_rate: number | null
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          cancellation_requested_at?: string | null
          created_at?: string
          created_by?: string | null
          event_id: string
          event_role_id?: string | null
          hours_reported?: number | null
          id?: string
          rate_set_at?: string | null
          rate_set_by?: string | null
          recruiter_id?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          user_id: string
          wage_rate?: number | null
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          cancellation_requested_at?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string
          event_role_id?: string | null
          hours_reported?: number | null
          id?: string
          rate_set_at?: string | null
          rate_set_by?: string | null
          recruiter_id?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          user_id?: string
          wage_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_registrations_event_role_id_fkey"
            columns: ["event_role_id"]
            isOneToOne: false
            referencedRelation: "event_role_fill_counts"
            referencedColumns: ["event_role_id"]
          },
          {
            foreignKeyName: "event_registrations_event_role_id_fkey"
            columns: ["event_role_id"]
            isOneToOne: false
            referencedRelation: "event_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_rate_set_by_fkey"
            columns: ["rate_set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_rate_set_by_fkey"
            columns: ["rate_set_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_rate_set_by_fkey"
            columns: ["rate_set_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_rate_set_by_fkey"
            columns: ["rate_set_by"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "event_registrations_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      event_roles: {
        Row: {
          base_rate: number | null
          bill_to_client: number | null
          created_at: string
          end_time: string | null
          event_id: string
          headcount: number
          id: string
          role_name: string
          start_time: string
          wage_to_worker: number | null
        }
        Insert: {
          base_rate?: number | null
          bill_to_client?: number | null
          created_at?: string
          end_time?: string | null
          event_id: string
          headcount: number
          id?: string
          role_name: string
          start_time: string
          wage_to_worker?: number | null
        }
        Update: {
          base_rate?: number | null
          bill_to_client?: number | null
          created_at?: string
          end_time?: string | null
          event_id?: string
          headcount?: number
          id?: string
          role_name?: string
          start_time?: string
          wage_to_worker?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      event_roster_override_audit: {
        Row: {
          actor_id: string
          created_at: string
          employee_id: string
          event_id: string
          event_role_id: string
          id: string
          registration_id: string
          warning_codes: string[]
        }
        Insert: {
          actor_id: string
          created_at?: string
          employee_id: string
          event_id: string
          event_role_id: string
          id?: string
          registration_id: string
          warning_codes: string[]
        }
        Update: {
          actor_id?: string
          created_at?: string
          employee_id?: string
          event_id?: string
          event_role_id?: string
          id?: string
          registration_id?: string
          warning_codes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "event_roster_override_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_roster_override_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_roster_override_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_roster_override_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "event_roster_override_audit_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_roster_override_audit_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_roster_override_audit_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_roster_override_audit_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "event_roster_override_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_roster_override_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_roster_override_audit_event_role_id_fkey"
            columns: ["event_role_id"]
            isOneToOne: false
            referencedRelation: "event_role_fill_counts"
            referencedColumns: ["event_role_id"]
          },
          {
            foreignKeyName: "event_roster_override_audit_event_role_id_fkey"
            columns: ["event_role_id"]
            isOneToOne: false
            referencedRelation: "event_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_roster_override_audit_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cancelled_from_status: string | null
          client_id: string
          created_at: string | null
          dress_code: string | null
          event_date: string
          id: string
          lifecycle_status: string
          location: string
          min_age: number | null
          min_rating: number | null
          notes: string | null
          recruiter_id: string | null
          start_time: string | null
          status: string
          travel_budget_per_worker: number | null
          updated_at: string
        }
        Insert: {
          cancelled_from_status?: string | null
          client_id: string
          created_at?: string | null
          dress_code?: string | null
          event_date: string
          id?: string
          lifecycle_status?: string
          location: string
          min_age?: number | null
          min_rating?: number | null
          notes?: string | null
          recruiter_id?: string | null
          start_time?: string | null
          status?: string
          travel_budget_per_worker?: number | null
          updated_at?: string
        }
        Update: {
          cancelled_from_status?: string | null
          client_id?: string
          created_at?: string | null
          dress_code?: string | null
          event_date?: string
          id?: string
          lifecycle_status?: string
          location?: string
          min_age?: number | null
          min_rating?: number | null
          notes?: string | null
          recruiter_id?: string | null
          start_time?: string | null
          status?: string
          travel_budget_per_worker?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      profiles: {
        Row: {
          average_rating: number | null
          birth_date: string | null
          can_create_events: boolean | null
          created_at: string
          email: string | null
          email_verified: boolean | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          phone_number: string | null
          phone_verified: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          total_ratings: number | null
          tz: string
        }
        Insert: {
          average_rating?: number | null
          birth_date?: string | null
          can_create_events?: boolean | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          first_name: string
          gender?: string | null
          id: string
          last_name: string
          phone_number?: string | null
          phone_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          total_ratings?: number | null
          tz: string
        }
        Update: {
          average_rating?: number | null
          birth_date?: string | null
          can_create_events?: boolean | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          phone_number?: string | null
          phone_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          total_ratings?: number | null
          tz?: string
        }
        Relationships: []
      }
      recruiter_bonuses: {
        Row: {
          applied_at: string | null
          applied_to_registration_id: string | null
          bonus_amount: number
          created_at: string
          id: string
          recruiter_id: string
          source_registration_id: string
          status: Database["public"]["Enums"]["bonus_status"]
        }
        Insert: {
          applied_at?: string | null
          applied_to_registration_id?: string | null
          bonus_amount: number
          created_at?: string
          id?: string
          recruiter_id: string
          source_registration_id: string
          status?: Database["public"]["Enums"]["bonus_status"]
        }
        Update: {
          applied_at?: string | null
          applied_to_registration_id?: string | null
          bonus_amount?: number
          created_at?: string
          id?: string
          recruiter_id?: string
          source_registration_id?: string
          status?: Database["public"]["Enums"]["bonus_status"]
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_bonuses_applied_to_registration_id_fkey"
            columns: ["applied_to_registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruiter_bonuses_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruiter_bonuses_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruiter_bonuses_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruiter_bonuses_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "recruiter_bonuses_source_registration_id_fkey"
            columns: ["source_registration_id"]
            isOneToOne: true
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_status_history: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          employee_id: string
          event_id: string
          from_status: Database["public"]["Enums"]["registration_status"] | null
          id: string
          reason: string | null
          registration_id: string
          to_status: Database["public"]["Enums"]["registration_status"] | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          employee_id: string
          event_id: string
          from_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          id?: string
          reason?: string | null
          registration_id: string
          to_status?: Database["public"]["Enums"]["registration_status"] | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          employee_id?: string
          event_id?: string
          from_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          id?: string
          reason?: string | null
          registration_id?: string
          to_status?: Database["public"]["Enums"]["registration_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "registration_status_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_status_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_status_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_status_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "registration_status_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_status_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "registration_status_history_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_hour_submissions: {
        Row: {
          employee_id: string | null
          event_id: string | null
          id: string
          performance_notes: string | null
          performance_rating: number | null
          registration_id: string
          rejection_reason: string | null
          reported_end: string
          reported_hours: number
          reported_start: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string | null
          submitted_by: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          employee_id?: string | null
          event_id?: string | null
          id?: string
          performance_notes?: string | null
          performance_rating?: number | null
          registration_id: string
          rejection_reason?: string | null
          reported_end: string
          reported_hours: number
          reported_start: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          submitted_by: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          employee_id?: string | null
          event_id?: string | null
          id?: string
          performance_notes?: string | null
          performance_rating?: number | null
          registration_id?: string
          rejection_reason?: string | null
          reported_end?: string
          reported_hours?: number
          reported_start?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          submitted_by?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_hour_submissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_age"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_hour_submissions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      signup_tz_attempts: {
        Row: {
          attempt_count: number
          last_attempt_at: string
          lease_token: string | null
          lease_until: string | null
          tz_hash: string
          window_started_at: string
        }
        Insert: {
          attempt_count?: number
          last_attempt_at?: string
          lease_token?: string | null
          lease_until?: string | null
          tz_hash: string
          window_started_at?: string
        }
        Update: {
          attempt_count?: number
          last_attempt_at?: string
          lease_token?: string | null
          lease_until?: string | null
          tz_hash?: string
          window_started_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      event_role_fill_counts: {
        Row: {
          event_id: string | null
          event_role_id: string | null
          filled_count: number | null
          headcount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      event_spot_summary: {
        Row: {
          event_id: string | null
          spots_filled: number | null
          spots_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_shift_submissions_dashboard"
            referencedColumns: ["event_id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          birth_date: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string | null
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      profiles_with_age: {
        Row: {
          age: number | null
          birth_date: string | null
          created_at: string | null
          email: string | null
          email_verified: boolean | null
          first_name: string | null
          gender: string | null
          id: string | null
          last_name: string | null
          phone_number: string | null
          phone_verified: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          tz: string | null
        }
        Insert: {
          age?: never
          birth_date?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          gender?: string | null
          id?: string | null
          last_name?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          tz?: string | null
        }
        Update: {
          age?: never
          birth_date?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          gender?: string | null
          id?: string | null
          last_name?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          tz?: string | null
        }
        Relationships: []
      }
      v_shift_submissions_dashboard: {
        Row: {
          employee_id: string | null
          employee_name: string | null
          employee_tz: string | null
          event_date: string | null
          event_id: string | null
          location: string | null
          performance_rating: number | null
          reported_end: string | null
          reported_hours: number | null
          reported_start: string | null
          submission_id: string | null
          submission_status:
            | Database["public"]["Enums"]["submission_status"]
            | null
          submitted_at: string | null
          submitted_by_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      acquire_signup_tz_lease: {
        Args: {
          p_lease_seconds?: number
          p_lease_token: string
          p_tz_hash: string
        }
        Returns: boolean
      }
      add_historical_event_attendee: {
        Args: {
          p_employee_id: string
          p_event_id: string
          p_event_role_id: string
        }
        Returns: {
          actual_end_time: string | null
          actual_start_time: string | null
          cancellation_requested_at: string | null
          created_at: string
          created_by: string | null
          event_id: string
          event_role_id: string | null
          hours_reported: number | null
          id: string
          rate_set_at: string | null
          rate_set_by: string | null
          recruiter_id: string | null
          status: Database["public"]["Enums"]["registration_status"]
          user_id: string
          wage_rate: number | null
        }
        SetofOptions: {
          from: "*"
          to: "event_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      app_can_manage_event: { Args: { p_event_id: string }; Returns: boolean }
      app_current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      app_event_has_approved_hours: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      app_lock_event_status: { Args: { p_event_id: string }; Returns: string }
      app_manager_rate_deadline: {
        Args: { p_event_date: string }
        Returns: string
      }
      app_registration_initial_status: {
        Args: { p_event_role_id: string; p_uid: string }
        Returns: Database["public"]["Enums"]["registration_status"]
      }
      consume_signup_tz_attempt: {
        Args: {
          p_max_attempts?: number
          p_tz_hash: string
          p_window_seconds?: number
        }
        Returns: boolean
      }
      get_employee_detail: {
        Args: { p_employee_id: string }
        Returns: {
          age_years: number
          approved_hours: number
          average_rating: number
          birth_date: string
          client_name: string
          effective_pay: number
          email: string
          email_verified: boolean
          employee_id: string
          event_date: string
          event_id: string
          first_name: string
          form_101_status: string
          joined_at: string
          last_name: string
          phone_number: string
          phone_verified: boolean
          registered_at: string
          registration_status: string
          role_name: string
          total_ratings: number
          tz: string
        }[]
      }
      get_event_roster: {
        Args: { p_event_id: string }
        Returns: {
          age: number
          average_rating: number
          cancellation_requested_at: string
          event_role_id: string
          first_name: string
          last_name: string
          phone_number: string
          rate_set_at: string
          registered_at: string
          registration_id: string
          reported_hours: number
          role_name: string
          status: Database["public"]["Enums"]["registration_status"]
          submission_id: string
          submission_status: string
          user_id: string
          wage_rate: number
          waitlist_position: number
          worker_role: string
        }[]
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      list_employees: {
        Args: {
          p_dir: string
          p_limit: number
          p_min_rating: number
          p_offset: number
          p_query: string
          p_sort: string
        }
        Returns: {
          age_years: number
          approved_hours: number
          average_rating: number
          email: string
          employee_id: string
          events_attended: number
          first_name: string
          form_101_status: string
          joined_at: string
          last_name: string
          phone_number: string
          total_count: number
          tz: string
        }[]
      }
      register_for_event_role: {
        Args: { p_event_role_id: string }
        Returns: {
          actual_end_time: string | null
          actual_start_time: string | null
          cancellation_requested_at: string | null
          created_at: string
          created_by: string | null
          event_id: string
          event_role_id: string | null
          hours_reported: number | null
          id: string
          rate_set_at: string | null
          rate_set_by: string | null
          recruiter_id: string | null
          status: Database["public"]["Enums"]["registration_status"]
          user_id: string
          wage_rate: number | null
        }
        SetofOptions: {
          from: "*"
          to: "event_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      release_signup_tz_lease: {
        Args: { p_lease_token: string; p_tz_hash: string }
        Returns: boolean
      }
      remove_scheduled_employee: {
        Args: { p_reason: string; p_registration_id: string }
        Returns: string
      }
      schedule_employee: {
        Args: { p_employee_id: string; p_event_role_id: string }
        Returns: {
          registration_id: string
          warnings: string[]
        }[]
      }
      search_employees: {
        Args: { p_event_id: string; p_query: string }
        Returns: {
          age_years: number
          average_rating: number
          base_rate: number
          employee_id: string
          event_role_id: string
          event_role_name: string
          first_name: string
          last_name: string
          phone_number: string
          registered_at: string
          registration_id: string
          registration_status: string
          wage_rate: number
          warnings: string[]
        }[]
      }
      set_registration_wage_rate: {
        Args: { p_registration_id: string; p_wage_rate: number }
        Returns: {
          actual_end_time: string | null
          actual_start_time: string | null
          cancellation_requested_at: string | null
          created_at: string
          created_by: string | null
          event_id: string
          event_role_id: string | null
          hours_reported: number | null
          id: string
          rate_set_at: string | null
          rate_set_by: string | null
          recruiter_id: string | null
          status: Database["public"]["Enums"]["registration_status"]
          user_id: string
          wage_rate: number | null
        }
        SetofOptions: {
          from: "*"
          to: "event_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      staff_transition_registration: {
        Args: { p_action: string; p_reason?: string; p_registration_id: string }
        Returns: {
          actual_end_time: string | null
          actual_start_time: string | null
          cancellation_requested_at: string | null
          created_at: string
          created_by: string | null
          event_id: string
          event_role_id: string | null
          hours_reported: number | null
          id: string
          rate_set_at: string | null
          rate_set_by: string | null
          recruiter_id: string | null
          status: Database["public"]["Enums"]["registration_status"]
          user_id: string
          wage_rate: number | null
        }
        SetofOptions: {
          from: "*"
          to: "event_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      bonus_status: "pending" | "applied" | "voided"
      doc_status: "missing" | "submitted" | "verified" | "rejected"
      doc_type: "form_101" | "bank_details"
      registration_status:
        | "pending"
        | "registered"
        | "confirmed"
        | "cancelled"
        | "no_show"
        | "completed"
        | "approved"
        | "rejected"
        | "waitlisted"
        | "removed"
      staff_role:
        | "waiter"
        | "bartender"
        | "setup"
        | "security"
        | "host"
        | "driver"
        | "other"
      submission_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "pending"
      user_role: "admin" | "manager" | "recruiter" | "employee"
      worker_rank: "any" | "trainee" | "standard" | "senior" | "lead"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      bonus_status: ["pending", "applied", "voided"],
      doc_status: ["missing", "submitted", "verified", "rejected"],
      doc_type: ["form_101", "bank_details"],
      registration_status: [
        "pending",
        "registered",
        "confirmed",
        "cancelled",
        "no_show",
        "completed",
        "approved",
        "rejected",
        "waitlisted",
        "removed",
      ],
      staff_role: [
        "waiter",
        "bartender",
        "setup",
        "security",
        "host",
        "driver",
        "other",
      ],
      submission_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "pending",
      ],
      user_role: ["admin", "manager", "recruiter", "employee"],
      worker_rank: ["any", "trainee", "standard", "senior", "lead"],
    },
  },
} as const
