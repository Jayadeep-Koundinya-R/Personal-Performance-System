// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");

    const body = await req.json().catch(() => ({}));
    const { roomId, roomName } = body;

    if (!roomId) {
      return new Response(
        JSON.stringify({ error: "Missing required 'roomId' in request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!dailyApiKey) {
      // Graceful fallback for local development or before API key is saved
      return new Response(
        JSON.stringify({
          fallback: true,
          message: "DAILY_API_KEY is not configured in Supabase secrets. Please set DAILY_API_KEY.",
          url: null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize room name for Daily (letters, numbers, hyphens, max 40 chars)
    const sanitizedId = String(roomId).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 30);
    const dailyRoomName = `pps-${sanitizedId}`;

    // 1. Check if room already exists
    const checkRes = await fetch(`https://api.daily.co/v1/rooms/${dailyRoomName}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${dailyApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (checkRes.ok) {
      const existing = await checkRes.json();
      return new Response(
        JSON.stringify({
          url: existing.url,
          name: existing.name,
          domain: existing.domain || "",
          fallback: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create room with 24h expiration
    const expEpoch = Math.floor(Date.now() / 1000) + 86400; // 24 hours
    const createRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dailyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: dailyRoomName,
        privacy: "public",
        properties: {
          exp: expEpoch,
          enable_chat: false,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
          eject_at_room_exp: true,
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Daily API Create Room error:", errText);
      return new Response(
        JSON.stringify({
          error: "Failed to create Daily.co room",
          details: errText,
          fallback: true,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const created = await createRes.json();
    return new Response(
      JSON.stringify({
        url: created.url,
        name: created.name,
        domain: created.domain || "",
        fallback: false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("create-daily-room edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error", fallback: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
