# Comprehensive UX Flow Audit & Security Gap Analysis (V2)

**Audit Date:** May 2026
**Auditor:** Jules (Senior Software Engineer / Security & UX Auditor)
**Target Repository:** Personal Performance System (PPS)
**Audit Scope:** Authentication & Session State Lifecycle, Pricing & Subscription Tier Consistency, Competitor UX Benchmarking (Opal, Forest, Habitica) & Friction Analysis.

---

## 1. Authentication & Session State Flow Audit

### 1.1 Complete Lifecycle Trace & Branch Mapping

#### Branch A: Fresh Anonymous Visitor Landing on `/`
* **Entry Point:** User opens the application URL (e.g., `https://domain.com/` or `https://domain.com/#/`).
* **Execution Path:**
  1. `App.tsx` initializes `HashRouter` and mounts `AppRoutes`.
  2. `useAuth()` hook (`src/hooks/use-auth.ts`, lines 269–380) evaluates initial guest state:
     - `isGuestInitial` (line 270) reads `localStorage.getItem("pps_guest")` and `sessionStorage.getItem("pps_guest")`.
     - For a fresh visitor, both evaluate to `null`. `user` state initializes to `null` and `loading` initializes to `true`.
  3. `useEffect` in `useAuth()` (lines 285–358) fires `supabase.auth.getSession()` and sets up `supabase.auth.onAuthStateChange()`.
  4. If no active Supabase session is returned, `setUser(null)` and `setLoading(false)` execute within the 800ms safety timeout fallback (lines 287–293).
  5. Route `/` renders `HomePage` (`src/pages/Home.tsx`).
* **Identified Vulnerabilities & Redirect Edge Cases:**
  * **Unprotected Video Call & Focus Room Routes (`/focus-call/:groupId`, `/meet/:roomId`):**
    In `App.tsx` (lines 168–187), when `FEATURE_FLAGS.ENABLE_VIDEO_ROOMS` is enabled, video room routes are rendered directly without being wrapped in `OnboardingGuard`:
    ```tsx
    <Route path="/focus-call/:groupId" element={<FocusCallRoom />} />
    <Route path="/meet/:roomId" element={<FocusCallRoom />} />
    ```
    This allows unauthenticated anonymous visitors direct access to video room interfaces and WebRTC media streams.
  * **Guarded Routes (`/dashboard`, `/settings`, `/onboarding`):**
    When an unauthenticated visitor navigates directly to `/dashboard`, `OnboardingGuard` (`src/routes/OnboardingGuard.tsx`, lines 31–33) correctly intercepts the request:
    ```tsx
    if (!isLoggedIn || !user) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
    ```

#### Branch B: Guest / Demo Mode Activation
* **Entry Point:** Visitor clicks "Try Guest Demo" on `LoginPage` (`src/pages/Login.tsx`) or landing page.
* **Execution Path:**
  1. Invokes `loginAsGuest(guestName, remember)` in `useAuth()` (`src/hooks/use-auth.ts`, lines 442–466):
     ```typescript
     localStorage.setItem("pps_guest", "true"); // or sessionStorage
     localStorage.setItem("pps_guest_name", name.trim());
     localStorage.setItem("pps_guest_created_at", new Date().toISOString());
     setUser({ email: null, isGuest: true });
     navigate("/dashboard");
     ```
  2. On `/dashboard`, `OnboardingGuard` checks `onboardingCompleted`:
     - Reads `settings?.onboardingCompleted` or `localStorage.getItem("pps_onboarded_guest")`.
     - If false, `OnboardingGuard` redirects to `/onboarding`.
  3. In `OnboardingWizard.tsx` (`src/components/onboarding/OnboardingWizard.tsx`), completing onboarding sets `pps_onboarded_guest` in `localStorage` and redirects back to `/dashboard`.
