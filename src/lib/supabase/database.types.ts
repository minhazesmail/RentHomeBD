export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      amenities: {
        Row: { created_at: string; name: string; slug: string }
        Insert: { created_at?: string; name: string; slug: string }
        Update: { created_at?: string; name?: string; slug?: string }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string | null
          id: string
          primary_role: Database["public"]["Enums"]["profile_role"]
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          primary_role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          primary_role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address_text: string | null
          available_from: string | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          deposit_bdt: number
          description: string | null
          expires_at: string | null
          floor_number: number | null
          furnishing: Database["public"]["Enums"]["furnishing_status"]
          gender_preference: Database["public"]["Enums"]["gender_preference"]
          id: string
          last_confirmed_at: string | null
          latitude: number | null
          location: unknown
          longitude: number | null
          moderation_notes: string | null
          owner_id: string
          property_type: Database["public"]["Enums"]["property_type"] | null
          published_at: string | null
          rent_bdt: number | null
          size_sqft: number | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string | null
          total_floors: number | null
          updated_at: string
          utilities_included: string[]
        }
        Insert: {
          address_text?: string | null
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          deposit_bdt?: number
          description?: string | null
          expires_at?: string | null
          floor_number?: number | null
          furnishing?: Database["public"]["Enums"]["furnishing_status"]
          gender_preference?: Database["public"]["Enums"]["gender_preference"]
          id?: string
          last_confirmed_at?: string | null
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          moderation_notes?: string | null
          owner_id: string
          property_type?: Database["public"]["Enums"]["property_type"] | null
          published_at?: string | null
          rent_bdt?: number | null
          size_sqft?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string | null
          total_floors?: number | null
          updated_at?: string
          utilities_included?: string[]
        }
        Update: {
          address_text?: string | null
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          deposit_bdt?: number
          description?: string | null
          expires_at?: string | null
          floor_number?: number | null
          furnishing?: Database["public"]["Enums"]["furnishing_status"]
          gender_preference?: Database["public"]["Enums"]["gender_preference"]
          id?: string
          last_confirmed_at?: string | null
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          moderation_notes?: string | null
          owner_id?: string
          property_type?: Database["public"]["Enums"]["property_type"] | null
          published_at?: string | null
          rent_bdt?: number | null
          size_sqft?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string | null
          total_floors?: number | null
          updated_at?: string
          utilities_included?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_amenities: {
        Row: { amenity_slug: string; created_at: string; property_id: string }
        Insert: { amenity_slug: string; created_at?: string; property_id: string }
        Update: { amenity_slug?: string; created_at?: string; property_id?: string }
        Relationships: [
          {
            foreignKeyName: "property_amenities_amenity_slug_fkey"
            columns: ["amenity_slug"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "property_amenities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_media: {
        Row: {
          created_at: string
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          property_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          property_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          property_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_tenant_types: {
        Row: {
          created_at: string
          property_id: string
          tenant_type: Database["public"]["Enums"]["tenant_type"]
        }
        Insert: {
          created_at?: string
          property_id: string
          tenant_type: Database["public"]["Enums"]["tenant_type"]
        }
        Update: {
          created_at?: string
          property_id?: string
          tenant_type?: Database["public"]["Enums"]["tenant_type"]
        }
        Relationships: [
          {
            foreignKeyName: "property_tenant_types_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      furnishing_status: "furnished" | "semi_furnished" | "unfurnished"
      gender_preference: "male" | "female" | "any"
      listing_status:
        | "draft"
        | "pending_review"
        | "available"
        | "pending_confirmation"
        | "rented"
        | "expired"
        | "rejected"
      media_type: "photo" | "video"
      profile_role: "renter" | "owner" | "agent"
      property_type: "apartment" | "house" | "room_share" | "sublet" | "hostel_seat"
      tenant_type: "family" | "bachelor" | "student" | "job_holder" | "everyone"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      furnishing_status: ["furnished", "semi_furnished", "unfurnished"],
      gender_preference: ["male", "female", "any"],
      listing_status: ["draft", "pending_review", "available", "pending_confirmation", "rented", "expired", "rejected"],
      media_type: ["photo", "video"],
      profile_role: ["renter", "owner", "agent"],
      property_type: ["apartment", "house", "room_share", "sublet", "hostel_seat"],
      tenant_type: ["family", "bachelor", "student", "job_holder", "everyone"],
    },
  },
} as const
