export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      auction_watchers: {
        Row: {
          auction_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          auction_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          auction_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_watchers_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_watchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          auto_extend_minutes: number | null
          bid_count: number
          bid_increment: number
          category_id: string | null
          condition: string | null
          created_at: string
          current_price: number
          description: string
          end_time: string
          featured: boolean
          final_price: number | null
          id: string
          images: string[]
          location: string | null
          reserve_price: number | null
          seller_id: string
          shipping_cost: number
          start_time: string
          starting_price: number
          status: Database["public"]["Enums"]["auction_status"]
          title: string
          updated_at: string
          view_count: number
          winner_id: string | null
        }
        Insert: {
          auto_extend_minutes?: number | null
          bid_count?: number
          bid_increment?: number
          category_id?: string | null
          condition?: string | null
          created_at?: string
          current_price?: number
          description: string
          end_time: string
          featured?: boolean
          final_price?: number | null
          id?: string
          images?: string[]
          location?: string | null
          reserve_price?: number | null
          seller_id: string
          shipping_cost?: number
          start_time: string
          starting_price: number
          status?: Database["public"]["Enums"]["auction_status"]
          title: string
          updated_at?: string
          view_count?: number
          winner_id?: string | null
        }
        Update: {
          auto_extend_minutes?: number | null
          bid_count?: number
          bid_increment?: number
          category_id?: string | null
          condition?: string | null
          created_at?: string
          current_price?: number
          description?: string
          end_time?: string
          featured?: boolean
          final_price?: number | null
          id?: string
          images?: string[]
          location?: string | null
          reserve_price?: number | null
          seller_id?: string
          shipping_cost?: number
          start_time?: string
          starting_price?: number
          status?: Database["public"]["Enums"]["auction_status"]
          title?: string
          updated_at?: string
          view_count?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          auction_id: string
          auto_bid_max_amount: number | null
          bid_time: string
          bidder_id: string
          created_at: string
          id: string
          ip_address: string | null
          is_auto_bid: boolean
          status: Database["public"]["Enums"]["bid_status"]
          user_agent: string | null
        }
        Insert: {
          amount: number
          auction_id: string
          auto_bid_max_amount?: number | null
          bid_time?: string
          bidder_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          is_auto_bid?: boolean
          status?: Database["public"]["Enums"]["bid_status"]
          user_agent?: string | null
        }
        Update: {
          amount?: number
          auction_id?: string
          auto_bid_max_amount?: number | null
          bid_time?: string
          bidder_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          is_auto_bid?: boolean
          status?: Database["public"]["Enums"]["bid_status"]
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      counter_offers: {
        Row: {
          auction_id: string
          bidder_id: string
          counter_amount: number
          created_at: string
          expires_at: string
          id: string
          message: string | null
          original_bid_amount: number
          responded_at: string | null
          seller_id: string
          status: Database["public"]["Enums"]["counter_offer_status"]
        }
        Insert: {
          auction_id: string
          bidder_id: string
          counter_amount: number
          created_at?: string
          expires_at: string
          id?: string
          message?: string | null
          original_bid_amount: number
          responded_at?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["counter_offer_status"]
        }
        Update: {
          auction_id?: string
          bidder_id?: string
          counter_amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          message?: string | null
          original_bid_amount?: number
          responded_at?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["counter_offer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "counter_offers_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counter_offers_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counter_offers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          auction_id: string | null
          bid_id: string | null
          created_at: string
          data: Json
          id: string
          is_email_sent: boolean
          is_read: boolean
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          auction_id?: string | null
          bid_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          is_email_sent?: boolean
          is_read?: boolean
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          auction_id?: string | null
          bid_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          is_email_sent?: boolean
          is_read?: boolean
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          auction_id: string
          buyer_id: string
          commission_amount: number
          completed_at: string | null
          counter_offer_id: string | null
          created_at: string
          id: string
          invoice_url: string | null
          notes: string | null
          payment_id: string | null
          payment_method: string | null
          seller_id: string
          shipping_cost: number
          status: Database["public"]["Enums"]["transaction_status"]
          total_amount: number
        }
        Insert: {
          amount: number
          auction_id: string
          buyer_id: string
          commission_amount?: number
          completed_at?: string | null
          counter_offer_id?: string | null
          created_at?: string
          id?: string
          invoice_url?: string | null
          notes?: string | null
          payment_id?: string | null
          payment_method?: string | null
          seller_id: string
          shipping_cost?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          total_amount: number
        }
        Update: {
          amount?: number
          auction_id?: string
          buyer_id?: string
          commission_amount?: number
          completed_at?: string | null
          counter_offer_id?: string | null
          created_at?: string
          id?: string
          invoice_url?: string | null
          notes?: string | null
          payment_id?: string | null
          payment_method?: string | null
          seller_id?: string
          shipping_cost?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_counter_offer_id_fkey"
            columns: ["counter_offer_id"]
            isOneToOne: false
            referencedRelation: "counter_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_admin: boolean
          is_verified: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_admin?: boolean
          is_verified?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_admin?: boolean
          is_verified?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: {
          p_user_id: string
          p_auction_id?: string
          p_bid_id?: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_title: string
          p_message: string
          p_data?: Json
        }
        Returns: string
      }
    }
    Enums: {
      auction_status: "draft" | "scheduled" | "active" | "ended" | "completed" | "cancelled"
      bid_status: "active" | "outbid" | "winning" | "lost"
      counter_offer_status: "pending" | "accepted" | "rejected" | "expired"
      notification_type: "bid_placed" | "outbid" | "auction_won" | "auction_ended" | "counter_offer" | "offer_accepted" | "offer_rejected" | "bid_accepted" | "bid_rejected"
      transaction_status: "pending" | "completed" | "failed" | "refunded"
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