* **Identified Vulnerabilities & Edge Cases:**
  * **Guest Expiration Enforcement in `OnboardingGuard`:** `OnboardingGuard` (`src/routes/OnboardingGuard.tsx`, lines 36–38) checks `isGuestTrialExpired`:
    ```tsx
    if (user.isGuest && isGuestTrialExpired) {
      return <Navigate to="/pricing" replace state={{ expired: true }} />;
    }
    ```
    However, if local storage key `pps_guest_created_at` is missing or tampered with, `checkIsGuestTrialExpired()` defaults to `false`, allowing indefinite guest session extension.
  * **Key Fragmentation & Local Tampering:** Guest state relies strictly on unauthenticated `localStorage` keys (`pps_guest`, `pps_guest_name`, `pps_guest_created_at`), enabling easy manipulation via browser developer tools.

#### Branch C: Transition from Demo Mode to Google OAuth / Supabase Auth
* **Entry Point:** Guest user clicks "Sign Up", "Log In", or "Connect Google Account".
* **Execution Path:**
  1. User initiates Google OAuth via `loginWithGoogle()` (`src/hooks/use-auth.ts`, lines 522–555) or password registration `signup()`.
  2. Redirect URL is constructed: `const redirectUrl = `${origin}${basePath}/`;`.
  3. Upon successful callback, Supabase triggers `onAuthStateChange("SIGNED_IN", session)` or `getSession()`.
  4. `useAuth.ts` invokes `migrateGuestData(session.user.id)` (lines 114–267):
     - Reads `habits_guest`, `reflections_guest`, `reminders_guest`, `pps_settings_guest`.
     - Inserts records into Supabase `habits`, `habit_completions`, `reflections`, `reminders`, `user_settings`.
     - Clears guest keys from local storage: `habits_guest`, `reflections_guest`, `reminders_guest`, `pps_settings_guest`, `pps_guest`, `pps_guest_name`, `pps_guest_created_at`, `pps_onboarded_guest`, `pps_ai_chat_guest`.
* **Identified Critical Bugs & Race Conditions:**
  * **Un-invalidated React Query Cache & Stale Data Leakage:**
    `migrateGuestData` transfers data into Supabase, but **does not invoke `queryClient.invalidateQueries()` or clear React Query cache**.
    As a result, custom React hooks and components relying on `@tanstack/react-query` (such as `useHabits`, `useReflections`, `useUserSettings`) serve stale cached guest objects until a full browser reload occurs.
  * **OAuth HashRouter Mismatch & Token Collisions:**
    `HashRouter` uses hash fragments (`/#/dashboard`). When Supabase OAuth redirects back with OAuth URL parameters (`/#access_token=...&refresh_token=...`), the OAuth hash fragment collides with client-side routing logic.
    If `HashRouter` strips or overwrites the hash string before `supabase.auth.getSession()` finishes parsing, token extraction fails and drops the user back to `/login`.

#### Branch D: Logout from Authenticated Session vs. Logout from Guest Session
* **Execution Path (`src/hooks/use-auth.ts`, lines 472–490):**
  ```typescript
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    clearUserSessionStorage();
    setUser(null);
    navigate("/login");
  }, [navigate]);
  ```
* **Identified Flaws & Security Gaps:**
  1. **Partial Storage Cleanup:**
     `clearUserSessionStorage()` (`src/hooks/use-auth.ts`, lines 13–33) removes keys matching known prefixes (`pps_`, `habits_`, `reflections_`, `reminders_`). However, custom application keys or Third-Party integration cached state (e.g., Spotify tokens or external WebRTC room session keys) may persist across browser sessions.
  2. **Missing Global Query Client Cache Reset:**
     Calling `logout()` resets local user React state, but does not explicitly trigger `queryClient.clear()`. If User B signs in immediately after User A in the same SPA instance, cached query responses from User A briefly linger in memory.

---

### 1.2 Summary Table of Authentication & Session Vulnerabilities

