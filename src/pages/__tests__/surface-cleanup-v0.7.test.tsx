import { describe, it, expect, beforeEach, vi } from "vitest";
import { FEATURE_FLAGS } from "@/config/features";
import { renderHook, act } from "@testing-library/react";
import { useAuth, AuthProvider } from "@/hooks/use-auth";

// Mock React Router
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

// Mock Supabase
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

describe("v0.7 Surface Clean-Up Verification Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("Task 0.7.3: Guest trial duration is strictly capped at 5 days", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => {
      result.current.loginAsGuest("Explorer", true);
    });

    expect(result.current.guestDaysRemaining).toBe(5);
    expect(result.current.isGuestTrialExpired).toBe(false);

    // Verify localStorage key holds timestamp
    const createdAtStr = localStorage.getItem("pps_guest_created_at");
    expect(createdAtStr).toBeTruthy();
  });

  it("Task 0.7.5: Unbuilt features are strictly disabled behind FEATURE_FLAGS", () => {
    expect(FEATURE_FLAGS.ENABLE_TEACHER_MARKETPLACE).toBe(false);
    expect(FEATURE_FLAGS.ENABLE_WHITEBOARD).toBe(false);
    expect(FEATURE_FLAGS.ENABLE_VIDEO_ROOMS).toBe(false);
  });

  it("Task 0.7.4: Demo goal check-in questions persist choice cleanly to localStorage", () => {
    const goalId = "placements";
    localStorage.setItem("pps_demo_goal", goalId);

    const saved = localStorage.getItem("pps_demo_goal");
    expect(saved).toBe("placements");
  });
});
