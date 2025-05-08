
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
    // Get request params (optional userId or use a default one)
    const { userId } = await req.json().catch(() => ({}));

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get first user id if none provided
    let actualUserId = userId;
    if (!actualUserId) {
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();
      
      if (usersError) {
        throw new Error(`Error finding user: ${usersError.message}`);
      }
      
      if (users) {
        actualUserId = users.id;
      } else {
        throw new Error("No users found to create test ride");
      }
    }

    // Create test ride
    const testRide = {
      passenger_id: actualUserId,
      pickup_location: { 
        name: "Test Pickup Location", 
        coordinates: [73.0479, 33.6844] // Islamabad coords
      },
      dropoff_location: {
        name: "Test Dropoff Location",
        coordinates: [73.0682, 33.7294] // A few km away
      },
      status: 'searching',
      price: 250,
      distance: 5.2,
      duration: 900, // 15 minutes in seconds
      ride_option: { name: 'Standard', type: 'car' },
      currency: 'RS',
      payment_method: 'cash'
    };

    console.log("Creating test ride:", testRide);

    const { data, error } = await supabase
      .from('rides')
      .insert(testRide)
      .select()
      .single();

    if (error) {
      console.error("Error creating test ride:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error('Error creating test ride:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
