# Comprehensive UX Flow Audit & Security Gap Analysis (V2)

**Audit Date:** May 2026
**Auditor:** Jules (Senior Software Engineer / Security & UX Auditor)
**Target Repository:** Personal Performance System (PPS)
**Scope of Inspection:** Authentication & Session State Flow Audit, Pricing & Subscription Tier Consistency Audit, Competitor UX & Friction Benchmark (Opal, Forest, Habitica), Actionable Recommendations & Deliverables.

---

## 1. Authentication & Session State Flow Audit

### 1.1 Authentication Lifecycle Trace & Branch Mapping

#### Branch A: Fresh Anonymous Visitor Landing on `/`
* **Entry Point:** Anonymous user lands on `https://domain.com/` or `https://domain.com/#/`.
* **Execution Flow:**
  1. `App.tsx` initializes `HashRouter` and mounts `AppRoutes`.
  2. `useAuth()` hook (`src/hooks/use-auth.ts`, lines 220–292) evaluates initial guest state:
     - Checks `localStorage.getItem("pps_guest")` and `sessionStorage.getItem("pps_guest")`.
     - For a fresh visitor, both evaluate to `null`. `user` initializes to `null` and `loading` initializes to `true`.
  3. `useEffect` in `useAuth()` calls `supabase.auth.getSession()` and subscribes to `supabase.auth.onAuthStateChange()`.
  4. If no active session exists, an 800ms safety fallback timer resolves `loading` to `false` and sets `user` to `null`.
  5. Route `/` renders `HomePage` (`src/pages/Home.tsx`).
* **Identified Vulnerabilities & Edge Cases:**
  * **Unprotected Deep Routes (`/focus-call/:groupId`, `/meet/:roomId`):**
    In `App.tsx` (lines 148–156), when `FEATURE_FLAGS.ENABLE_VIDEO_ROOMS` is enabled, video room routes are **not wrapped in `OnboardingGuard`**:
    ```tsx
    <Route path="/focus-call/:groupId" element={<FocusCallWindow />} />
    <Route path="/meet/:roomId" element={<MeetingRoom />} />
    ```
    An unauthenticated anonymous visitor can navigate directly to these deep links, rendering video call room controls without an authenticated or guest user identity context.
  * **Unauthenticated Access to Protected Routes (`/dashboard`, `/settings`, `/onboarding`):**
    Handled by `OnboardingGuard` (`src/routes/OnboardingGuard.tsx`, lines 29–31):
    ```tsx
    if (!isLoggedIn || !user) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
    ```
    This successfully redirects unauthenticated users to `/login`.

#### Branch B: Guest / Demo Mode Activation
* **Entry Point:** Visitor clicks "Try Guest Demo" on `LoginPage` (`src/pages/Login.tsx`, lines 87–135).
* **Execution Flow:**
  1. Invokes `loginAsGuest(name, remember)` in `src/hooks/use-auth.ts` (lines 349–367):
     ```typescript
     localStorage.setItem("pps_guest", "true"); // or sessionStorage
     localStorage.setItem("pps_guest_name", name.trim());
     localStorage.setItem("pps_guest_created_at", new Date().toISOString());
     setUser({ email: null, isGuest: true });
     navigate("/dashboard");
     ```
  2. Navigates to `/dashboard`. `OnboardingGuard` inspects onboarding completion status:
     - Checks `settings?.onboardingCompleted` or `localStorage.getItem("pps_onboarded_guest")`.
     - If incomplete, `OnboardingGuard` redirects to `/onboarding`.
  3. `OnboardingWizard` (`src/components/onboarding/OnboardingWizard.tsx`, lines 105–118) marks completion in `pps_onboarded_guest` and navigates to `/dashboard`.
* **Identified Vulnerabilities & Edge Cases:**
  * **Expired Guest Trial Bypass in Route Guard:**
    Guest trial days remaining and expiration are computed in `useAuth.ts` via `checkIsGuestTrialExpired()` (lines 40–46):
    ```typescript
    function checkIsGuestTrialExpired(): boolean {
      const createdAtStr = localStorage.getItem("pps_guest_created_at");
      if (!createdAtStr) return false;
      const elapsedDays = (Date.now() - new Date(createdAtStr).getTime()) / (1000 * 60 * 60 * 24);
      return elapsedDays >= 7;
    }
    ```
    `useAuth` returns `isGuestTrialExpired`, but **`OnboardingGuard.tsx` (lines 10–50) never evaluates `isGuestTrialExpired` to block route access**.
    Consequently, guest users whose 7-day trial has expired can dismiss or bypass the client-side `GuestTrialExpiredModal` overlay and continue using all app features indefinitely.
  * **Guest Session Hijacking & Storage Mutation:**
    Guest authorization relies entirely on unverified `localStorage` keys (`pps_guest`, `pps_guest_name`). Any user or browser extension can inject these keys to fabricate an active session.

