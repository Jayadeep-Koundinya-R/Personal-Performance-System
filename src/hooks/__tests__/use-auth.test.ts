import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuth, AuthProvider, mapAuthError, validatePasswordStrength, TRIAL_DURATION_DAYS } from "../use-auth";
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
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      insert: () => Promise.resolve({ error: null }),
      upsert: () => Promise.resolve({ error: null }),
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
      result.current.loginAsGuest("Test User");
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
      result.current.loginAsGuest("Demo Guest");
    });

    expect(result.current.guestDaysRemaining).toBe(TRIAL_DURATION_DAYS);
    expect(result.current.isGuestTrialExpired).toBe(false);
  });

  it("logout cleans all guest storage tokens and resets user state", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => {
      result.current.loginAsGuest("Demo User");
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

  it("blocks offline login with error instead of local fallback", async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
      error: { message: "Failed to fetch" },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let err: string | null = null;
    await act(async () => {
      err = await result.current.login("tester@example.com", "MyPassword123!");
    });

    expect(err).toBeTruthy();
    expect(err).toContain("Unable to connect");
    expect(result.current.user).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("blocks offline signup with error instead of local account creation", async () => {
    (supabase.auth.signUp as any).mockResolvedValueOnce({
      error: { message: "Failed to fetch" },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let err: string | null = null;
    await act(async () => {
      err = await result.current.signup("newuser@example.com", "Password123!", "Password123!");
    });

    expect(err).toBeTruthy();
    expect(err).toContain("Unable to connect");
    expect(result.current.user).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
    // Verify no local account was created
    expect(localStorage.getItem("pps_local_accounts")).toBeNull();
    expect(localStorage.getItem("pps_local_session")).toBeNull();
  });

  it("returns error message when login fails with invalid credentials", async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
      error: { message: "Invalid login credentials", code: "invalid_credentials" },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let err: string | null = null;
    await act(async () => {
      err = await result.current.login("user@example.com", "WrongPassword1!");
    });

    expect(err).toContain("Email or password is incorrect");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("returns error message gracefully when Google OAuth provider is unconfigured", async () => {
    (supabase.auth.signInWithOAuth as any).mockResolvedValueOnce({
      error: { message: "Unsupported provider: provider is not enabled" },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let err: string | null = null;
    await act(async () => {
      err = await result.current.loginWithGoogle();
    });

    expect(err).toContain("Google Sign-In is not configured");
    expect(result.current.user).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("cleans up legacy local account data on first load", async () => {
    // Seed legacy data
    localStorage.setItem("pps_local_accounts", JSON.stringify({ "test@example.com": "hash123" }));
    localStorage.setItem("pps_local_session", JSON.stringify({ email: "test@example.com", isGuest: false }));

    // Trigger the auth hook to run its cleanup effect
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      // Wait for effect to run
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(localStorage.getItem("pps_local_accounts")).toBeNull();
    expect(localStorage.getItem("pps_local_session")).toBeNull();
  });
});

describe("mapAuthError", () => {
  it("maps invalid_credentials to user-friendly message", () => {
    expect(mapAuthError({ code: "invalid_credentials", message: "Invalid login credentials" }))
      .toBe("Email or password is incorrect. Please try again.");
  });

  it("maps email_not_confirmed to user-friendly message", () => {
    expect(mapAuthError({ code: "email_not_confirmed", message: "Email not confirmed" }))
      .toContain("Please check your email");
  });

  it("maps user_already_exists to user-friendly message", () => {
    expect(mapAuthError({ code: "user_already_exists", message: "User already registered" }))
      .toContain("An account with this email may already exist");
  });

  it("maps weak_password to user-friendly message", () => {
    expect(mapAuthError({ code: "weak_password", message: "Password is too weak" }))
      .toContain("Password must be at least 8 characters");
  });

  it("maps rate limit errors to user-friendly message", () => {
    expect(mapAuthError({ code: "over_request_rate_limit", message: "Email rate limit exceeded" }))
      .toContain("Too many attempts");
  });

  it("maps network errors to user-friendly message", () => {
    expect(mapAuthError({ message: "Failed to fetch" }))
      .toContain("Unable to connect");
  });

  it("maps unsupported provider errors to user-friendly message", () => {
    expect(mapAuthError({ code: "unsupported_provider", message: "provider is not enabled" }))
      .toContain("Google Sign-In is not configured");
  });

  it("falls back to original message for unknown errors", () => {
    expect(mapAuthError({ message: "Something unexpected happened" }))
      .toBe("Something unexpected happened");
  });
});

describe("validatePasswordStrength", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePasswordStrength("Pw1")).toBe("Password must be at least 8 characters.");
  });

  it("rejects passwords without uppercase letters", () => {
    expect(validatePasswordStrength("password1")).toBe("Password must contain at least 1 uppercase letter.");
  });

  it("rejects passwords without numbers", () => {
    expect(validatePasswordStrength("Password")).toBe("Password must contain at least 1 number.");
  });

  it("accepts valid passwords (8+ chars, 1 uppercase, 1 number)", () => {
    expect(validatePasswordStrength("Password1")).toBeNull();
    expect(validatePasswordStrength("MySecure99")).toBeNull();
  });
});
