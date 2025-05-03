
// Import calculateDistance from rideRequests instead
import { calculateDistance } from '@/lib/utils/rideRequests';

// And fix the pickup_location reference
const pickupLocation = ride.pickup; // Use pickup instead of pickup_location
