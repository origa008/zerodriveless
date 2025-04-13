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
      chats: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          receiver_email: string | null
          receiver_id: string
          ride_id: string
          sender_email: string | null
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          receiver_email?: string | null
          receiver_id: string
          ride_id: string
          sender_email?: string | null
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          receiver_email?: string | null
          receiver_id?: string
          ride_id?: string
          sender_email?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_requests: {
        Row: {
          account_number: string
          account_title: string
          amount: number
          bank_name: string
          created_at: string
          id: string
          processed_at: string | null
          receipt_url: string | null
          status: string
          transaction_reference: string | null
          user_id: string
        }
        Insert: {
          account_number: string
          account_title: string
          amount: number
          bank_name: string
          created_at?: string
          id?: string
          processed_at?: string | null
          receipt_url?: string | null
          status?: string
          transaction_reference?: string | null
          user_id: string
        }
        Update: {
          account_number?: string
          account_title?: string
          amount?: number
          bank_name?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          receipt_url?: string | null
          status?: string
          transaction_reference?: string | null
          user_id?: string
        }
        Relationships: []
      }
      driver_details: {
        Row: {
          approval_date: string | null
          cnic_back_url: string | null
          cnic_front_url: string | null
          cnic_number: string
          created_at: string
          deposit_amount_required: number
          driver_license_number: string | null
          email: string | null
          full_name: string
          has_sufficient_deposit: boolean
          id: string
          license_back_url: string | null
          license_front_url: string | null
          selfie_photo_url: string | null
          selfie_with_cnic_url: string | null
          status: string
          user_id: string
          vehicle_color: string | null
          vehicle_model: string | null
          vehicle_photo_url: string | null
          vehicle_registration_number: string
          vehicle_registration_url: string | null
          vehicle_type: string
        }
        Insert: {
          approval_date?: string | null
          cnic_back_url?: string | null
          cnic_front_url?: string | null
          cnic_number: string
          created_at?: string
          deposit_amount_required?: number
          driver_license_number?: string | null
          email?: string | null
          full_name: string
          has_sufficient_deposit?: boolean
          id?: string
          license_back_url?: string | null
          license_front_url?: string | null
          selfie_photo_url?: string | null
          selfie_with_cnic_url?: string | null
          status?: string
          user_id: string
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          vehicle_registration_number: string
          vehicle_registration_url?: string | null
          vehicle_type: string
        }
        Update: {
          approval_date?: string | null
          cnic_back_url?: string | null
          cnic_front_url?: string | null
          cnic_number?: string
          created_at?: string
          deposit_amount_required?: number
          driver_license_number?: string | null
          email?: string | null
          full_name?: string
          has_sufficient_deposit?: boolean
          id?: string
          license_back_url?: string | null
          license_front_url?: string | null
          selfie_photo_url?: string | null
          selfie_with_cnic_url?: string | null
          status?: string
          user_id?: string
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          vehicle_registration_number?: string
          vehicle_registration_url?: string | null
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_email: string | null
          author_id: string
          comments: number
          content: string
          created_at: string
          id: string
          likes: number
        }
        Insert: {
          author_email?: string | null
          author_id: string
          comments?: number
          content: string
          created_at?: string
          id?: string
          likes?: number
        }
        Update: {
          author_email?: string | null
          author_id?: string
          comments?: number
          content?: string
          created_at?: string
          id?: string
          likes?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar: string | null
          created_at: string
          email: string
          id: string
          is_verified_driver: boolean | null
          is_online: boolean | null
          current_location: {
            latitude: number
            longitude: number
            updated_at: string
          } | null
          last_online: string | null
          name: string
          phone: string | null
          referral_code: string | null
          rating: number | null
        }
        Insert: {
          address?: string | null
          avatar?: string | null
          created_at?: string
          email: string
          id: string
          is_verified_driver?: boolean | null
          is_online?: boolean | null
          current_location?: {
            latitude: number
            longitude: number
            updated_at: string
          } | null
          last_online?: string | null
          name: string
          phone?: string | null
          referral_code?: string | null
          rating?: number | null
        }
        Update: {
          address?: string | null
          avatar?: string | null
          created_at?: string
          email?: string
          id?: string
          is_verified_driver?: boolean | null
          is_online?: boolean | null
          current_location?: {
            latitude: number
            longitude: number
            updated_at: string
          } | null
          last_online?: string | null
          name?: string
          phone?: string | null
          referral_code?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rated_id: string
          rater_id: string
          rating: number
          ride_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_id: string
          rater_id: string
          rating: number
          ride_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_id?: string
          rater_id?: string
          rating?: number
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: true
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          created_at: string
          currency: string
          distance: number
          driver_email: string | null
          driver_id: string | null
          dropoff_location: Json
          duration: number
          end_time: string | null
          id: string
          passenger_email: string | null
          passenger_id: string
          payment_method: string
          pickup_location: Json
          price: number
          ride_option: Json
          start_time: string | null
          status: string
        }
        Insert: {
          created_at?: string
          currency?: string
          distance: number
          driver_email?: string | null
          driver_id?: string | null
          dropoff_location: Json
          duration: number
          end_time?: string | null
          id?: string
          passenger_email?: string | null
          passenger_id: string
          payment_method?: string
          pickup_location: Json
          price: number
          ride_option: Json
          start_time?: string | null
          status: string
        }
        Update: {
          created_at?: string
          currency?: string
          distance?: number
          driver_email?: string | null
          driver_id?: string | null
          dropoff_location?: Json
          duration?: number
          end_time?: string | null
          id?: string
          passenger_email?: string | null
          passenger_id?: string
          payment_method?: string
          pickup_location?: Json
          price?: number
          ride_option?: Json
          start_time?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          bank_details: Json | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          payment_method: string | null
          ride_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_details?: Json | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          payment_method?: string | null
          ride_id?: string | null
          status: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_details?: Json | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          payment_method?: string | null
          ride_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          id: string
          last_updated: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          last_updated?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          last_updated?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_requests: {
        Row: {
          id: string
          created_at: string
          passenger_id: string
          driver_id?: string | null
          pickup_location: {
            name: string
            coordinates: [number, number]
          }
          dropoff_location: {
            name: string
            coordinates: [number, number]
          }
          pickup_lat: number
          pickup_lng: number
          dropoff_lat: number
          dropoff_lng: number
          vehicle_type: 'car' | 'bike' | 'auto'
          estimated_price: number
          estimated_distance: number
          estimated_duration: number
          payment_method: string
          status: 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          passenger_id: string
          driver_id?: string | null
          pickup_location: {
            name: string
            coordinates: [number, number]
          }
          dropoff_location: {
            name: string
            coordinates: [number, number]
          }
          pickup_lat: number
          pickup_lng: number
          dropoff_lat: number
          dropoff_lng: number
          vehicle_type: 'car' | 'bike' | 'auto'
          estimated_price: number
          estimated_distance: number
          estimated_duration: number
          payment_method?: string
          status?: 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          passenger_id?: string
          driver_id?: string | null
          pickup_location?: {
            name: string
            coordinates: [number, number]
          }
          dropoff_location?: {
            name: string
            coordinates: [number, number]
          }
          pickup_lat?: number
          pickup_lng?: number
          dropoff_lat?: number
          dropoff_lng?: number
          vehicle_type?: 'car' | 'bike' | 'auto'
          estimated_price?: number
          estimated_distance?: number
          estimated_duration?: number
          payment_method?: string
          status?: 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_to_balance: {
        Args: { amount: number }
        Returns: number
      }
      add_to_wallet: {
        Args: { user_id: string; amount: number }
        Returns: undefined
      }
      create_referral: {
        Args: { referrer_code: string; referred_id: string }
        Returns: undefined
      }
      create_storage_policy: {
        Args: {
          bucket_id: string
          role_name: string
          operation: string
          policy: string
        }
        Returns: undefined
      }
      deduct_from_wallet: {
        Args: { user_id: string; amount: number }
        Returns: boolean
      }
      get_wallet_balance: {
        Args: { user_id: string }
        Returns: number
      }
      subtract_from_balance: {
        Args: { amount: number }
        Returns: number
      }
      get_nearby_ride_requests: {
        Args: {
          driver_lat: number
          driver_lng: number
          radius_km: number
        }
        Returns: {
          id: string
          passenger_id: string
          pickup_location: {
            name: string
            coordinates: [number, number]
          }
          dropoff_location: {
            name: string
            coordinates: [number, number]
          }
          estimated_price: number
          estimated_distance: number
          estimated_duration: number
          vehicle_type: 'car' | 'bike' | 'auto'
          status: 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
          created_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// Derived types
export type RideRequest = Database['public']['Tables']['ride_requests']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type RideStatus = RideRequest['status']
