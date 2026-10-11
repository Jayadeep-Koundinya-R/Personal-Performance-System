import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { REGIONAL_PRICING, PLAN_LIMITS } from "@/lib/plans";
import LoginPage from "@/pages/Login";
import { HomePage } from "@/pages/Home";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: "test-user" } }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  },
}));

describe("Authentication & Pricing Bugfixes Verification", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe("Bug 2: Unified Multi-Region Subscription Pricing", () => {
    it("ensures India regional pricing is consistent across all definitions", () => {
      const inPricing = REGIONAL_PRICING.IN;
      expect(inPricing.currencySymbol).toBe("₹");
      expect(inPricing.currencyCode).toBe("INR");
      expect(inPricing.proMonthly).toBe(199);
      expect(inPricing.proYearly).toBe(1999);
      expect(inPricing.institutionPerStudentSemester).toBe(2000);
      expect(inPricing.teacherCommission).toBe("10% per class fee");
      expect(inPricing.savingsBadge).toBe("Save 44%");
    });

    it("ensures Global regional pricing is consistent across all definitions", () => {
      const globalPricing = REGIONAL_PRICING.GLOBAL;
      expect(globalPricing.currencySymbol).toBe("$");
      expect(globalPricing.currencyCode).toBe("USD");
      expect(globalPricing.proMonthly).toBe(9.99);
      expect(globalPricing.proYearly).toBe(99.99);
      expect(globalPricing.institutionPerStudentSemester).toBe(49);
      expect(globalPricing.teacherCommission).toBe("10% per class fee");
    });

    it("verifies free tier limits match the documented marketing specs", () => {
      expect(PLAN_LIMITS.free.maxHabits).toBe(15);
      expect(PLAN_LIMITS.free.focusRoomDailyMinutes).toBe(60);
      expect(PLAN_LIMITS.free.maxGroups).toBe(3);
      expect(PLAN_LIMITS.free.maxMembersPerGroup).toBe(10);
    });
  });

  describe("Bug 3: Demo Mode User Can Access Login Form", () => {
    it("does NOT bounce guest/demo users to /dashboard when accessing /login", async () => {
      // Simulate guest/demo session
      localStorage.setItem("pps_guest", "true");
      localStorage.setItem("pps_guest_name", "Demo Explorer");

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <ThemeProvider>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<div data-testid="dashboard-screen">Dashboard</div>} />
              </Routes>
            </AuthProvider>
          </ThemeProvider>
        </MemoryRouter>
      );

      // Verify that the login form IS rendered and dashboard is NOT auto-navigated to
      expect(screen.queryByTestId("dashboard-screen")).toBeNull();
      expect(screen.getByText(/browsing in/i)).toBeInTheDocument();
      expect(screen.getByText(/7-Day Demo Mode/i)).toBeInTheDocument();
      expect(screen.getByText(/Exit Demo/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    });
  });

  describe("Bug 1: Logout Flow & Navbar Clean State", () => {
    it("renders Sign In and Start Free on Home navbar when logged out", async () => {
      localStorage.clear();

      render(
        <MemoryRouter initialEntries={["/"]}>
          <ThemeProvider>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<HomePage />} />
              </Routes>
            </AuthProvider>
          </ThemeProvider>
        </MemoryRouter>
      );

      // The top navbar should display Sign In and Start Free, NOT a lone Dashboard button
      const signInLinks = screen.getAllByRole("link", { name: /sign in/i });
      expect(signInLinks.length).toBeGreaterThan(0);
      const startFreeLinks = screen.getAllByRole("link", { name: /start free/i });
      expect(startFreeLinks.length).toBeGreaterThan(0);
    });
  });
});
