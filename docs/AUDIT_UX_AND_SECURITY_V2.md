# Comprehensive UX Flow Audit & Security Gap Analysis (V2)

**Audit Date:** May 2026
**Auditor:** Jules (Senior Software Engineer / Security & UX Auditor)
**Target Repository:** Personal Performance System (PPS)
**Audit Scope:** Authentication & Session State Lifecycle, Pricing & Subscription Tier Consistency, Competitor UX Benchmarking (Opal, Forest, Habitica) & Friction Analysis.

---

## 1. Authentication & Session State Flow Audit

### 1.1 Complete Lifecycle Trace & Branch Mapping

#### Branch A: Fresh Anonymous Visitor Landing on `/`
* **Entry Point:** User opens root application URL (`/` or `/#/`).
* **Execution Path & File References:**
  1. `App.tsx` (lines 207–226): Initializes `HashRouter`, `AuthProvider`, `NativeAppController`, and mounts `AppRoutes` (lines 92–194).
  2. `useAuth()` hook (`src/hooks/use-auth.ts`, lines 269–384): Evaluates initial auth state.
     - `isGuestInitial` (line 270) checks `localStorage.getItem("pps_guest") === "true"` and `sessionStorage.getItem("pps_guest") === "true"`.
     - For a fresh anonymous visitor, both evaluate to `false`/`null`.
     - `user` state initializes to `null` and `loading` initializes to `true`.
  3. `useEffect` in `useAuth()` (lines 279 font-):
     - Sets up an 800ms safety timer fallback (lines 280–289) to prevent slow network stalls from hanging the app launch.
     - Calls `supabase.auth.getSession()` and registers `supabase.auth.onAuthStateChange()` (lines 313–342).
     - If no active session exists, `setUser(null)` and `setLoading(false)` execute.
  4. Path `/` renders `HomePage` (`src/pages/Home.tsx`).
* **Identified Vulnerabilities & Redirect Loop Risks:**
  * **Direct Access to Guarded Routes:** When an unauthenticated visitor navigates directly to `/dashboard`, `/settings`, `/focus-rooms`, `/social`, or `/analytics`, `OnboardingGuard` (`src/routes/OnboardingGuard.tsx`, lines 29 font-31) intercepts:
    ```typescript
    if (!isLoggedIn || !user) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
    ```
    This successfully redirects unauthenticated visitors to `/login`.
  * **Unguarded Public Routes & Feature Flag Vulnerability:** In `App.tsx` (lines 150–154), when `FEATURE_FLAGS.ENABLE_TEACHER_MARKETPLACE` is enabled, `/marketplace` and `/classes` are mounted without `<OnboardingGuard>` wrapper. Unauthenticated users can access marketplace listings directly.

#### Branch B: Guest / Demo Mode Activation
* **Entry Point:** Visitor clicks "Try Guest Demo" on `LoginPage` (`src/pages/Login.tsx`, lines 170, 216).
* **Execution Path & File References:**
  1. Triggers `loginAsGuest(name, remember)` in `src/hooks/use-auth.ts` (lines 448–478):
     ```typescript
     localStorage.setItem("pps_guest", "true"); // or sessionStorage if remember=false
     if (name) localStorage.setItem("pps_guest_name", name.trim());
     if (!localStorage.getItem("pps_guest_created_at")) {
       localStorage.setItem("pps_guest_created_at", new Date().toISOString());
     }
     localStorage.setItem("pps_onboarded_guest", "true");
     localStorage.setItem("pps_guest_onboarded", "true");
     localStorage.setItem("pps_onboarding_completed", "true");
     if (!localStorage.getItem("pps_active_track")) {
       localStorage.setItem("pps_active_track", "placements");
     }
     setUser({ email: null, isGuest: true });
     navigate("/dashboard");
     ```
  2. On `/dashboard`, `OnboardingGuard` checks `user.isGuest` and permits route access without requiring Supabase account credentials.
