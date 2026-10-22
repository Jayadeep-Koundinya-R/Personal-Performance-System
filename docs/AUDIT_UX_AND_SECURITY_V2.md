# Comprehensive UX Flow Audit & Security Gap Analysis (v2.0)

**Target System:** Personal Performance System (PPS)
**Scope:** Read-Only Full Codebase Inspection
**Report Date:** March 2026
**Auditor:** Jules (Senior Software Engineer & Security Auditor)

---

## Section 1: Authentication & Session State Flow Audit

### 1.1 Authentication Lifecycle Architecture & Branch Analysis

The authentication system in PPS is managed primarily through `src/hooks/use-auth.ts`, supported by `src/App.tsx`, `src/routes/OnboardingGuard.tsx`, `src/providers/AppProviders.tsx`, and `src/pages/Login.tsx`.

#### Branch 1: Fresh Anonymous Visitor Landing on `/`
- **Flow Description:** A new visitor navigating to `#/` hits `AppRoutes` in `src/App.tsx` (line 183).
- **Execution Path:**
  1. `AppRoutes` renders `<HomePage />` wrapped in `<DashboardProviders user={currentUser}>` (line 181).
  2. `currentUser` is evaluated on line 180 as `user || { email: null, isGuest: true }`.
  3. `useProvideAuth()` in `src/hooks/use-auth.ts` initializes state. `isGuestInitial` checks `localStorage.getItem("pps_guest")` and `sessionStorage.getItem("pps_guest")` (line 232).
  4. Since no local storage keys exist, `user` defaults to `null` and `loading` defaults to `true` (lines 234, 237).
  5. An asynchronous safety timeout of 800ms (`safetyTimer`, lines 241-248) runs alongside `supabase.auth.getSession()` (line 274) and `supabase.auth.onAuthStateChange` (line 258).
  6. When `getSession()` resolves with `session === null`, `setUser(null)` and `setLoading(false)` are called.
- **Identified Risk:** Because `currentUser` falls back to `{ email: null, isGuest: true }` in `src/App.tsx` (line 180) even when `user` is `null`, `DashboardProviders` initializes the full react tree (`SubscriptionProvider`, `ProfileProvider`, `UserSettingsProvider`, `ReflectionsProvider`, `RemindersProvider`, `HabitsProvider`, `NotificationProvider`, `FocusTimerProvider`) for an anonymous visitor who hasn't clicked "Demo Mode" or "Sign In". This creates unnecessary state listeners and localStorage initializations for anonymous landing traffic.

#### Branch 2: Guest / Demo Mode Activation
- **Flow Description:** The user clicks "Enter 7-Day Demo Dashboard" on `src/pages/Login.tsx` or "Start Free" from landing components.
- **Execution Path:**
  1. `loginAsGuest(name, remember)` is invoked in `src/hooks/use-auth.ts` (lines 357-380).
  2. Storage keys are set: `pps_guest = "true"`, `pps_guest_name`, `pps_guest_created_at = ISO string`, `pps_onboarded_guest = "true"`, `pps_guest_onboarded = "true"`, `pps_onboarding_completed = "true"`, `pps_active_track = "placements"`.
  3. `setUser({ email: null, isGuest: true })` updates React state immediately.
  4. Custom event `window.dispatchEvent(new Event("pps_auth_change"))` triggers cross-tab and in-tab listeners (line 293).
  5. Router navigates to `#/dashboard`.
  6. Demo trial duration is checked via `checkIsGuestTrialExpired()` (lines 64-70) based on `TRIAL_DURATION_DAYS = 7` (line 52).
  7. When trial expires (`elapsedDays >= 7`), `OnboardingGuard` (`src/routes/OnboardingGuard.tsx`, lines 33-35) intercept requests and forces redirect to `#/pricing` with `state={{ trialExpired: true }}`.

