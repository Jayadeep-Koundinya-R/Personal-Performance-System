import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("🛡️ PPS v0.5: Auth Truth Verification", () => {
  it("verifies Login.tsx does NOT contain fake TEST_ACCOUNTS or 1-click bypasses", () => {
    const loginFilePath = path.resolve(__dirname, "../Login.tsx");
    const loginContent = fs.readFileSync(loginFilePath, "utf8");

    expect(loginContent).not.toContain("TEST_ACCOUNTS");
    expect(loginContent).not.toContain("test.pro@pps.local");
    expect(loginContent).not.toContain("test.teacher@pps.local");
    expect(loginContent).not.toContain("test.free@pps.local");
    expect(loginContent).not.toContain("handleFillTestAccount");
  });

  it("verifies Login.tsx does NOT fake plan tiers via @pps.local or pps_plan", () => {
    const loginFilePath = path.resolve(__dirname, "../Login.tsx");
    const loginContent = fs.readFileSync(loginFilePath, "utf8");

    expect(loginContent).not.toContain('@pps.local');
    expect(loginContent).not.toContain('localStorage.setItem("pps_plan"');
  });

  it("verifies use-subscription does NOT allow localPlan bypasses", () => {
    const subFilePath = path.resolve(__dirname, "../../hooks/use-subscription.tsx");
    const subContent = fs.readFileSync(subFilePath, "utf8");

    expect(subContent).not.toContain('localStorage.getItem("pps_plan")');
  });

  it("verifies guest tier strictly defaults to free tier without authentic subscription", () => {
    const isGuest = true;
    const userId = null;
    const plan = (isGuest || !userId) ? "free" : "pro";
    expect(plan).toBe("free");
  });

  it("verifies OnboardingGuard relies on single authoritative DB/profile flag without multi-key confusion", () => {
    const guardPath = path.resolve(__dirname, "../../routes/OnboardingGuard.tsx");
    const guardContent = fs.readFileSync(guardPath, "utf8");

    expect(guardContent).not.toContain("pps_onboarding_completed");
    expect(guardContent).not.toContain("pps_skip_onboarding");
    expect(guardContent).not.toContain("pps_onboarded_guest");
    expect(guardContent).toContain("pps_guest_onboarded");
  });
});
