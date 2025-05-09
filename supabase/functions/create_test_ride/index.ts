
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Get the request body
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Creating test ride for user", userId);

    // Create a Supabase client with the service role key (use env variables)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate realistic test data near a major city (Islamabad coordinates)
    const baseLatitude = 33.6844; 
    const baseLongitude = 73.0479;
    
    // Add some randomness for realistic-looking locations (within about 5km)
    const pickupLat = baseLatitude + (Math.random() - 0.5) * 0.05;
    const pickupLng = baseLongitude + (Math.random() - 0.5) * 0.05;
    
    const dropoffLat = baseLatitude + (Math.random() - 0.5) * 0.05; 
    const dropoffLng = baseLongitude + (Math.random() - 0.5) * 0.05;
    
    // Calculate a realistic price based on distance
    const distance = Math.round(Math.random() * 10 + 2); // 2-12km
    const duration = Math.round(distance * 3); // ~3 min per km
    const price = Math.round(50 + (distance * 15)); // 50 base + 15 per km

    // Create a new ride request with proper GeoJSON format for coordinates
    const { data: ride, error } = await supabase
      .from("rides")
      .insert({
        passenger_id: userId,
        pickup_location: { 
          type: "Point",
          coordinates: [pickupLng, pickupLat],
          name: "Test Pickup Location"
        },
        dropoff_location: {
          type: "Point",
          coordinates: [dropoffLng, dropoffLat],
          name: "Test Dropoff Location"
        },
        status: "searching",
        price: price,
        distance: distance,
        duration: duration,
        ride_option: { 
          id: "1",
          name: "Standard", 
          type: "car",
          basePrice: price 
        },
        currency: "RS",
        payment_method: "cash"
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating test ride:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("Test ride created successfully:", ride.id);

    return new Response(
      JSON.stringify({ success: true, rideId: ride.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("Error in create_test_ride function:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