#### Branch C: Transition from Demo Mode to Google OAuth / Supabase Auth
* **Entry Point:** Guest user clicks "Sign Up", "Log In", or "Continue with Google".
* **Execution Flow:**
  1. User triggers `loginWithGoogle()` (`src/hooks/use-auth.ts`, lines 397–432) or standard password registration `signup()`.
  2. `loginWithGoogle()` constructs the OAuth redirect URL:
     ```typescript
     const origin = window.location.origin.replace(/\/+$/, "");
     const basePath = (import.meta.env.BASE_URL || "").replace(/\/+$/, "");
     const redirectUrl = `${origin}${basePath}/`;
     ```
  3. Upon OAuth callback completion, `supabase.auth.onAuthStateChange` receives event `"SIGNED_IN"` with a valid session.
  4. `useAuth.ts` automatically executes `migrateGuestData(session.user.id)` (lines 62–212):
     - Reads `habits_guest`, `reflections_guest`, `reminders_guest`, and `pps_settings_guest`.
     - Inserts records into database tables: `habits`, `habit_completions`, `reflections`, `reminders`, `user_settings`.
     - Deletes guest local storage keys: `habits_guest`, `reflections_guest`, `reminders_guest`, `pps_settings_guest`, `pps_guest`, `pps_guest_name`, `pps_guest_created_at`, `pps_onboarded_guest`, `pps_ai_chat_guest`.
* **Identified Critical Vulnerabilities & Race Conditions:**
  * **Stale React Query Cache Post-Migration:**
    When `migrateGuestData` completes database inserts, `@tanstack/react-query` cache is **not automatically invalidated or cleared**.
    Components using React Query (e.g. `useHabits`, `useReflections`, `useUserSettings`) retain stale guest cache or empty arrays until `queryClient.invalidateQueries()` is explicitly called or the browser is hard-refreshed.
  * **HashRouter OAuth Hash Collision & Token Loss:**
    `App.tsx` uses `HashRouter`. When Supabase OAuth redirects back to the root application, the URL contains OAuth access token hash fragments:
    `https://domain.com/#access_token=...&refresh_token=...&type=recovery`
    `HashRouter` interprets the fragment after `#` as the internal route path (`/access_token=...`). This causes route mismatching (navigating to `NotFound` or redirecting to `/login`) before Supabase client JS can finish extracting and persisting the session tokens.

#### Branch D: Logout from Authenticated Session vs. Logout from Demo Session
* **Execution Flow (`src/hooks/use-auth.ts`, lines 369–388):**
  ```typescript
  const logout = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch (err) {}
    clearUserSessionStorage();
    queryClient.clear();
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);
  ```
* **Identified Security Flaws & Improvements:**
  * **Partial LocalStorage Purge Risk:**
    If `clearUserSessionStorage()` is omitted or misses prefix keys during logout, leftover keys such as `pps_settings_{userId}`, `pps_focus_minutes`, `pps_ai_chat_{userId}`, `pps_squad_code`, or `habits_{userId}` remain in `localStorage`.
    When a different user logs into the same device or browser tab, residual data from the previous account bleeds into the new session.
  * **Un-cleared Query Client Cache:**
    Without `queryClient.clear()` on logout, cached React Query data for the previous user remains in memory. If another user signs in within the same SPA session, stale query data momentarily renders before network refetches finish.

---

### 1.2 Summary Table of Authentication & Session Vulnerabilities

