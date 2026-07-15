export type PlanTier = "free" | "pro";

export const PLAN_LIMITS = {
  free: {
    maxHabits: 15,
    maxReminders: Infinity,
    reflectionHistoryDays: 7,
    analyticsDays: 7,
    achievements: "core" as const,
    streakFreezesPerMonth: 3,
    pdfReports: "unlimited" as const,
    socialFeatures: false,
    customThemes: false,
    shareCardsWatermark: true,
    aiCoach: true,
    smartInsights: false,
    aiConversationLimit: 10,
  },
  pro: {
    maxHabits: Infinity,
    maxReminders: Infinity,
    reflectionHistoryDays: Infinity,
    analyticsDays: Infinity,
    achievements: "all" as const,
    streakFreezesPerMonth: 3,
    pdfReports: "unlimited" as const,
    socialFeatures: true,
    customThemes: true,
    shareCardsWatermark: false,
    aiCoach: true,
    smartInsights: true,
    aiConversationLimit: Infinity,
  },
} as const;

export const PRICING = {
  proMonthly: 8.99,
  proYearly: 59.99,
  currency: "USD",
} as const;

export const CORE_BADGE_IDS = new Set([
  "first_step",
  "streak_3",
  "streak_7",
  "completions_10",
  "completions_50",
  "perfect_day",
]);

export function getPlanLimits(tier: PlanTier) {
  return PLAN_LIMITS[tier];
}

export function isPro(tier: PlanTier) {
  return tier === "pro";
}
