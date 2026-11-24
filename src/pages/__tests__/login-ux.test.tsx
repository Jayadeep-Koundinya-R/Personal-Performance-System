/**
 * ╔═════════════════════════════════════════════════════════════════════╗
 * ║  PPS v1.0 — Login Page: UI/UX Verification Suite                  ║
 * ║  Covers: Sign In, Sign Up, Demo, Forgot Password, Google OAuth,   ║
 * ║          Password Strength, Validation, Error Handling, Offline   ║
 * ╚═════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LoginPage from "@/pages/Login";
import { AuthProvider, useAuth, TRIAL_DURATION_DAYS } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";

// ── Mocks ─────────────────────────────────────────────────────────────
const mockLogin = vi.fn();
const mockSignup = vi.fn();
const mockLoginAsGuest = vi.fn();
const mockLogout = vi.fn();
const mockResetPassword = vi.fn();
const mockLoginWithGoogle = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  TRIAL_DURATION_DAYS: 5,
  useAuth: vi.fn(() => ({
    user: null,
    isLoggedIn: false,
    loading: false,
    login: mockLogin,
    signup: mockSignup,
    loginAsGuest: mockLoginAsGuest,
    logout: mockLogout,
    resetPassword: mockResetPassword,
    loginWithGoogle: mockLoginWithGoogle,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/use-theme", () => ({
  useTheme: vi.fn(() => ({
    theme: "dark",
    toggleTheme: vi.fn(),
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/ThreeDBackground", () => ({
  ThreeDBackground: () => <div data-testid="three-d-bg" />,
}));

vi.mock("@/components/BrandLogo", () => ({
  BrandLogo: () => <div data-testid="brand-logo">PPS Logo</div>,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Bypass framer-motion animations so conditional content mounts in jsdom
vi.mock("framer-motion", () => ({
  motion: {
    div: (props: any) => <div {...props} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Wrapper ───────────────────────────────────────────────────────────
const renderLogin = (initialEntries: string[] = ["/login"]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  mockLogin.mockResolvedValue(null);
  mockSignup.mockResolvedValue(null);
  mockResetPassword.mockResolvedValue(null);
  mockLoginWithGoogle.mockResolvedValue(null);
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    isLoggedIn: false,
    loading: false,
    login: mockLogin,
    signup: mockSignup,
    loginAsGuest: mockLoginAsGuest,
    logout: mockLogout,
    resetPassword: mockResetPassword,
    loginWithGoogle: mockLoginWithGoogle,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Helper to find inputs by placeholder (labels aren't linked via for/id)
const inputByPlaceholder = (text: string | RegExp) =>
  screen.getByPlaceholderText(text);

// Helper to find eye-toggle button next to a password input
const eyeToggleFor = (input: HTMLElement) => {
  const relativeDiv = input.closest("div.relative");
  return relativeDiv?.querySelector("button");
};

// ════════════════════════════════════════════════════════════════════════════════
// DEFAULT SIGN-IN TAB
// ════════════════════════════════════════════════════════════════════════════════

describe("Login — Default Sign-In Tab UI/UX", () => {
  it("renders welcome back heading by default", () => {
    renderLogin();
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
  });

  it("renders sign-in form with email and password fields", () => {
    renderLogin();
    expect(inputByPlaceholder(/you@email.com/i)).toBeInTheDocument();
    expect(inputByPlaceholder(/••••••••/i)).toBeInTheDocument();
  });

  it("renders remember-me duration select", () => {
    renderLogin();
    // Only one select on the page; default value is "7 days (Default)"
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByDisplayValue("7 days (Default)")).toBeInTheDocument();
  });

  it("renders sign-in button", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /sign in to workspace/i })).toBeInTheDocument();
  });

  it("renders forgot password link", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /forgot\?/i })).toBeInTheDocument();
  });

  it("renders sign-up tab pill", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
  });

  it("renders demo tab pill", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /demo/i })).toBeInTheDocument();
  });

  it("renders google oauth button", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
  });

  it("shows back to home link in top nav", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /back to home/i })).toBeInTheDocument();
  });

  it("renders theme toggle button", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /light mode|dark mode/i })).toBeInTheDocument();
  });

  it("renders footer links (pricing, privacy, terms)", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /plans & pricing/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /privacy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /terms/i })).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ════════════════════════════════════════════════════════════════════════════════

describe("Login — Tab Switching UI/UX", () => {
  it("switches to sign-up tab on click", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
    });
    expect(inputByPlaceholder(/repeat password/i)).toBeInTheDocument();
  });

  it("switches to demo tab on click", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /demo/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: new RegExp(`instant ${TRIAL_DURATION_DAYS}-day demo trial`, "i") })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: new RegExp(`enter ${TRIAL_DURATION_DAYS}-day demo dashboard`, "i") })).toBeInTheDocument();
    });
  });

  it("switches to forgot password tab on click", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /forgot\?/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /reset password/i })).toBeInTheDocument();
    });
    expect(inputByPlaceholder(/you@email.com/i)).toBeInTheDocument();
  });

  it("navigates back to sign-in from forgot password", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /forgot\?/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /reset password/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /← back to sign in/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    });
  });

  it("initializes signup tab from URL query param", () => {
    renderLogin(["/login?tab=signup"]);
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
  });

  it("initializes demo tab from URL query param", () => {
    renderLogin(["/login?tab=demo"]);
    expect(screen.getByRole("heading", { name: /instant 5-day demo trial/i })).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SIGN-IN FORM
// ════════════════════════════════════════════════════════════════════════════════

describe("Login — Sign-In Form UI/UX", () => {
  it("shows error when submitting empty fields", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /sign in to workspace/i }));
    expect(screen.getByText(/please enter your email and password/i)).toBeInTheDocument();
  });

  it("shows error for invalid email format", () => {
    renderLogin();
    const emailInput = inputByPlaceholder(/you@email.com/i);
    const pwInput = inputByPlaceholder(/••••••••/i);
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });
    fireEvent.change(pwInput, { target: { value: "Password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in to workspace/i }));
    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
  });

  it("calls login with email and password on valid submission", async () => {
    renderLogin();
    const emailInput = inputByPlaceholder(/you@email.com/i);
    const pwInput = inputByPlaceholder(/••••••••/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(pwInput, { target: { value: "Password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in to workspace/i }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "Password123", 7);
    });
  });

  it("shows signing-in loading state during submission", async () => {
    renderLogin();
    const emailInput = inputByPlaceholder(/you@email.com/i);
    const pwInput = inputByPlaceholder(/••••••••/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(pwInput, { target: { value: "Password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in to workspace/i }));
    expect(screen.getByRole("button", { name: /signing in\.\.\./i })).toBeInTheDocument();
  });

  it("shows error message from login failure", async () => {
    mockLogin.mockResolvedValue("Email or password is incorrect. Please try again.");
    renderLogin();
    const emailInput = inputByPlaceholder(/you@email.com/i);
    const pwInput = inputByPlaceholder(/••••••••/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(pwInput, { target: { value: "wrongpassword" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in to workspace/i }));
    await waitFor(() => {
      expect(screen.getByText(/email or password is incorrect/i)).toBeInTheDocument();
    });
  });

  it("shows network error message when unable to connect", async () => {
    mockLogin.mockResolvedValue("Unable to connect. Please check your internet connection and try again.");
    renderLogin();
    const emailInput = inputByPlaceholder(/you@email.com/i);
    const pwInput = inputByPlaceholder(/••••••••/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(pwInput, { target: { value: "Password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in to workspace/i }));
    await waitFor(() => {
      expect(screen.getByText(/unable to connect/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /retry \(1\/3\)/i })).toBeInTheDocument();
  });

  it("toggles password visibility on eye icon click", () => {
    renderLogin();
    const pwInput = inputByPlaceholder(/••••••••/i);
    expect(pwInput).toHaveAttribute("type", "password");
    const eyeBtn = eyeToggleFor(pwInput);
    expect(eyeBtn).toBeTruthy();
    fireEvent.click(eyeBtn as HTMLElement);
    expect(pwInput).toHaveAttribute("type", "text");
    fireEvent.click(eyeBtn as HTMLElement);
    expect(pwInput).toHaveAttribute("type", "password");
  });

  it("submits sign-in on Enter key", () => {
    renderLogin();
    const emailInput = inputByPlaceholder(/you@email.com/i);
    const pwInput = inputByPlaceholder(/••••••••/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(pwInput, { target: { value: "Password123" } });
    fireEvent.keyDown(pwInput, { key: "Enter" });
    expect(mockLogin).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SIGN-UP FORM
// ════════════════════════════════════════════════════════════════════════════════

describe("Login — Sign-Up Form UI/UX", () => {
  it("renders sign-up form with email, password, confirm password", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    await waitFor(() => {
      expect(inputByPlaceholder(/you@email.com/i)).toBeInTheDocument();
    });
    expect(inputByPlaceholder(/min 8 chars/i)).toBeInTheDocument();
    expect(inputByPlaceholder(/repeat password/i)).toBeInTheDocument();
  });

  it("shows password strength analyzer while typing", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    await waitFor(() => {
      expect(inputByPlaceholder(/min 8 chars/i)).toBeInTheDocument();
    });
    const pwInput = inputByPlaceholder(/min 8 chars/i);
    fireEvent.change(pwInput, { target: { value: "Weak" } });
    expect(screen.getByText(/strength: weak/i)).toBeInTheDocument();
    fireEvent.change(pwInput, { target: { value: "StrongPass123" } });
    expect(screen.getByText(/strength: strong/i)).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    await waitFor(() => {
      expect(inputByPlaceholder(/repeat password/i)).toBeInTheDocument();
    });
    fireEvent.change(inputByPlaceholder(/you@email.com/i), { target: { value: "test@example.com" } });
    fireEvent.change(inputByPlaceholder(/min 8 chars/i), { target: { value: "StrongPass1" } });
    fireEvent.change(inputByPlaceholder(/repeat password/i), { target: { value: "DifferentPass1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it("calls signup on valid submission", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    await waitFor(() => {
      expect(inputByPlaceholder(/repeat password/i)).toBeInTheDocument();
    });
    fireEvent.change(inputByPlaceholder(/you@email.com/i), { target: { value: "newuser@example.com" } });
    fireEvent.change(inputByPlaceholder(/min 8 chars/i), { target: { value: "StrongPass1" } });
    fireEvent.change(inputByPlaceholder(/repeat password/i), { target: { value: "StrongPass1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith("newuser@example.com", "StrongPass1", "StrongPass1");
    });
  });

  it("shows success message when confirmation required", async () => {
    mockSignup.mockResolvedValue("SUCCESS_CONFIRMATION_REQUIRED");
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    await waitFor(() => {
      expect(inputByPlaceholder(/repeat password/i)).toBeInTheDocument();
    });
    fireEvent.change(inputByPlaceholder(/you@email.com/i), { target: { value: "newuser@example.com" } });
    fireEvent.change(inputByPlaceholder(/min 8 chars/i), { target: { value: "StrongPass1" } });
    fireEvent.change(inputByPlaceholder(/repeat password/i), { target: { value: "StrongPass1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText(/account created.*check your email/i)).toBeInTheDocument();
    });
  });

  it("toggles password visibility for signup and confirm fields", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    await waitFor(() => {
      expect(inputByPlaceholder(/min 8 chars/i)).toBeInTheDocument();
    });
    const pwInput = inputByPlaceholder(/min 8 chars/i);
    fireEvent.change(pwInput, { target: { value: "TestPass1" } });
    const eyeBtn = eyeToggleFor(pwInput);
    expect(eyeBtn).toBeTruthy();
    fireEvent.click(eyeBtn as HTMLElement);
    expect(pwInput).toHaveAttribute("type", "text");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// DEMO / GUEST MODE
// ════════════════════════════════════════════════════════════════════════════════

describe("Login — Demo / Guest Mode UI/UX", () => {
  it("renders quick demo profiles (Alex, Sarah, Explorer)", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /demo/i }));
    await waitFor(() => {
      expect(screen.getByText(/^alex$/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/^sarah$/i)).toBeInTheDocument();
    expect(screen.getByText(/^explorer$/i)).toBeInTheDocument();
  });

  it("logs in as guest on 1-click demo profile click", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /demo/i }));
    await waitFor(() => {
      expect(screen.getByText(/^alex$/i)).toBeInTheDocument();
    });
    const alexBtn = screen.getByText(/^alex$/i).closest("button");
    fireEvent.click(alexBtn);
    expect(mockLoginAsGuest).toHaveBeenCalledWith("Alex");
  });

  it("shows error when guest name is empty", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /demo/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: new RegExp(`enter ${TRIAL_DURATION_DAYS}-day demo dashboard →`, "i") })).toBeInTheDocument();
    });
    const demoBtn = screen.getByRole("button", { name: new RegExp(`enter ${TRIAL_DURATION_DAYS}-day demo dashboard →`, "i") });
    expect(demoBtn).toBeDisabled();
  });

  it("logs in as guest with custom name", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /demo/i }));
    await waitFor(() => {
      expect(inputByPlaceholder(/enter your name/i)).toBeInTheDocument();
    });
    const nameInput = inputByPlaceholder(/enter your name/i);
    fireEvent.change(nameInput, { target: { value: "CustomUser" } });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`enter ${TRIAL_DURATION_DAYS}-day demo dashboard →`, "i") }));
    await waitFor(() => {
      expect(mockLoginAsGuest).toHaveBeenCalledWith("CustomUser");
    });
  });

  it("renders exit demo button when already in guest mode", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { email: null, isGuest: true },
      isLoggedIn: true,
      loading: false,
      login: mockLogin,
      signup: mockSignup,
      loginAsGuest: mockLoginAsGuest,
      logout: mockLogout,
      resetPassword: mockResetPassword,
      loginWithGoogle: mockLoginWithGoogle,
    });
    renderLogin(["/login?tab=signin"]);
    expect(screen.getByText(/browsing in/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${TRIAL_DURATION_DAYS}-Day Demo Mode`))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /exit demo/i })).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ════════════════════════════════════════════════════════════════════════════════

describe("Login — Forgot Password UI/UX", () => {
  it("renders forgot password form with email field", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /forgot\?/i }));
    await waitFor(() => {
      expect(inputByPlaceholder(/you@email.com/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /send password reset link/i })).toBeInTheDocument();
  });

  it("shows error when email is empty", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /forgot\?/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /send password reset link/i })).toBeInTheDocument();
    });
    mockResetPassword.mockResolvedValue("Please enter your email address.");
    fireEvent.click(screen.getByRole("button", { name: /send password reset link/i }));
    await waitFor(() => {
      expect(screen.getByText(/please enter your email address/i)).toBeInTheDocument();
    });
  });

  it("calls resetPassword on valid submission", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /forgot\?/i }));
    await waitFor(() => {
      expect(inputByPlaceholder(/you@email.com/i)).toBeInTheDocument();
    });
    fireEvent.change(inputByPlaceholder(/you@email.com/i), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send password reset link/i }));
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith("test@example.com");
    });
  });

  it("shows success message after reset password request", async () => {
    mockResetPassword.mockResolvedValue(null);
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /forgot\?/i }));
    await waitFor(() => {
      expect(inputByPlaceholder(/you@email.com/i)).toBeInTheDocument();
    });
    fireEvent.change(inputByPlaceholder(/you@email.com/i), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send password reset link/i }));
    await waitFor(() => {
      expect(screen.getByText(/if an account exists with that email/i)).toBeInTheDocument();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// GOOGLE OAUTH
// ════════════════════════════════════════════════════════════════════════════════

describe("Login — Google OAuth UI/UX", () => {
  it("calls loginWithGoogle on google button click", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    await waitFor(() => {
      expect(mockLoginWithGoogle).toHaveBeenCalled();
    });
  });

  it("shows redirecting state during google oauth", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    expect(screen.getByRole("button", { name: /redirecting\.\.\./i })).toBeInTheDocument();
  });

  it("shows error when google oauth is not configured", async () => {
    mockLoginWithGoogle.mockResolvedValue("Google Sign-In is not configured. Please use email login instead.");
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    await waitFor(() => {
      expect(screen.getByText(/google sign-in is not configured/i)).toBeInTheDocument();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY & ERROR DISPLAY
// ════════════════════════════════════════════════════════════════════════════════

describe("Login — Accessibility & Error Display UI/UX", () => {
  it("shows error alert with dismissable styling", async () => {
    mockLogin.mockResolvedValue("Invalid credentials");
    renderLogin();
    fireEvent.change(inputByPlaceholder(/you@email.com/i), { target: { value: "test@example.com" } });
    fireEvent.change(inputByPlaceholder(/••••••••/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in to workspace/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
    const alert = screen.getByText(/invalid credentials/i).closest("div");
    expect(alert).toHaveClass(/border-destructive/);
  });

  it("clears error message when switching tabs", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /sign in to workspace/i }));
    expect(screen.getByText(/please enter your email and password/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    expect(screen.queryByText(/please enter your email and password/i)).toBeNull();
  });

  it("shows demo mode banner when guest session active", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { email: null, isGuest: true },
      isLoggedIn: true,
      loading: false,
      login: mockLogin,
      signup: mockSignup,
      loginAsGuest: mockLoginAsGuest,
      logout: mockLogout,
      resetPassword: mockResetPassword,
      loginWithGoogle: mockLoginWithGoogle,
    });
    renderLogin(["/login?tab=signin"]);
    expect(screen.getByText(/browsing in/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${TRIAL_DURATION_DAYS}-Day Demo Mode`))).toBeInTheDocument();
  });

  it("renders pricing and campus sales links in footer", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /plans & pricing/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /campus sales/i })).toBeInTheDocument();
  });
});
