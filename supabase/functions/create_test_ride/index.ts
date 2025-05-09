
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestParams = {
  userId?: string;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Parse request body
    let params: RequestParams = {};
    
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      params = body as RequestParams;
    }

    // Get userId from request, or use a default for testing
    const userId = params.userId || "00000000-0000-0000-0000-000000000000"; // Fallback for testing
    
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log for debugging
    console.log(`Creating test ride for user ${userId}`);

    // Get random coordinates near Islamabad (for testing)
    const baseLat = 33.6844;
    const baseLng = 73.0479;
    const randomOffset = () => (Math.random() - 0.5) * 0.03;
    
    const pickupLat = baseLat + randomOffset();
    const pickupLng = baseLng + randomOffset();
    const dropoffLat = baseLat + randomOffset();
    const dropoffLng = baseLng + randomOffset();
    
    // Distance calculation (rough approximation)
    const distance = Math.sqrt(
      Math.pow(dropoffLat - pickupLat, 2) + 
      Math.pow(dropoffLng - pickupLng, 2)
    ) * 111; // Rough conversion to kilometers
    
    // Calculate price based on distance
    const price = Math.max(100, Math.round(distance * 30));
    
    // Generate random duration (5-30 minutes)
    const duration = Math.floor(Math.random() * 25 + 5) * 60; // in seconds
    
    console.log(`Test ride details: ${distance.toFixed(2)} km, ${price} RS, ${duration/60} min`);
    
    // Create the test ride in the database
    const { data, error } = await supabase
      .from('rides')
      .insert({
        passenger_id: userId,
        pickup_location: {
          name: "Test Pickup Location",
          coordinates: [pickupLng, pickupLat],
        },
        dropoff_location: {
          name: "Test Dropoff Location",
          coordinates: [dropoffLng, dropoffLat],
        },
        status: 'searching',
        price: price,
        currency: 'RS',
        distance: parseFloat(distance.toFixed(2)),
        duration: duration,
        ride_option: {
          id: '1',
          name: 'Standard',
          type: 'car',
          basePrice: price
        },
        payment_method: 'cash'
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating test ride:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Test ride created successfully:", data.id);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Test ride created successfully",
        rideId: data.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("Error in create_test_ride function:", err);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Failed to create test ride"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