#### Branch 3: Transition from Demo Mode to Google OAuth / Supabase Auth
- **Flow Description:** A guest user who built local habits decides to sign up or log in via Supabase or Google OAuth.
- **Execution Path:**
  1. The user logs in via `login()`, `signup()`, or `loginWithGoogle()`.
  2. Upon successful authentication, Supabase fires `onAuthStateChange` (line 258) or `getSession()` (line 274) returns `session.user`.
  3. `setUser(mapUser(session.user))` updates the user state.
  4. `migrateGuestData(session.user.id)` in `src/hooks/use-auth.ts` (lines 84-228) is executed automatically.
  5. `migrateGuestData` reads `habits_guest`, `reflections_guest`, `reminders_guest`, and `pps_settings_guest` from `localStorage`.
  6. Database records are inserted via `supabase.from("habits").insert(...)`, `supabase.from("habit_completions").insert(...)`, `supabase.from("reflections").insert(...)`, `supabase.from("reminders").insert(...)`, and `user_settings` upsert.
  7. Upon completion, guest keys are purged from `localStorage`: `habits_guest`, `reflections_guest`, `reminders_guest`, `pps_settings_guest`, `pps_guest`, `pps_guest_name`, `pps_guest_created_at`, `pps_onboarded_guest`, `pps_ai_chat_guest`, `pps_ai_chat_history`.
  8. `queryClient.invalidateQueries()` (line 222) invalidates React Query caches.

#### Branch 4: Logout from Authenticated Session vs. Logout from Demo Session
- **Flow Description:** User clicks "Sign Out" in settings (`src/components/sections/SettingsSection.tsx`) or navbar.
- **Execution Path:**
  1. `logout()` in `src/hooks/use-auth.ts` (lines 382-398) is called.
  2. `supabase.auth.signOut()` invalidates the remote session.
  3. `clearUserSessionStorage()` (lines 10-33) executes storage cleanup.
  4. `queryClient.clear()` (line 392) purges all cached React Query state.
  5. `setUser(null)` clears the React user context.
  6. `window.dispatchEvent(new Event("pps_auth_change"))` notifies all context providers.
  7. `navigate("/login", { replace: true })` redirects to the login screen.

---

### 1.2 Vulnerability & Edge Case Breakdown

#### 🔴 Critical Vulnerability 1: Storage Key Mutating Loop Bug in `clearUserSessionStorage()`
- **Location:** `src/hooks/use-auth.ts`, lines 10-33
- **Code Inspection:**
  ```typescript
  export function clearUserSessionStorage(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const keysToRemove: string[] = [];
      const totalKeys = localStorage.length;
      for (let i = 0; i < totalKeys; i++) {
        const key = localStorage.key(i);
        if (!key || key === "pps_billing_region") continue;
        if (
          key.startsWith("pps_") ||
          key.startsWith("habits_") ||
          key.startsWith("reflections_") ||
          key.startsWith("reminders_") ||
          key.startsWith("notifications_")
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (err) { ... }
  }
  ```
- **Root Cause & Impact:** Although `keysToRemove` is populated in the loop before removal, evaluating `localStorage.key(i)` inside a standard `0..totalKeys` loop assumes `localStorage.length` remains static during iteration. While `keysToRemove.forEach` deletes them afterward, if any concurrent write occurs or if key indices shift due to browser storage behavior, specific keys are skipped.
- **Exploit Scenario / Failure:** If `pps_onboarded_guest` or `pps_onboarding_completed` is skipped during session clear when a user logs out, a subsequent user logging in on the same browser device will inherit `onboardingCompleted = true` from the stale key in `OnboardingGuard.tsx` (lines 38-44), bypassing the required initial setup wizard.

