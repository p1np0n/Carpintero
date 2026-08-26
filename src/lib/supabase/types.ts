export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      carpintero_comments: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carpintero_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "carpintero_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      carpintero_materials: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          owner_id: string | null
          price_per_sheet: number | null
          price_per_sqm: number | null
          sheet_height_m: number
          sheet_width_m: number
          thickness_mm: number
          type: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          owner_id?: string | null
          price_per_sheet?: number | null
          price_per_sqm?: number | null
          sheet_height_m?: number
          sheet_width_m?: number
          thickness_mm: number
          type: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          owner_id?: string | null
          price_per_sheet?: number | null
          price_per_sqm?: number | null
          sheet_height_m?: number
          sheet_width_m?: number
          thickness_mm?: number
          type?: string
        }
        Relationships: []
      }
      carpintero_project_materials: {
        Row: {
          created_at: string
          id: string
          material_id: string
          project_id: string
          scope: string
          target_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          project_id: string
          scope?: string
          target_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          project_id?: string
          scope?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carpintero_project_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "carpintero_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carpintero_project_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "carpintero_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      carpintero_project_versions: {
        Row: {
          created_at: string
          created_by: string | null
          design_json: Json
          id: string
          label: string | null
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          design_json: Json
          id?: string
          label?: string | null
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          design_json?: Json
          id?: string
          label?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carpintero_project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "carpintero_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      carpintero_projects: {
        Row: {
          created_at: string
          current_version_id: string | null
          id: string
          is_public: boolean
          is_template: boolean
          name: string
          owner_id: string
          share_slug: string | null
          template_source: string | null
          thumbnail_svg: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_version_id?: string | null
          id?: string
          is_public?: boolean
          is_template?: boolean
          name?: string
          owner_id: string
          share_slug?: string | null
          template_source?: string | null
          thumbnail_svg?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_version_id?: string | null
          id?: string
          is_public?: boolean
          is_template?: boolean
          name?: string
          owner_id?: string
          share_slug?: string | null
          template_source?: string | null
          thumbnail_svg?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carpintero_projects_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "carpintero_project_versions"
            referencedColumns: ["id"]
          },
        ]
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const
