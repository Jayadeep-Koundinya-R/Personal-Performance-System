import { describe, it, expect } from "vitest";
import { getPlanLimits, isPro, PLAN_LIMITS, REGIONAL_PRICING, detectUserRegion, CORE_BADGE_IDS } from "../../lib/plans";

describe("Stage D: Pro Capabilities & Multi-Tier Verification Sweep", () => {
  describe("1. Plan Limits & Access Control Matrix", () => {
    it("verifies Free Tier strictly enforces limits", () => {
      const limits = getPlanLimits("free");
      expect(limits.maxHabits).toBe(15);
      expect(limits.reflectionHistoryDays).toBe(7);
      expect(limits.analyticsDays).toBe(7);
      expect(limits.focusRoomDailyMinutes).toBe(60);
      expect(limits.socialFeatures).toBe(false);
      expect(limits.smartInsights).toBe(false);
      expect(limits.shareCardsWatermark).toBe(true);
      expect(limits.aiConversationLimit).toBe(10);
    });

    it("verifies Student Pro Tier unlocks all limits to Infinity", () => {
      const limits = getPlanLimits("pro");
      expect(limits.maxHabits).toBe(Infinity);
      expect(limits.reflectionHistoryDays).toBe(Infinity);
      expect(limits.analyticsDays).toBe(Infinity);
      expect(limits.focusRoomDailyMinutes).toBe(Infinity);
      expect(limits.socialFeatures).toBe(true);
      expect(limits.smartInsights).toBe(true);
      expect(limits.shareCardsWatermark).toBe(false);
      expect(limits.aiConversationLimit).toBe(Infinity);
      expect(limits.customThemes).toBe(true);
      expect(limits.achievements).toBe("all");
    });

    it("verifies Teacher Tier has educator capabilities and revenue share", () => {
      const limits = getPlanLimits("teacher");
      expect(limits.maxHabits).toBe(Infinity);
      expect(limits.maxMembersPerGroup).toBe(100);
      expect(limits.commissionRate).toBe(0.10); // 10% platform commission
      expect(limits.lectureHosting).toBe(true);
      expect(limits.attendanceReports).toBe(true);
      expect(limits.streakFreezesPerMonth).toBe(5);
    });

    it("verifies Campus Institution Tier supports bulk enterprise scale", () => {
      const limits = getPlanLimits("institution");
      expect(limits.maxMembersPerGroup).toBe(500);
      expect(limits.bulkStudentRosters).toBe(true);
      expect(limits.campusLeaderboards).toBe(true);
      expect(limits.attendanceAuditLogs).toBe(true);
      expect(limits.customBranding).toBe(true);
    });
  });

  describe("2. isPro Helper Function Accuracy", () => {
    it("returns true for pro, teacher, and institution tiers", () => {
      expect(isPro("pro")).toBe(true);
      expect(isPro("teacher")).toBe(true);
      expect(isPro("institution")).toBe(true);
    });

    it("returns false for free tier", () => {
      expect(isPro("free")).toBe(false);
    });
  });

  describe("3. Regional PPP Pricing & Currency Conversion", () => {
    it("verifies Indian Rupee (INR) PPP pricing structure", () => {
      const inPricing = REGIONAL_PRICING.IN;
      expect(inPricing.currencyCode).toBe("INR");
      expect(inPricing.currencySymbol).toBe("₹");
      expect(inPricing.proMonthly).toBe(199);
      expect(inPricing.proYearly).toBe(1999);
      expect(inPricing.savingsBadge).toBe("Save 44%");
    });

    it("verifies International USD pricing structure", () => {
      const globalPricing = REGIONAL_PRICING.GLOBAL;
      expect(globalPricing.currencyCode).toBe("USD");
      expect(globalPricing.currencySymbol).toBe("$");
      expect(globalPricing.proMonthly).toBe(9.99);
      expect(globalPricing.proYearly).toBe(99.99);
    });
  });

  describe("4. Core Badges vs Pro Master Badges", () => {
    it("ensures free users only access core badge ids", () => {
      expect(CORE_BADGE_IDS.has("first_step")).toBe(true);
      expect(CORE_BADGE_IDS.has("streak_3")).toBe(true);
      expect(CORE_BADGE_IDS.has("streak_7")).toBe(true);
      expect(CORE_BADGE_IDS.has("perfect_day")).toBe(true);
      // Premium achievement badges should not be in core set
      expect(CORE_BADGE_IDS.has("century_club_100d")).toBe(false);
      expect(CORE_BADGE_IDS.has("zen_master_500h")).toBe(false);
    });
  });
});