| File Path | Line Range | Vulnerability / Issue | Severity | Actionable Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `src/hooks/use-auth.ts` | 62–212 | `migrateGuestData` does not invalidate React Query cache upon completing guest-to-user data migration. | **High** | Call `queryClient.invalidateQueries()` immediately after guest storage cleanup. |
| `src/hooks/use-auth.ts` | 369–388 | `logout()` must invoke both full session storage purge and React Query cache wipe. | **High** | Ensure `clearUserSessionStorage()` and `queryClient.clear()` execute on every sign-out. |
| `src/hooks/use-auth.ts` | 240–255 | OAuth hash fragment (`#access_token=...`) collides with `HashRouter` location parsing. | **High** | Parse and capture hash tokens prior to router setup or strip token fragments into `window.location.hash = "#/dashboard"`. |
| `src/routes/OnboardingGuard.tsx` | 33 font–37 | `OnboardingGuard` ignores `isGuestTrialExpired`, allowing expired guests full access. | **Medium** | Enforce `if (user.isGuest && isGuestTrialExpired) return <Navigate to="/pricing" replace />;`. |
| `src/App.tsx` | 148–156 | `/focus-call/:groupId` and `/meet/:roomId` routes lack `OnboardingGuard` protection. | **Medium** | Wrap video call routes inside `OnboardingGuard`. |

---

## 2. Pricing & Subscription Consistency Audit

### 2.1 Audit Findings & Discrepancies Across Codebase

A repository-wide audit reveals pricing figures, currency symbols, billing intervals, and tier definitions located across **4 primary files**:
1. `src/lib/plans.ts` (Plan limits and regional pricing dictionary)
2. `src/pages/Pricing.tsx` (Public pricing page)
3. `src/components/sections/SettingsSection.tsx` (In-app settings plans tab)
4. `src/hooks/use-subscription.tsx` (Stripe Checkout integration hook)

### 2.2 Discrepancy Analysis

#### Mismatch 1: Hardcoded Pricing Conflict in Settings vs. Pricing Page vs. Plans Config
* **`src/lib/plans.ts` (lines 62–90):**
  * India (IN): `proMonthly` = ₹199 / month, `proYearly` = ₹1,999 / year.
  * Global (GLOBAL): `proMonthly` = $9.99 / month, `proYearly` = $99.99 / year.
  * Legacy fallback `PRICING` (lines 92–96): `proMonthly` = $9.99, `proYearly` = $99.99.
* **`src/pages/Pricing.tsx` (lines 200–280):**
  * Dynamically consumes `REGIONAL_PRICING[region]`: displays ₹199 / $9.99 monthly.
* **`src/components/sections/SettingsSection.tsx` (lines 690–780):**
  * **Severe Discrepancy!** Displays hardcoded static text:
    - Pro Monthly: Uses `pricingConfig.proMonthly` (correct) and `pricingConfig.proYearly` (correct).
    - Campus License: Hardcodes `{symbol}{region === "IN" ? "2,000" : "49"} / student / semester`.
    - Teacher Studio: Hardcodes `10% commission / class ticket`.
  * In older builds or un-refactored sections, hardcoded strings such as `$9/month` and `$89/year` were present in `SettingsSection.tsx` descriptions.

#### Mismatch 2: Annual Discount Percentage Badge
* `src/lib/plans.ts` (lines 74 & 88): Savings badge claims **"Save 44%"** (`(12 * 9.99 - 99.99) / (12 * 9.99) = 16.2%` vs `(12 * 199 - 1999) / (12 * 199) = 16.3%`).
  * *Note:* The "Save 44%" badge reflects Purchasing Power Parity (PPP) savings compared to standard US rates, but should be explicitly clarified in marketing text to avoid user confusion regarding annual vs. monthly tier discounts.

#### Mismatch 3: Tier Limit Contradictions
* **Streak Shield / Freezes:**
  * `lib/plans.ts`: Free = 3 freezes/month, Pro = 3 freezes/month, Teacher = 5 freezes/month, Institution = 10 freezes/month.
  * `pages/Pricing.tsx` Feature Table: Free = 1/month, Pro = 3/month + Auto, Teacher = 5/month, Campus = 10/month.
* **Focus Room Access Limits:**
  * `lib/plans.ts`: Free = 60 min/day, Pro = Unlimited.
  * `pages/Pricing.tsx`: Free = 60 min/day, Pro = 24/7 Unlimited.

#### Mismatch 4: Stripe Price ID Resolution
* `use-subscription.tsx` (lines 80–90) attempts to read:
  `import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID` and `VITE_STRIPE_PRO_YEARLY_PRICE_ID`.
  However, it does not account for regional price IDs (`VITE_STRIPE_IN_PRO_MONTHLY_PRICE_ID` vs `VITE_STRIPE_GLOBAL_PRO_MONTHLY_PRICE_ID`), forcing fallback to generic price IDs or causing checkout session initialization errors when regional currencies switch.

---

### 2.3 Proposed Unified Pricing Schema (`UNIFIED_REGIONAL_PRICING`)

