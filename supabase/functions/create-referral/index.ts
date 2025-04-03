
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface RequestBody {
  referrerCode: string;
  referredId: string;
}

serve(async (req) => {
  try {
    // Create a Supabase client with the project URL and service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Parse request body
    const { referrerCode, referredId }: RequestBody = await req.json();
    
    if (!referrerCode || !referredId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Find referrer by code
    const { data: referrerData, error: referrerError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("referral_code", referrerCode)
      .single();
    
    if (referrerError || !referrerData) {
      return new Response(
        JSON.stringify({ error: "Invalid referral code" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Verify referred user exists
    const { data: referredData, error: referredError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", referredId)
      .single();
    
    if (referredError || !referredData) {
      return new Response(
        JSON.stringify({ error: "Invalid referred user" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Check if referral already exists
    const { data: existingReferral, error: existingError } = await supabaseAdmin
      .from("referrals")
      .select("id")
      .eq("referred_id", referredId)
      .limit(1);
    
    if (existingReferral && existingReferral.length > 0) {
      return new Response(
        JSON.stringify({ message: "Referral already exists" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Create new referral
    const { data: referralData, error: referralError } = await supabaseAdmin
      .from("referrals")
      .insert({
        referrer_id: referrerData.id,
        referred_id: referredId,
        status: "pending",
        amount: 50 // Default referral amount
      });
    
    if (referralError) {
      return new Response(
        JSON.stringify({ error: "Failed to create referral" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, message: "Referral created successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