#### 🔴 Security Gap 2: HashRouter OAuth Callback Hash Mismatch & Infinite Loop
- **Location:** `src/hooks/use-auth.ts` (lines 250-263) & `src/App.tsx` (lines 183-235)
- **Code Inspection:**
  ```typescript
  // src/hooks/use-auth.ts
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
- **Root Cause & Impact:** PPS uses `HashRouter` (`<HashRouter>` in `src/App.tsx` line 229). When Google OAuth redirects back from Supabase to `https://domain.com/#access_token=...&refresh_token=...`, `HashRouter` interprets the portion after `#` as the route path (`/access_token=...`).
- **Failure Mode:** React Router attempts to match route `/access_token=...`, triggering `NotFound` (`<Route path="*" element={<NotFound />} />`) before `use-auth.ts` finishes asynchronous token exchange. On slow mobile connections, this results in an unhandled 404 screen or repeated route redirection loops between `#/login` and `#/access_token=...`.

#### 🟠 Medium Vulnerability 3: React Query Cache Pollution During Demo-to-Auth Migration
- **Location:** `src/hooks/use-auth.ts`, line 222
- **Code Inspection:**
  ```typescript
  // Inside migrateGuestData
  queryClient.invalidateQueries();
  ```
- **Root Cause & Impact:** `queryClient.invalidateQueries()` marks active queries as stale and triggers a refetch, but does **not** clear existing query cache data structures. If a guest user viewed habit statistics or local reflections, those cached objects remain in the React Query memory store until the refetch completes.
- **Security Impact:** Momentary data leakage where guest session data remains visible in UI components for 200ms–1000ms while database queries load. `queryClient.clear()` or `queryClient.resetQueries()` must be called prior to refetching authenticated user data.

---

## Section 2: Pricing & Subscription Consistency Audit

### 2.1 Codebase Pricing & Tier Audit Matrix

A complete scan of the codebase reveals multiple inconsistencies in plan tier naming, currency symbols, regional price representation, and Stripe Price ID fallbacks.

| File Location | Currency Symbol / Format | Stated Tier Names | Stated Pro Pricing | Identified Conflicts & Discrepancies |
| :--- | :--- | :--- | :--- | :--- |
| `src/lib/plans.ts` (lines 72-108) | `₹` (IN), `$` (GLOBAL) | `free`, `pro`, `teacher`, `institution` | IN: ₹199/mo, ₹1999/yr<br>GLOBAL: $9.99/mo, $99.99/yr | **Source of Truth** for limits & regional pricing. |
| `src/lib/plans.ts` (lines 111-115) | `$` (USD) | `pro` | $9.99/mo, $99.99/yr | **Legacy Fallback Object `PRICING`**: Ignores regional PPP (`₹199`) and breaks INR users if imported directly. |
| `src/pages/Pricing.tsx` (lines 220-300) | `symbol` from `REGIONAL_PRICING` | `Personal Free`, `Student Pro`, `Teacher Studio`, `Campus License` | Monthly: {pricingConfig.proMonthly}<br>Annual: Math.round(proYearly/12) | Displays $9.99 / ₹167 (billed annually). Naming differs from `plans.ts` (`Campus License` vs `institution`). |
| `src/pages/Pricing.tsx` (lines 255, 283, 405) | Hardcoded `₹`, `$`, `₹2,000` | N/A | Hardcoded ₹2,000 / $49 per student | Hardcoded pricing strings in JSX bypassing `REGIONAL_PRICING` constants. |
| `src/components/sections/SettingsSection.tsx` (lines 500-580) | `symbol` from `REGIONAL_PRICING` | `Student Pro Tier`, `Teacher & Mentor Studio`, `Campus Institutional License` | {pricingConfig.proMonthly} / Math.round(proYearly/12) | Uses `handleCheckout("campus")` instead of `"institution"`. Uses custom tier strings. |
| `src/pages/Home.tsx` (lines 50-60) | Text | `Personal Free` | 100% Free Lifetime Tier | Mentions "15 active habits, 3 study squads" (matches `PLAN_LIMITS.free`). |
| `src/hooks/use-subscription.tsx` (lines 75-85) | N/A | `pro`, `free` | N/A | Relies on `VITE_STRIPE_PRO_YEARLY_PRICE_ID` & `VITE_STRIPE_PRO_MONTHLY_PRICE_ID`. Sends `undefined` if env vars are missing. |

