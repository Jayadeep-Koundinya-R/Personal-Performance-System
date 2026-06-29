// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);

  const { data: reminders } = await supabase
    .from("reminders")
    .select("*")
    .eq("enabled", true)
    .eq("reminder_time", currentTime);

  for (const reminder of reminders || []) {
    await supabase.from("notifications").insert({
      user_id: reminder.user_id,
      type: "reminder",
      title: "Habit Reminder",
      message: reminder.label,
      icon: "🔔",
    });
  }

  return new Response(JSON.stringify({ processed: reminders?.length || 0 }), {
    headers: { "Content-Type": "application/json" },
  });
});
