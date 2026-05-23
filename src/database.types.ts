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
      choice_set_courses: {
        Row: {
          course_id: string
          set_id: number
        }
        Insert: {
          course_id: string
          set_id: number
        }
        Update: {
          course_id?: string
          set_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "choice_set_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "choice_set_courses_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "choice_sets"
            referencedColumns: ["set_id"]
          },
        ]
      }
      choice_sets: {
        Row: {
          group_id: number | null
          max_select: number
          min_select: number
          name: string
          set_id: number
        }
        Insert: {
          group_id?: number | null
          max_select?: number
          min_select?: number
          name: string
          set_id?: number
        }
        Update: {
          group_id?: number | null
          max_select?: number
          min_select?: number
          name?: string
          set_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "choice_sets_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "course_groups"
            referencedColumns: ["group_id"]
          },
        ]
      }
      course_groups: {
        Row: {
          group_code: string
          group_id: number
          module_id: number | null
          name: string
        }
        Insert: {
          group_code: string
          group_id?: number
          module_id?: number | null
          name: string
        }
        Update: {
          group_code?: string
          group_id?: number
          module_id?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_groups_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["module_id"]
          },
        ]
      }
      course_prereq_choice_sets: {
        Row: {
          course_id: string
          prereq_choice_set: number
        }
        Insert: {
          course_id: string
          prereq_choice_set: number
        }
        Update: {
          course_id?: string
          prereq_choice_set?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_prereq_choice_sets_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_prereq_choice_sets_prereq_choice_set_fkey"
            columns: ["prereq_choice_set"]
            isOneToOne: false
            referencedRelation: "choice_sets"
            referencedColumns: ["set_id"]
          },
        ]
      }
      course_prerequisites: {
        Row: {
          course_id: string
          prereq_course_id: string
        }
        Insert: {
          course_id: string
          prereq_course_id: string
        }
        Update: {
          course_id?: string
          prereq_course_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_prerequisites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_prerequisites_prereq_course_id_fkey"
            columns: ["prereq_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
        ]
      }
      course_recommended_semesters: {
        Row: {
          course_id: string
          id: number
          semester_id: number
        }
        Insert: {
          course_id: string
          id?: number
          semester_id: number
        }
        Update: {
          course_id?: string
          id?: number
          semester_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_recommended_semesters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_recommended_semesters_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["semester_id"]
          },
        ]
      }
      courses: {
        Row: {
          course_id: string
          credits: number
          is_new: boolean | null
          module_type: string | null
          name: string
        }
        Insert: {
          course_id: string
          credits: number
          is_new?: boolean | null
          module_type?: string | null
          name: string
        }
        Update: {
          course_id?: string
          credits?: number
          is_new?: boolean | null
          module_type?: string | null
          name?: string
        }
        Relationships: []
      }
      degree_choice_requirements: {
        Row: {
          id: number
          max_select_override: number | null
          min_select_override: number | null
          set_id: number | null
          track_code: string | null
        }
        Insert: {
          id?: number
          max_select_override?: number | null
          min_select_override?: number | null
          set_id?: number | null
          track_code?: string | null
        }
        Update: {
          id?: number
          max_select_override?: number | null
          min_select_override?: number | null
          set_id?: number | null
          track_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "degree_choice_requirements_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "choice_sets"
            referencedColumns: ["set_id"]
          },
          {
            foreignKeyName: "degree_choice_requirements_track_code_fkey"
            columns: ["track_code"]
            isOneToOne: false
            referencedRelation: "degree_tracks"
            referencedColumns: ["track_code"]
          },
        ]
      }
      degree_course_requirements: {
        Row: {
          course_id: string | null
          id: number
          track_code: string | null
        }
        Insert: {
          course_id?: string | null
          id?: number
          track_code?: string | null
        }
        Update: {
          course_id?: string | null
          id?: number
          track_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "degree_course_requirements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "degree_course_requirements_track_code_fkey"
            columns: ["track_code"]
            isOneToOne: false
            referencedRelation: "degree_tracks"
            referencedColumns: ["track_code"]
          },
        ]
      }
      degree_group_requirements: {
        Row: {
          group_id: number | null
          id: number
          is_main: boolean | null
          track_code: string | null
        }
        Insert: {
          group_id?: number | null
          id?: number
          is_main?: boolean | null
          track_code?: string | null
        }
        Update: {
          group_id?: number | null
          id?: number
          is_main?: boolean | null
          track_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "degree_group_requirements_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "course_groups"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "degree_group_requirements_track_code_fkey"
            columns: ["track_code"]
            isOneToOne: false
            referencedRelation: "degree_tracks"
            referencedColumns: ["track_code"]
          },
        ]
      }
      degree_tracks: {
        Row: {
          description: string | null
          name: string
          total_credits_required: number | null
          track_code: string
        }
        Insert: {
          description?: string | null
          name: string
          total_credits_required?: number | null
          track_code: string
        }
        Update: {
          description?: string | null
          name?: string
          total_credits_required?: number | null
          track_code?: string
        }
        Relationships: []
      }
      group_courses: {
        Row: {
          course_id: string
          group_id: number
          note: string | null
        }
        Insert: {
          course_id: string
          group_id: number
          note?: string | null
        }
        Update: {
          course_id?: string
          group_id?: number
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "group_courses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "course_groups"
            referencedColumns: ["group_id"]
          },
        ]
      }
      modules: {
        Row: {
          description: string | null
          module_id: number
          name: string
        }
        Insert: {
          description?: string | null
          module_id: number
          name: string
        }
        Update: {
          description?: string | null
          module_id?: number
          name?: string
        }
        Relationships: []
      }
      semesters: {
        Row: {
          season: string
          semester_id: number
          year_rank: number
        }
        Insert: {
          season: string
          semester_id?: number
          year_rank: number
        }
        Update: {
          season?: string
          semester_id?: number
          year_rank?: number
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