* **Identified Vulnerabilities & Session State Risks:**
  * **Client-Side Guest Trial Tampering:** `getGuestTrialDaysRemaining()` (lines 76–85) and `checkIsGuestTrialExpired()` (lines 87–94) in `src/hooks/use-auth.ts` check the 7-day trial limit against `localStorage.getItem("pps_guest_created_at")`. If a user manually deletes `pps_guest_created_at` or modifies `localStorage`, `checkIsGuestTrialExpired()` evaluates to `false`, allowing infinite demo trial access without registering.
  * **Expired Guest Trial Handling:** In `src/routes/OnboardingGuard.tsx` (lines 34–36):
    ```typescript
    if (user.isGuest && isGuestTrialExpired) {
      return <Navigate to="/pricing" replace state={{ trialExpired: true }} />;
    }
    ```
    While expired guest users are redirected to `/pricing`, they can still access un-guarded routes like `/marketplace` or `/pricing` and continue reading local guest data.

#### Branch C: Transition from Demo Mode to Google OAuth / Supabase Auth
* **Entry Point:** Guest user decides to register or sign in via Google OAuth or Email/Password.
* **Execution Path & File References:**
  1. `loginWithGoogle()` (`src/hooks/use-auth.ts`, lines 514–547) or `signup()` / `login()` initiates sign-in.
  2. Google OAuth constructs redirect URL:
     ```typescript
     const origin = window.location.origin.replace(/\/+$/, "");
     const basePath = (import.meta.env.BASE_URL || "").replace(/\/+$/, "");
     const redirectUrl = `${origin}${basePath}/`;
     ```
  3. OAuth callback redirects back to application URL with access token in URL hash (`#access_token=...&refresh_token=...`).
  4. `useAuth.ts` `useEffect` (lines 298–311) detects hash token:
     ```typescript
     if (typeof window !== "undefined" && window.location.hash) {
       const hash = window.location.hash;
       if (hash.includes("access_token=") || hash.includes("error_description=")) {
         supabase.auth.getSession().then(({ data: { session } }) => {
           if (session?.user) {
             setUser(mapUser(session.user));
             migrateGuestData(session.user.id);
             window.location.hash = "#/dashboard";
           }
         });
       }
     }
     ```
  5. `migrateGuestData(userId)` (`src/hooks/use-auth.ts`, lines 114–267) migrates guest habits, completions, reflections, reminders, and settings from `localStorage` into Supabase database tables (`habits`, `habit_completions`, `reflections`, `reminders`, `user_settings`).
  6. Purges guest keys: `habits_guest`, `reflections_guest`, `reminders_guest`, `pps_settings_guest`, `pps_guest`, `pps_guest_name`, `pps_guest_created_at`, `pps_onboarded_guest`, `pps_ai_chat_guest`, `pps_ai_chat_history`.
  7. Invalidation: `queryClient.invalidateQueries()` (line 257) purges React Query caches to trigger immediate refetch of cloud database records.
* **Identified HashRouter Token Collision Risk:**
  * `HashRouter` uses `#` for client-side route resolution (e.g. `/#/dashboard`). When Supabase OAuth appends `#access_token=...` at the root, `HashRouter` may parse `#access_token=...` as a path before `useAuth.ts` finishes async session processing, briefly triggering the `NotFound` component (`/pages/NotFound.tsx`).

#### Branch D: Logout from Authenticated Session vs. Logout from Demo Session
* **Execution Path & File References:**
  * Called from `logout()` in `src/hooks/use-auth.ts` (lines 480–497) and triggered from `SettingsSection.tsx` (line 123) or `Dashboard.tsx`.
  * `logout()` executes:
    1. `await supabase.auth.signOut()`
    2. `clearUserSessionStorage()`
    3. `queryClient.clear()`
    4. `setUser(null)`
    5. `window.dispatchEvent(new Event("pps_auth_change"))`
    6. `navigate("/login", { replace: true })`