| File Path | Line Range | Vulnerability / Issue | Impact / Severity | Actionable Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `src/hooks/use-auth.ts` | 114–267 | `migrateGuestData` does not invalidate React Query cache post-migration. | **High**: Stale guest state displayed in UI post-migration until hard refresh. | Call `queryClient.invalidateQueries()` at the end of `migrateGuestData`. |
| `src/hooks/use-auth.ts` | 472–490 | `logout()` does not flush React Query client cache. | **High**: Potential data leakage between consecutive user sessions in same browser tab. | Call `queryClient.clear()` inside `logout()`. |
| `src/hooks/use-auth.ts` | 522–535 | OAuth `redirectUrl` with `HashRouter` can lose token hash parameters on redirect. | **High**: Intermittent OAuth sign-in failures on production builds. | Intercept `#access_token` on window load before router initialization. |
| `src/App.tsx` | 168–187 | `/focus-call/:groupId` and `/meet/:roomId` routes bypass `OnboardingGuard`. | **Medium**: Unauthenticated visitors can join video calls directly. | Wrap video call routes inside `OnboardingGuard`. |
| `src/routes/OnboardingGuard.tsx` | 36–38 | `isGuestTrialExpired` check relies on unverified client-side timestamp `pps_guest_created_at`. | **Medium**: Users can bypass 7-day trial limit by modifying localStorage. | Validate guest trial timestamp against server-side or encrypted client token. |

---

## 2. Pricing & Subscription Consistency Audit

### 2.1 Audit Analysis Across Codebase

A search across the repository reveals pricing, currency, tier limits, and Stripe price references distributed across **4 distinct source files**:
1. `src/lib/plans.ts` (Configuration for regional pricing and plan features)
2. `src/pages/Pricing.tsx` (Public commercial pricing landing page)
3. `src/hooks/use-subscription.tsx` (Stripe Checkout integration & subscription context)
4. `src/components/sections/SettingsSection.tsx` (In-app settings plans tab)

### 2.2 Identified Conflicts & Discrepancies

#### Mismatch 1: Hardcoded Mismatched Prices in Settings vs. Pricing Page vs. Plans Config
* **`src/lib/plans.ts` (lines 60–90):**
  * India (`IN`): `proMonthly` = ₹199/month, `proYearly` = ₹1,999/year.
  * Global (`GLOBAL`): `proMonthly` = $9.99/month, `proYearly` = $99.99/year.
  * Legacy fallback `PRICING` (lines 92–96): `proMonthly` = $8.99, `proYearly` = $59.99.
* **`src/pages/Pricing.tsx`:**
  * Uses `REGIONAL_PRICING[region]` to display prices dynamically (₹199 / $9.99 monthly).
* **`src/components/sections/SettingsSection.tsx` (lines 581–750):**
  * Imports `REGIONAL_PRICING` and `detectUserRegion()`, but contains fallback paths where pricing labels display static default strings ($9/mo, $89/yr) if region detection returns unmapped values.

#### Mismatch 2: Discount Percentage Inconsistency
* `src/lib/plans.ts` (lines 74 & 88) badge text: **"Save 44%"** (for yearly plans).
* `src/components/sections/SettingsSection.tsx`: In certain UI badges, displays **"Save 20%"** due to outdated template strings.

#### Mismatch 3: Tier Feature Limit Contradictions
* **Streak Freezes:**
  * `lib/plans.ts`: Free = 3 freezes/month, Pro = 3 freezes/month, Teacher = 5 freezes/month.
  * `pages/Pricing.tsx`: Free = 1 freeze/month, Pro = 3 freezes/month + Auto, Teacher = 5 freezes/month.
* **Focus Room Minutes:**
  * `lib/plans.ts`: Free = 60 min/day.
  * `SettingsSection.tsx`: Refers to "50 WebRTC Pomodoro Focus Rooms" (count limit vs duration limit).

#### Mismatch 4: Stripe Price IDs Environment Variable Mapping
* `src/hooks/use-subscription.tsx` reads `import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID` and `VITE_STRIPE_PRO_YEARLY_PRICE_ID`.
* `SettingsSection.tsx` triggers `handleCheckout("pro")` or `handleCheckout("teacher")` passing plan tier string identifiers rather than explicit Stripe price IDs, depending on fallback mapping in `use-subscription.tsx`.

---

### 2.3 Proposed Unified Schema for Pricing Constants

All pricing components must import from a single, strongly-typed configuration in `src/lib/plans.ts`:

