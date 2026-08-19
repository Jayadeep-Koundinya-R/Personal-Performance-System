/**
 * 🛠️ Autonomous AI Agent Tool Engine
 *
 * HOW THIS WORKS (Phase 3 Autonomous AI):
 * ─────────────────────────────────────────
 * An AI Agent differs from a basic chatbot because it can take ACTIONS.
 * This module parses natural language into structured, executable Tool Payloads
 * and generates Human-in-the-Loop Confirmation Cards for the user.
 *
 * Supported Tools:
 * 1. CREATE_HABIT: Extracts habit details from natural language (e.g. "Add a daily habit for Yoga at 7 AM")
 * 2. FREEZE_STREAK: Identifies habit to protect with streak shield/freeze credit
 * 3. SCHEDULE_REMINDER: Converts time expressions to alarms & notifications linked to habits
 * 4. START_FOCUS_TIMER: Configures and triggers a dedicated deep-work Pomodoro session
 * 5. PROACTIVE_AUDIT: Generates recommendations for struggling habits or smart rescheduling
 */

export type AgentActionType =
  | "CREATE_HABIT"
  | "FREEZE_STREAK"
  | "SCHEDULE_REMINDER"
  | "START_FOCUS_TIMER"
  | "PROACTIVE_AUDIT";

export interface CreateHabitParams {
  name: string;
  category: "Health" | "Productivity" | "Learning" | "Mindset" | "Fitness" | "General";
  period: "Daily" | "Weekly" | "Monthly";
  priority: "High" | "Medium" | "Low";
  suggestedTime?: string;
}

export interface FreezeStreakParams {
  habitId?: string;
  habitName: string;
  freezeCreditsRemaining: number;
}

export interface ScheduleReminderParams {
  habitId?: string;
  habitName: string;
  time: string; // HH:MM:SS format
  displayTime: string; // e.g. "7:30 AM"
  repeatPattern: "Every Day" | "Weekdays Only" | "Weekends Only";
  deliveryType: "notification" | "alarm";
}

export interface StartFocusTimerParams {
  durationMinutes: number;
  habitId?: string;
  habitName?: string;
}

export interface AgentActionPayload {
  actionType: AgentActionType;
  title: string;
  description: string;
  parameters:
    | CreateHabitParams
    | FreezeStreakParams
    | ScheduleReminderParams
    | StartFocusTimerParams
    | any;
  status: "pending" | "executed" | "dismissed";
}

/**
 * Normalizes time strings like "7pm", "7:30 AM", "14:00", "9:15" into 24-hour HH:MM:SS format.
 */
export function normalizeTimeString(rawTime: string): { time24: string; displayTime: string } {
  const clean = rawTime.trim().toLowerCase();
  
  // Match e.g. "7:30 am", "7:30am", "7 pm", "7pm", "07:30"
  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) {
    return { time24: "09:00:00", displayTime: "9:00 AM" };
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];

  if (meridiem === "pm" && hours < 12) {
    hours += 12;
  } else if (meridiem === "am" && hours === 12) {
    hours = 0;
  }

  const pad = (n: number) => n.toString().padStart(2, "0");
  const time24 = `${pad(hours)}:${pad(minutes)}:00`;

  // Format 12-hour display time
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMeridiem = hours >= 12 ? "PM" : "AM";
  const displayTime = `${displayHours}:${pad(minutes)} ${displayMeridiem}`;

  return { time24, displayTime };
}

/**
 * Extracts category from habit description
 */
export function inferCategory(text: string): CreateHabitParams["category"] {
  const lower = text.toLowerCase();
  if (/(gym|workout|run|walk|exercise|pushups|swim|cardio|yoga|stretch)/.test(lower)) {
    return "Fitness";
  }
  if (/(water|sleep|meditate|eat|diet|healthy|vitamins|fasting)/.test(lower)) {
    return "Health";
  }
  if (/(read|study|code|learn|book|practice|language|course)/.test(lower)) {
    return "Learning";
  }
  if (/(journal|breathe|gratitude|pray|mindful|reflect)/.test(lower)) {
    return "Mindset";
  }
  if (/(work|code|inbox|email|tasks|project|pomodoro|focus|organize)/.test(lower)) {
    return "Productivity";
  }
  return "General";
}

/**
 * Parses parameters to create a habit from natural language.
 */