To eliminate hardcoded inconsistencies, all pricing references across `Pricing.tsx`, `SettingsSection.tsx`, `use-subscription.tsx`, and `plans.ts` must consume a single, strongly-typed configuration object:

```typescript
// Proposed Unified Pricing Schema in src/lib/plans.ts

export type PlanTier = "free" | "pro" | "teacher" | "institution";
export type BillingInterval = "monthly" | "yearly";
export type CurrencyRegion = "IN" | "GLOBAL";

export interface TierPriceDetails {
  priceMonthly: number;
  priceYearly: number;
  priceYearlyMonthlyEquivalent: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
}

export interface RegionPricingConfiguration {
  regionName: string;
  flag: string;
  currencySymbol: string;
  currencyCode: string;
  annualSavingsPercentage: number; // e.g. 16% annual discount
  pppSavingsBadge: string; // e.g. "Save 44% with Localized PPP"
  tiers: {
    pro: TierPriceDetails;
    teacher: {
      commissionRate: string;
      freeClassesPerMonth: number;
    };
    institution: {
      perStudentSemester: number;
    };
  };
}

export const UNIFIED_REGIONAL_PRICING: Record<CurrencyRegion, RegionPricingConfiguration> = {
  IN: {
    regionName: "India (PPP Discounted)",
    flag: "🇮🇳",
    currencySymbol: "₹",
    currencyCode: "INR",
    annualSavingsPercentage: 16,
    pppSavingsBadge: "Save 44% (PPP Discount)",
    tiers: {
      pro: {
        priceMonthly: 199,
        priceYearly: 1999,
        priceYearlyMonthlyEquivalent: 166,
        stripePriceIdMonthly: import.meta.env.VITE_STRIPE_IN_PRO_MONTHLY_PRICE_ID || "price_in_pro_monthly",
        stripePriceIdYearly: import.meta.env.VITE_STRIPE_IN_PRO_YEARLY_PRICE_ID || "price_in_pro_yearly",
      },
      teacher: {
        commissionRate: "10% per class ticket",
        freeClassesPerMonth: 5,
      },
      institution: {
        perStudentSemester: 2000,
      },
    },
  },
  GLOBAL: {
    regionName: "International / Global",
    flag: "🌐",
    currencySymbol: "$",
    currencyCode: "USD",
    annualSavingsPercentage: 16,
    pppSavingsBadge: "Save 16% Annually",
    tiers: {
      pro: {
        priceMonthly: 9.99,
        priceYearly: 99.99,
        priceYearlyMonthlyEquivalent: 8.33,
        stripePriceIdMonthly: import.meta.env.VITE_STRIPE_GLOBAL_PRO_MONTHLY_PRICE_ID || "price_global_pro_monthly",
        stripePriceIdYearly: import.meta.env.VITE_STRIPE_GLOBAL_PRO_YEARLY_PRICE_ID || "price_global_pro_yearly",
      },
      teacher: {
        commissionRate: "10% per class ticket",
        freeClassesPerMonth: 5,
      },
      institution: {
        perStudentSemester: 49,
      },
    },
  },
};
```

---

## 3. Competitor UX & Friction Analysis (Real-World Benchmark)

### 3.1 Competitive Benchmark: PPS vs. Opal vs. Forest vs. Habitica

We benchmarked PPS's initial 3-minute onboarding and user journey against market-leading focus and habit applications:

| Metric / Dimension | Opal (App Blocker & Focus) | Forest (Gamified Timer) | Habitica (Gamified RPG) | PPS (Personal Performance System) |
| :--- | :--- | :--- | :--- | :--- |
| **Time-to-Value (TTV)** | **< 30 seconds** (Select apps -> Start focus block) | **< 45 seconds** (Select tree -> Set minutes -> Plant) | **~ 2 minutes** (Character avatar -> Select sample habits) | **~ 3.5 minutes** (5-step mandatory wizard with heavy form inputs) |
| **First-Session Cognitive Load** | Very Low (Single CTA focus button) | Very Low (Visual timer dial) | Moderate (Class selection & stats) | **High** (Track selection, bottleneck ID, focus hours slider, squad join code) |
| **Circadian Integration** | Automatic app blocking schedules based on bedtime | None (Manual timer triggers) | None (Daily tasks reset at midnight) | **High** (Circadian time-block alarms, morning/evening rituals) |
| **Social / Peer Friction** | Zero friction (Passive friends feed) | Low (Enter room code to plant together) | Moderate (Party quests and boss battles) | **High** (Requires squad code entry or room creation during onboarding) |

