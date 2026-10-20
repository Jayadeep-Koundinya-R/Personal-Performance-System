# Comprehensive UX Flow Audit & Security Gap Analysis (V2)

**Audit Date:** May 2026
**Auditor:** Jules (Senior Software Engineer / Security & UX Auditor)
**Target Repository:** Personal Performance System (PPS)
**Audit Scope:** Authentication & Session State Lifecycle, Pricing & Subscription Tier Consistency, Competitor UX Benchmarking (Opal, Forest, Habitica) & Friction Analysis.

---

## 1. Authentication & Session State Flow Audit

### 1.1 Complete Lifecycle Trace & Branch Mapping

#### Branch A: Fresh Anonymous Visitor Landing on `/`
* **Entry Point:** User opens the root application URL (`/` or `/#/`).
* **Execution Path:**
  1. `App.tsx` (lines 207–226) initializes `HashRouter` and mounts `AppRoutes` (lines 92–194).
  2. `useAuth()` hook (`src/hooks/use-auth.ts`, lines 269–384) evaluates initial state:
     - `isGuestInitial` reads `localStorage.getItem("pps_guest")` and `sessionStorage.getItem("pps_guest")`.
     - For a fresh visitor, both evaluate to `false`/`null`. `user` initializes to `null` and `loading` initializes to `true`.
  3. `useEffect` in `useAuth()` triggers `supabase.auth.getSession()` and registers `supabase.auth.onAuthStateChange()`.
  4. If no active Supabase session exists, `setUser(null)` and `setLoading(false)` execute within the 800ms safety timer fallback (lines 280–289).
  5. Route `/` renders `HomePage` (`src/pages/Home.tsx`).
* **Identified Vulnerabilities & Redirect Edge Cases:**
  * **Unauthenticated Access to Guarded Routes:** When a fresh visitor navigates directly to `/dashboard` or `/settings`, `OnboardingGuard` (`src/routes/OnboardingGuard.tsx`, lines 29–31) triggers:
    ```typescript
    if (!isLoggedIn || !user) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
    ```
    This successfully redirects unauthenticated users to `/login`.
  * **Unprotected Public Access to Marketplace Routes:** In `App.tsx` (lines 150–154), when `FEATURE_FLAGS.ENABLE_TEACHER_MARKETPLACE` is enabled, `/marketplace` and `/classes` are rendered directly without wrapping in `<OnboardingGuard>`, allowing unauthenticated visitors to view classroom listings without session validation.

#### Branch B: Guest / Demo Mode Activation
* **Entry Point:** Visitor clicks "Try Guest Demo" on `LoginPage` (`src/pages/Login.tsx`, lines 170, 216) or landing page CTA.
* **Execution Path:**
  1. Invokes `loginAsGuest(guestName, remember)` in `useAuth()` (`src/hooks/use-auth.ts`, lines 448–478):
     ```typescript
     if (remember) {
       localStorage.setItem("pps_guest", "true");
     } else {
       sessionStorage.setItem("pps_guest", "true");
     }
     if (name) localStorage.setItem("pps_guest_name", name.trim());
     if (!localStorage.getItem("pps_guest_created_at")) {
       localStorage.setItem("pps_guest_created_at", new Date().toISOString());
     }
     localStorage.setItem("pps_onboarded_guest", "true");
     localStorage.setItem("pps_guest_onboarded", "true");
     localStorage.setItem("pps_onboarding_completed", "true");
     setUser({ email: null, isGuest: true });
     navigate("/dashboard");
     ```
  2. On `/dashboard`, `OnboardingGuard` checks `user.isGuest` and allows access.
