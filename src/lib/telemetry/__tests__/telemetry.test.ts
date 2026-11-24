import { describe, it, expect, beforeEach } from "vitest";
import {
  trackEvent,
  getTelemetryEvents,
  clearTelemetryEvents,
  sanitizeMetadata,
} from "../telemetry";

describe("Production Telemetry Logger", () => {
  beforeEach(() => {
    localStorage.clear();
    clearTelemetryEvents();
  });

  it("tracks key v1.0 milestone events", () => {
    const e1 = trackEvent("habit_completed", { habitId: "h-1", streak: 5 });
    const e2 = trackEvent("sprint_finished", { durationMinutes: 25, mode: "pomodoro" });
    const e3 = trackEvent("vayu_rebalanced", { displacedBlocks: 2 });
    const e4 = trackEvent("checkout_initiated", { plan: "pro", region: "IN" });

    expect(e1.name).toBe("habit_completed");
    expect(e2.name).toBe("sprint_finished");
    expect(e3.name).toBe("vayu_rebalanced");
    expect(e4.name).toBe("checkout_initiated");

    const events = getTelemetryEvents();
    expect(events.length).toBe(4);
  });

  it("strictly scrubs PII from metadata (email, passwords, tokens, full names)", () => {
    const dirty = {
      habitId: "h-42",
      email: "user@example.com",
      password: "secretpassword",
      token: "jwt_bearer_token",
      displayName: "Jane Doe",
      freeTextEmail: "jane@test.org",
      score: 95,
      active: true,
    };

    const sanitized = sanitizeMetadata(dirty);

    expect(sanitized.habitId).toBe("h-42");
    expect(sanitized.score).toBe(95);
    expect(sanitized.active).toBe(true);

    expect(sanitized.email).toBeUndefined();
    expect(sanitized.password).toBeUndefined();
    expect(sanitized.token).toBeUndefined();
    expect(sanitized.displayName).toBeUndefined();
    expect(sanitized.freeTextEmail).toBeUndefined();
  });

  it("persists sanitized events in localStorage and clears properly", () => {
    trackEvent("test_event", { metric: 100 });
    expect(getTelemetryEvents().length).toBe(1);

    clearTelemetryEvents();
    expect(getTelemetryEvents().length).toBe(0);
  });
});
