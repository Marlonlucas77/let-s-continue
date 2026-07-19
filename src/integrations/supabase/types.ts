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
      ai_prediction_usage: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string | null
          ref_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          label?: string | null
          ref_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          ref_id?: number
          user_id?: string
        }
        Relationships: []
      }
      fixture_analysis_cache: {
        Row: {
          ai_summary: string | null
          analysis: Json | null
          away_id: number | null
          fixture_id: number
          home_id: number | null
          updated_at: string | null
        }
        Insert: {
          ai_summary?: string | null
          analysis?: Json | null
          away_id?: number | null
          fixture_id: number
          home_id?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_summary?: string | null
          analysis?: Json | null
          away_id?: number | null
          fixture_id?: number
          home_id?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          away_corners: number | null
          away_goals: number | null
          away_goals_ht: number | null
          away_red: number | null
          away_team_id: string | null
          away_yellow: number | null
          created_at: string | null
          home_corners: number | null
          home_goals: number | null
          home_goals_ht: number | null
          home_red: number | null
          home_team_id: string | null
          home_yellow: number | null
          id: string
          match_date: string
          user_id: string
        }
        Insert: {
          away_corners?: number | null
          away_goals?: number | null
          away_goals_ht?: number | null
          away_red?: number | null
          away_team_id?: string | null
          away_yellow?: number | null
          created_at?: string | null
          home_corners?: number | null
          home_goals?: number | null
          home_goals_ht?: number | null
          home_red?: number | null
          home_team_id?: string | null
          home_yellow?: number | null
          id?: string
          match_date: string
          user_id: string
        }
        Update: {
          away_corners?: number | null
          away_goals?: number | null
          away_goals_ht?: number | null
          away_red?: number | null
          away_team_id?: string | null
          away_yellow?: number | null
          created_at?: string | null
          home_corners?: number | null
          home_goals?: number | null
          home_goals_ht?: number | null
          home_red?: number | null
          home_team_id?: string | null
          home_yellow?: number | null
          id?: string
          match_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_members: {
        Row: {
          created_at: string | null
          id: string
          pool_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pool_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pool_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_members_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pools: {
        Row: {
          created_at: string | null
          id: string
          invite_code: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invite_code?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          away_team_id: string | null
          btts_correct: boolean | null
          cards_correct: boolean | null
          corners_correct: boolean | null
          created_at: string | null
          home_team_id: string | null
          id: string
          over_under_correct: boolean | null
          predicted_data: Json
          result_checked: boolean | null
          user_id: string
          was_correct: boolean | null
        }
        Insert: {
          away_team_id?: string | null
          btts_correct?: boolean | null
          cards_correct?: boolean | null
          corners_correct?: boolean | null
          created_at?: string | null
          home_team_id?: string | null
          id?: string
          over_under_correct?: boolean | null
          predicted_data: Json
          result_checked?: boolean | null
          user_id: string
          was_correct?: boolean | null
        }
        Update: {
          away_team_id?: string | null
          btts_correct?: boolean | null
          cards_correct?: boolean | null
          corners_correct?: boolean | null
          created_at?: string | null
          home_team_id?: string | null
          id?: string
          over_under_correct?: boolean | null
          predicted_data?: Json
          result_checked?: boolean | null
          user_id?: string
          was_correct?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          environment: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          environment?: string | null
          id?: string
          plan: string
          status: string
          stripe_customer_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          environment?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          api_id: number | null
          color: string | null
          country: string | null
          created_at: string | null
          id: string
          league: string | null
          logo_url: string | null
          name: string
          user_id: string
        }
        Insert: {
          api_id?: number | null
          color?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          league?: string | null
          logo_url?: string | null
          name: string
          user_id: string
        }
        Update: {
          api_id?: number | null
          color?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          league?: string | null
          logo_url?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      tracked_leagues: {
        Row: {
          country: string | null
          created_at: string | null
          id: string
          include_stats: boolean | null
          last_run_at: string | null
          league_id: number
          league_name: string
          season: number
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          id?: string
          include_stats?: boolean | null
          last_run_at?: string | null
          league_id: number
          league_name: string
          season: number
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string | null
          id?: string
          include_stats?: boolean | null
          last_run_at?: string | null
          league_id?: number
          league_name?: string
          season?: number
          user_id?: string
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
      get_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          accuracy: number
          correct: number
          display_name: string
          total: number
          user_id: string
        }[]
      }
      get_my_prediction_stats: {
        Args: { _user: string }
        Returns: {
          accuracy: number
          correct: number
          last_30_correct: number
          last_30_total: number
          total: number
        }[]
      }
      get_pool_leaderboard: {
        Args: { _pool_id: string }
        Returns: {
          accuracy: number
          correct: number
          display_name: string
          total: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
