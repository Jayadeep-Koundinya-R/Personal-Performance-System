import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuth, AuthProvider } from "../use-auth";
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
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

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

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let errorMsg: string | null = null;
    await act(async () => {
      errorMsg = await result.current.resetPassword("user@example.com");
    });

    expect(errorMsg).toContain("Password reset service is currently unconfigured");
  });

  it("calculates guest trial days remaining cleanly", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => {
      result.current.loginAsGuest("Demo Guest", true);
    });

    expect(result.current.guestDaysRemaining).toBe(7);
    expect(result.current.isGuestTrialExpired).toBe(false);
  });

  it("logout cleans all guest storage tokens and resets user state", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => {
      result.current.loginAsGuest("Demo User", true);
    });
    expect(result.current.user?.isGuest).toBe(true);
    expect(localStorage.getItem("pps_guest")).toBe("true");

    // Seed session data to ensure comprehensive wipe
    localStorage.setItem("pps_focus_minutes_2026-10-11", "90");
    localStorage.setItem("pps_ai_chat_user-123", JSON.stringify([{ msg: "hello" }]));
    localStorage.setItem("pps_active_track", "placements");
    localStorage.setItem("habits_user-123", JSON.stringify([{ id: "1" }]));
    // Set device preference that should be preserved
    localStorage.setItem("theme", "dark");
    localStorage.setItem("pps_billing_region", "IN");

    await act(async () => {
      result.current.logout();
    });

    expect(localStorage.getItem("pps_guest")).toBeNull();
    expect(localStorage.getItem("pps_guest_name")).toBeNull();
    expect(localStorage.getItem("pps_guest_created_at")).toBeNull();
    expect(localStorage.getItem("pps_focus_minutes_2026-10-11")).toBeNull();
    expect(localStorage.getItem("pps_ai_chat_user-123")).toBeNull();
    expect(localStorage.getItem("pps_active_track")).toBeNull();
    expect(localStorage.getItem("habits_user-123")).toBeNull();
    // Device preference preserved
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(localStorage.getItem("pps_billing_region")).toBe("IN");

    expect(result.current.user).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });
});
