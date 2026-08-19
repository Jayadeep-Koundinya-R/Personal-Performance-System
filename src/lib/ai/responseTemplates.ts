/**
 * 📝 Smart Response Templates
 *
 * HOW THIS WORKS (Learning Notes):
 * ─────────────────────────────────
 * Each intent from the classifier maps to a set of response templates.
 * Templates are FUNCTIONS, not static strings — they receive the user's
 * real habit data and generate a personalized response.
 *
 * We provide multiple variants per intent so the bot doesn't repeat
 * the same response every time (we pick randomly).
 *
 * The `HabitContext` object contains pre-computed statistics about the
 * user's habits, streaks, and completion rates — the templates just
 * reference these values instead of re-computing them.
 */

export interface HabitContext {
  /** Total habits the user has */
  totalHabits: number;
  /** Habits due today */
  dueToday: number;
  /** Habits completed today */
  completedToday: number;
  /** Habits still pending today */
  pendingToday: number;
  /** Completion percentage today (0-100) */
  completionRate: number;
  /** User's longest active streak */
  maxStreak: number;
  /** Names of pending habits (for display) */
  pendingNames: string[];
  /** Names of completed habits today */
  completedNames: string[];
  /** Total all-time completions */
  totalCompletions: number;
  /** Top 3 habit names by streak */
  topStreakHabits: { name: string; streak: number }[];
  /** Recent reflection moods (last 3) */
  recentMoods: string[];
  /** User's display name */
  displayName: string;
}

type TemplateFunction = (ctx: HabitContext) => {
  text: string;
  actionHabits?: { id: string; name: string }[];
};

/**
 * Pick a random item from an array.
 * This is how we add variety — each intent has 2-3 templates.
 */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Response templates organized by intent name.
 * Each intent maps to a function that takes HabitContext and returns a response.
 */