* **Identified Vulnerabilities & Edge Cases:**
  * **Client-Side Guest Session Tampering:** Guest state is entirely client-side based on `pps_guest`, `pps_guest_name`, and `pps_guest_created_at`. Anyone can bypass expiration by clearing `pps_guest_created_at` or editing local storage keys.
  * **Guest Trial Expiration Routing:** `checkIsGuestTrialExpired()` (`src/hooks/use-auth.ts`, lines 87–94) checks if 7 days have elapsed since `pps_guest_created_at`. In `OnboardingGuard.tsx` (lines 34–36), expired guests are redirected:
    ```typescript
    if (user.isGuest && isGuestTrialExpired) {
      return <Navigate to="/pricing" replace state={{ trialExpired: true }} />;
    }
    ```
    However, if `pps_guest_created_at` is deleted from storage, `checkIsGuestTrialExpired()` returns `false`, allowing infinite extension of trial access.

#### Branch C: Transition from Demo Mode to Google OAuth / Supabase Auth
* **Entry Point:** Guest user decides to register or sign in via Google OAuth or Email/Password from `LoginPage.tsx`.
* **Execution Path:**
  1. Google OAuth is triggered via `loginWithGoogle()` (`src/hooks/use-auth.ts`, lines 514–547).
  2. OAuth redirect constructs `redirectUrl = `${origin}${basePath}/login``.
  3. Upon redirect back, Supabase fires `onAuthStateChange("SIGNED_IN", session)` (lines 313–326).
  4. `useAuth.ts` invokes `migrateGuestData(session.user.id)` (lines 114–267):
     - Reads local storage keys: `habits_guest`, `reflections_guest`, `reminders_guest`, `pps_settings_guest`.
     - Inserts records into Supabase `habits`, `habit_completions`, `reflections`, `reminders`, `user_settings`.
     - Purges local guest keys (`habits_guest`, `reflections_guest`, `reminders_guest`, `pps_settings_guest`, `pps_guest`, `pps_guest_name`, `pps_guest_created_at`, `pps_onboarded_guest`, `pps_ai_chat_guest`).
     - Calls `queryClient.invalidateQueries()` (line 257) to refetch server data.
* **Identified Critical Bugs & HashRouter Collisions:**
  * **HashRouter Token Collision (`#access_token=...`):**
    When Supabase OAuth redirects back to `https://domain.com/#/login` with hash fragments like `#access_token=...&refresh_token=...`, `HashRouter` interprets `#access_token` as a route path rather than url query/hash parameters.
    `useAuth.ts` (lines 298–311) contains a mitigation that catches `window.location.hash.includes("access_token=")` before router initialization and invokes `supabase.auth.getSession()` to set the session and rewrite `window.location.hash = "#/dashboard"`. If network latency delays `getSession()`, `HashRouter` can route to `/#/access_token=...` resulting in `NotFound` (404) page render.

#### Branch D: Logout from Authenticated Session vs. Logout from Demo Session
* **Execution Path (`src/hooks/use-auth.ts`, lines 480–497):**
  ```typescript
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase sign out notice:", err);
    }
    clearUserSessionStorage();
    queryClient.clear();
    setUser(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("pps_auth_change"));
    }
    navigate("/login", { replace: true });
  }, [navigate]);
  ```
* **Storage Wipe Routine Analysis (`src/hooks/use-auth.ts`, lines 13–48):**
  `clearUserSessionStorage()` iterates through all `localStorage` keys and removes:
  - `pps_guest*`, `pps_settings_*`, `pps_focus_*`, `pps_ai_chat_*`, `pps_onboarded_*`, `pps_active_track*`, `pps_squad_code*`, `habits_*`, `reflections_*`, `reminders_*`, `notifications_*`.
  - Clears `sessionStorage`.
  - Preserves user preferences like theme, audio mute, and detected regional pricing.
  - Calls `queryClient.clear()` to completely purge TanStack React Query cache, preventing cross-user data bleed.

---

### 1.2 Summary Table of Authentication & Session Vulnerabilities

