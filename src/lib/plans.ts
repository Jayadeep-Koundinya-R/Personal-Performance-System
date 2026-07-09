export type PlanTier = "free" | "pro";

export const PLAN_LIMITS = {
  free: {
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
  return true;
}