export const RESPONSE_TEMPLATES: Record<string, TemplateFunction> = {

  greeting: (ctx) => {
    const templates = [
      `Hey ${ctx.displayName}! 👋 Ready to crush today's habits? You have ${ctx.pendingToday} pending out of ${ctx.dueToday} due today.`,
      `What's up, ${ctx.displayName}! Your completion rate today is ${ctx.completionRate}%. ${ctx.pendingToday === 0 ? "Clean sweep! 🏆" : `Let's knock out those ${ctx.pendingToday} remaining tasks!`}`,
      `Welcome back! 🚀 Quick status: ${ctx.completedToday}/${ctx.dueToday} habits done today, best streak at ${ctx.maxStreak} days. What can I help with?`,
    ];
    return { text: pick(templates) };
  },

  roast: (ctx) => {
    if (ctx.pendingToday === 0 && ctx.dueToday > 0) {
      return {
        text: pick([
          `🔥 I came here to roast you but... you've actually done ALL ${ctx.dueToday} habits today. Respect. I'll save the roast for when you inevitably slack off tomorrow. 😏`,
          `🔥 100% completion? Who are you and what did you do with the real ${ctx.displayName}? Seriously though — ${ctx.maxStreak}-day streak energy. Keep it up or I WILL come back harder.`,
        ]),
      };
    }
    if (ctx.dueToday === 0) {
      return {
        text: `🔥 You don't even have habits set up for today! That's not "rest day energy," that's "I'm hiding from accountability" energy. Go create some habits in Habit Architect right now!`,
      };
    }
    if (ctx.completionRate < 25) {
      return {
        text: `🔥 BRUTAL TRUTH: ${ctx.completedToday} out of ${ctx.dueToday} habits done today — that's ${ctx.completionRate}%. "${ctx.pendingNames[0]}" is just sitting there gathering dust. Your streak of ${ctx.maxStreak} days didn't build itself by making excuses. Get moving!`,
        actionHabits: ctx.pendingNames.slice(0, 3).map((name, i) => ({ id: `pending_${i}`, name })),
      };
    }
    return {
      text: `🔥 ${ctx.pendingToday} habits still pending including "${ctx.pendingNames[0]}" — you're at ${ctx.completionRate}% which is... mediocre at best. Your best streak is ${ctx.maxStreak} days. Want to keep it or let it die? Knock these out:`,
      actionHabits: ctx.pendingNames.slice(0, 3).map((name, i) => ({ id: `pending_${i}`, name })),
    };
  },

  audit: (ctx) => {
    if (ctx.pendingToday === 0 && ctx.dueToday > 0) {
      return {
        text: `📋 DAILY AUDIT COMPLETE\n━━━━━━━━━━━━━━━━━━━━━\n✅ Status: ALL CLEAR — ${ctx.completedToday}/${ctx.dueToday} habits done (100%)\n🔥 Best Streak: ${ctx.maxStreak} days\n📊 Total Lifetime Completions: ${ctx.totalCompletions}\n\nNothing pending. You earned your rest! 🏆`,
      };
    }
    if (ctx.dueToday === 0) {
      return {
        text: `📋 DAILY AUDIT\n━━━━━━━━━━━━━━\nNo habits are scheduled for today. Consider adding daily habits in the Habit Architect to keep your momentum going!`,
      };
    }
    const pendingList = ctx.pendingNames.map((n, i) => `  ${i + 1}. ${n}`).join("\n");
    return {
      text: `📋 DAILY AUDIT REPORT\n━━━━━━━━━━━━━━━━━━━━━\n✅ Completed: ${ctx.completedToday}/${ctx.dueToday} (${ctx.completionRate}%)\n⏳ Pending: ${ctx.pendingToday} habits remaining\n🔥 Best Streak: ${ctx.maxStreak} days\n\nStill pending:\n${pendingList}\n\nTap below to quick-complete:`,
      actionHabits: ctx.pendingNames.slice(0, 5).map((name, i) => ({ id: `pending_${i}`, name })),
    };
  },

  motivation: (ctx) => {
    const templates = [
      `💪 Listen — you've already completed ${ctx.totalCompletions} habits in your lifetime. That's not nothing. Every single one of those was a moment where you chose discipline over comfort. Today's ${ctx.pendingToday} pending habits? They're just ${ctx.pendingToday} more chances to prove you're serious.`,
      `🌟 Here's a fact: 92% of people abandon their habits within the first month. You? You've built a ${ctx.maxStreak}-day streak. You're already in the top 8%. Don't stop now — your future self will thank you.`,
      `⚡ The 2-Minute Rule: Don't think about doing the whole habit. Just start it for 2 minutes. Open the book, put on the shoes, write one sentence. Action creates motivation, not the other way around.`,
    ];
    return { text: pick(templates) };
  },

  focus: (ctx) => {
    const templates = [
      `🧠 DEEP FOCUS PROTOCOL:\n\n1. Pick ONE habit — start with "${ctx.pendingNames[0] || "your most important task"}"\n2. Set a 25-min timer in Focus Studio\n3. Close all other tabs (yes, ALL of them)\n4. Work until the timer rings\n\nThis is the Pomodoro Technique. It works because your brain can't resist a clear, time-boxed challenge.`,
      `🎯 Procrastination isn't about laziness — it's about emotional avoidance. Ask yourself: "What about this task feels uncomfortable?" Then do it for just 2 minutes. The resistance always fades once you start.`,
      `⚡ Cal Newport's Deep Work Rule: "A 4-hour focused session produces more than a 10-hour distracted one." Block distractions, put your phone in another room, and attack your ${ctx.pendingToday} pending habits with full intensity.`,
    ];
    return { text: pick(templates) };
  },

  streak: (ctx) => {
    if (ctx.maxStreak === 0) {
      return {
        text: `🛡️ Your streak hasn't started yet — and that's okay! Complete just ONE habit today to start a streak. Every great streak began with Day 1. The key is: never miss twice in a row.`,
      };
    }
    if (ctx.maxStreak >= 30) {
      return {
        text: `🏆 ${ctx.maxStreak}-DAY STREAK! That's elite-level consistency. You're in the top 1% of habit builders. Protect this streak like it's sacred — use a Streak Shield if you need a rest day. Don't let one bad day undo a month of work.`,
      };
    }
    return {
      text: pick([
        `🛡️ Your best streak: ${ctx.maxStreak} days. ${ctx.pendingToday > 0 ? `You have ${ctx.pendingToday} habits left today — complete them to keep the chain alive!` : "All habits done today — streak protected! 🔥"}\n\nPro tip: "Don't break the chain" (Jerry Seinfeld's method). Each day you complete adds a link. The longer it gets, the harder it is to break.`,
        `🔥 Streak Status: ${ctx.maxStreak} days and counting. Remember — it took you ${ctx.maxStreak} days to build this. One missed day doesn't erase it, but consistency compounds. ${ctx.pendingToday > 0 ? "Finish today's pending habits to stay on track!" : "You're golden for today!"}`,
      ]),
    };
  },

  stats: (ctx) => {
    const topHabits = ctx.topStreakHabits.length > 0
      ? ctx.topStreakHabits.map(h => `  • ${h.name}: ${h.streak}-day streak`).join("\n")
      : "  No active streaks yet";
    return {
      text: `📊 YOUR PERFORMANCE DASHBOARD\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📈 Today: ${ctx.completedToday}/${ctx.dueToday} (${ctx.completionRate}%)\n🔥 Best Streak: ${ctx.maxStreak} days\n🏅 Total Completions: ${ctx.totalCompletions}\n📦 Total Habits: ${ctx.totalHabits}\n\n🏆 Top Streak Habits:\n${topHabits}`,
    };
  },

  weekly_review: (ctx) => {
    return {
      text: `📅 WEEKLY SNAPSHOT\n━━━━━━━━━━━━━━━━━━\n🔥 Longest Streak: ${ctx.maxStreak} days\n📊 Today's Rate: ${ctx.completionRate}%\n🏅 Lifetime Completions: ${ctx.totalCompletions}\n${ctx.recentMoods.length > 0 ? `😊 Recent Moods: ${ctx.recentMoods.join(", ")}` : ""}\n\nFor a full breakdown with charts, head to the Analytics Studio or download a PDF report from Reports!`,
    };
  },

  habit_suggest: (ctx) => {
    const suggestions = [
      { name: "📚 Read 20 minutes", why: "Reading is the #1 habit of high performers" },
      { name: "🧘 5-min Meditation", why: "Reduces stress and improves focus by 14%" },
      { name: "💧 Drink 8 glasses of water", why: "Dehydration kills focus — most people don't drink enough" },
      { name: "📝 Daily Journaling", why: "Writing clarifies thinking and tracks emotional patterns" },
      { name: "🏃 30-min Exercise", why: "Physical activity boosts BDNF (brain growth protein)" },
      { name: "🛏️ Sleep by 11 PM", why: "Consistent sleep schedule is the foundation of all other habits" },
      { name: "📵 1 hour no-phone", why: "Digital detox improves attention span and creativity" },
      { name: "🍎 Eat a fruit daily", why: "Small nutrition wins compound into major health gains" },
    ];
    const picks = [];
    const shuffled = [...suggestions].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(3, shuffled.length); i++) picks.push(shuffled[i]);

    const list = picks.map((s, i) => `${i + 1}. **${s.name}** — ${s.why}`).join("\n");
    return {
      text: `💡 HABIT SUGGESTIONS FOR YOU:\n\n${list}\n\nYou currently have ${ctx.totalHabits} habits. Head to Habit Architect to add any of these!`,
    };
  },

  time_management: (ctx) => {
    return {
      text: pick([
        `⏰ TIME BLOCKING STRATEGY:\n\n🌅 Morning (6-9 AM): High-willpower habits (exercise, deep work, study)\n☀️ Midday (12-2 PM): Review & social habits\n🌙 Evening (7-9 PM): Reflection, reading, planning tomorrow\n\nYour ${ctx.dueToday} habits today should be spread across these blocks. Use Start/End times in Habit Architect to enforce this!`,
        `📅 PRO TIP: Schedule your hardest habit first thing in the morning. Willpower is highest after sleep and depletes throughout the day. "${ctx.pendingNames[0] || "Your top priority"}" should be a morning task!`,
      ]),
    };
  },

  celebrate: (ctx) => {
    if (ctx.completionRate === 100 && ctx.dueToday > 0) {
      return {
        text: `🎉🏆 PERFECT DAY! All ${ctx.completedToday} habits completed! You're UNSTOPPABLE!\n\n${ctx.maxStreak >= 7 ? `Combined with your ${ctx.maxStreak}-day streak, you're operating at elite level.` : "Keep stacking these perfect days and watch your streak grow!"}\n\nCelebrate this win — you earned it! 🥳`,
      };
    }
    return {
      text: pick([
        `🎉 Great energy! You've completed ${ctx.completedToday} habits today (${ctx.completionRate}%). ${ctx.pendingToday > 0 ? `Finish the last ${ctx.pendingToday} for a perfect day!` : "Clean sweep! 🏆"}`,
        `👏 Nice work, ${ctx.displayName}! Every completed habit is a vote for the person you want to become. ${ctx.totalCompletions} lifetime completions and counting!`,
      ]),
    };
  },

  sleep: (ctx) => {
    return {
      text: pick([
        `😴 SLEEP OPTIMIZATION TIPS:\n\n1. Fixed wake time — same time every day, even weekends\n2. No screens 30 min before bed (blue light suppresses melatonin)\n3. Cool room (65-68°F / 18-20°C)\n4. Track it as a habit! Add "Sleep by 11 PM" in Habit Architect\n\nSleep is the foundation — every other habit performs worse without it.`,
        `🛏️ Research shows that consistent sleep is MORE important than total hours. Sleeping 7 hours at the SAME time each night beats 9 hours at random times. Add a bedtime habit and guard it like your streak depends on it — because it does!`,
      ]),
    };
  },

  exercise: (ctx) => {
    return {
      text: pick([
        `🏋️ EXERCISE STRATEGY:\n\nDon't aim for perfection — aim for consistency:\n• Beginner: 15-min walk daily\n• Intermediate: 30-min mixed workout 4x/week\n• Advanced: 45-60 min strength + cardio 5x/week\n\nStart small. The habit of SHOWING UP matters more than the workout itself.`,
        `💪 Exercise produces BDNF (a brain protein that literally helps you learn faster). Even a 20-minute walk improves focus for 2+ hours after. Track it as a daily habit — your brain will thank you!`,
      ]),
    };
  },

  help: (ctx) => {
    return {
      text: `🤖 I'M YOUR AI PERFORMANCE COACH!\n\nHere's what I can do:\n\n🔥 **"Roast me"** — Brutally honest performance review\n📋 **"Daily audit"** — See pending habits & completion rate\n💪 **"Motivate me"** — Get a pep talk\n🧠 **"Focus tips"** — Procrastination-beating strategies\n🛡️ **"Streak advice"** — Protect your consistency chain\n📊 **"My stats"** — Full performance dashboard\n📅 **"Weekly review"** — Week-over-week summary\n💡 **"Suggest a habit"** — Get habit recommendations\n⏰ **"Time management"** — Scheduling strategies\n🎉 **"I completed everything!"** — Celebrate your wins\n\nJust type naturally — I'll figure out what you mean!`,
    };
  },

  compare: (ctx) => {
    return {
      text: `📈 PROGRESS COMPARISON\n━━━━━━━━━━━━━━━━━━━━━\n📊 Today's Rate: ${ctx.completionRate}%\n🔥 Current Best Streak: ${ctx.maxStreak} days\n🏅 Total Lifetime Completions: ${ctx.totalCompletions}\n\nFor detailed day-by-day and week-by-week comparisons with trend charts, check out the Analytics Studio! It has heatmaps, bar charts, and category breakdowns.`,
    };
  },

  gratitude: (ctx) => {
    return {
      text: pick([
        `🙏 Gratitude shifts your brain from "what's missing" to "what's working." Here's a quick exercise:\n\n1. Name 1 habit you're proud of maintaining\n2. Name 1 person who supports your growth\n3. Name 1 thing you learned this week\n\nWrite these in your Daily Reflection journal to lock them in! ${ctx.recentMoods.length > 0 ? `Your recent mood: ${ctx.recentMoods[0]}` : ""}`,
        `✨ The fact that you're using a habit tracker at all puts you ahead of most people. You've completed ${ctx.totalCompletions} habits total. That's ${ctx.totalCompletions} moments where you chose growth. Be proud of that!`,
      ]),
    };
  },

  create_habit: (ctx) => {
    return {
      text: `✨ I've prepared a new habit setup for you! Review the action card below and tap "Create Habit" to add it to your daily dashboard.`,
    };
  },

  freeze_streak: (ctx) => {
    return {
      text: `🛡️ STREAK PROTECTION\n\nI can activate a Streak Shield freeze credit for you so an unexpected busy day or illness doesn't reset your hard-earned chain. Confirm below to apply it:`,
    };
  },

  schedule_reminder: (ctx) => {
    return {
      text: `⏰ ALARM & REMINDER STUDIO\n\nI've prepared your scheduled reminder trigger. Habits with dedicated time reminders have a 300% higher completion rate. Confirm below to schedule:`,
    };
  },

  start_timer: (ctx) => {
    return {
      text: `🎯 FOCUS STUDIO LAUNCHER\n\nEliminate distractions and enter flow state. I've configured your Pomodoro deep-work timer below. Tap "Launch Session" to begin!`,
    };
  },

  unknown: (ctx) => {
    return {
      text: pick([
        `I'm not sure I understood that, but here's a quick status: ${ctx.completedToday}/${ctx.dueToday} habits done today (${ctx.completionRate}%). Try asking me to "roast me", "audit my day", or "create a habit"!`,
        `Hmm, I didn't catch that specific request. But I can help with:\n• Performance roasts 🔥\n• Daily audits 📋\n• Create habits ➕\n• Freeze streaks 🛡️\n• Start focus timers 🎯\n• Schedule alarms 🔔\n\nType "help" to see everything I can do!`,
      ]),
    };
  },
};
