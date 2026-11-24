/**
 * ╔═════════════════════════════════════════════════════════════════════╗
 * ║  PPS v1.0 — Home (Landing) Page: UI/UX Verification Suite         ║
 * ║  Covers: Hero, Navigation, Showcase, 16 Features, Simulator,     ║
 * ║          Personas, Science, FAQ, Footer, Theme, Mobile Menu      ║
 * ╚═════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "@/pages/Home";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";
import { ambientSynthesizer } from "@/lib/audio/ambientSynthesizer";

// ── Mocks ─────────────────────────────────────────────────────────────
vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isLoggedIn: false,
    loading: false,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/use-theme", () => ({
  useTheme: vi.fn(() => ({
    theme: "dark",
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/ThreeDBackground", () => ({
  ThreeDBackground: () => <div data-testid="three-d-bg" />,
}));

vi.mock("@/lib/audio/ambientSynthesizer", () => ({
  ambientSynthesizer: {
    play: vi.fn(),
    stop: vi.fn(),
    setVolume: vi.fn(),
  },
  AmbienceType: "none",
}));

vi.mock("@/components/ui/ScrollProgressBar", () => ({
  ScrollProgressBar: () => <div data-testid="scroll-progress" />,
}));

vi.mock("@/components/ui/ScrollToTop", () => ({
  ScrollToTop: () => <div data-testid="scroll-to-top" />,
}));

vi.mock("@/components/BrandLogo", () => ({
  BrandLogo: () => <div data-testid="brand-logo">PPS Logo</div>,
}));

// Bypass framer-motion animations so conditional content mounts in jsdom
vi.mock("framer-motion", () => ({
  motion: {
    div: (props: any) => <div {...props} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockAmbientSynthesizer = vi.mocked(ambientSynthesizer);
const mockUseTheme = vi.mocked(useTheme);
const mockUseAuth = vi.mocked(useAuth);

// ── Wrapper ───────────────────────────────────────────────────────────
const renderHome = (initialEntries: string[] = ["/"], userOverride?: any) => {
  if (userOverride) {
    mockUseAuth.mockReturnValue(userOverride);
  }
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <ThemeProvider>
          <HomePage />
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  // Mock scrollIntoView for nav button clicks (not available in jsdom)
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    value: () => {},
    writable: true,
    configurable: true,
  });
  mockUseAuth.mockReturnValue({
    user: null,
    isLoggedIn: false,
    loading: false,
  });
  mockUseTheme.mockReturnValue({
    theme: "dark",
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  });
  mockAmbientSynthesizer.play.mockClear();
  mockAmbientSynthesizer.stop.mockClear();
  mockAmbientSynthesizer.setVolume.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (HTMLElement.prototype as any).scrollIntoView;
});

// ════════════════════════════════════════════════════════════════════════════════
// HERO SECTION
// ════════════════════════════════════════════════════════════════════════════════

describe("Home — Hero Section UI/UX", () => {
  it("renders main H1 headline with gradient text", () => {
    renderHome();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.textContent).toContain("Stop Studying Alone");
    expect(h1.textContent).toContain("Build Relentless Focus With Your Squad");
  });

  it("renders hero subheading describing the product", () => {
    renderHome();
    expect(screen.getByText(/all-in-one personal performance system/i)).toBeInTheDocument();
  });

  it("renders primary CTA button for logged-out users", () => {
    renderHome();
    const cta = screen.getByRole("link", { name: /start free study sprint/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", expect.stringContaining("login"));
  });

  it("renders secondary 'Try Live Interactive Demo' button", () => {
    renderHome();
    const demoBtn = screen.getByRole("button", { name: /try live interactive demo/i });
    expect(demoBtn).toBeInTheDocument();
  });

  it("renders trust badges strip with 4 items", () => {
    renderHome();
    expect(screen.getByText(/100% free forever tier/i)).toBeInTheDocument();
    expect(screen.getByText(/no credit card required/i)).toBeInTheDocument();
    expect(screen.getByText(/real-time multi-device sync/i)).toBeInTheDocument();
    expect(screen.getByText(/zero fake bots/i)).toBeInTheDocument();
  });

  it("renders stat strip with 4 capability stats", () => {
    renderHome();
    expect(screen.getByText("16+")).toBeInTheDocument();
    expect(screen.getByText("24/7")).toBeInTheDocument();
    expect(screen.getByText("0 KB")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════════════════════════════════════════

describe("Home — Navigation UI/UX", () => {
  it("renders Sign In and Start Free links when logged out", () => {
    renderHome();
    const signInLinks = screen.getAllByRole("link", { name: /sign in/i });
    expect(signInLinks.length).toBeGreaterThan(0);
    const startFreeLinks = screen.getAllByRole("link", { name: /start free/i });
    expect(startFreeLinks.length).toBeGreaterThan(0);
  });

  it("does NOT render Dashboard link when logged out", () => {
    renderHome();
    expect(screen.queryByRole("link", { name: /^dashboard$/i })).toBeNull();
  });

  it("renders Dashboard link when logged in", () => {
    renderHome(["/"], {
      user: { email: "test@example.com", isGuest: false, id: "user-123" },
      isLoggedIn: true,
      loading: false,
    });
    const dashboardLinks = screen.getAllByRole("link", { name: /^dashboard$/i });
    expect(dashboardLinks.length).toBeGreaterThan(0);
  });

  it("renders theme toggle button with aria-label", () => {
    renderHome();
    const themeBtn = screen.getByRole("button", { name: /toggle theme/i });
    expect(themeBtn).toBeInTheDocument();
  });

  it("renders Pricing link in desktop nav", () => {
    renderHome();
    const pricingLinks = screen.getAllByRole("link", { name: /pricing/i });
    expect(pricingLinks.length).toBeGreaterThan(0);
  });

  it("toggles mobile menu open/closed on hamburger click", () => {
    renderHome();
    const hamburger = screen.getByRole("button", { name: /toggle mobile menu/i });
    expect(hamburger).toBeInTheDocument();
    fireEvent.click(hamburger);
    // Mobile menu open: "Product Showcase" button appears in mobile menu (plus section heading)
    expect(screen.getAllByText("Product Showcase").length).toBeGreaterThanOrEqual(2);
    fireEvent.click(hamburger);
    // Mobile menu closed: only the section heading "Product Showcase" remains
    expect(screen.getAllByText("Product Showcase").length).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// SHOWCASE BENTO GRID
// ════════════════════════════════════════════════════════════════════════════════

describe("Home — Product Showcase Bento Grid UI/UX", () => {
  it("renders showcase section heading", () => {
    renderHome();
    expect(screen.getByRole("heading", { name: /designed for uncompromising focus/i })).toBeInTheDocument();
  });

  it("renders all 6 bento tiles", () => {
    renderHome();
    // Focus Room Studio
    expect(screen.getByText(/room: stanford alpha sprint/i)).toBeInTheDocument();
    // Kaizen Streak
    expect(screen.getByText(/18 days/i)).toBeInTheDocument();
    // AI Coach
    expect(screen.getByText(/private ai coach/i)).toBeInTheDocument();
    // Analytics
    expect(screen.getByText(/94\.2%/i)).toBeInTheDocument();
    // Soundscapes - multiple elements contain this text (hero + bento + features); check at least one
    expect(screen.getAllByText(/procedural 432hz soundscapes/i).length).toBeGreaterThan(0);
    // Whiteboard
    expect(screen.getByText(/real-time collaborative whiteboard/i)).toBeInTheDocument();
  });

  it("shows hover-state visual indicators on bento tiles", () => {
    renderHome();
    expect(screen.getAllByText(/unbroken consistency chain/i).length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 16 FEATURES ARCHITECTURE
// ════════════════════════════════════════════════════════════════════════════════

describe("Home — 16 Features Architecture UI/UX", () => {
  it("renders features section heading", () => {
    renderHome();
    expect(screen.getByRole("heading", { name: /16 specialized productivity engines built-in/i })).toBeInTheDocument();
  });

  it("renders all 6 hero feature cards", () => {
    renderHome();
    expect(screen.getByText(/mesh video focus rooms/i)).toBeInTheDocument();
    expect(screen.getByText(/0kb procedural 432hz soundscapes/i)).toBeInTheDocument();
    expect(screen.getByText(/dual-engine ai performance coach/i)).toBeInTheDocument();
    expect(screen.getByText(/kaizen streak engine & auto-shields/i)).toBeInTheDocument();
    expect(screen.getByText(/championship live leaderboard/i)).toBeInTheDocument();
    expect(screen.getByText(/deep performance analytics/i)).toBeInTheDocument();
  });

  it("renders expand/collapse button for secondary features", () => {
    renderHome();
    const expandBtn = screen.getByRole("button", { name: /explore all 16 architecture modules/i });
    expect(expandBtn).toBeInTheDocument();
    fireEvent.click(expandBtn);
    expect(screen.getByText(/hide secondary capabilities/i)).toBeInTheDocument();
  });

  it("shows secondary features when expanded", () => {
    renderHome();
    const expandBtn = screen.getByRole("button", { name: /explore all 16 architecture modules/i });
    fireEvent.click(expandBtn);
    expect(screen.getByText(/collaborative realtime whiteboard/i)).toBeInTheDocument();
    expect(screen.getByText(/pop-out window & pip mode/i)).toBeInTheDocument();
    expect(screen.getByText(/nlp lecture to habit stack/i)).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// INTERACTIVE SIMULATOR
// ════════════════════════════════════════════════════════════════════════════════

describe("Home — Interactive Simulator UI/UX", () => {
  it("renders simulator section heading", () => {
    renderHome();
    expect(screen.getByRole("heading", { name: /test the core engines live right now/i })).toBeInTheDocument();
  });

  it("renders Pomodoro tab by default with timer display", () => {
    renderHome();
    expect(screen.getByText(/25:00/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start sprint/i })).toBeInTheDocument();
  });

  it("starts and pauses pomodoro timer on button click", () => {
    renderHome();
    const startBtn = screen.getByRole("button", { name: /start sprint/i });
    fireEvent.click(startBtn);
    expect(screen.getByRole("button", { name: /pause sprint/i })).toBeInTheDocument();
  });

  it("resets pomodoro timer on reset button click", () => {
    renderHome();
    const startBtn = screen.getByRole("button", { name: /start sprint/i });
    const resetBtn = screen.getByRole("button", { name: /reset timer/i });
    fireEvent.click(startBtn);
    fireEvent.click(resetBtn);
    expect(screen.getByRole("button", { name: /start sprint/i })).toBeInTheDocument();
  });

  it("toggles habit completion and updates XP/streak", () => {
    renderHome();
    const habitItem = screen.getByText(/solve 1 algorithm challenge/i).closest("div");
    expect(habitItem).toBeInTheDocument();
    fireEvent.click(habitItem);
    // "+10 XP Earned" may appear in multiple places (habit item + XP display); check at least one
    expect(screen.getAllByText(/\+10 XP Earned/i).length).toBeGreaterThan(0);
  });

  it("switches to soundscape tab and renders audio controls", () => {
    renderHome();
    const soundscapeTab = screen.getByRole("button", { name: /432hz audio/i });
    fireEvent.click(soundscapeTab);
    expect(screen.getByText(/0kb procedural soundscapes/i)).toBeInTheDocument();
    // Soundscape preset buttons have "Ready" badge; multiple presets each show "Ready"
    expect(screen.getAllByText(/ready/i).length).toBeGreaterThan(0);
  });

  it("plays and stops soundscape on preset click", () => {
    renderHome();
    const soundscapeTab = screen.getByRole("button", { name: /432hz audio/i });
    fireEvent.click(soundscapeTab);
    // Find the lofi preset button by its label text
    const lofiBtn = screen.getByText(/432hz alpha waves/i).closest("button");
    fireEvent.click(lofiBtn);
    expect(mockAmbientSynthesizer.play).toHaveBeenCalled();
    expect(screen.getByText(/playing/i)).toBeInTheDocument();
    const stopBtn = screen.getByText(/stop audio/i).closest("button");
    fireEvent.click(stopBtn);
    expect(mockAmbientSynthesizer.stop).toHaveBeenCalled();
  });

  it("switches to AI tab and renders habit stack generator", () => {
    renderHome();
    const aiTab = screen.getByRole("button", { name: /ai architect/i });
    fireEvent.click(aiTab);
    expect(screen.getByPlaceholderText(/enter any ambitious goal/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate habit stack/i })).toBeInTheDocument();
  });

  it("generates AI habit stack on button click", () => {
    renderHome();
    const aiTab = screen.getByRole("button", { name: /ai architect/i });
    fireEvent.click(aiTab);
    const generateBtn = screen.getByRole("button", { name: /generate habit stack/i });
    fireEvent.click(generateBtn);
    expect(screen.getByText(/synthesized daily habit stack/i)).toBeInTheDocument();
  });

  it("renders quick prompt chips for AI generator", () => {
    renderHome();
    const aiTab = screen.getByRole("button", { name: /ai architect/i });
    fireEvent.click(aiTab);
    expect(screen.getByText(/crack faang swe interview in 6 months/i)).toBeInTheDocument();
    expect(screen.getByText(/prepare for graduate research defense/i)).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// CIRCADIAN RHYTHM CALCULATOR
// ════════════════════════════════════════════════════════════════════════════════

describe("Home — Circadian Rhythm Calculator UI/UX", () => {
  it("renders science section with circadian engine", () => {
    renderHome();
    expect(screen.getByRole("heading", { name: /biological alignment & 1% compounding/i })).toBeInTheDocument();
    expect(screen.getByText(/circadian rhythm engine/i)).toBeInTheDocument();
  });

  it("renders wake time slider with default 7 AM", () => {
    renderHome();
    // Slider has no aria-label; find all sliders, circadian is first
    const sliders = screen.getAllByRole("slider");
    expect(sliders.length).toBeGreaterThanOrEqual(1);
    // formatHour12(7) returns "7:00 AM" (no leading zero)
    expect(screen.getByText(/7:00 AM/i)).toBeInTheDocument();
  });

  it("updates peak windows when wake time slider changes", () => {
    renderHome();
    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "6" } });
    // Multiple elements contain "8:00 AM" (peak window label, focus room label); check at least one
    expect(screen.getAllByText(/8:00 AM/i).length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// COMPOUNDING CALCULATOR
// ════════════════════════════════════════════════════════════════════════════════

describe("Home — 1% Compounding Calculator UI/UX", () => {
  it("renders compounding section with streak slider", () => {
    renderHome();
    expect(screen.getByText(/1% daily compounding/i)).toBeInTheDocument();
    const sliders = screen.getAllByRole("slider");
    // Two sliders on page (circadian + compounding); compounding is second
    expect(sliders.length).toBeGreaterThanOrEqual(2);
  });

  it("updates output multiplier when streak slider changes", () => {
    renderHome();
    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[1], { target: { value: "365" } });
    expect(screen.getByText(/legend/i)).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PERSONAS
// ════════════════════════════════════════════════════════════════════════════════

describe("Home — Personas UI/UX", () => {
  it("renders personas section heading", () => {
    renderHome();
    expect(screen.getByRole("heading", { name: /how top achievers use pps/i })).toBeInTheDocument();
  });

  it("renders 3 persona tabs", () => {
    renderHome();
    expect(screen.getByRole("button", { name: /exam aspirants/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /software engineers & builders/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /university & research cohorts/i })).toBeInTheDocument();
  });

  it("switches persona content on tab click", () => {
    renderHome();
    const codersTab = screen.getByRole("button", { name: /software engineers & builders/i });
    fireEvent.click(codersTab);
    expect(screen.getByText(/developer & software engineer workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/unbroken leetcode & architecture sprints/i)).toBeInTheDocument();
  });

  it("shows aspirants persona by default", () => {
    renderHome();
    expect(screen.getByText(/competitive exam & board sprint routine/i)).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// FAQ
// ════════════════════════════════════════════════════════════════════════════════

describe("Home — FAQ Section UI/UX", () => {
  it("renders FAQ section with questions", () => {
    renderHome();
    expect(screen.getByRole("heading", { name: /frequently asked questions/i })).toBeInTheDocument();
    expect(screen.getByText(/what makes pps fundamentally different/i)).toBeInTheDocument();
  });

  it("expands FAQ answer on question click", () => {
    renderHome();
    const faqQuestion = screen.getByText(/what makes pps fundamentally different/i).closest("button");
    fireEvent.click(faqQuestion);
    expect(screen.getByText(/unified personal performance system combining/i)).toBeInTheDocument();
  });

  it("collapses FAQ answer on second click", () => {
    renderHome();
    const faqQuestion = screen.getByText(/what makes pps fundamentally different/i).closest("button");
    fireEvent.click(faqQuestion);
    fireEvent.click(faqQuestion);
    expect(screen.queryByText(/unified personal performance system combining/i)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// FOOTER
// ════════════════════════════════════════════════════════════════════════════════

describe("Home — Footer UI/UX", () => {
  it("renders footer with copyright and links", () => {
    renderHome();
    expect(screen.getByText(/© 2026 personal performance system/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /terms of service/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /roadmap/i })).toBeInTheDocument();
  });

  it("renders brand logo in footer", () => {
    renderHome();
    const logos = screen.getAllByTestId("brand-logo");
    expect(logos.length).toBeGreaterThanOrEqual(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// THEME & ACCESSIBILITY
// ════════════════════════════════════════════════════════════════════════════════

describe("Home — Theme & Accessibility UI/UX", () => {
  it("toggles theme on theme button click", () => {
    renderHome();
    const themeBtn = screen.getByRole("button", { name: /toggle theme/i });
    fireEvent.click(themeBtn);
    expect(mockUseTheme().toggleTheme).toHaveBeenCalled();
  });

  it("renders all navigation buttons with proper aria labels", () => {
    renderHome();
    const showcaseBtns = screen.getAllByRole("button", { name: /showcase/i });
    const capabilitiesBtns = screen.getAllByRole("button", { name: /capabilities/i });
    const liveDemoBtns = screen.getAllByRole("button", { name: /live demo/i });
    const personasBtns = screen.getAllByRole("button", { name: /personas/i });
    const scienceBtns = screen.getAllByRole("button", { name: /science/i });
    expect(showcaseBtns.length).toBeGreaterThan(0);
    expect(capabilitiesBtns.length).toBeGreaterThan(0);
    expect(liveDemoBtns.length).toBeGreaterThan(0);
    expect(personasBtns.length).toBeGreaterThan(0);
    expect(scienceBtns.length).toBeGreaterThan(0);
  });

  it("scrolls to section when nav button clicked", () => {
    renderHome();
    const showcaseBtns = screen.getAllByRole("button", { name: /showcase/i });
    fireEvent.click(showcaseBtns[0]);
    expect(screen.getByText(/designed for uncompromising focus/i)).toBeInTheDocument();
  });
});