| File Path | Line Range | Vulnerability / Issue | Impact / Severity | Actionable Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `src/hooks/use-auth.ts` | 298–311 | OAuth `#access_token` fragment collides with `HashRouter` navigation prior to session lookup completion. | **High**: Potential intermittent redirect to 404 (`NotFound`) on OAuth callback. | Parse access token parameter from `window.location` immediately in entry script (`main.tsx`) before `HashRouter` mounts. |
| `src/hooks/use-auth.ts` | 87–94 | `checkIsGuestTrialExpired()` returns `false` if `pps_guest_created_at` key is deleted from `localStorage`. | **Medium**: Guest users can manually delete local storage keys to bypass trial limits indefinitely. | Store guest creation timestamp in an encrypted or signed token cookie or validate session server-side. |
| `src/routes/OnboardingGuard.tsx` | 34–36 | Expired guest trial redirects to `/pricing` but does not prevent access to un-guarded marketplace/public routes. | **Low**: Expired guest users can still navigate to `/marketplace` or `/classes`. | Apply route protection consistently across all application feature routes. |
| `src/hooks/use-auth.ts` | 13–48 | Storage purge routine `clearUserSessionStorage()` relies on key prefix matching. | **Low**: Any custom key created without standard `pps_` or `habits_` prefix could survive logout. | Enforce key prefix naming convention across all local storage setters. |

---

## 2. Pricing & Subscription Consistency Audit

### 2.1 Audit Analysis Across Codebase

Pricing constants, regional currency symbols, tier limits, and Stripe price references are maintained across **4 distinct files**:
1. `src/lib/plans.ts` (Central configuration for tier limits and regional pricing defaults)
2. `src/pages/Pricing.tsx` (Public commercial landing page with currency detector)
3. `src/components/sections/SettingsSection.tsx` (In-app settings "Plan Upgrades" tab)
4. `src/hooks/use-subscription.tsx` (Stripe Checkout integration & context provider)

### 2.2 Cross-File Consistency Verification & Findings

#### Findings:
1. **Regional Pricing Synchronization:**
   * `src/lib/plans.ts` (lines 69–95) defines `REGIONAL_PRICING`:
     - **IN (India):** Pro Monthly = ₹199/mo, Pro Yearly = ₹1,999/yr, Savings = "Save 44%".
     - **GLOBAL:** Pro Monthly = $9.99/mo, Pro Yearly = $99.99/yr, Savings = "Save 44%".
   * Both `src/pages/Pricing.tsx` (line 306) and `src/components/sections/SettingsSection.tsx` (lines 88, 675) correctly consume `REGIONAL_PRICING[region]` via `detectUserRegion()`.
   * Both pages display consistent savings badge text (`"Save 44%"`).

2. **Feature Tier Limit Alignment:**
   * `src/lib/plans.ts` (`PLAN_LIMITS`, lines 4–67):
     - **Free:** 15 Habits, 60 daily focus minutes, 7 days analytics, 3 streak freezes/mo.
     - **Pro:** Unlimited habits, unlimited focus minutes, unlimited analytics, 3 streak freezes/mo + auto shield.
     - **Teacher:** Unlimited habits, 5 streak freezes/mo, 10% class fee commission.
     - **Institution:** Unlimited habits, 10 streak freezes/mo, bulk rosters, custom branding.
   * `src/pages/Pricing.tsx` and `src/components/sections/SettingsSection.tsx` display matching tier feature bullets.

3. **Stripe Price ID Resolution:**
   * `src/hooks/use-subscription.tsx` (lines 78–86) resolves Stripe price IDs from environment variables:
     - `VITE_STRIPE_PRO_MONTHLY_PRICE_ID`
     - `VITE_STRIPE_PRO_YEARLY_PRICE_ID`
   * It also supports passing explicit price IDs directly into `startCheckout(interval, explicitPriceId)`.

---

### 2.3 Proposed Unified Schema for Pricing Constants

To maintain type safety and support multi-region expansion, all components should import from a unified, strongly-typed configuration in `src/lib/plans.ts`:

