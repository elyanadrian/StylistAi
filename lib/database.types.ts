// Hand-written to match supabase/migrations/20261019000000_init.sql, in the
// same shape `supabase gen types typescript` produces. Once a Supabase project
// is linked, overwrite this file with `npm run db:types`.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          location_name: string | null;
          latitude: number | null;
          longitude: number | null;
          temp_unit: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          location_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          temp_unit?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          location_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          temp_unit?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          user_id: string;
          image_path: string;
          name: string | null;
          category: string | null;
          subcategory: string | null;
          colors: string[];
          pattern: string | null;
          formality: number | null;
          warmth: number | null;
          waterproof: boolean;
          ai_tags: Json | null;
          tag_status: string;
          user_edited: boolean;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          image_path: string;
          name?: string | null;
          category?: string | null;
          subcategory?: string | null;
          colors?: string[];
          pattern?: string | null;
          formality?: number | null;
          warmth?: number | null;
          waterproof?: boolean;
          ai_tags?: Json | null;
          tag_status?: string;
          user_edited?: boolean;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          image_path?: string;
          name?: string | null;
          category?: string | null;
          subcategory?: string | null;
          colors?: string[];
          pattern?: string | null;
          formality?: number | null;
          warmth?: number | null;
          waterproof?: boolean;
          ai_tags?: Json | null;
          tag_status?: string;
          user_edited?: boolean;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      outfits: {
        Row: {
          id: string;
          user_id: string;
          occasion: string;
          target_formality: number | null;
          weather: Json | null;
          explanation: string | null;
          model: string | null;
          source: string;
          rating: number | null;
          worn_on: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          occasion: string;
          target_formality?: number | null;
          weather?: Json | null;
          explanation?: string | null;
          model?: string | null;
          source?: string;
          rating?: number | null;
          worn_on?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          occasion?: string;
          target_formality?: number | null;
          weather?: Json | null;
          explanation?: string | null;
          model?: string | null;
          source?: string;
          rating?: number | null;
          worn_on?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      outfit_items: {
        Row: {
          outfit_id: string;
          item_id: string;
          slot: string;
        };
        Insert: {
          outfit_id: string;
          item_id: string;
          slot: string;
        };
        Update: {
          outfit_id?: string;
          item_id?: string;
          slot?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outfit_items_outfit_id_fkey";
            columns: ["outfit_id"];
            isOneToOne: false;
            referencedRelation: "outfits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outfit_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
