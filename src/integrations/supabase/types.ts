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
      camera_credentials: {
        Row: {
          camera_name: string
          camera_url: string
          created_at: string
          encrypted_password: string | null
          encrypted_username: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          camera_name: string
          camera_url: string
          created_at?: string
          encrypted_password?: string | null
          encrypted_username?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          camera_name?: string
          camera_url?: string
          created_at?: string
          encrypted_password?: string | null
          encrypted_username?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      camera_settings: {
        Row: {
          camera_id: string | null
          cooldown_period: number | null
          created_at: string | null
          detection_zones_enabled: boolean | null
          email_notifications: boolean | null
          end_hour: number | null
          id: string
          min_motion_duration: number | null
          motion_enabled: boolean | null
          motion_sensitivity: number | null
          motion_threshold: number | null
          noise_reduction: boolean | null
          notification_email: string | null
          quality: string | null
          recording_enabled: boolean | null
          schedule_enabled: boolean | null
          start_hour: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          camera_id?: string | null
          cooldown_period?: number | null
          created_at?: string | null
          detection_zones_enabled?: boolean | null
          email_notifications?: boolean | null
          end_hour?: number | null
          id?: string
          min_motion_duration?: number | null
          motion_enabled?: boolean | null
          motion_sensitivity?: number | null
          motion_threshold?: number | null
          noise_reduction?: boolean | null
          notification_email?: string | null
          quality?: string | null
          recording_enabled?: boolean | null
          schedule_enabled?: boolean | null
          start_hour?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          camera_id?: string | null
          cooldown_period?: number | null
          created_at?: string | null
          detection_zones_enabled?: boolean | null
          email_notifications?: boolean | null
          end_hour?: number | null
          id?: string
          min_motion_duration?: number | null
          motion_enabled?: boolean | null
          motion_sensitivity?: number | null
          motion_threshold?: number | null
          noise_reduction?: boolean | null
          notification_email?: string | null
          quality?: string | null
          recording_enabled?: boolean | null
          schedule_enabled?: boolean | null
          start_hour?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camera_settings_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "camera_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      motion_events: {
        Row: {
          camera_id: string | null
          cleared_at: string | null
          created_at: string
          detected_at: string
          duration_ms: number | null
          email_sent: boolean | null
          id: string
          motion_level: number | null
          user_id: string
        }
        Insert: {
          camera_id?: string | null
          cleared_at?: string | null
          created_at?: string
          detected_at?: string
          duration_ms?: number | null
          email_sent?: boolean | null
          id?: string
          motion_level?: number | null
          user_id: string
        }
        Update: {
          camera_id?: string | null
          cleared_at?: string | null
          created_at?: string
          detected_at?: string
          duration_ms?: number | null
          email_sent?: boolean | null
          id?: string
          motion_level?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recordings: {
        Row: {
          camera_id: string | null
          created_at: string
          duration_seconds: number | null
          file_size: number | null
          filename: string
          id: string
          motion_detected: boolean | null
          pi_sync_status: string | null
          pi_synced_at: string | null
          recorded_at: string
          storage_path: string | null
          storage_type: string | null
          user_id: string
        }
        Insert: {
          camera_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size?: number | null
          filename: string
          id?: string
          motion_detected?: boolean | null
          pi_sync_status?: string | null
          pi_synced_at?: string | null
          recorded_at?: string
          storage_path?: string | null
          storage_type?: string | null
          user_id: string
        }
        Update: {
          camera_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size?: number | null
          filename?: string
          id?: string
          motion_detected?: boolean | null
          pi_sync_status?: string | null
          pi_synced_at?: string | null
          recorded_at?: string
          storage_path?: string | null
          storage_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_tokens: {
        Row: {
          created_at: string
          encrypted_token: string
          id: string
          token_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_token: string
          id?: string
          token_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_token?: string
          id?: string
          token_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrypt_credential: {
        Args: { ciphertext: string; user_id: string }
        Returns: string
      }
      encrypt_credential: {
        Args: { plaintext: string; user_id: string }
        Returns: string
      }
      update_motion_event_cleared: {
        Args: { event_id: string }
        Returns: undefined
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
