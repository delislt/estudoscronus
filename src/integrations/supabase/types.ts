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
      achievements: {
        Row: {
          code: string
          created_at: string
          description: string
          icon: string
          id: string
          kind: string
          threshold: number
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          kind: string
          threshold?: number
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          kind?: string
          threshold?: number
          title?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      decks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          subject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          subject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          subject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          error_message: string | null
          extracted_text: string | null
          id: string
          mime_type: string | null
          page_count: number | null
          size_bytes: number | null
          status: string
          storage_path: string
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          extracted_text?: string | null
          id?: string
          mime_type?: string | null
          page_count?: number | null
          size_bytes?: number | null
          status?: string
          storage_path: string
          subject_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          extracted_text?: string | null
          id?: string
          mime_type?: string | null
          page_count?: number | null
          size_bytes?: number | null
          status?: string
          storage_path?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      essays: {
        Row: {
          body: string
          c1: number | null
          c2: number | null
          c3: number | null
          c4: number | null
          c5: number | null
          created_at: string
          feedback: Json | null
          id: string
          model: string | null
          prompt: string
          status: string
          total: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          c1?: number | null
          c2?: number | null
          c3?: number | null
          c4?: number | null
          c5?: number | null
          created_at?: string
          feedback?: Json | null
          id?: string
          model?: string | null
          prompt: string
          status?: string
          total?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          c1?: number | null
          c2?: number | null
          c3?: number | null
          c4?: number | null
          c5?: number | null
          created_at?: string
          feedback?: Json | null
          id?: string
          model?: string | null
          prompt?: string
          status?: string
          total?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exam_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          chosen_label: string | null
          id: string
          is_correct: boolean | null
          question_id: string
          time_ms: number | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          chosen_label?: string | null
          id?: string
          is_correct?: boolean | null
          question_id: string
          time_ms?: number | null
          user_id: string
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          chosen_label?: string | null
          id?: string
          is_correct?: boolean | null
          question_id?: string
          time_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          correct_count: number | null
          finished_at: string | null
          id: string
          per_subject: Json | null
          question_ids: string[]
          raw_score: number | null
          source: string
          started_at: string
          status: string
          subjects: string[]
          total_questions: number
          tri_score: number | null
          user_id: string
        }
        Insert: {
          correct_count?: number | null
          finished_at?: string | null
          id?: string
          per_subject?: Json | null
          question_ids: string[]
          raw_score?: number | null
          source: string
          started_at?: string
          status?: string
          subjects?: string[]
          total_questions: number
          tri_score?: number | null
          user_id: string
        }
        Update: {
          correct_count?: number | null
          finished_at?: string | null
          id?: string
          per_subject?: Json | null
          question_ids?: string[]
          raw_score?: number | null
          source?: string
          started_at?: string
          status?: string
          subjects?: string[]
          total_questions?: number
          tri_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      flashcard_reviews: {
        Row: {
          created_at: string
          flashcard_id: string
          id: string
          new_ease: number | null
          new_interval: number | null
          prev_ease: number | null
          prev_interval: number | null
          rating: string
          user_id: string
        }
        Insert: {
          created_at?: string
          flashcard_id: string
          id?: string
          new_ease?: number | null
          new_interval?: number | null
          prev_ease?: number | null
          prev_interval?: number | null
          rating: string
          user_id: string
        }
        Update: {
          created_at?: string
          flashcard_id?: string
          id?: string
          new_ease?: number | null
          new_interval?: number | null
          prev_ease?: number | null
          prev_interval?: number | null
          rating?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          deck_id: string
          due_at: string
          ease: number
          front: string
          id: string
          interval_days: number
          lapses: number
          last_reviewed_at: string | null
          reps: number
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          deck_id: string
          due_at?: string
          ease?: number
          front: string
          id?: string
          interval_days?: number
          lapses?: number
          last_reviewed_at?: string | null
          reps?: number
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          deck_id?: string
          due_at?: string
          ease?: number
          front?: string
          id?: string
          interval_days?: number
          lapses?: number
          last_reviewed_at?: string | null
          reps?: number
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          current_value: number
          id: string
          period: string
          target_value: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          id?: string
          period?: string
          target_value?: number
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number
          id?: string
          period?: string
          target_value?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding: {
        Row: {
          created_at: string
          exam_date: string | null
          hours_per_day: number
          learning_style: string
          objective: string
          study_days: number[]
          target_exam: string | null
          target_exam_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_date?: string | null
          hours_per_day?: number
          learning_style?: string
          objective: string
          study_days?: number[]
          target_exam?: string | null
          target_exam_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_date?: string | null
          hours_per_day?: number
          learning_style?: string
          objective?: string
          study_days?: number[]
          target_exam?: string | null
          target_exam_date?: string | null
          updated_at?: string
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
          leaderboard_opt_in: boolean
          onboarding_completed: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          leaderboard_opt_in?: boolean
          onboarding_completed?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          leaderboard_opt_in?: boolean
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          alternatives: Json
          correct_label: string
          created_at: string
          difficulty: number | null
          discrimination: number | null
          exam_year: number | null
          explanation: string | null
          external_id: string | null
          guessing: number | null
          id: string
          source: string
          statement: string
          subject: string
          topic: string | null
        }
        Insert: {
          alternatives: Json
          correct_label: string
          created_at?: string
          difficulty?: number | null
          discrimination?: number | null
          exam_year?: number | null
          explanation?: string | null
          external_id?: string | null
          guessing?: number | null
          id?: string
          source: string
          statement: string
          subject: string
          topic?: string | null
        }
        Update: {
          alternatives?: Json
          correct_label?: string
          created_at?: string
          difficulty?: number | null
          discrimination?: number | null
          exam_year?: number | null
          explanation?: string | null
          external_id?: string | null
          guessing?: number | null
          id?: string
          source?: string
          statement?: string
          subject?: string
          topic?: string | null
        }
        Relationships: []
      }
      schedule_tasks: {
        Row: {
          ai_reason: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          duration_min: number
          id: string
          is_review: boolean
          scheduled_date: string
          skipped: boolean
          source: string
          subject_id: string | null
          title: string
          topic: string | null
          user_id: string
        }
        Insert: {
          ai_reason?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          is_review?: boolean
          scheduled_date: string
          skipped?: boolean
          source?: string
          subject_id?: string | null
          title: string
          topic?: string | null
          user_id: string
        }
        Update: {
          ai_reason?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          is_review?: boolean
          scheduled_date?: string
          skipped?: boolean
          source?: string
          subject_id?: string | null
          title?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          kind: string
          metadata: Json | null
          name: string
          price: number
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          metadata?: Json | null
          name: string
          price: number
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          metadata?: Json | null
          name?: string
          price?: number
          slug?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_min: number
          id: string
          subject_id: string | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_min: number
          id?: string
          subject_id?: string | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_min?: number
          id?: string
          subject_id?: string | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string
          created_at: string
          difficulty: number
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          difficulty?: number
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          difficulty?: number
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      summaries: {
        Row: {
          content: Json
          created_at: string
          document_id: string | null
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          document_id?: string | null
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          document_id?: string | null
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "summaries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_inventory: {
        Row: {
          acquired_at: string
          equipped: boolean
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          equipped?: boolean
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          equipped?: boolean
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          coins: number
          last_study_date: string | null
          level: number
          streak_days: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          coins?: number
          last_study_date?: string | null
          level?: number
          streak_days?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          coins?: number
          last_study_date?: string | null
          level?: number
          streak_days?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      video_recommendations: {
        Row: {
          channel_hint: string | null
          completed: boolean
          created_at: string
          description: string | null
          duration_hint: string | null
          favorited: boolean
          id: string
          level: string
          reason: string | null
          resolved_title: string | null
          search_query: string
          subject: string
          title: string
          updated_at: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          channel_hint?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          duration_hint?: string | null
          favorited?: boolean
          id?: string
          level?: string
          reason?: string | null
          resolved_title?: string | null
          search_query: string
          subject: string
          title: string
          updated_at?: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          channel_hint?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          duration_hint?: string | null
          favorited?: boolean
          id?: string
          level?: string
          reason?: string | null
          resolved_title?: string | null
          search_query?: string
          subject?: string
          title?: string
          updated_at?: string
          user_id?: string
          video_id?: string | null
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
          avatar_url: string
          full_name: string
          level: number
          streak_days: number
          user_id: string
          xp: number
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