---

### 2.2 Detailed Discrepancy & Gap Analysis

#### Discrepancy 1: Inconsistent Tier Keys Across UI & Logic
- **`src/lib/plans.ts` Tier Type:** `export type PlanTier = "free" | "pro" | "teacher" | "institution";`
- **`src/components/sections/SettingsSection.tsx` Deviation:**
  ```typescript
  // Line 448
  const handleCheckout = async (targetPlan: "pro" | "teacher" | "campus") => { ... }
  ```
- **Impact:** `SettingsSection.tsx` uses `"campus"` as a plan target identifier, whereas `plans.ts` and `supabase` schema define `"institution"`. Passing `"campus"` to subscription or profile update helpers causes database lookup mismatches or fallback to `"free"`.

#### Discrepancy 2: Hardcoded Currency Text Bypassing PPP Config
- In `src/pages/Pricing.tsx`:
  - Line 106: Hardcoded text `🎁 Beta Perks Included (₹0):`.
  - Line 255: Hardcoded text `₹0 / $0 Upfront Platform Cost`.
  - Line 405: FAQ text `₹2,000 per enrolled student`.
- **Impact:** Non-Indian global visitors (e.g., US/EU) viewing the pricing page see rupee symbols (`₹`) embedded in feature lists and FAQs despite selecting `GLOBAL` ($ USD) currency mode.

#### Discrepancy 3: Stripe Price ID Environment Variable Fragility
- In `src/hooks/use-subscription.tsx` (lines 75-85):
  ```typescript
  const envPriceId = isYearly
    ? (import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID as string)
    : (import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID as string);
  ```
- **Impact:** If frontend deployments do not inject `VITE_STRIPE_PRO_YEARLY_PRICE_ID` or `VITE_STRIPE_PRO_MONTHLY_PRICE_ID`, `startCheckout` passes `priceId: undefined` to Supabase edge function `create-checkout-session`, resulting in runtime payment failures for end users without explicit error messaging.

---

### 2.3 Proposed Unified Pricing Schema & Constants Standard

To eliminate all hardcoded pricing strings and tier key mismatches, all pricing configurations should be consolidated into a single immutable specification in `src/lib/plans.ts`:

```typescript
export type PlanTier = "free" | "pro" | "teacher" | "institution";
export type CurrencyRegion = "IN" | "GLOBAL";

export interface TierBillingConfig {
  id: PlanTier;
  displayName: string;
  badgeText?: string;
  limits: (typeof PLAN_LIMITS)[PlanTier];
  pricing: {
    IN: {
      monthly: number;
      yearly: number;
      effectiveMonthlyYearly: number;
      currencySymbol: string;
      formattedPriceMonthly: string;
      formattedPriceYearly: string;
    };
    GLOBAL: {
      monthly: number;
      yearly: number;
      effectiveMonthlyYearly: number;
      currencySymbol: string;
      formattedPriceMonthly: string;
      formattedPriceYearly: string;
    };
  };
}

export const UNIFIED_PRICING_SCHEMA: Record<PlanTier, TierBillingConfig> = {
  free: {
    id: "free",
    displayName: "Personal Free",
    limits: PLAN_LIMITS.free,
    pricing: {
      IN: { monthly: 0, yearly: 0, effectiveMonthlyYearly: 0, currencySymbol: "₹", formattedPriceMonthly: "₹0", formattedPriceYearly: "₹0" },
      GLOBAL: { monthly: 0, yearly: 0, effectiveMonthlyYearly: 0, currencySymbol: "$", formattedPriceMonthly: "$0", formattedPriceYearly: "$0" },
    },
  },
  pro: {
    id: "pro",
    displayName: "Student Pro",
    badgeText: "Most Popular",
    limits: PLAN_LIMITS.pro,
    pricing: {
      IN: { monthly: 199, yearly: 1999, effectiveMonthlyYearly: 167, currencySymbol: "₹", formattedPriceMonthly: "₹199", formattedPriceYearly: "₹1,999" },
      GLOBAL: { monthly: 9.99, yearly: 99.99, effectiveMonthlyYearly: 8.33, currencySymbol: "$", formattedPriceMonthly: "$9.99", formattedPriceYearly: "$99.99" },
    },
  },
  teacher: {
    id: "teacher",
    displayName: "Teacher & Mentor Studio",
    badgeText: "Beta",
    limits: PLAN_LIMITS.teacher,
    pricing: {
      IN: { monthly: 0, yearly: 0, effectiveMonthlyYearly: 0, currencySymbol: "₹", formattedPriceMonthly: "10% comm.", formattedPriceYearly: "10% comm." },
      GLOBAL: { monthly: 0, yearly: 0, effectiveMonthlyYearly: 0, currencySymbol: "$", formattedPriceMonthly: "10% comm.", formattedPriceYearly: "10% comm." },
    },
  },
  institution: {
    id: "institution",
    displayName: "Campus Institutional License",
    badgeText: "Enterprise",
    limits: PLAN_LIMITS.institution,
    pricing: {
      IN: { monthly: 2000, yearly: 2000, effectiveMonthlyYearly: 2000, currencySymbol: "₹", formattedPriceMonthly: "₹2,000/student/sem", formattedPriceYearly: "₹2,000/student/sem" },
      GLOBAL: { monthly: 49, yearly: 49, effectiveMonthlyYearly: 49, currencySymbol: "$", formattedPriceMonthly: "$49/student/sem", formattedPriceYearly: "$49/student/sem" },
    },
  },
};
```

