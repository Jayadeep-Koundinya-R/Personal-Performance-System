import { describe, it, expect, beforeEach, vi } from "vitest";
import { createElement } from "react";
import { renderHook, act } from "@testing-library/react";
import { useAuth, AuthProvider, TRIAL_DURATION_DAYS } from "@/hooks/use-auth";

// Mock React Router (same approach as surface-cleanup-v0.7)
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => createElement("a", { href: to }, children),
}));

// Mock Supabase so no network/auth calls are made
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
    }),
  },
}));

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// V1 launch regression guards. Scope: guest 5-day free-trial invariants.
// NOTE: Offline-queue flush (src/lib/sync/__tests__/offlineQueue.test.ts) and
// timer->habit auto-complete (use-habits-agni2.test.tsx) are covered elsewhere;
// this file only adds guards not already exercised.
describe("V1 Launch Regression Guards", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof document !== "undefined") {
      document.cookie = "pps_gt=; max-age=0; path=/";
    }
    vi.clearAllMocks();
  });

  it("trial duration constant is 5 days", () => {
    expect(TRIAL_DURATION_DAYS).toBe(5);
  });

  it("fresh guest starts with the full trial and is not expired", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => {
      result.current.loginAsGuest("Explorer", true);
    });

    expect(result.current.guestDaysRemaining).toBe(TRIAL_DURATION_DAYS);
    expect(result.current.isGuestTrialExpired).toBe(false);
  });

  it("guest trial counts down and expires after the full window", () => {
    // Seed an expired start timestamp BEFORE login so loginAsGuest preserves it
    localStorage.setItem("pps_guest_created_at", daysAgoISO(TRIAL_DURATION_DAYS + 1));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => {
      result.current.loginAsGuest("Explorer", true);
    });

    expect(result.current.guestDaysRemaining).toBe(0);
    expect(result.current.isGuestTrialExpired).toBe(true);
  });

  it("loginAsGuest preserves an existing trial timestamp (no free reset on re-entry)", () => {
    const started = daysAgoISO(3);
    localStorage.setItem("pps_guest_created_at", started);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => {
      result.current.loginAsGuest("Explorer", true);
    });

    // Timestamp must be unchanged -> ~2 days remaining, not a reset to 5
    expect(localStorage.getItem("pps_guest_created_at")).toBe(started);
    expect(result.current.guestDaysRemaining).toBeLessThanOrEqual(2);
    expect(result.current.guestDaysRemaining).toBeGreaterThan(0);
  });

  it("guest cannot bypass the 5-day trial by clearing pps_guest_created_at from localStorage", () => {
    // Seed expired guest trial
    localStorage.setItem("pps_guest_created_at", daysAgoISO(TRIAL_DURATION_DAYS + 1));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => {
      result.current.loginAsGuest("Explorer", true);
    });

    expect(result.current.isGuestTrialExpired).toBe(true);

    // Tamper attempt: deleting pps_guest_created_at while guest session markers remain
    act(() => {
      localStorage.removeItem("pps_guest_created_at");
      localStorage.removeItem("pps_guest_first_seen");
      document.cookie = "pps_gt=; max-age=0; path=/";
    });

    // Re-mount / read state
    const { result: tamperedResult } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(tamperedResult.current.isGuestTrialExpired).toBe(true);
    expect(tamperedResult.current.guestDaysRemaining).toBe(0);
  });
});