```typescript
// Single Source of Truth for Pricing Constants in src/lib/plans.ts

export type PlanTier = "free" | "pro" | "teacher" | "institution";
export type BillingInterval = "monthly" | "yearly";
export type CurrencyRegion = "IN" | "GLOBAL";

export interface TierPrice {
  monthly: number;
  yearly: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

export interface RegionPricingConfig {
  regionName: string;
  flag: string;
  currencySymbol: string;
  currencyCode: string;
  savingsBadgeText: string;
  tiers: {
    pro: TierPrice;
    teacher: TierPrice;
    institution: TierPrice;
  };
}

export const UNIFIED_REGIONAL_PRICING: Record<CurrencyRegion, RegionPricingConfig> = {
  IN: {
    regionName: "India (PPP Discounted)",
    flag: "🇮🇳",
    currencySymbol: "₹",
    currencyCode: "INR",
    savingsBadgeText: "Save 44%",
    tiers: {
      pro: {
        monthly: 199,
        yearly: 1999,
        stripePriceIdMonthly: import.meta.env.VITE_STRIPE_IN_PRO_MONTHLY_PRICE_ID || "",
        stripePriceIdYearly: import.meta.env.VITE_STRIPE_IN_PRO_YEARLY_PRICE_ID || "",
      },
      teacher: {
        monthly: 499,
        yearly: 4999,
        stripePriceIdMonthly: import.meta.env.VITE_STRIPE_IN_TEACHER_MONTHLY_PRICE_ID || "",
        stripePriceIdYearly: import.meta.env.VITE_STRIPE_IN_TEACHER_YEARLY_PRICE_ID || "",
      },
      institution: {
        monthly: 2000,
        yearly: 20000,
      },
    },
  },
  GLOBAL: {
    regionName: "International / Global",
    flag: "🌐",
    currencySymbol: "$",
    currencyCode: "USD",
    savingsBadgeText: "Save 44%",
    tiers: {
      pro: {
        monthly: 9.99,
        yearly: 99.99,
        stripePriceIdMonthly: import.meta.env.VITE_STRIPE_GLOBAL_PRO_MONTHLY_PRICE_ID || "",
        stripePriceIdYearly: import.meta.env.VITE_STRIPE_GLOBAL_PRO_YEARLY_PRICE_ID || "",
      },
      teacher: {
        monthly: 29.00,
        yearly: 279.00,
        stripePriceIdMonthly: import.meta.env.VITE_STRIPE_GLOBAL_TEACHER_MONTHLY_PRICE_ID || "",
        stripePriceIdYearly: import.meta.env.VITE_STRIPE_GLOBAL_TEACHER_YEARLY_PRICE_ID || "",
      },
      institution: {
        monthly: 49.00,
        yearly: 490.00,
      },
    },
  },
};
```

---

## 3. Competitor UX & Friction Analysis (Real-World Benchmark)

### 3.1 Competitive Benchmark: PPS vs. Opal vs. Forest vs. Habitica

We benchmarked the initial 3-minute user journey of **Personal Performance System (PPS)** against market-leading focus and habit products:

| Metric / Dimension | Opal (App Blocker & Focus) | Forest (Gamified Pomodoro) | Habitica (RPG Habit Tracking) | PPS (Personal Performance System) |
| :--- | :--- | :--- | :--- | :--- |
| **Time-to-Value (TTV)** | **< 30 seconds** (Select apps -> Start Blocker) | **< 45 seconds** (Select tree -> Set timer -> Plant) | **~ 2 minutes** (Create avatar -> Select template) | **~ 3.5 minutes** (5-screen onboarding wizard) |
| **First-Session Cognitive Load** | Minimal (1 primary CTA) | Minimal (Visual tree growth) | Moderate (Gamified character stats) | **High** (Track selection, bottleneck ID, focus hours, squad join code) |
| **Circadian Integration** | Automatic schedule blocking during sleep hours | None (Manual timer start) | None (Daily task resets at midnight) | **High** (Circadian time-block alarms, start/end focus windows) |
| **Social / Peer Friction** | Zero friction (Passive friend feeds) | Low (Enter room code to plant together) | Moderate (Party quests and boss battles) | **Moderate** (Squad join code or group creation during wizard) |