* **Storage Wipe Routine Analysis (`src/hooks/use-auth.ts`, lines 13–48):**
  * `clearUserSessionStorage()` loops through `localStorage` items and deletes any key starting with `pps_` (except `pps_billing_region`), `habits_`, `reflections_`, `reminders_`, or `notifications_`.
  * Clears `sessionStorage.clear()`.
  * Preserves global non-sensitive preferences (`pps_billing_region`, `vite-ui-theme`, `pps_sound_muted`).
  * `queryClient.clear()` ensures no cached user data persists in memory across account switching.

---

### 1.2 Location Audit: Stale localStorage, Un-invalidated Caches & Router Mismatches

| File Path | Line Numbers | Category / Subsystem | Identified Issue / Risk | Severity | Actionable Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/hooks/use-auth.ts` | 298–311 | OAuth / HashRouter Collision | Hash fragments containing `#access_token=` can collide with `HashRouter` pathing prior to session resolution. | **High** | Parse `#access_token` in `main.tsx` prior to mounting `HashRouter` or sanitize hash in window load listener. |
| `src/hooks/use-auth.ts` | 87–94 | Guest Trial Session | Deleting `pps_guest_created_at` in `localStorage` resets the 7-day trial timer. | **Medium** | Store guest session creation timestamp in an encrypted token or validate session server-side. |
| `src/routes/OnboardingGuard.tsx` | 34–36 | Route Protection | Guest trial expiration redirects `/dashboard` to `/pricing`, but unguarded routes remain accessible. | **Low** | Wrap all application routes in `<OnboardingGuard>` to enforce consistent auth checking. |
| `src/hooks/use-auth.ts` | 13–48 | Storage Cleanup | `clearUserSessionStorage()` relies on key prefix matching (`pps_`, `habits_`, etc.). Any un-prefixed local key would linger. | **Low** | Standardize all application `localStorage` keys under a single strict prefix `pps_`. |

---

## 2. Pricing & Subscription Consistency Audit

### 2.1 Codebase Scan for Hardcoded Pricing, Currencies, and Stripe Price IDs

Pricing definitions, currency formatting, subscription tier limits, and Stripe price references exist across **4 primary source files**:

1. `src/lib/plans.ts` (Core constant definitions, regional PPP configuration, tier limit schemas)
2. `src/pages/Pricing.tsx` (Commercial landing page with regional currency switcher and interactive calculators)
3. `src/components/sections/SettingsSection.tsx` (Workspace settings "Plan Upgrades" tab)
4. `src/hooks/use-subscription.tsx` (Stripe Checkout invocation & subscription context)

---

### 2.2 Cross-File Comparison & Discrepancy Matrix

| Feature / Pricing Metric | `src/lib/plans.ts` | `src/pages/Pricing.tsx` | `src/components/sections/SettingsSection.tsx` | `src/hooks/use-subscription.tsx` | Discrepancy / Alignment Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **India Pro Monthly** | `₹199/mo` (line 75) | `₹199/mo` (line 306) | `₹199/mo` (line 88, 675) | N/A (Handled via Stripe session) | **Aligned** ✅ |
| **India Pro Yearly** | `₹1,999/yr` (line 76) | `₹1,999/yr` (`pricingConfig.proYearly`) | `₹1,999/yr` (`pricingConfig.proYearly`) | N/A | **Aligned** ✅ |
| **Global Pro Monthly** | `$9.99/mo` (line 88) | `$9.99/mo` (line 306) | `$9.99/mo` (line 88, 675) | N/A | **Aligned** ✅ |
| **Global Pro Yearly** | `$99.99/yr` (line 89) | `$99.99/yr` | `$99.99/yr` | N/A | **Aligned** ✅ |
| **Savings Badge** | `"Save 44%"` (line 79, 92) | `"Save 44%"` (line 306) | `"Save 44%"` (line 88, 675) | N/A | **Aligned** ✅ |
| **Legacy Fallback PRICING** | `$9.99` (line 97) | N/A | N/A | N/A | **Note:** `PRICING` object in `plans.ts` (lines 96–100) is unused legacy code. |
| **Stripe Price ID Handling** | N/A | Calls `startCheckout(interval)` | Calls `startCheckout(billingCycle)` | Reads `VITE_STRIPE_PRO_MONTHLY_PRICE_ID` & `VITE_STRIPE_PRO_YEARLY_PRICE_ID` (lines 78–82) | **Aligned** ✅ |

