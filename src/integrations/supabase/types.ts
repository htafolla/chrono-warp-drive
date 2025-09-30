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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cascade_updates: {
        Row: {
          cascade_index: number
          cti_value: number
          delta_phase: number
          efficiency: number
          id: string
          metadata: Json | null
          n: number
          q_ent: number
          session_id: string
          tdf_value: number
          timestamp: string
        }
        Insert: {
          cascade_index: number
          cti_value: number
          delta_phase: number
          efficiency: number
          id?: string
          metadata?: Json | null
          n: number
          q_ent: number
          session_id: string
          tdf_value: number
          timestamp?: string
        }
        Update: {
          cascade_index?: number
          cti_value?: number
          delta_phase?: number
          efficiency?: number
          id?: string
          metadata?: Json | null
          n?: number
          q_ent?: number
          session_id?: string
          tdf_value?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "cascade_updates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cti_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      cti_sessions: {
        Row: {
          cascade_level: number
          created_at: string
          id: string
          metadata: Json | null
          q_ent: number | null
          session_id: string
          status: string
          tdf_value: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cascade_level?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          q_ent?: number | null
          session_id: string
          status?: string
          tdf_value?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cascade_level?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          q_ent?: number | null
          session_id?: string
          status?: string
          tdf_value?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          cascade_level: number
          fps: number
          id: string
          memory_mb: number
          quality_setting: string
          session_id: string
          timestamp: string
          vertex_count: number
        }
        Insert: {
          cascade_level: number
          fps: number
          id?: string
          memory_mb: number
          quality_setting: string
          session_id: string
          timestamp?: string
          vertex_count: number
        }
        Update: {
          cascade_level?: number
          fps?: number
          id?: string
          memory_mb?: number
          quality_setting?: string
          session_id?: string
          timestamp?: string
          vertex_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cti_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      scene_performance_logs: {
        Row: {
          breakthrough_validated: boolean | null
          cycle_number: number
          fps: number
          id: string
          memory_usage: number
          particles_enabled: boolean | null
          performance_warnings: string[] | null
          quality_setting: string
          session_id: string | null
          shadows_enabled: boolean | null
          tdf_value: number
          timestamp: string
          user_id: string | null
          vertex_count: number
        }
        Insert: {
          breakthrough_validated?: boolean | null
          cycle_number: number
          fps: number
          id?: string
          memory_usage: number
          particles_enabled?: boolean | null
          performance_warnings?: string[] | null
          quality_setting: string
          session_id?: string | null
          shadows_enabled?: boolean | null
          tdf_value: number
          timestamp?: string
          user_id?: string | null
          vertex_count: number
        }
        Update: {
          breakthrough_validated?: boolean | null
          cycle_number?: number
          fps?: number
          id?: string
          memory_usage?: number
          particles_enabled?: boolean | null
          performance_warnings?: string[] | null
          quality_setting?: string
          session_id?: string | null
          shadows_enabled?: boolean | null
          tdf_value?: number
          timestamp?: string
          user_id?: string | null
          vertex_count?: number
        }
        Relationships: []
      }
      tdf_experiments: {
        Row: {
          completed_at: string | null
          created_at: string
          experiment_name: string
          id: string
          performance_data: Json | null
          status: string
          tdf_components: Json
          time_shift_metrics: Json
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          experiment_name: string
          id?: string
          performance_data?: Json | null
          status?: string
          tdf_components: Json
          time_shift_metrics: Json
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          experiment_name?: string
          id?: string
          performance_data?: Json | null
          status?: string
          tdf_components?: Json
          time_shift_metrics?: Json
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
