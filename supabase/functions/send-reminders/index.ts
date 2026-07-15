// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();

  // 1. Fetch all enabled reminders
  const { data: reminders, error: remindersError } = await supabase
    .from("reminders")
    .select("*")
    .eq("enabled", true);

  if (remindersError) {
    return new Response(JSON.stringify({ error: remindersError.message }), { status: 500 });
  }

  // 2. Fetch all habits with start_time or end_time scheduled
  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("*")
    .or("start_time.not.is.null,end_time.not.is.null");

  if (habitsError) {
    return new Response(JSON.stringify({ error: habitsError.message }), { status: 500 });
  }

  // Get unique user IDs from both reminders and habits
  const reminderUserIds = reminders?.map((r) => r.user_id) || [];
  const habitUserIds = habits?.map((h) => h.user_id) || [];
  const userIds = [...new Set([...reminderUserIds, ...habitUserIds])];

  if (userIds.length === 0) {
    return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Fetch User Timezones and settings
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, timezone")
    .in("user_id", userIds);
  const tzMap = new Map(profiles?.map((p) => [p.user_id, p.timezone || "UTC"]) || []);

  const { data: userSettings } = await supabase
    .from("user_settings")
    .select("user_id, notification_prefs, default_reminder_settings")
    .in("user_id", userIds);
  const settingsMap = new Map(userSettings?.map((s) => [s.user_id, s]) || []);

  let processedCount = 0;
  let sentCount = 0;

  // 4. Process standalone reminders
  for (const reminder of reminders) {
    const tz = tzMap.get(reminder.user_id) || "UTC";

    // Format current date and time in user's timezone
    const userTimeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const userDateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
    });

    const userTimeStr = userTimeFormatter.format(now); // "HH:MM"
    const userTodayStr = userDateFormatter.format(now); // "YYYY-MM-DD"

    // Parse reminder time "HH:MM:SS" -> "HH:MM"
    const reminderTimeStr = reminder.reminder_time.slice(0, 5);

    // Get trigger dates
    const lastTriggeredDate = reminder.last_triggered_at
      ? userDateFormatter.format(new Date(reminder.last_triggered_at))
      : null;

    let isDue = false;
    let isSnoozedTrigger = false;

    // Check if snooze is active and due
    if (reminder.snoozed_until) {
      const snoozeTime = new Date(reminder.snoozed_until);
      if (now >= snoozeTime) {
        isDue = true;
        isSnoozedTrigger = true;
      }
    } else {
      // Normal trigger checks
      if (userTimeStr >= reminderTimeStr) {
        const alreadyTriggeredToday = lastTriggeredDate === userTodayStr;

        if (!alreadyTriggeredToday) {
          // Check repeat pattern
          if (reminder.repeat_pattern === "One-time" && !reminder.last_triggered_at) {
            isDue = true;
          } else if (reminder.repeat_pattern === "Daily") {
            isDue = true;
          } else if (reminder.repeat_pattern === "Weekly") {
            const createdDayOfWeek = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(new Date(reminder.created_at));
            const currentDayOfWeek = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(now);
            if (createdDayOfWeek === currentDayOfWeek) {
              isDue = true;
            }
          } else if (reminder.repeat_pattern === "Monthly") {
            const createdDayOfMonth = new Date(reminder.created_at).getDate();
            const currentDayOfMonth = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: tz, day: "numeric" }).format(now));
            if (createdDayOfMonth === currentDayOfMonth) {
              isDue = true;
            }
          }
        }
      }
    }

    if (!isDue) continue;

    processedCount++;

    // Habit completion check (if linked to a specific habit)
    let isHabitCompleted = false;
    let habitName = "";
    if (reminder.habit_id) {
      const { data: habit } = await supabase
        .from("habits")
        .select("name")
        .eq("id", reminder.habit_id)
        .maybeSingle();

      if (habit) {
        habitName = habit.name;

        // Query completions for today
        const { data: completion } = await supabase
          .from("habit_completions")
          .select("id")
          .eq("habit_id", reminder.habit_id)
          .eq("completed_date", userTodayStr)
          .maybeSingle();

        if (completion) {
          isHabitCompleted = true;
        }
      }
    }

    // If the habit is already completed today, mark it triggered and skip alert!
    if (isHabitCompleted) {
      await supabase
        .from("reminders")
        .update({
          last_triggered_at: now.toISOString(),
          snoozed_until: null,
          enabled: reminder.repeat_pattern === "One-time" ? false : reminder.enabled
        })
        .eq("id", reminder.id);
      continue;
    }

    const userSet = settingsMap.get(reminder.user_id);
    const globalPrefs = userSet?.notification_prefs || { email: true };

    // Send Alert based on Channel
    if (reminder.channel === "email") {
      if (globalPrefs.email !== false) {
        const { data: userData } = await supabase.auth.admin.getUserById(reminder.user_id);
        const email = userData?.user?.email;
        const resendApiKey = Deno.env.get("RESEND_API_KEY");

        if (email && resendApiKey) {
          const emailSubject = habitName ? `Reminder: Complete ${habitName} 🎯` : `${reminder.label} 🔔`;
          const emailMessage = habitName
            ? `Reminder: You haven't completed "${habitName}" today. Keep your streak alive!`
            : reminder.label;

          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "Personal Performance System <onboarding@resend.dev>",
              to: [email],
              subject: emailSubject,
              html: `<p>${emailMessage}</p>`,
            }),
          });

          if (emailRes.ok) sentCount++;
          else console.error(`Failed to send Resend email to ${email}:`, await emailRes.text());
        }
      }
    } else {
      // In-App Alert (Alarm or Soft Notification)
      const notificationType = reminder.delivery_type === "alarm" ? "alarm" : "reminder";
      const title = reminder.delivery_type === "alarm" ? "🚨 Habit Alarm!" : "🔔 Habit Reminder";
      const icon = reminder.delivery_type === "alarm" ? "⏰" : "🔔";
      
      const message = habitName
        ? `Reminder: You haven't completed "${habitName}" today. Keep your streak alive!`
        : reminder.label;

      await supabase.from("notifications").insert({
        user_id: reminder.user_id,
        type: notificationType,
        title: title,
        message: message,
        icon: icon,
        read: false,
      });
      sentCount++;
    }

    // Update reminder status
    await supabase
      .from("reminders")
      .update({
        last_triggered_at: now.toISOString(),
        snoozed_until: null,
        enabled: reminder.repeat_pattern === "One-time" ? false : reminder.enabled
      })
      .eq("id", reminder.id);
  }

  // 5. Process Habit schedules (Start & End Time blocks)
  if (habits && habits.length > 0) {
    for (const habit of habits) {
      const tz = tzMap.get(habit.user_id) || "UTC";

      const userTimeFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const userDateFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
      });

      const userTimeStr = userTimeFormatter.format(now); // "HH:MM"
      const userTodayStr = userDateFormatter.format(now); // "YYYY-MM-DD"

      const habitDueDateStr = userDateFormatter.format(new Date(habit.due_date));
      const isDue = userTodayStr >= habitDueDateStr;
      if (!isDue) continue;

      const userSet = settingsMap.get(habit.user_id);
      const defaultSettings = userSet?.default_reminder_settings || { repeat: "Daily", channel: "in_app", delivery_type: "notification" };
      const globalPrefs = userSet?.notification_prefs || { email: true };

      const channel = defaultSettings.channel || "in_app";
      const deliveryType = defaultSettings.delivery_type || "notification";

      // ── START TIME TRIGGER ──
      if (habit.start_time) {
        const startTimeStr = habit.start_time.slice(0, 5);
        const lastStartTriggeredDate = habit.last_start_triggered_at
          ? userDateFormatter.format(new Date(habit.last_start_triggered_at))
          : null;

        if (userTimeStr >= startTimeStr && lastStartTriggeredDate !== userTodayStr) {
          processedCount++;

          if (channel === "email" && globalPrefs.email !== false) {
            const { data: userData } = await supabase.auth.admin.getUserById(habit.user_id);
            const email = userData?.user?.email;
            const resendApiKey = Deno.env.get("RESEND_API_KEY");

            if (email && resendApiKey) {
              const emailRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${resendApiKey}`,
                },
                body: JSON.stringify({
                  from: "Personal Performance System <onboarding@resend.dev>",
                  to: [email],
                  subject: `Time to start: ${habit.name} 🎯`,
                  html: `<p>This is your automatic reminder to start your habit: "${habit.name}". Good luck!</p>`,
                }),
              });
              if (emailRes.ok) sentCount++;
            }
          } else {
            const forceAlarm = habit.start_alarm === true;
            const notificationType = forceAlarm || deliveryType === "alarm" ? "alarm" : "reminder";
            const title = forceAlarm || deliveryType === "alarm" ? "🚨 Habit Alarm!" : "🔔 Habit Reminder";
            const icon = forceAlarm || deliveryType === "alarm" ? "⏰" : "🔔";

            await supabase.from("notifications").insert({
              user_id: habit.user_id,
              type: notificationType,
              title: title,
              message: `Time to start: "${habit.name}"`,
              icon: icon,
              read: false,
            });
            sentCount++;
          }

          await supabase
            .from("habits")
            .update({ last_start_triggered_at: now.toISOString() })
            .eq("id", habit.id);
        }
      }

      // ── END TIME TRIGGER ──
      if (habit.end_time) {
        const endTimeStr = habit.end_time.slice(0, 5);
        const lastEndTriggeredDate = habit.last_end_triggered_at
          ? userDateFormatter.format(new Date(habit.last_end_triggered_at))
          : null;

        if (userTimeStr >= endTimeStr && lastEndTriggeredDate !== userTodayStr) {
          processedCount++;

          // Check if already completed today
          const { data: completion } = await supabase
            .from("habit_completions")
            .select("id")
            .eq("habit_id", habit.id)
            .eq("completed_date", userTodayStr)
            .maybeSingle();

          if (!completion) {
            if (channel === "email" && globalPrefs.email !== false) {
              const { data: userData } = await supabase.auth.admin.getUserById(habit.user_id);
              const email = userData?.user?.email;
              const resendApiKey = Deno.env.get("RESEND_API_KEY");

              if (email && resendApiKey) {
                const emailRes = await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${resendApiKey}`,
                  },
                  body: JSON.stringify({
                    from: "Personal Performance System <onboarding@resend.dev>",
                    to: [email],
                    subject: `Time's up for: ${habit.name} ⏳`,
                    html: `<p>Time is up for your habit: "${habit.name}". Did you complete it today?</p>`,
                  }),
                });
                if (emailRes.ok) sentCount++;
              }
            } else {
              const forceAlarm = habit.end_alarm === true;
              const notificationType = forceAlarm || deliveryType === "alarm" ? "alarm" : "reminder";
              const title = forceAlarm || deliveryType === "alarm" ? "🚨 Habit Alarm!" : "🔔 Habit Reminder";
              const icon = forceAlarm || deliveryType === "alarm" ? "⏰" : "🔔";

              await supabase.from("notifications").insert({
                user_id: habit.user_id,
                type: notificationType,
                title: title,
                message: `Time's up for "${habit.name}" — did you complete it?`,
                icon: icon,
                read: false,
              });
              sentCount++;
            }
          }

          await supabase
            .from("habits")
            .update({ last_end_triggered_at: now.toISOString() })
            .eq("id", habit.id);
        }
      }
    }
  }

  return new Response(JSON.stringify({ processed: processedCount, sent: sentCount }), {
    headers: { "Content-Type": "application/json" },
  });
});