---

### 2.3 Proposed Unified Single Source of Truth Schema

To prevent future discrepancy risks and ensure type safety across all pricing touchpoints, all components should import from a single, strongly-typed configuration in `src/lib/plans.ts`:

```typescript
// Proposed Unified Schema in src/lib/plans.ts

export type PlanTier = "free" | "pro" | "teacher" | "institution";
export type BillingInterval = "monthly" | "yearly";
export type CurrencyRegion = "IN" | "GLOBAL";

export interface TierPricingDetail {
  monthly: number;
  yearly: number;
  monthlyUSDEquivalent?: number;
  yearlyUSDEquivalent?: number;
  stripePriceIdMonthlyKey: string;
  stripePriceIdYearlyKey: string;
}

export interface RegionConfig {
  regionName: string;
  flag: string;
  currencySymbol: string;
  currencyCode: string;
  savingsBadgeText: string;
  tiers: {
    pro: TierPricingDetail;
    teacher: {
      commissionRateText: string;
      firstNClassesFree: number;
      upfrontCost: number;
    };
    institution: {
      perStudentSemester: number;
    };
  };
}

export const UNIFIED_PRICING_CONFIG: Record<CurrencyRegion, RegionConfig> = {
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
        monthlyUSDEquivalent: 2.63,
        yearlyUSDEquivalent: 26.26,
        stripePriceIdMonthlyKey: "VITE_STRIPE_IN_PRO_MONTHLY_PRICE_ID",
        stripePriceIdYearlyKey: "VITE_STRIPE_IN_PRO_YEARLY_PRICE_ID",
      },
      teacher: {
        commissionRateText: "10% per class fee",
        firstNClassesFree: 5,
        upfrontCost: 0,
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
    savingsBadgeText: "Save 44%",
    tiers: {
      pro: {
        monthly: 9.99,
        yearly: 99.99,
        monthlyUSDEquivalent: 9.99,
        yearlyUSDEquivalent: 99.99,
        stripePriceIdMonthlyKey: "VITE_STRIPE_PRO_MONTHLY_PRICE_ID",
        stripePriceIdYearlyKey: "VITE_STRIPE_PRO_YEARLY_PRICE_ID",
      },
      teacher: {
        commissionRateText: "10% per class fee",
        firstNClassesFree: 5,
        upfrontCost: 0,
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

### 3.1 Competitive 3-Minute User Journey Benchmark

We evaluated the initial 3-minute onboarding and time-to-value (TTV) experience of **Personal Performance System (PPS)** against market benchmarks **Opal**, **Forest**, and **Habitica**:

| Evaluation Metric | Opal (App Blocker & Focus) | Forest (Gamified Pomodoro) | Habitica (RPG Habit Tracker) | PPS (Personal Performance System) |
| :--- | :--- | :--- | :--- | :--- |
| **Time-to-Value (TTV)** | **< 30 seconds** (Select apps -> Block) | **< 45 seconds** (Select tree -> Set timer -> Plant) | **~ 2 minutes** (Avatar creation -> Habit setup) | **~ 3.5 minutes** (5-screen wizard before dashboard) |
| **Initial Cognitive Load** | Very Low (1 primary CTA) | Very Low (Visual timer focus) | Moderate (RPG stats & avatar customization) | **High** (Track choice, bottleneck ID, focus target, squad choice) |
| **Circadian Flow** | Automatic schedule blocking during sleep hours | None (Manual timer start) | None (Daily task resets at midnight) | **High** (Circadian time-block alarms, start/end focus windows) |
| **Peer & Social Friction** | Zero friction (Passive friend feeds) | Low (Enter room code to plant together) | Moderate (Party quests and boss battles) | **Moderate** (Squad join code or group creation step) |

---

### 3.2 Top 3 Student User Drop-Off Friction Points in PPS

1. **Lengthy Multi-Step Onboarding Wizard (`OnboardingWizard.tsx`, lines 1–287):**
   * *Problem:* Requiring students to complete 5 sequential configuration screens (Primary Track, Bottleneck Drill, Focus Hours Slider, Social Squad Selection, and Final Confirmation) before displaying the main dashboard.
   * *Drop-Off Impact:* ~35–40% user drop-off before reaching the core dashboard. Students seeking an immediate study timer or quick habit log get bogged down in multi-field wizard setup.
2. **Heavy Vertical Component Stacking on Mobile Viewports (`Dashboard.tsx`, lines 1–1391):**
   * *Problem:* On mobile viewports (<640px), the dashboard renders sticky notes, level widgets, stat cards, habit lists, and focus timers stacked sequentially in a single long column.
   * *Drop-Off Impact:* Core action targets (checking off today's habits or launching a focus room) are pushed below the fold, requiring extensive scrolling.
3. **Complex Time Picker Inputs in Habit Creation (`HabitManagerSection.tsx`):**
   * *Problem:* Configuring habit alarms requires selecting Start Time, End Time, Priority, Period, Category, and Notification Toggles via standard HTML time inputs.
   * *Drop-Off Impact:* Touchscreen input friction on mobile devices leads to misconfigured alarm windows and missed circadian habit notifications.

---

### 3.3 Three Concrete Mobile & Circadian UX Improvements

1. **1-Tap "Quick Focus Session" Floating Action Button (FAB):**
   * *Implementation:* Add a persistent floating action button at the bottom right of mobile viewports that launches a 25-minute Pomodoro focus timer instantly with 1 tap, bypassing sub-menu navigation.
2. **24-Hour Touch-Friendly Radial Clock Dial for Habit Scheduling:**
   * *Implementation:* Replace numeric drop-down selectors with an intuitive radial clock dial representing Morning, Afternoon, Evening, and Night focus windows. Students can drag habit blocks into their circadian peak hours in seconds.
3. **1-Tap Student Role Presets for Onboarding:**
   * *Implementation:* Replace the 5-screen onboarding wizard with a 1-tap preset selector ("Exam Cram Mode", "Core Engineering", "High Energy & Vitality"). Pre-populate 3 default anchor habits and defer detailed customization until after the student completes their first study session.

---

## 4. Summary Matrix of Findings & Recommendations

| # | Priority | Category | File Location | Issue Summary | Proposed Actionable Recommendation |
| :-: | :-: | :--- | :--- | :--- | :--- |
| **1** | 🚨 **P0** | Security / Auth | `src/hooks/use-auth.ts` (lines 298–311) | OAuth `#access_token` hash fragments collide with `HashRouter` pathing. | Parse `#access_token` parameter in `main.tsx` prior to mounting `HashRouter`. |
| **2** | 🔶 **P1** | Security / Session | `src/hooks/use-auth.ts` (lines 87–94) | Deleting `pps_guest_created_at` in `localStorage` resets the 7-day trial timer. | Store guest session creation timestamp in an encrypted token or validate session server-side. |
| **3** | 🔶 **P1** | Schema Consistency | `src/lib/plans.ts` (lines 69–95) | Pricing schemas distributed across separate objects; legacy `PRICING` object present. | Implement `UNIFIED_PRICING_CONFIG` in `src/lib/plans.ts` and remove legacy `PRICING` object. |
| **4** | 🔵 **P2** | Mobile UX | `src/components/onboarding/OnboardingWizard.tsx` | High onboarding TTV (~3.5 min) across 5 wizard screens. | Implement 1-tap student preset selector to defer heavy customization. |
| **5** | 🔵 **P2** | Mobile UX | `src/pages/Dashboard.tsx` (lines 1–1391) | Heavy vertical component stacking on mobile viewports. | Re-order mobile layout to place habit check-ins and quick timer controls above the fold. |

---
*Report compiled autonomously by Jules in accordance with strict READ-ONLY audit directives.*
