import { describe, it, expect } from "vitest";
import { isPro, getPlanLimits, PLAN_LIMITS, detectUserRegion } from "../plans";

describe("Plans & Subscription Limits Logic", () => {
  it("isPro returns true ONLY for 'pro' tier, never hardcoded true for 'free'", () => {
    expect(isPro("pro")).toBe(true);
    expect(isPro("free")).toBe(false);
  });

  it("getPlanLimits returns exact limits for Free tier", () => {
    const limits = getPlanLimits("free");
    expect(limits.maxHabits).toBe(15);
    expect(limits.aiConversationLimit).toBe(10);
    expect(limits.socialFeatures).toBe(false);
  });

  it("getPlanLimits returns unlimited for Pro tier", () => {
    const limits = getPlanLimits("pro");
    expect(limits.maxHabits).toBe(Infinity);
    expect(limits.aiConversationLimit).toBe(Infinity);
    expect(limits.socialFeatures).toBe(true);
  });

  it("detectUserRegion returns valid CurrencyRegion string", () => {
    const region = detectUserRegion();
    expect(["IN", "GLOBAL"]).toContain(region);
  });
});
