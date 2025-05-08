
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  driver_lat: number;
  driver_lng: number;
  radius_km: number;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Get request params
    const { driver_lat, driver_lng, radius_km = 10 } = await req.json() as RequestBody;

    if (!driver_lat || !driver_lng) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Fetching rides near [${driver_lng}, ${driver_lat}] within ${radius_km}km`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query rides table for available rides
    const { data, error } = await supabase
      .from('rides')
      .select(`
        *,
        passenger:profiles!passenger_id (
          id, name, avatar
        )
      `)
      .eq('status', 'searching')
      .is('driver_id', null);

    if (error) {
      console.error('Error fetching rides:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Found ${data.length} rides in searching status`);

    // Calculate distances and filter by radius
    const nearbyRides = data
      .map(ride => {
        try {
          // Extract pickup coordinates
          let pickupCoords: [number, number] | null = null;
          
          if (ride.pickup_location) {
            if (typeof ride.pickup_location === 'string') {
              try {
                const parsed = JSON.parse(ride.pickup_location);
                if (parsed && Array.isArray(parsed.coordinates) && parsed.coordinates.length >= 2) {
                  pickupCoords = [Number(parsed.coordinates[0]), Number(parsed.coordinates[1])];
                }
              } catch (e) {
                console.error("Error parsing pickup_location:", e);
              }
            } else if (typeof ride.pickup_location === 'object' && ride.pickup_location !== null) {
              const loc = ride.pickup_location;
              if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
                pickupCoords = [Number(loc.coordinates[0]), Number(loc.coordinates[1])];
              } else if (loc.lng !== undefined && loc.lat !== undefined) {
                pickupCoords = [Number(loc.lng), Number(loc.lat)];
              } else if (loc.longitude !== undefined && loc.latitude !== undefined) {
                pickupCoords = [Number(loc.longitude), Number(loc.latitude)];
              }
            }
          }
          
          if (!pickupCoords) {
            console.warn(`Could not extract coordinates for ride ${ride.id}`);
            return null;
          }
          
          // Calculate distance to pickup
          const distance = calculateDistance(
            [driver_lng, driver_lat],
            pickupCoords
          );
          
          return {
            ...ride,
            distance_to_pickup: parseFloat(distance.toFixed(2))
          };
        } catch (err) {
          console.error(`Error processing ride ${ride.id}:`, err);
          return null;
        }
      })
      .filter(ride => ride !== null && ride.distance_to_pickup <= radius_km)
      .sort((a, b) => a.distance_to_pickup - b.distance_to_pickup);

    console.log(`Returning ${nearbyRides.length} rides within ${radius_km}km`);
    
    return new Response(
      JSON.stringify(nearbyRides),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(point1: [number, number], point2: [number, number]): number {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;

  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  return distance;
}
