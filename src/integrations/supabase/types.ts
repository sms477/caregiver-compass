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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          performed_by: string
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_by: string
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          created_at: string
          description: string
          follow_up_notes: string | null
          follow_up_required: boolean
          id: string
          immediate_action: string
          incident_type: string
          location_id: string | null
          occurred_at: string
          resident_id: string | null
          resident_name: string
          staff_id: string
          staff_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          follow_up_notes?: string | null
          follow_up_required?: boolean
          id?: string
          immediate_action?: string
          incident_type?: string
          location_id?: string | null
          occurred_at?: string
          resident_id?: string | null
          resident_name: string
          staff_id: string
          staff_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          follow_up_notes?: string | null
          follow_up_required?: boolean
          id?: string
          immediate_action?: string
          incident_type?: string
          location_id?: string | null
          occurred_at?: string
          resident_id?: string | null
          resident_name?: string
          staff_id?: string
          staff_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          license_number: string | null
          name: string
          org_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          license_number?: string | null
          name: string
          org_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          license_number?: string | null
          name?: string
          org_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string
          dosage: string
          id: string
          location_id: string | null
          name: string
          resident_id: string
          schedule: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dosage: string
          id?: string
          location_id?: string | null
          name: string
          resident_id: string
          schedule?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dosage?: string
          id?: string
          location_id?: string | null
          name?: string
          resident_id?: string
          schedule?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      pay_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          id: string
          line_items: Json
          location_id: string | null
          pay_period: Json
          status: string
          total_gross_pay: number
          total_net_pay: number
          total_taxes: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          line_items?: Json
          location_id?: string | null
          pay_period: Json
          status?: string
          total_gross_pay?: number
          total_net_pay?: number
          total_taxes?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          line_items?: Json
          location_id?: string | null
          pay_period?: Json
          status?: string
          total_gross_pay?: number
          total_net_pay?: number
          total_taxes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_runs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_stubs: {
        Row: {
          created_at: string
          employee_id: string
          employee_name: string
          id: string
          line_item: Json
          location_id: string | null
          paid_at: string
          pay_period: Json
          pay_run_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          employee_name: string
          id?: string
          line_item: Json
          location_id?: string | null
          paid_at?: string
          pay_period: Json
          pay_run_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          employee_name?: string
          id?: string
          line_item?: Json
          location_id?: string | null
          paid_at?: string
          pay_period?: Json
          pay_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_stubs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_stubs_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_batches: {
        Row: {
          created_at: string
          id: string
          initiated_at: string
          initiated_by: string
          location_id: string | null
          notes: string | null
          pay_run_id: string
          payment_count: number
          processed_at: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiated_at?: string
          initiated_by: string
          location_id?: string | null
          notes?: string | null
          pay_run_id: string
          payment_count?: number
          processed_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          initiated_at?: string
          initiated_by?: string
          location_id?: string | null
          notes?: string | null
          pay_run_id?: string
          payment_count?: number
          processed_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batches_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_items: {
        Row: {
          account_last_four: string | null
          amount: number
          bank_name: string | null
          batch_id: string
          check_number: string | null
          created_at: string
          employee_id: string
          employee_name: string
          failure_reason: string | null
          id: string
          payment_method: string
          status: string
          updated_at: string
        }
        Insert: {
          account_last_four?: string | null
          amount: number
          bank_name?: string | null
          batch_id: string
          check_number?: string | null
          created_at?: string
          employee_id: string
          employee_name: string
          failure_reason?: string | null
          id?: string
          payment_method?: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_last_four?: string | null
          amount?: number
          bank_name?: string | null
          batch_id?: string
          check_number?: string | null
          created_at?: string
          employee_id?: string
          employee_name?: string
          failure_reason?: string | null
          id?: string
          payment_method?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payment_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          pay_run_id: string | null
          performed_by: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          pay_run_id?: string | null
          performed_by: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          pay_run_id?: string | null
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_audit_log_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          annual_salary: number | null
          bank_account_number: string | null
          bank_account_type: string | null
          bank_name: string | null
          bank_routing_number: string | null
          created_at: string
          deductions: Json
          display_name: string
          federal_allowances: number | null
          filing_status: string | null
          hourly_rate: number | null
          id: string
          job_title: string | null
          org_id: string | null
          pay_type: string
          phone: string | null
          shift_differentials: Json
          start_date: string | null
          state_allowances: number | null
          updated_at: string
          user_id: string
          w4: Json
          work_state: string
          worker_type: string
        }
        Insert: {
          annual_salary?: number | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          created_at?: string
          deductions?: Json
          display_name: string
          federal_allowances?: number | null
          filing_status?: string | null
          hourly_rate?: number | null
          id?: string
          job_title?: string | null
          org_id?: string | null
          pay_type?: string
          phone?: string | null
          shift_differentials?: Json
          start_date?: string | null
          state_allowances?: number | null
          updated_at?: string
          user_id: string
          w4?: Json
          work_state?: string
          worker_type?: string
        }
        Update: {
          annual_salary?: number | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          created_at?: string
          deductions?: Json
          display_name?: string
          federal_allowances?: number | null
          filing_status?: string | null
          hourly_rate?: number | null
          id?: string
          job_title?: string | null
          org_id?: string | null
          pay_type?: string
          phone?: string | null
          shift_differentials?: Json
          start_date?: string | null
          state_allowances?: number | null
          updated_at?: string
          user_id?: string
          w4?: Json
          work_state?: string
          worker_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          name: string
          room: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          name: string
          room: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          name?: string
          room?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          adl_reports: Json
          caregiver_id: string
          caregiver_name: string
          clock_in: string
          clock_in_location: Json | null
          clock_out: string | null
          clock_out_location: Json | null
          created_at: string
          emar_records: Json
          id: string
          is_24_hour: boolean
          location_id: string | null
          meal_break_reason: string | null
          meal_break_taken: boolean | null
          second_meal_break_reason: string | null
          second_meal_break_taken: boolean | null
          sleep_end: string | null
          sleep_interruptions: Json
          sleep_start: string | null
          updated_at: string
        }
        Insert: {
          adl_reports?: Json
          caregiver_id: string
          caregiver_name: string
          clock_in?: string
          clock_in_location?: Json | null
          clock_out?: string | null
          clock_out_location?: Json | null
          created_at?: string
          emar_records?: Json
          id?: string
          is_24_hour?: boolean
          location_id?: string | null
          meal_break_reason?: string | null
          meal_break_taken?: boolean | null
          second_meal_break_reason?: string | null
          second_meal_break_taken?: boolean | null
          sleep_end?: string | null
          sleep_interruptions?: Json
          sleep_start?: string | null
          updated_at?: string
        }
        Update: {
          adl_reports?: Json
          caregiver_id?: string
          caregiver_name?: string
          clock_in?: string
          clock_in_location?: Json | null
          clock_out?: string | null
          clock_out_location?: Json | null
          created_at?: string
          emar_records?: Json
          id?: string
          is_24_hour?: boolean
          location_id?: string | null
          meal_break_reason?: string | null
          meal_break_taken?: boolean | null
          second_meal_break_reason?: string | null
          second_meal_break_taken?: boolean | null
          sleep_end?: string | null
          sleep_interruptions?: Json
          sleep_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_filings: {
        Row: {
          agency: string
          amount: number | null
          confirmation_number: string | null
          created_at: string
          filed_at: string
          filed_by: string
          filing_data: Json
          filing_type: string
          form_type: string
          id: string
          notes: string | null
          period_label: string | null
          status: string
          tax_year: number
          updated_at: string
        }
        Insert: {
          agency?: string
          amount?: number | null
          confirmation_number?: string | null
          created_at?: string
          filed_at?: string
          filed_by: string
          filing_data?: Json
          filing_type?: string
          form_type?: string
          id?: string
          notes?: string | null
          period_label?: string | null
          status?: string
          tax_year: number
          updated_at?: string
        }
        Update: {
          agency?: string
          amount?: number | null
          confirmation_number?: string | null
          created_at?: string
          filed_at?: string
          filed_by?: string
          filing_data?: Json
          filing_type?: string
          form_type?: string
          id?: string
          notes?: string | null
          period_label?: string | null
          status?: string
          tax_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      tax_forms: {
        Row: {
          created_at: string
          distributed_at: string | null
          employee_id: string
          employee_name: string
          form_data: Json
          form_type: string
          generated_at: string
          generated_by: string
          id: string
          status: string
          tax_year: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          distributed_at?: string | null
          employee_id: string
          employee_name: string
          form_data?: Json
          form_type?: string
          generated_at?: string
          generated_by: string
          id?: string
          status?: string
          tax_year: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          distributed_at?: string | null
          employee_id?: string
          employee_name?: string
          form_data?: Json
          form_type?: string
          generated_at?: string
          generated_by?: string
          id?: string
          status?: string
          tax_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_can_access_location: {
        Args: { _location_id: string; _user_id: string }
        Returns: boolean
      }
      admin_can_access_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      user_has_location_access: {
        Args: { _location_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_role_at_location: {
        Args: {
          _location_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_in_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "caregiver" | "reviewer" | "super_admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "caregiver", "reviewer", "super_admin"],
    },
  },
} as const