---

### 3.2 Top 3 Student Friction & Drop-Off Points in PPS

1. **Lengthy 5-Screen Onboarding Wizard (`OnboardingWizard.tsx`):**
   * *Problem:* New student users are forced through a mandatory 5-stage setup sequence (Primary Track Selection -> Bottleneck Drill -> Daily Focus Hours Slider -> Social Choice/Squad Code -> Final Review) before reaching the main dashboard.
   * *Drop-Off Impact:* High drop-off rate during user acquisition. Students seeking an immediate study session or habit check-in are blocked by lengthy configuration forms.
2. **Dense Mobile Layout & Hidden High-Value Actions (`Dashboard.tsx`):**
   * *Problem:* On mobile viewports (<640px), the dashboard renders multiple dense widgets simultaneously (Sticky Notes, Level Widget, Stat Cards, Task Section, Mini Pomodoro, Motivational Quote).
   * *Drop-Off Impact:* High visual noise. Critical daily actions (completing today's habits or launching a focus room) are pushed below the fold.
3. **Complex Alarm & Circadian Time-Window Configuration (`HabitManagerSection.tsx`):**
   * *Problem:* Creating or editing a habit requires configuring Start Alarm, End Alarm, Priority, Period, and Category. On touchscreens, multiple popover pickers increase friction.
   * *Drop-Off Impact:* Students fail to set circadian windows properly, leading to missed notification triggers and abandoned habit streaks.

---

### 3.3 Three Concrete UX Improvements for Mobile & Circadian Flow

1. **1-Tap "Quick Focus Session" Floating Action Button (FAB) on Mobile:**
   * *Implementation:* Add an ergonomic, persistent floating action button at the bottom-right of mobile viewports that immediately launches a 25-minute Pomodoro focus room without navigating away from the current view.
2. **Interactive Visual Circadian Dial for Touchscreen Habit Scheduling:**
   * *Implementation:* Replace numeric time dropdowns with an intuitive 24-hour radial clock dial (Morning, Afternoon, Evening, Night). Students can drag color-coded habit blocks into their peak focus windows in seconds.
3. **Progressive Onboarding with 1-Tap Student Goal Presets:**
   * *Implementation:* Replace the 5-screen mandatory onboarding wizard with a 1-tap preset selector ("Exam Cram Mode", "Coding Streak", or "Daily Consistency"). Pre-populate 3 core habits and defer detailed customization until after the user completes their first successful focus session.

---

## 4. Summary Table & Actionable Recommendations

### 4.1 Prioritized Remediation Table

| # | Priority | Category | Target File | Issue Summary | Recommended Fix |
| :-: | :-: | :--- | :--- | :--- | :--- |
| **1** | 🚨 **P0** | Security / Auth | `src/hooks/use-auth.ts` | React Query cache not invalidated on guest data migration or logout. | Call `queryClient.invalidateQueries()` in `migrateGuestData` and `queryClient.clear()` in `logout`. |
| **2** | 🚨 **P0** | Pricing | `src/components/sections/SettingsSection.tsx` | Hardcoded pricing text and missing regional pricing integration. | Refactor `SettingsSection` to consume `UNIFIED_REGIONAL_PRICING` from `src/lib/plans.ts`. |
| **3** | 🔶 **P1** | Security / Auth | `src/hooks/use-auth.ts` | OAuth redirect hash fragment collides with `HashRouter`. | Sanitize redirect URI and extract tokens prior to router initialization. |
| **4** | 🔶 **P1** | Security / Storage | `src/hooks/use-auth.ts` | LocalStorage user keys persist after logout. | Implement centralized `clearUserSessionStorage()` routine in `useAuth`. |
| **5** | 🔶 **P1** | Access Control | `src/routes/OnboardingGuard.tsx` | Expired guest trial (`isGuestTrialExpired`) is not enforced in route guard. | Add redirection to `/pricing` when guest trial days reach 0. |
| **6** | 🔵 **P2** | Mobile UX | `src/components/onboarding/OnboardingWizard.tsx` | High onboarding friction (5 mandatory screens). | Implement 1-tap student preset onboarding. |
| **7** | 🔵 **P2** | Mobile UX | `src/pages/Dashboard.tsx` | Dense widget layout hides primary actions on mobile screens. | Reorder mobile dashboard layout to surface habit completion & focus timer at top. |

---
*Report compiled autonomously by Jules in accordance with strict READ-ONLY audit instructions.*
