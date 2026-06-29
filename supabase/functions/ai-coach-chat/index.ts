// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header provided" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with client's credentials
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

    const { message, habits, reflections, chatHistory } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Missing message parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key is not configured on the server" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Format user context variables for the AI Coach prompt
    const habitsPrompt = (habits || []).map((h: any) => 
      `- ${h.name} (${h.category}): Streak of ${h.streak} days. Last completed: ${h.lastCompletedDate || "never"}. Frequency: ${h.period}.`
    ).join("\n") || "No habits tracked yet.";

    const reflectionsPrompt = (reflections || []).slice(0, 5).map((r: any) => 
      `- Date: ${r.date}, Mood: ${r.mood}. Notes: "${r.text || "None"}"`
    ).join("\n") || "No reflections logged yet.";

    const systemPrompt = `You are a supportive, insightful, and direct AI Performance Coach helping a user build consistent daily habits.
Here is the user's current habit and reflection context:

ACTIVE HABITS:
${habitsPrompt}

RECENT REFLECTIONS:
${reflectionsPrompt}

Analyze their progress. If they ask for a roast, be playfully strict and call out their misses or low streaks. If they ask for advice, provide specific, high-yield actionable tips based on deep-work principles. Keep your answers relatively concise, encouraging, and focused on helping them level up their consistency. Respond using markdown.`;

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

    return new Response(JSON.stringify({ text: responseText }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in ai-coach-chat function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
