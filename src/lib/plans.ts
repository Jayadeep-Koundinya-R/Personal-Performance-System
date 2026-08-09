export type PlanTier = "free" | "pro";
export type CurrencyRegion = "IN" | "GLOBAL";

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

export const REGIONAL_PRICING = {
  IN: {
    regionName: "India (PPP Discounted)",
    flag: "🇮🇳",
    currencySymbol: "₹",
    currencyCode: "INR",
    proMonthly: 199, // ₹199/month (~$2.40 / $2.63)
    proYearly: 1999, // ₹1999/year (~$24.00 / $26.26)
    proMonthlyUSD: 2.63,
    proYearlyUSD: 26.26,
    savingsBadge: "Save 44%",
  },
  GLOBAL: {
    regionName: "International / Global",
    flag: "🌐",
    currencySymbol: "$",
    currencyCode: "USD",
    proMonthly: 9.99,
    proYearly: 99.99,
    proMonthlyUSD: 9.99,
    proYearlyUSD: 99.99,
    savingsBadge: "Save 44%",
  },
} as const;

// Legacy fallback
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

export function detectUserRegion(): CurrencyRegion {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && (tz.includes("Kolkata") || tz.includes("Calcutta") || tz.includes("Asia/Colombo"))) {
      return "IN";
    }
    const lang = navigator.language || "";
    if (lang.includes("en-IN") || lang.includes("hi")) {
      return "IN";
    }
  } catch (e) {}
  return "GLOBAL";
}

export function getPlanLimits(tier: PlanTier) {
  return PLAN_LIMITS[tier];
}

export function isPro(tier: PlanTier) {
  return tier === "pro";
}