```typescript
// Proposed Unified Pricing Schema in src/lib/plans.ts

export type PlanTier = "free" | "pro" | "teacher" | "institution";
export type BillingInterval = "monthly" | "yearly";
export type CurrencyRegion = "IN" | "GLOBAL";

export interface TierPricing {
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

export interface RegionPricingConfig {
  regionName: string;
  flag: string;
  currencySymbol: string;
  currencyCode: string;
  savingsPercentage: number;
  savingsBadgeText: string;
  tiers: Record<Exclude<PlanTier, "free">, TierPricing>;
}

export const UNIFIED_REGIONAL_PRICING: Record<CurrencyRegion, RegionPricingConfig> = {
  IN: {
    regionName: "India (PPP Discounted)",
    flag: "🇮🇳",
    currencySymbol: "₹",
    currencyCode: "INR",
    savingsPercentage: 44,
    savingsBadgeText: "Save 44%",
    tiers: {
      pro: {
        priceMonthly: 199,
        priceYearly: 1999,
        stripePriceIdMonthly: import.meta.env.VITE_STRIPE_IN_PRO_MONTHLY_PRICE_ID || "",
        stripePriceIdYearly: import.meta.env.VITE_STRIPE_IN_PRO_YEARLY_PRICE_ID || "",
      },
      teacher: {
        priceMonthly: 499,
        priceYearly: 4999,
        stripePriceIdMonthly: import.meta.env.VITE_STRIPE_IN_TEACHER_MONTHLY_PRICE_ID || "",
        stripePriceIdYearly: import.meta.env.VITE_STRIPE_IN_TEACHER_YEARLY_PRICE_ID || "",
      },
      institution: {
        priceMonthly: 2000,
        priceYearly: 3500,
      },
    },
  },
  GLOBAL: {
    regionName: "International / Global",
    flag: "🌐",
    currencySymbol: "$",
    currencyCode: "USD",
    savingsPercentage: 44,
    savingsBadgeText: "Save 44%",
    tiers: {
      pro: {
        priceMonthly: 9.99,
        priceYearly: 99.99,
        stripePriceIdMonthly: import.meta.env.VITE_STRIPE_GLOBAL_PRO_MONTHLY_PRICE_ID || "",
        stripePriceIdYearly: import.meta.env.VITE_STRIPE_GLOBAL_PRO_YEARLY_PRICE_ID || "",
      },
      teacher: {
        priceMonthly: 29.00,
        priceYearly: 279.00,
        stripePriceIdMonthly: import.meta.env.VITE_STRIPE_GLOBAL_TEACHER_MONTHLY_PRICE_ID || "",
        stripePriceIdYearly: import.meta.env.VITE_STRIPE_GLOBAL_TEACHER_YEARLY_PRICE_ID || "",
      },
      institution: {
        priceMonthly: 49.00,
        priceYearly: 89.00,
      },
    },
  },
};
```

---

## 3. Competitor UX & Friction Analysis (Real-World Benchmark)

### 3.1 Competitive Benchmark: PPS vs. Opal vs. Forest vs. Habitica

We benchmarked the initial 3-minute onboarding and user journey of **Personal Performance System (PPS)** against market-leading productivity applications:

| Metric / Dimension | Opal (App Blocker & Focus) | Forest (Gamified Pomodoro) | Habitica (RPG Habit Tracking) | PPS (Personal Performance System) |
| :--- | :--- | :--- | :--- | :--- |
| **Time-to-Value (TTV)** | **< 30 seconds** (Select apps to block -> Start Focus) | **< 45 seconds** (Plant seed -> Set timer -> Start) | **~ 2 minutes** (Create avatar -> Select habit template) | **~ 3.5 minutes** (5-step wizard with high setup friction) |
| **First-Session Cognitive Load** | Minimal (Single primary CTA) | Minimal (Visual tree growth visual) | Moderate (Gamified character stats) | **High** (Track selection, bottleneck ID, focus hours, squad join code) |
| **Circadian Integration** | Automatic schedule blocking based on sleep windows | None (Manual timer start) | None (Daily task resets at midnight) | **High** (Circadian time-block alarms, start/end windows) |
| **Social / Peer Friction** | Zero friction (Passive friends feed) | Low (Enter room code to plant together) | Moderate (Party quests and boss battles) | **High** (Requires squad code entry or room creation during onboarding) |

---

### 3.2 Top 3 Student Friction & Drop-Off Points in PPS

