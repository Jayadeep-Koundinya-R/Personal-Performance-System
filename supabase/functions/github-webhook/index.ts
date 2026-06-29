// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // Only process pushes
    if (!payload.commits || payload.commits.length === 0) {
      return new Response(JSON.stringify({ message: "No commits in payload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // In a real scenario, you'd extract a user identifier from the webhook 
    // or configure a unique webhook URL per user. For now, we assume the 
    // user's GitHub username matches a stored metadata field, or we pass `userId` in the query params.
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId parameter" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch user's active habits that have github triggers
    const { data: habits, error: habitsError } = await supabaseAdmin
      .from("habits")
      .select("id, name, github_trigger_keywords, last_github_commit_hash, streak, last_completed_date")
      .eq("user_id", userId);

    if (habitsError || !habits || habits.length === 0) {
      return new Response(JSON.stringify({ message: "No active habits with triggers found." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Fetch today's habit completions for this user to check for duplicates
    const { data: todayCompletions, error: completionsError } = await supabaseAdmin
      .from("habit_completions")
      .select("habit_id")
      .eq("user_id", userId)
      .eq("completed_date", todayStr);

    if (completionsError) {
      console.error("Error fetching today's completions:", completionsError);
    }

    const completedTodayIds = new Set((todayCompletions || []).map((c: any) => c.habit_id));

    const relevantHabits = habits.filter((h) => h.github_trigger_keywords && h.github_trigger_keywords.length > 0);
    
    if (relevantHabits.length === 0) {
      return new Response(JSON.stringify({ message: "No habits have github keywords configured." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY") ?? "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const commitMessages = payload.commits.map((c: any) => c.message).join("\n");
    const latestHash = payload.commits[0].id;

    const habitPrompts = relevantHabits.map((h) => `Habit ID: ${h.id}, Name: ${h.name}, Keywords: ${h.github_trigger_keywords.join(", ")}`).join("\n");

    const prompt = `
You are a developer habit tracker AI. Read the following commit messages pushed by a developer.
Does this work satisfy any of the user's active habits based on the keywords?

Commit Messages:
${commitMessages}

Active Habits:
${habitPrompts}

Return a valid JSON array of Habit IDs that are satisfied by these commits. 
Example: ["123", "456"]
If none are satisfied, return []. Do not return markdown, just the JSON array.
`;

    const result = await model.generateContent(prompt);
    let matchedHabitIds: string[] = [];
    try {
        const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        matchedHabitIds = JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse Gemini response", e);
    }

    if (matchedHabitIds.length === 0) {
        return new Response(JSON.stringify({ message: "No habits matched." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Update the matched habits
    for (const habitId of matchedHabitIds) {
        const habit = relevantHabits.find(h => h.id === habitId);
        if (!habit) continue;
        
        // Prevent duplicate trigger for same commit
        if (habit.last_github_commit_hash === latestHash) continue;

        // Prevent duplicate completion for today
        if (completedTodayIds.has(habitId)) {
            // Update last commit hash to prevent re-triggering
            await supabaseAdmin
                .from("habits")
                .update({ 
                    last_github_commit_hash: latestHash
                })
                .eq("id", habitId);
            continue;
        }

        // Insert new completion
        const { error: insertError } = await supabaseAdmin
            .from("habit_completions")
            .insert({
                habit_id: habitId,
                user_id: userId,
                completed_date: todayStr,
            });

        if (insertError) {
            console.error(`Failed to insert completion for habit ${habitId}:`, insertError);
            continue;
        }

        // Calculate new streak
        const newStreak = habit.last_completed_date
            ? (Math.round((new Date(todayStr).getTime() - new Date(habit.last_completed_date).getTime()) / 864e5) === 1
                ? habit.streak + 1 
                : 1)
            : 1;

        await supabaseAdmin
            .from("habits")
            .update({ 
                streak: newStreak,
                last_completed_date: todayStr,
                last_github_commit_hash: latestHash
            })
            .eq("id", habitId);
    }

    return new Response(JSON.stringify({ message: "Success", matchedHabitIds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
