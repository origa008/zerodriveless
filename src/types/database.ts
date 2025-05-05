
export interface DriverDetails {
  id: string;
  user_id: string;
  status: string;
  has_sufficient_deposit: boolean;
  current_location: {
    type: string;
    coordinates: [number, number];
    updated_at: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface Ride {
  id: string;
  passenger_id: string;
  driver_id?: string | null;
  pickup_location: {
    name: string;
    coordinates: [number, number];
  };
  dropoff_location: {
    name: string;
    coordinates: [number, number];
  };
  price: number;
  distance: number;
  duration: number;
  status: string;
  created_at: string;
}
