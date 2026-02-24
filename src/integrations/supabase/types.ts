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
      broadcasts: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          message: string
          status_page_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          message: string
          status_page_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string
          status_page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_status_page_id_fkey"
            columns: ["status_page_id"]
            isOneToOne: false
            referencedRelation: "status_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      checks: {
        Row: {
          error: string | null
          id: number
          is_up: boolean
          latency_ms: number
          service_id: string
          status_code: number | null
          timestamp: string
        }
        Insert: {
          error?: string | null
          id?: never
          is_up: boolean
          latency_ms: number
          service_id: string
          status_code?: number | null
          timestamp?: string
        }
        Update: {
          error?: string | null
          id?: never
          is_up?: boolean
          latency_ms?: number
          service_id?: string
          status_code?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "checks_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      incident_affected_services: {
        Row: {
          incident_id: string
          service_id: string
        }
        Insert: {
          incident_id: string
          service_id: string
        }
        Update: {
          incident_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_affected_services_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_affected_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_updates: {
        Row: {
          created_at: string
          id: string
          incident_id: string
          message: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id: string
          message: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string
          message?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_updates_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string
          id: string
          resolved_at: string | null
          severity: string
          status: string
          status_page_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          status_page_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          status_page_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_status_page_id_fkey"
            columns: ["status_page_id"]
            isOneToOne: false
            referencedRelation: "status_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          check_interval_seconds: number
          created_at: string
          endpoint: string
          expected_status_code: number | null
          id: string
          name: string
          protocol: string
          status: string
          status_page_id: string
          timeout_ms: number
          updated_at: string
        }
        Insert: {
          check_interval_seconds?: number
          created_at?: string
          endpoint?: string
          expected_status_code?: number | null
          id?: string
          name: string
          protocol?: string
          status?: string
          status_page_id: string
          timeout_ms?: number
          updated_at?: string
        }
        Update: {
          check_interval_seconds?: number
          created_at?: string
          endpoint?: string
          expected_status_code?: number | null
          id?: string
          name?: string
          protocol?: string
          status?: string
          status_page_id?: string
          timeout_ms?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_status_page_id_fkey"
            columns: ["status_page_id"]
            isOneToOne: false
            referencedRelation: "status_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      status_pages: {
        Row: {
          brand_color: string | null
          created_at: string
          custom_css: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          created_at?: string
          custom_css?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          created_at?: string
          custom_css?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_service_metrics: {
        Args: { p_end: string; p_service_id: string; p_start: string }
        Returns: {
          availability: number
          bucket: string
          check_count: number
          latency_avg: number
          latency_p95: number
          latency_p99: number
        }[]
      }
      get_service_summary: {
        Args: { p_hours?: number; p_service_id: string }
        Returns: {
          availability: number
          avg_latency: number
          failed_checks: number
          p95_latency: number
          p99_latency: number
          total_checks: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