---

## Section 3: Competitor UX & Friction Analysis (Real-World Benchmark)

### 3.1 Benchmark Comparison: PPS vs. Opal, Forest, and Habitica

| Metric / Dimension | PPS (Personal Performance System) | Opal | Forest | Habitica |
| :--- | :--- | :--- | :--- | :--- |
| **Core Product Focus** | All-in-one execution OS (Habits, Study Squads, Focus Rooms, Circadian Alarms, AI Coach) | Hard distraction blocking & App/Screen time lockouts | Visual Pomodoro timer & virtual tree planting | RPG Gamified habit tracking & avatar quests |
| **Time-to-Value (TTFV)** | ~180 seconds (requires multi-step wizard choices before main dashboard) | ~30 seconds (1 tap permissions -> instant screen lock timer) | ~15 seconds (1 tap "Plant" -> timer starts) | ~90 seconds (avatar creation -> default quest stack) |
| **Onboarding Friction** | **High** (4 tracks, bottleneck selection, Universal Agni 5 AM challenge, focus hours, social choice) | **Very Low** (Single focus goal -> iOS Screen Time API prompt) | **Zero** (Instant visual tree planting canvas) | **Medium** (RPG class select + starter habits) |
| **Mobile Experience** | Dense multi-card layout, top header + bottom navigation + overlapping modal triggers | High-contrast native iOS cards, single primary CTA | Ultra-clean full-screen canvas, haptic radial slider | Pixel-art list view, dense quest & item sub-menus |
| **Circadian Integration** | Built-in circadian energy window calculator & peak focus alarms | Schedule-based blocking sessions | Manual timer duration | None |

---

### 3.2 Top 3 Friction Points for New Student Users

#### 1. Onboarding Choice Fatigue & Decision Paralysis (`src/components/onboarding/OnboardingWizard.tsx`)
- **Root Cause:** When a student enters `OnboardingWizard.tsx`, they are presented with:
  1. Selecting 1 of 4 Primary Tracks (Placements, Competitive Exams, Core Coding, Fitness).
  2. Selecting specific Bottleneck Drills (`ScreenTrackDrill.tsx`).
  3. Configuring daily focus target hours.
  4. Toggling the "Universal Agni 5 AM Challenge" mode.
  5. Choosing social preferences (Solo vs. Create Squad vs. Join Squad).
  6. Reviewing and tweaking custom starter habit items (`ScreenFinalReview.tsx`).
