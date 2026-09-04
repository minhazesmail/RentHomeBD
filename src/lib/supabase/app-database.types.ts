import type { Database } from "./database.types";

type AuditFunctions = {
  get_my_property_moderation_notes: {
    Args: { property_ids: string[] };
    Returns: { property_id: string; moderation_notes: string | null }[];
  };
  replace_property_listing_relations: {
    Args: {
      property_uuid: string;
      tenant_values: string[];
      amenity_values: string[];
    };
    Returns: undefined;
  };
};

export type AppDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Database["public"]["Functions"] & AuditFunctions;
  };
};
