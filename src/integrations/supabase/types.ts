export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      connectors: {
        Row: {
          id: string;
          power_kw: number;
          price_per_kwh: number;
          station_id: string;
          status: Database["public"]["Enums"]["connector_status"];
          type: string;
        };
        Insert: {
          id?: string;
          power_kw: number;
          price_per_kwh: number;
          station_id: string;
          status?: Database["public"]["Enums"]["connector_status"];
          type: string;
        };
        Update: {
          id?: string;
          power_kw?: number;
          price_per_kwh?: number;
          station_id?: string;
          status?: Database["public"]["Enums"]["connector_status"];
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "connectors_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      favourites: {
        Row: {
          created_at: string;
          id: string;
          station_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          station_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          station_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favourites_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      issue_reports: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          station_id: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          station_id: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          station_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "issue_reports_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      operators: {
        Row: {
          id: string;
          logo_url: string | null;
          name: string;
        };
        Insert: {
          id?: string;
          logo_url?: string | null;
          name: string;
        };
        Update: {
          id?: string;
          logo_url?: string | null;
          name?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          vehicle_id: string | null;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          vehicle_id?: string | null;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      stations: {
        Row: {
          address: string;
          amenities: string[];
          city: string;
          created_at: string;
          id: string;
          lat: number;
          lng: number;
          name: string;
          opening_hours: string | null;
          operator_id: string;
        };
        Insert: {
          address: string;
          amenities?: string[];
          city: string;
          created_at?: string;
          id?: string;
          lat: number;
          lng: number;
          name: string;
          opening_hours?: string | null;
          operator_id: string;
        };
        Update: {
          address?: string;
          amenities?: string[];
          city?: string;
          created_at?: string;
          id?: string;
          lat?: number;
          lng?: number;
          name?: string;
          opening_hours?: string | null;
          operator_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stations_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          connector_types: string[];
          id: string;
          make: string;
          max_charge_kw: number;
          model: string;
        };
        Insert: {
          connector_types?: string[];
          id?: string;
          make: string;
          max_charge_kw: number;
          model: string;
        };
        Update: {
          connector_types?: string[];
          id?: string;
          make?: string;
          max_charge_kw?: number;
          model?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      connector_status: "available" | "in_use" | "offline";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      connector_status: ["available", "in_use", "offline"],
    },
  },
} as const;
