// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const ALLOWED_ORIGINS = [
  "https://jayadeep-koundinya-r.github.io",
  "http://localhost:5173",
  "capacitor://localhost",
  "http://localhost",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header provided" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with user's JWT credentials
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Validate the user's JWT session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. PRO & FREE-TIER QUOTA GATING: Check if user is active Pro or has free daily prompts remaining
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .maybeSingle();

    const isProSub = sub?.status === "active" && sub?.plan === "pro";

    let isProUser = isProSub;
    if (!isProUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_tier")
        .eq("user_id", user.id)
        .maybeSingle();
      isProUser = profile?.plan_tier === "pro";
    }

    const FREE_DAILY_QUOTA = 3;
    let freeQueriesRemaining = FREE_DAILY_QUOTA;

    if (!isProUser) {
      const today = new Date().toISOString().split("T")[0];
      try {
        const { data: settings } = await supabase
          .from("user_settings")
          .select("notification_prefs")
          .eq("user_id", user.id)
          .maybeSingle();

        const prefs = settings?.notification_prefs || {};
        const aiUsage = prefs.ai_usage || { date: today, count: 0 };
        const currentCount = aiUsage.date === today ? (Number(aiUsage.count) || 0) : 0;

        if (currentCount >= FREE_DAILY_QUOTA) {
          return new Response(
            JSON.stringify({
              error: "PRO_REQUIRED",
              isPro: false,
              fallback: true,
              message: `You have reached your limit of ${FREE_DAILY_QUOTA} free daily AI prompts. Upgrade to Pro for unlimited coaching!`,
              remainingFreeQueries: 0,
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        freeQueriesRemaining = Math.max(0, FREE_DAILY_QUOTA - currentCount - 1);

        // Update quota count in user_settings notification_prefs
        await supabase
          .from("user_settings")
          .update({
            notification_prefs: {
              ...prefs,
              ai_usage: { date: today, count: currentCount + 1 },
            },
          })
          .eq("user_id", user.id);
      } catch (quotaErr) {
        console.warn("Failed to check free quota, defaulting to allow:", quotaErr);
        // Default allow if counter fails so authenticated users are not blocked on DB error
      }
    }

    const { message, habits, reflections, chatHistory } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Missing message parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. CHECK GEMINI API KEY CONFIGURATION
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_NOT_CONFIGURED",
          isPro: true,
          fallback: true,
          message: "Gemini API key is not configured on the server. Falling back to local coach engine.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. MODEL UPGRADE: Use current recommended gemini-2.0-flash
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Format user context variables for the AI Coach prompt
    const habitsPrompt = (habits || []).map((h: any) => 
      `- ${h.name} (${h.category}): Streak of ${h.streak} days. Last completed: ${h.lastCompletedDate || "never"}. Frequency: ${h.period}.`
    ).join("\n") || "No habits tracked yet.";

    const reflectionsPrompt = (reflections || []).slice(0, 5).map((r: any) => 
      `- Date: ${r.date}, Mood: ${r.mood}. Notes: "${r.text || "None"}"`
    ).join("\n") || "No reflections logged yet.";

    const systemPrompt = `You are a supportive, insightful, and direct AI Performance Coach & Autonomous Agent helping a user build consistent daily habits.
Here is the user's current habit and reflection context:

ACTIVE HABITS:
${habitsPrompt}

RECENT REFLECTIONS:
${reflectionsPrompt}

Analyze their progress. If they ask for a roast, be playfully strict and call out their misses or low streaks. If they ask for advice, provide specific, high-yield actionable tips based on deep-work principles.
If they ask you to create a habit, schedule an alarm, freeze a streak, or start a focus timer, acknowledge their request with encouragement and confirm that an interactive action confirmation card has been prepared for them below. Keep your answers relatively concise, encouraging, and focused on helping them level up their consistency. Respond using markdown.`;

    // Map frontend message format to Gemini's history structure
    const chatHistoryFormatted = (chatHistory || []).map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    // Start chat session with historical messages and system instructions
    const chat = model.startChat({
      history: chatHistoryFormatted,
      systemInstruction: systemPrompt,
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return new Response(
      JSON.stringify({
        text: responseText,
        model: "gemini-2.0-flash",
        isPro: isProUser,
        freeQuotaUsed: !isProUser,
        remainingFreeQueries: isProUser ? -1 : freeQueriesRemaining,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in ai-coach-chat function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        fallback: true,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

