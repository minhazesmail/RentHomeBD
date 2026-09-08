export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      amenities: {
        Row: { created_at: string; name: string; slug: string };
        Insert: { created_at?: string; name: string; slug: string };
        Update: { created_at?: string; name?: string; slug?: string };
        Relationships: [];
      };
      moderators: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string; created_at?: string };
        Update: { user_id?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "moderators_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          phone_verified_at: string | null;
          preferred_tenant_type: Database["public"]["Enums"]["tenant_type"] | null;
          primary_role: Database["public"]["Enums"]["profile_role"];
          role_verified_at: string | null;
          role_verified_by: string | null;
          role_verified_role: Database["public"]["Enums"]["profile_role"] | null;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          phone_verified_at?: string | null;
          preferred_tenant_type?: Database["public"]["Enums"]["tenant_type"] | null;
          primary_role?: Database["public"]["Enums"]["profile_role"];
          role_verified_at?: string | null;
          role_verified_by?: string | null;
          role_verified_role?: Database["public"]["Enums"]["profile_role"] | null;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          phone_verified_at?: string | null;
          preferred_tenant_type?: Database["public"]["Enums"]["tenant_type"] | null;
          primary_role?: Database["public"]["Enums"]["profile_role"];
          role_verified_at?: string | null;
          role_verified_by?: string | null;
          role_verified_role?: Database["public"]["Enums"]["profile_role"] | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          address_text: string | null;
          available_from: string | null;
          bathrooms: number | null;
          bedrooms: number | null;
          created_at: string;
          deposit_bdt: number;
          description: string | null;
          expires_at: string | null;
          floor_number: number | null;
          furnishing: Database["public"]["Enums"]["furnishing_status"];
          gender_preference: Database["public"]["Enums"]["gender_preference"];
          id: string;
          last_confirmed_at: string | null;
          latitude: number | null;
          location: unknown;
          longitude: number | null;
          moderation_notes: string | null;
          owner_id: string;
          property_type: Database["public"]["Enums"]["property_type"] | null;
          public_owner_display_name: string | null;
          public_owner_phone_verified_at: string | null;
          public_owner_role: Database["public"]["Enums"]["profile_role"] | null;
          public_owner_role_verified_at: string | null;
          public_owner_role_verified_role: Database["public"]["Enums"]["profile_role"] | null;
          published_at: string | null;
          rent_bdt: number | null;
          size_sqft: number | null;
          status: Database["public"]["Enums"]["listing_status"];
          title: string | null;
          total_floors: number | null;
          updated_at: string;
          utilities_included: string[];
        };
        Insert: {
          address_text?: string | null;
          available_from?: string | null;
          bathrooms?: number | null;
          bedrooms?: number | null;
          created_at?: string;
          deposit_bdt?: number;
          description?: string | null;
          expires_at?: string | null;
          floor_number?: number | null;
          furnishing?: Database["public"]["Enums"]["furnishing_status"];
          gender_preference?: Database["public"]["Enums"]["gender_preference"];
          id?: string;
          last_confirmed_at?: string | null;
          latitude?: number | null;
          location?: unknown;
          longitude?: number | null;
          moderation_notes?: string | null;
          owner_id: string;
          property_type?: Database["public"]["Enums"]["property_type"] | null;
          published_at?: string | null;
          rent_bdt?: number | null;
          size_sqft?: number | null;
          status?: Database["public"]["Enums"]["listing_status"];
          title?: string | null;
          total_floors?: number | null;
          updated_at?: string;
          utilities_included?: string[];
        };
        Update: {
          address_text?: string | null;
          available_from?: string | null;
          bathrooms?: number | null;
          bedrooms?: number | null;
          created_at?: string;
          deposit_bdt?: number;
          description?: string | null;
          expires_at?: string | null;
          floor_number?: number | null;
          furnishing?: Database["public"]["Enums"]["furnishing_status"];
          gender_preference?: Database["public"]["Enums"]["gender_preference"];
          id?: string;
          last_confirmed_at?: string | null;
          latitude?: number | null;
          location?: unknown;
          longitude?: number | null;
          moderation_notes?: string | null;
          owner_id?: string;
          property_type?: Database["public"]["Enums"]["property_type"] | null;
          published_at?: string | null;
          rent_bdt?: number | null;
          size_sqft?: number | null;
          status?: Database["public"]["Enums"]["listing_status"];
          title?: string | null;
          total_floors?: number | null;
          updated_at?: string;
          utilities_included?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      property_amenities: {
        Row: { amenity_slug: string; created_at: string; property_id: string };
        Insert: {
          amenity_slug: string;
          created_at?: string;
          property_id: string;
        };
        Update: {
          amenity_slug?: string;
          created_at?: string;
          property_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_amenities_amenity_slug_fkey";
            columns: ["amenity_slug"];
            isOneToOne: false;
            referencedRelation: "amenities";
            referencedColumns: ["slug"];
          },
          {
            foreignKeyName: "property_amenities_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      property_media: {
        Row: {
          created_at: string;
          id: string;
          media_type: Database["public"]["Enums"]["media_type"];
          property_id: string;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          media_type?: Database["public"]["Enums"]["media_type"];
          property_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          media_type?: Database["public"]["Enums"]["media_type"];
          property_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_media_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      property_tenant_types: {
        Row: {
          created_at: string;
          property_id: string;
          tenant_type: Database["public"]["Enums"]["tenant_type"];
        };
        Insert: {
          created_at?: string;
          property_id: string;
          tenant_type: Database["public"]["Enums"]["tenant_type"];
        };
        Update: {
          created_at?: string;
          property_id?: string;
          tenant_type?: Database["public"]["Enums"]["tenant_type"];
        };
        Relationships: [
          {
            foreignKeyName: "property_tenant_types_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_properties: {
        Row: {
          created_at: string;
          property_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          property_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          property_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_properties_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_properties_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_searches: {
        Row: {
          center_lat: number;
          center_long: number;
          created_at: string;
          id: string;
          max_rent: number | null;
          min_bedrooms: number | null;
          min_rent: number | null;
          name: string;
          radius_km: number | null;
          tenant_type: Database["public"]["Enums"]["tenant_type"] | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          center_lat: number;
          center_long: number;
          created_at?: string;
          id?: string;
          max_rent?: number | null;
          min_bedrooms?: number | null;
          min_rent?: number | null;
          name: string;
          radius_km?: number | null;
          tenant_type?: Database["public"]["Enums"]["tenant_type"] | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          center_lat?: number;
          center_long?: number;
          created_at?: string;
          id?: string;
          max_rent?: number | null;
          min_bedrooms?: number | null;
          min_rent?: number | null;
          name?: string;
          radius_km?: number | null;
          tenant_type?: Database["public"]["Enums"]["tenant_type"] | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_message_inbox: {
        Args: { search_text?: string | null; unread_only?: boolean | null };
        Returns: {
          unread_count?: number | string | null;
        }[];
      };
    };
    Enums: {
      furnishing_status: "furnished" | "semi_furnished" | "unfurnished";
      gender_preference: "male" | "female" | "any";
      listing_status:
        | "draft"
        | "pending_review"
        | "available"
        | "pending_confirmation"
        | "rented"
        | "expired"
        | "rejected";
      media_type: "photo" | "video";
      moderation_decision: "approve" | "reject";
      profile_role: "renter" | "owner" | "agent";
      profile_verification_decision: "verify" | "revoke";
      property_type:
        | "apartment"
        | "house"
        | "room_share"
        | "sublet"
        | "hostel_seat";
      tenant_type:
        | "family"
        | "bachelor"
        | "student"
        | "job_holder"
        | "everyone";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<
  T extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<
  T extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<
  T extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      furnishing_status: ["furnished", "semi_furnished", "unfurnished"],
      gender_preference: ["male", "female", "any"],
      listing_status: [
        "draft",
        "pending_review",
        "available",
        "pending_confirmation",
        "rented",
        "expired",
        "rejected",
      ],
      media_type: ["photo", "video"],
      moderation_decision: ["approve", "reject"],
      profile_role: ["renter", "owner", "agent"],
      profile_verification_decision: ["verify", "revoke"],
      property_type: [
        "apartment",
        "house",
        "room_share",
        "sublet",
        "hostel_seat",
      ],
      tenant_type: [
        "family",
        "bachelor",
        "student",
        "job_holder",
        "everyone",
      ],
    },
  },
} as const;
