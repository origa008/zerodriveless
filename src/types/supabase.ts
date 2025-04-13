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
} 