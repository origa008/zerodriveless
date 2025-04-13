export interface Ride {
  id: string;
  created_at: string;
  pickup_location: string;
  dropoff_location: string;
  status: 'searching' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  user_id: string;
  driver_id: string | null;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  bid_amount: number | null;
  vehicle_type: string;
  estimated_distance: number | null;
  estimated_duration: number | null;
}

export interface Database {
  public: {
    Tables: {
      rides: {
        Row: Ride;
        Insert: Omit<Ride, 'id' | 'created_at' | 'driver_id'>;
        Update: Partial<Omit<Ride, 'id' | 'created_at' | 'user_id'>>;
      };
      driver_details: {
        Row: {
          id: string;
          user_id: string;
          status: 'pending' | 'approved' | 'rejected';
          vehicle_type: string;
          license_number: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['driver_details']['Row'], 'id' | 'created_at'>;
        Update: Partial<Omit<Database['public']['Tables']['driver_details']['Row'], 'id' | 'created_at' | 'user_id'>>;
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['wallets']['Row'], 'id' | 'created_at'>;
        Update: Partial<Omit<Database['public']['Tables']['wallets']['Row'], 'id' | 'created_at' | 'user_id'>>;
      };
    };
    Functions: {
      get_nearby_rides: {
        Args: {
          driver_lat: number;
          driver_lng: number;
          max_distance_km?: number;
        };
        Returns: Ride[];
      };
    };
  };
} 