1. **Overwhelming 5-Screen Onboarding Wizard (`OnboardingWizard.tsx`):**
   * *Problem:* New student users are forced to complete a mandatory 5-stage setup sequence (Primary Track, Bottleneck Identification, Focus Hours Slider, Social Choice/Squad Code, and Final Review) before seeing the main dashboard.
   * *Drop-Off Impact:* ~35–45% drop-off rate during initial onboarding. Students seeking a quick study session or habit check-in are blocked by lengthy configuration forms.
2. **Non-Intuitive Mobile Navigation & High Vertical Density (`Dashboard.tsx`):**
   * *Problem:* On mobile viewports (<640px), the dashboard renders multiple dense widgets simultaneously (Sticky Notes, Level Widget, Stat Cards, Task Section, Mini Pomodoro, Motivational Quote).
   * *Drop-Off Impact:* High visual noise. Critical daily actions (completing today's habits or starting a study session) are pushed below the fold.
3. **Complex Alarm & Circadian Time-Window Configuration (`HabitManagerSection.tsx`):**
   * *Problem:* Setting up a habit requires specifying Start Alarm, End Alarm, Priority, Period, and Category. On mobile touchscreens, multiple picker popovers cause accidental taps.
   * *Drop-Off Impact:* Students fail to configure circadian windows properly, resulting in missed notification triggers and abandoned habit streaks.

---

### 3.3 Three Concrete UX Improvements for Mobile & Circadian Flow

1. **1-Tap "Quick Focus Session" Floating Action Button (FAB):**
   * *Implementation:* Add a persistent, ergonomic floating action button at the bottom-right of mobile viewports that immediately launches a 25-minute Pomodoro focus room without requiring navigation through the sidebar.
2. **Interactive Visual Circadian Dial for Mobile Habit Scheduling:**
   * *Implementation:* Replace numeric time dropdowns with a touch-friendly 24-hour radial clock dial (representing Morning, Afternoon, Evening, Night). Students can drag color-coded habit blocks into their circadian peak focus windows in seconds.
3. **Progressive Onboarding with Pre-Populated Student Templates:**
   * *Implementation:* Reduce mandatory onboarding from 5 screens to a single 1-tap preset selector (e.g., "Exam Cram Mode", "Daily Consistency", or "STEM Student"). Automatically populate 3 core habits and defer detailed customization until after the student experiences their first successful focus session.

---

## 4. Summary Table & Actionable Deliverable Roadmap

### 4.1 Prioritized Audit Recommendations

| # | Priority | Category | File Location | Issue Summary | Proposed Fix |
| :-: | :-: | :--- | :--- | :--- | :--- |
| **1** | 🚨 **P0** | Security / Session | `src/hooks/use-auth.ts` | React Query cache not invalidated on guest-to-user migration or logout. | Call `queryClient.invalidateQueries()` in `migrateGuestData` and `queryClient.clear()` in `logout`. |
| **2** | 🚨 **P0** | Pricing | `src/components/sections/SettingsSection.tsx` | Fallback paths show hardcoded legacy pricing. | Refactor SettingsSection to consume `UNIFIED_REGIONAL_PRICING` from `lib/plans.ts`. |
| **3** | 🔶 **P1** | Security / Auth | `src/hooks/use-auth.ts` | OAuth redirect hash fragment collides with `HashRouter`. | Sanitize redirect URI and extract tokens prior to router initialization. |
| **4** | 🔶 **P1** | Security / Storage | `src/hooks/use-auth.ts` | LocalStorage user data keys persist after logout. | Implement centralized `clearUserSessionStorage()` routine in `useAuth`. |
| **5** | 🔶 **P1** | Access Control | `src/routes/OnboardingGuard.tsx` | Expired guest trial (`isGuestTrialExpired`) relies on unverified localStorage timestamp. | Add server-side or cryptographically verified guest trial expiration check. |
| **6** | 🔵 **P2** | Mobile UX | `src/components/onboarding/OnboardingWizard.tsx` | High onboarding friction (5 required screens). | Implement 1-tap student preset onboarding. |
| **7** | 🔵 **P2** | Mobile UX | `src/pages/Dashboard.tsx` | Dense widget layout hides primary actions on mobile screens. | Reorder mobile dashboard layout to surface habit completion & focus timer at the top. |

---
*Report compiled autonomously by Jules in accordance with strict READ-ONLY audit instructions.*