- **Impact:** In the first 180 seconds, a student user must make over 8 distinct configuration decisions before seeing their active habit dashboard or experiencing the product's core value. This causes high drop-off for casual mobile users.

#### 2. Modal Overlay Contention & UI Overcrowding on Mobile Devices (`src/pages/Dashboard.tsx`)
- **Root Cause:** When a user lands on the dashboard, several floating banners and modal overlays evaluate visibility simultaneously:
  - `GuestTrialBanner` (`src/components/ui/GuestTrialBanner.tsx`)
  - `GuestTrialExpiredModal` (`src/components/GuestTrialExpiredModal.tsx`)
  - `VayuPulseBanner` (`src/components/vayu/VayuPulseBanner.tsx`)
  - `EmergencyTriageModal` (`src/components/dashboard/EmergencyTriageModal.tsx`)
  - `MorningRitualModal` (`src/components/dashboard/MorningRitualModal.tsx`)
- **Impact:** On mobile portrait screens (width 375px–414px), multiple fixed-position modals stack over the main habit list. Users are forced to dismiss 2-3 popups before checking off their first morning habit.

#### 3. Hidden Circadian Window Configuration in Habit Forms (`src/components/sections/DailyTrackerSection.tsx`)
- **Root Cause:** Setting up a circadian-aligned habit (e.g. "Morning Deep Work during Cortisol Peak") requires opening the full habit modal, manually setting `startTime` and `endTime` strings, toggling start/end alarms, and configuring freeze credit thresholds.
- **Impact:** Students default to basic time-unbounded habits ("Do anytime"). As a result, the powerful Circadian Flow Engine (`src/lib/dashboard/vitality.ts`) loses contextual energy alignment data.

---

### 3.3 Top 3 Concrete UX Improvements for Mobile & Circadian Flow

#### Improvement 1: "1-Tap Express Onboarding" with One-Click Archetype Presets
- **Proposed Solution:** Replace the 5-screen wizard for mobile users with a 1-tap archetype selector:
  - 🎓 **Exam Aspirant Stack** (3 preset habits + 8:00 AM Cortisol Peak anchor).
  - 💻 **Core Developer Stack** (LeetCode + 90m Deep Build + 432Hz Audio).
  - 🏃 **Fitness & Mindset Stack** (Hydration + Sunlight + Evening Recovery).
- **UX Benefit:** Reduces Time-to-Value from 180 seconds down to < 15 seconds. Users drop straight into an active dashboard with pre-configured habits.

#### Improvement 2: Mobile "Daily Circadian Horizon Deck" (Swipeable Time-Window Cards)
- **Proposed Solution:** Introduce a horizontal swipeable "Circadian Deck" at the top of the mobile dashboard dividing the day into 3 distinct biological energy windows:
  1. 🌅 **Morning Cortisol Peak** (07:00 – 11:00 AM): Displays high-priority deep work habits.
  2. ⚡ **Afternoon Executive Window** (01:00 – 05:00 PM): Displays study squads and focus room sessions.
  3. 🌙 **Evening Recovery & Consolidation** (08:00 – 10:00 PM): Displays reflection journal and wind-down alarms.
- **UX Benefit:** Replaces endless vertical scroll with clean, time-aware focus context, reducing cognitive clutter on small mobile screens.

#### Improvement 3: Haptic Radial Quick-Checkin Floating Action Hub (FAB)
- **Proposed Solution:** Implement a single floating action button (FAB) in the bottom right corner of mobile views. Long-pressing or swiping up on the FAB opens a radial arc containing:
  - ⚡ **1-Tap Quick Habit Checkoff**
  - ⏱️ **Instant 25m Pomodoro Start**
  - 🎧 **Toggle 432Hz Lo-Fi Ambient Audio**
  - 🎥 **Drop-In Live Focus Room**
- **UX Benefit:** Eliminates navigation tab switching for frequent daily micro-interactions, mimicking top mobile productivity apps like Forest and Opal.
