// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header provided" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase Client with client auth context
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // Using service role key to insert suggestions safely
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Validate the user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch user data (Habits, Completions, Reminders)
    const { data: habits } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id);

    const { data: completions } = await supabase
      .from("habit_completions")
      .select("*")
      .eq("user_id", user.id);

    const { data: reminders } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id);

    if (!habits || habits.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Call Google Gemini
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a supportive and direct AI Performance Coach. Analyze this habit tracking history and suggest improvements.
Here is the data:
- Habits: ${JSON.stringify(habits)}
- Habit Completions (last 14 days): ${JSON.stringify(completions)}
- Active Reminders: ${JSON.stringify(reminders)}

Provide exactly two types of recommendations in a valid JSON array:
1. SMART TIMING: Suggest scheduling a habit to a different time if they consistently complete other habits or are active at specific times.
2. STRUGGLING HABIT: If a habit has low completion rates (e.g. less than 40%), suggest a different time or a simpler alternative habit name (e.g. change "Read 60 mins" to "Read 10 mins").

Your response MUST be a valid JSON array of objects with these keys:
- "type": "smart_timing" or "struggling_habit"
- "habit_id": string (the habit's ID)
- "habit_name": string (the habit's current name)
- "suggested_time": string in "HH:MM" format (or null)
- "alternative_habit_name": string (or null)
- "reason": string (a short, friendly, encouraging explanation, under 2 sentences, explaining the rationale based on their completed dates data)

Do not return any markdown code block formatting (like \`\`\`json). Just return the raw JSON text array.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Clean markdown code blocks if returned
    if (text.startsWith("```json")) {
      text = text.substring(7);
    } else if (text.startsWith("```")) {
      text = text.substring(3);
    }
    if (text.endsWith("```")) {
      text = text.substring(0, text.length - 3);
    }

    const suggestions = JSON.parse(text.trim());

    // 3. Clear previous pending suggestions
    await supabase
      .from("ai_suggestions")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "pending");

    // 4. Insert new suggestions
    const inserts = (suggestions || []).map((s) => ({
      user_id: user.id,
      type: s.type,
      habit_id: s.habit_id || null,
      suggested_time: s.suggested_time || null,
      alternative_habit_name: s.alternative_habit_name || null,
      reason: s.reason,
      status: "pending",
    }));

    if (inserts.length > 0) {
      await supabase.from("ai_suggestions").insert(inserts);
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Analysis error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