export function parseCreateHabitTool(message: string): AgentActionPayload | null {
  // Matches "add habit...", "create a habit to...", "new habit: ..."
  const habitRegex = /(?:add|create|new|start|set up)\s+(?:a\s+)?(?:new\s+)?(?:daily\s+|weekly\s+)?habit\s+(?:to\s+|for\s+|called\s+|:\s*)?([^.!?\n]+)/i;
  const match = message.match(habitRegex);
  if (!match && !/(?:add|create)\s+habit/i.test(message)) return null;

  let rawName = match ? match[1].trim() : message.replace(/(?:add|create|new)\s+habit/i, "").trim();
  
  // Extract time if specified (e.g. "at 7 AM", "every morning at 8:00")
  let suggestedTime: string | undefined;
  const timeMatch = rawName.match(/\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (timeMatch) {
    suggestedTime = normalizeTimeString(timeMatch[1]).displayTime;
    rawName = rawName.replace(/\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i, "").trim();
  }

  // Clean trailing punctuation / keywords
  rawName = rawName.replace(/^(to|for)\s+/i, "").replace(/[.!?,]+$/, "").trim();
  if (!rawName) rawName = "New Habit";

  // Capitalize words
  const formattedName = rawName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const category = inferCategory(formattedName);
  const isWeekly = /weekly|every week|on weekends/i.test(message);

  return {
    actionType: "CREATE_HABIT",
    title: `Create "${formattedName}"`,
    description: `Add a ${isWeekly ? "weekly" : "daily"} habit in the ${category} category.`,
    status: "pending",
    parameters: {
      name: formattedName,
      category,
      period: isWeekly ? "Weekly" : "Daily",
      priority: "Medium",
      suggestedTime,
    },
  };
}

/**
 * Parses parameters to freeze a streak from natural language.
 */
export function parseFreezeStreakTool(message: string, habits: any[]): AgentActionPayload | null {
  if (!/(?:freeze|protect|shield|save)\s+(?:my\s+)?(?:streak|habits?)/i.test(message) &&
      !/(?:take a break|traveling|vacation|sick today)/i.test(message)) {
    return null;
  }

  // Find matching habit name if mentioned
  let targetHabit = habits.find((h) => !h.archived && (h.streak || 0) > 0);
  for (const h of habits) {
    if (message.toLowerCase().includes(h.name.toLowerCase())) {
      targetHabit = h;
      break;
    }
  }

  if (!targetHabit) {
    targetHabit = habits.find((h) => !h.archived) || { id: "general", name: "All Habits", freezeCredits: 2 };
  }

  const credits = targetHabit.freezeCredits ?? targetHabit.freeze_credits ?? 2;

  return {
    actionType: "FREEZE_STREAK",
    title: `Freeze Streak for "${targetHabit.name}"`,
    description: `Protect your ${targetHabit.streak || 0}-day streak using 1 freeze credit (${credits} remaining).`,
    status: "pending",
    parameters: {
      habitId: targetHabit.id,
      habitName: targetHabit.name,
      freezeCreditsRemaining: credits,
    },
  };
}

/**
 * Parses parameters to schedule a reminder/alarm from natural language.
 */
export function parseScheduleReminderTool(message: string, habits: any[]): AgentActionPayload | null {
  if (!/(?:remind|alarm|notify|set reminder|set alarm)/i.test(message)) return null;

  // Extract time e.g. "at 7:30 AM", "at 9pm", "for 6:00"
  const timeMatch = message.match(/(?:at|for)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  const timeInfo = timeMatch ? normalizeTimeString(timeMatch[1]) : normalizeTimeString("8:00 AM");

  // Find habit if mentioned
  let targetHabit = habits.find((h) => message.toLowerCase().includes(h.name.toLowerCase()));
  if (!targetHabit) {
    targetHabit = habits.find((h) => !h.archived);
  }

  const habitName = targetHabit ? targetHabit.name : "Daily Habit";
  const isAlarm = /alarm|sound|wake/i.test(message);

  return {
    actionType: "SCHEDULE_REMINDER",
    title: `Set ${isAlarm ? "Alarm" : "Reminder"} for "${habitName}"`,
    description: `Schedule a daily ${isAlarm ? "alarm" : "push notification"} at ${timeInfo.displayTime}.`,
    status: "pending",
    parameters: {
      habitId: targetHabit?.id,
      habitName,
      time: timeInfo.time24,
      displayTime: timeInfo.displayTime,
      repeatPattern: "Every Day",
      deliveryType: isAlarm ? "alarm" : "notification",
    },
  };
}

/**
 * Parses parameters to start a Focus Studio Pomodoro timer session.
 */
export function parseFocusTimerTool(message: string, habits: any[] = []): AgentActionPayload | null {
  const isTimerIntent =
    /(?:start|launch|set|begin)\s+(?:a\s+)?(?:\d+\s*(?:min|minute|m|hour|hr|h)\s+)?(?:focus|timer|pomodoro|session|deep work)/i.test(message) ||
    /(?:focus|timer|pomodoro)\s+(?:for\s+)?\d+/i.test(message) ||
    /(?:pomodoro\s+session|focus\s+timer)/i.test(message);

  if (!isTimerIntent) {
    return null;
  }

  // Extract duration e.g. "25 min", "45 minutes", "1 hour", "50m"
  let duration = 25;
  const hourMatch = message.match(/(\d+)\s*(?:hour|hr|h)\b/i);
  const minMatch = message.match(/(\d+)\s*(?:min|minute|m)\b/i);

  if (hourMatch) {
    duration = parseInt(hourMatch[1], 10) * 60;
  } else if (minMatch) {
    duration = parseInt(minMatch[1], 10);
  }

  // Match habit if mentioned
  let targetHabit = habits.find((h) => message.toLowerCase().includes(h.name.toLowerCase()));
  if (!targetHabit) {
    targetHabit = habits.find((h) => !h.archived && /(work|study|code|read|write)/i.test(h.name));
  }

  return {
    actionType: "START_FOCUS_TIMER",
    title: `Launch ${duration}-Minute Focus Session`,
    description: `Start a deep-work timer${targetHabit ? ` linked to "${targetHabit.name}"` : ""}.`,
    status: "pending",
    parameters: {
      durationMinutes: duration,
      habitId: targetHabit?.id,
      habitName: targetHabit?.name,
    },
  };
}

/**
 * Master parser: Evaluates message and returns an executable Agent Action Payload if applicable.
 */
export function detectAgentAction(message: string, habits: any[] = []): AgentActionPayload | null {
  // 1. Check for Habit Creation intent
  const createTool = parseCreateHabitTool(message);
  if (createTool) return createTool;

  // 2. Check for Focus Timer launch intent
  const timerTool = parseFocusTimerTool(message, habits);
  if (timerTool) return timerTool;

  // 3. Check for Reminder / Alarm scheduling intent
  const reminderTool = parseScheduleReminderTool(message, habits);
  if (reminderTool) return reminderTool;

  // 4. Check for Streak Freeze / Shield intent
  const freezeTool = parseFreezeStreakTool(message, habits);
  if (freezeTool) return freezeTool;

  return null;
}
