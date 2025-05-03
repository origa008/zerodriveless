
// Function to create a new ride request
const createNewRideRequest = async ({
  passengerId,
  pickupLocation,
  dropoffLocation,
  bidAmount,
  vehicleType,
  estimatedDistance,
  estimatedDuration,
  paymentMethod
}: {
  passengerId: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  bidAmount: number;
  vehicleType: string;
  estimatedDistance: number;
  estimatedDuration: number;
  paymentMethod: PaymentMethod;
}) => {
  try {
    console.log('Creating a new ride with:', {
      passenger_id: passengerId,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      bid_amount: bidAmount,
      ride_option: { name: vehicleType, type: vehicleType },
      price: bidAmount,
      distance: estimatedDistance,
      duration: estimatedDuration,
      payment_method: paymentMethod,
      status: 'searching',
      currency: 'RS'
    });

    const { data: ride, error } = await supabase
      .from('rides')
      .insert({
        passenger_id: passengerId,
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        bid_amount: bidAmount,
        ride_option: { name: vehicleType, type: vehicleType },
        price: bidAmount,
        distance: estimatedDistance,
        duration: estimatedDuration,
        payment_method: paymentMethod,
        status: 'searching',
        currency: 'RS'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ride request:', error);
      throw new Error(error.message);
    }

    console.log('Created ride:', ride);

    // Set up a subscription for this specific ride
    const unsubscribe = subscribeToRideStatus(ride.id, (updatedRide) => {
      console.log('Ride status updated:', updatedRide);
      // Handle any status updates
    });

    return { data: ride, error: null, unsubscribe };
  } catch (error: any) {
    console.error('Error in createNewRideRequest:', error);
    return { data: null, error: error.message, unsubscribe: () => {} };
  }
};

// In the fetchRideRequests function
const fetchRideRequests = async () => {
  if (!user?.id) return;
  
  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'searching')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setPendingRideRequests(data || []);
  } catch (error: any) {
    console.error('Error fetching ride requests:', error);
    toast({
      title: "Error",
      description: "Failed to fetch ride requests",
      variant: "destructive"
    });
  }
};
