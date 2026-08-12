import { describe, it, expect } from "vitest";
import { getPlanLimits, isPro, REGIONAL_PRICING, PLAN_LIMITS, CORE_BADGE_IDS } from "../../lib/plans";

describe("Subscription Billing & Plan Tier Rules", () => {
  it("correctly identifies Pro vs Free tier", () => {
    expect(isPro("pro")).toBe(true);
    expect(isPro("free")).toBe(false);
  });

  it("enforces habit limits on Free tier and unlimited on Pro tier", () => {
    const freeLimits = getPlanLimits("free");
    const proLimits = getPlanLimits("pro");

    expect(freeLimits.maxHabits).toBe(15);
    expect(proLimits.maxHabits).toBe(Infinity);
  });

  it("restricts history days for Free tier while giving Infinity to Pro tier", () => {
    const freeLimits = getPlanLimits("free");
    const proLimits = getPlanLimits("pro");

    expect(freeLimits.analyticsDays).toBe(7);
    expect(proLimits.analyticsDays).toBe(Infinity);
    expect(freeLimits.reflectionHistoryDays).toBe(7);
    expect(proLimits.reflectionHistoryDays).toBe(Infinity);
  });

  it("gates social features and smart insights to Pro tier", () => {
    const freeLimits = getPlanLimits("free");
    const proLimits = getPlanLimits("pro");

    expect(freeLimits.socialFeatures).toBe(false);
    expect(proLimits.socialFeatures).toBe(true);

    expect(freeLimits.smartInsights).toBe(false);
    expect(proLimits.smartInsights).toBe(true);
  });

  it("has valid India regional pricing (PPP discounted)", () => {
    const india = REGIONAL_PRICING.IN;
    expect(india.currencySymbol).toBe("₹");
    expect(india.currencyCode).toBe("INR");
    expect(india.proMonthly).toBe(199);
    expect(india.proYearly).toBe(1999);
  });

  it("has valid Global regional pricing", () => {
    const global = REGIONAL_PRICING.GLOBAL;
    expect(global.currencySymbol).toBe("$");
    expect(global.currencyCode).toBe("USD");
    expect(global.proMonthly).toBe(9.99);
    expect(global.proYearly).toBe(99.99);
  });

  it("defines core achievement badge IDs correctly", () => {
    expect(CORE_BADGE_IDS.has("first_step")).toBe(true);
    expect(CORE_BADGE_IDS.has("streak_7")).toBe(true);
    expect(CORE_BADGE_IDS.has("non_existent_badge")).toBe(false);
  });
});