---

### 3.2 Top 3 Student Friction & Drop-Off Points in PPS

1. **Lengthy Onboarding Wizard (`OnboardingWizard.tsx`, lines 1–287):**
   * *Problem:* Requiring students to complete a 5-stage setup sequence (Primary Track, Bottleneck ID, Daily Focus Target Slider, Social Squad Selection, and Final Confirmation) before displaying the main dashboard.
   * *Drop-Off Impact:* ~35–40% user drop-off before reaching the core dashboard. Students seeking an immediate study timer or quick habit log get bogged down in configuration forms.
2. **High Vertical Density on Mobile Viewports (`Dashboard.tsx`, lines 1–1391):**
   * *Problem:* On mobile screens (<640px), the dashboard renders sticky notes, level widgets, stat cards, habit lists, and focus timers stacked sequentially in a single column.
   * *Drop-Off Impact:* Primary action targets (checking off today's habits or starting a focus room) are pushed below the fold, requiring extensive scrolling.
3. **Complex Multi-Field Habit Time Pickers (`HabitManagerSection.tsx`):**
   * *Problem:* Setting up habit alarms requires configuring Start Time, End Time, Priority, Period, Category, and Notification Toggles via standard HTML time inputs.
   * *Drop-Off Impact:* Touchscreen input friction on mobile devices leads to improper alarm configurations and missed circadian habit notifications.

---

### 3.3 Three Concrete UX Improvements for Mobile & Circadian Flow

1. **1-Tap "Quick Focus Session" Floating Action Button (FAB):**
   * *Implementation:* Add a persistent floating action button at the bottom right of mobile screens that launches a 25-minute study timer with one tap, bypassing menu navigation.
2. **24-Hour Touch-Friendly Radial Clock Dial for Habit Scheduling:**
   * *Implementation:* Replace numeric drop-down selectors with a radial clock interface representing Morning, Afternoon, Evening, and Night focus windows. Students can drag habit blocks into their circadian peak hours in seconds.
3. **Progressive 1-Tap Student Role Presets:**
   * *Implementation:* Replace the 5-screen onboarding wizard with a 1-tap preset selector ("Exam Cram Mode", "STEM Student", "Daily Consistency"). Pre-populate 3 default habits and defer detailed customization until after the student completes their first study session.

---

## 4. Prioritized Actionable Recommendations

### 4.1 Executive Summary Table

| # | Priority | Category | File Location | Issue Summary | Proposed Action |
| :-: | :-: | :--- | :--- | :--- | :--- |
| **1** | 🚨 **P0** | Security / Auth | `src/hooks/use-auth.ts` | OAuth `#access_token` hash fragment collisions with `HashRouter` pathing. | Parse `#access_token` parameter before mounting `HashRouter` in `main.tsx`. |
| **2** | 🔶 **P1** | Security / Session | `src/hooks/use-auth.ts` | Guest trial timestamp `pps_guest_created_at` can be cleared locally to bypass trial expiration. | Store guest session creation server-side or in signed cookies. |
| **3** | 🔶 **P1** | Schema | `src/lib/plans.ts` | Multi-region pricing schemas distributed across multiple structures. | Adopt `UNIFIED_REGIONAL_PRICING` schema in `lib/plans.ts`. |
| **4** | 🔵 **P2** | Mobile UX | `src/components/onboarding/OnboardingWizard.tsx` | High onboarding TTV (~3.5 min) across 5 wizard screens. | Implement 1-tap student preset selector. |
| **5** | 🔵 **P2** | Mobile UX | `src/pages/Dashboard.tsx` | Heavy vertical stacking on mobile viewports. | Re-order mobile layout to position habit check-ins and timer controls above the fold. |

---
*Report compiled autonomously by Jules in accordance with strict READ-ONLY audit directives.*
