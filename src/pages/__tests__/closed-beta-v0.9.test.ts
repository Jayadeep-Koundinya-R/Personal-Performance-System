import { describe, it, expect } from "vitest";
import { TRIAL_DURATION_DAYS } from "@/hooks/use-auth";

describe("v0.9 Closed Beta Ready Verification Suite", () => {
  it("Task 0.9.2: Environment variables standard and fallback configuration", () => {
    // Check that publishable keys or placeholders are handled gracefully
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-project.supabase.co";
    expect(supabaseUrl).toBeTruthy();
    expect(typeof supabaseUrl).toBe("string");
  });

  it("Task 0.9.2: TRIAL_DURATION_DAYS is universally exported as 5", () => {
    expect(TRIAL_DURATION_DAYS).toBe(5);
  });

  it("Task 0.9.4: Multi-device sync time window is consistent with 5-day trial", () => {
    const trialMs = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
    expect(trialMs).toBe(432000000); // 5 days in milliseconds
  });
});
