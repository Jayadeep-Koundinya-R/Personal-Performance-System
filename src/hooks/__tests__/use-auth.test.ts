import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuth } from "../use-auth";
import { supabase } from "@/integrations/supabase/client";

// Mock React Router useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: () => Promise.resolve({ error: null }),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      insert: () => Promise.resolve({ error: null }),
    }),
  },
}));

describe("useAuth Hook & Auth Flows", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  it("creates guest session correctly and stores creation timestamp", () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.loginAsGuest("Test User", true);
    });

    expect(localStorage.getItem("pps_guest")).toBe("true");
    expect(localStorage.getItem("pps_guest_name")).toBe("Test User");
    expect(localStorage.getItem("pps_guest_created_at")).toBeTruthy();
    expect(result.current.user?.isGuest).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("handles password reset error gracefully when Supabase Auth is unconfigured", async () => {
    (supabase.auth.resetPasswordForEmail as any).mockResolvedValueOnce({
      error: { message: "Auth provider configuration missing", status: 400 },
    });

    const { result } = renderHook(() => useAuth());

    let errorMsg: string | null = null;
    await act(async () => {
      errorMsg = await result.current.resetPassword("user@example.com");
    });

    expect(errorMsg).toContain("Password reset service is currently unconfigured");
  });

  it("calculates guest trial days remaining cleanly", () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.loginAsGuest("Demo Guest", true);
    });

    expect(result.current.guestDaysRemaining).toBe(7);
    expect(result.current.isGuestTrialExpired).toBe(false);
  });
});
