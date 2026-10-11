# 📝 PPS Engineering Decision Log

> **Project:** Personal Performance System (PPS)  
> **Repository:** `Jayadeep-Koundinya-R/Personal-Performance-System`  
> **Maintainers:** Jayadeep & Antigravity  
> **Purpose:** Track daily architectural decisions, shipped files, automated test results, blockers, and remediation actions.

---

## 📌 Decision Log Index

- [Entry 2026-10-11: Jules Audit Merge & P0/P1 Security Remediation Patches](#entry-2026-10-11-jules-audit-merge--p0p1-security-remediation-patches)
- [Entry 2026-10-10: Authentication Resilience, Demo Mode Routing & Pricing Uniformity Hardening](#entry-2026-10-10-authentication-resilience-demo-mode-routing--pricing-uniformity-hardening)
- [Entry 2026-10-10: Sprint 4 — Jules' Onboarding Wizard Audit, Supabase complete_onboarding RPC & Native Polish](#entry-2026-10-10-sprint-4--jules-onboarding-wizard-audit-supabase-complete_onboarding-rpc--native-polish)
- [Entry 2026-10-08: Sprint 3 — Capacitor Android Native Build, Safe Areas & Native Haptics](#entry-2026-10-08-sprint-3--capacitor-android-native-build-safe-areas--native-haptics)
- [Entry 2026-10-08: Sprint 2 — Monetization Wiring & Database Performance Indexing](#entry-2026-10-08-sprint-2--monetization-wiring--database-performance-indexing)
- [Entry 2026-10-08: Sprint 1 — Security Remediation & Navigation Pruning](#entry-2026-10-08-sprint-1--security-remediation--navigation-pruning)
- [Entry 2026-10-06: Unfiltered 360° Executive Reality Audit](#entry-2026-10-06-unfiltered-360-executive-reality-audit)
- [Entry 2026-10-05: Strict Architectural Audit & Roadmap Commitment](#entry-2026-10-05-strict-architectural-audit--roadmap-commitment)
- [Entry 2026-10-04: Vayu Launch Elevation & DOMPurify Security Hardening](#entry-2026-10-04-vayu-launch-elevation--dompurify-security-hardening)
- [Entry 2026-08-24: Agni Launch Stabilization & Truth-in-Features Audit](#entry-2026-08-24-agni-launch-stabilization--truth-in-features-audit)

---

## [Entry 2026-10-11: Jules Audit Merge & P0/P1 Security Remediation Patches]

### 1. Context & Objectives
- Merge Jules' documentation PR branch (`origin/docs/ux-security-audit-v2-15775860961250705551`, file `docs/AUDIT_UX_AND_SECURITY_V2.md`) into `main`.
- Implement all P0 and P1 security and access control remediation items highlighted in the audit report.
- Verify 100% test passing across the entire Vitest suite (182 tests) and clean production compilation.

### 2. Architectural Decisions & Remediation Actions
- **Singleton QueryClient & Cache Lifecycle (P0):**
  - Created `src/lib/queryClient.ts` housing the shared singleton `QueryClient`.
  - In `migrateGuestData(userId)`, hooked `queryClient.invalidateQueries()` so that newly migrated Supabase records immediately refetch.
  - In `logout()`, hooked `queryClient.clear()` to prevent data leakage across user sessions on shared machines.
- **Centralized Session Storage Wipe (P1):**
  - Implemented `clearUserSessionStorage()` in `src/hooks/use-auth.ts`.
  - Thoroughly cleans all user habits, reflections, reminders, focus history, AI chat history, squad codes, and active track data while preserving non-sensitive device configurations (`pps_theme`, `pps_billing_region`, `pps_sound_muted`).
- **OAuth Redirect Sanitization & Hash Token Handling (P1):**
  - Sanitized Google OAuth redirect URL in `loginWithGoogle()` to `${origin}${basePath}/`.
  - Added hash fragment interceptor in `useProvideAuth()` to parse tokens via `supabase.auth.getSession()` and route cleanly to `#/dashboard` without HashRouter collisions.
- **Access Control & Expired Guest Trial Enforcement (P1):**
  - Updated `OnboardingGuard.tsx` to inspect `isGuestTrialExpired`. If a demo trial has expired (>7 days), the user is forcefully redirected to `/pricing` with zero access to protected dashboard routes.
  - Wrapped `/focus-call/:groupId` and `/meet/:roomId` inside `<OnboardingGuard>` in `src/App.tsx`, preventing unauthenticated visitors from accessing video room interfaces directly.
- **Test Setup Disentanglement:**
  - Fixed a latent mock defect in `src/test/setup.ts` where `window.localStorage` and `window.sessionStorage` referenced the exact same mock store closure. Separated them into independent store instances.

### 3. Automated Validation & Verification
- **Vitest Suite:** 33 test files passed, 182 tests passed, 0 failures.
- **Build Verification:** `npm run build` compiled 26 PWA assets and 0 errors in 19.25s.

---

## [Entry 2026-10-10: Authentication Resilience, Demo Mode Routing & Pricing Uniformity Hardening]

### 1. Context & Objectives
- Eradicate 3 critical user-reported friction bugs:
  1. **Logout & Stale Navbar / Error Page:** After logging out, the navbar still displayed a single "Dashboard" button. Clicking it navigated to an Error Boundary crash instead of cleanly routing to `/login` with unauthenticated actions.
  2. **Demo Mode -> Login Form Lockout:** Users exploring in 7-day Demo Mode trying to sign in or register with real credentials were instantly bounced back to `/dashboard` without ever displaying the login/registration form.
  3. **Subscription Pricing Discrepancies:** Settings subscription panel had hardcoded, conflicting prices ($9/$89, $29/$279, $199) and mismatched quotas compared to the public `/pricing` page and `src/lib/plans.ts` (India PPP ₹199/mo, ₹1,999/yr, Global $9.99/mo, $99.99/yr, 10% commission on Teacher Studio with ₹0 upfront, and ₹2,000 / $49 per student semester for Campus).

### 2. Architectural Decisions
- **Shared Singleton `AuthProvider` & Reactive Synchronization:**
  - Introduced `AuthContext` and `AuthProvider` in `src/hooks/use-auth.ts`, wrapped around `<HashRouter>` inside `src/App.tsx`.
  - Added cross-tab and local reactive synchronization via custom `pps_auth_change` window event and storage event listeners.
  - Rewrote `logout()` with comprehensive cleanup: signs out from Supabase with safe try/catch fallback, removes all guest session keys (`pps_guest`, `pps_guest_name`, `pps_guest_created_at`, `pps_guest_avatar`, `pps_onboarded_guest`, `pps_active_track`), resets user state to `null`, and navigates cleanly to `/login`.
- **Demo Mode to Login Route Decoupling:**
  - In `src/pages/Login.tsx`, updated the auto-redirect gate from `if (!loading && isLoggedIn)` to `if (!loading && isLoggedIn && !user?.isGuest) return <Navigate to="/dashboard" replace />;`.
  - Added active demo session banner on `/login` alerting users they are in 7-day demo mode with an instant "Exit Demo" action.
  - Retained automatic guest data migration (`migrateGuestData(userId)`) upon signing in or registering with real credentials.
- **Navbar Logged-Out State & Clean Routing:**
  - In `src/pages/Home.tsx`, decoupled button rendering using `hasActiveAccount = isLoggedIn && !user?.isGuest`.
  - When logged out, the navbar always renders "Sign In" and "Start Free" (with mobile visibility preserved), completely hiding "Dashboard".
  - In `src/pages/Pricing.tsx` and `src/pages/Roadmap.tsx`, updated hero CTAs and headers to route cleanly to `/` and `/login?tab=signin` when unauthenticated.
- **Subscription Pricing Alignment:**
  - In `src/lib/plans.ts`, synchronized the fallback legacy `PRICING` dictionary to match `REGIONAL_PRICING` ($9.99/mo, $99.99/yr).
  - In `src/components/sections/SettingsSection.tsx`, imported `REGIONAL_PRICING`, `detectUserRegion`, and dynamic billing calculation.
  - Updated Pro Tier to `{symbol}{billingCycle === "monthly" ? pricingConfig.proMonthly : Math.round(pricingConfig.proYearly / 12)} / month` with dynamic yearly savings badge.
  - Updated Teacher Studio to 10% commission, ₹0 upfront, first 5 classes/mo free, linked directly to `/pricing#teacher-calculator`.
  - Updated Campus license to `{symbol}{region === "IN" ? "2,000" : "49"} / student / semester`.
  - Aligned Workspace Role Matrix and quotas (15 habits, 60m focus rooms, 10 AI msgs/day on free tier).

### 3. Automated Validation & Verification
- **Vitest Unit & Integration Test Suites:**
  - 33 test files passed, 181 tests passed, 0 failures.
  - Added `src/test/auth-and-pricing-bugfixes.test.tsx` (5/5 tests passed).
- **Playwright E2E Browser Testing:**
  - 3 spec files (`basic.spec.ts`, `pps.spec.ts`, `auth-and-pricing-bugfixes.spec.ts`), 12 tests passed, 0 failures in Chromium.
  - Verified clean logout flow, demo-to-login form accessibility, navbar link states, and pricing uniformity.
- **Production Bundle:**
  - `npm run build` compiled cleanly into `dist/` with 26 PWA assets precached and zero TypeScript errors.

---

## [Entry 2026-10-10: Sprint 4 — Jules' Onboarding Wizard Audit, Supabase complete_onboarding RPC & Native Polish]

### 1. Context & Objectives
- Audit and integrate Jules' UI branch (`feat/onboarding-wizard-ui`).
- Extend Supabase schema with onboarding attributes, AI personalization telemetry table, and atomic `complete_onboarding` PostgreSQL RPC.
- Wire frontend wizard submit handler to invoke `supabase.rpc('complete_onboarding')`.
- Polish native UX with Capacitor light haptics on card/chip/step interactions, success haptic on launch, and hardware back-button listener.
- Protect application routes using `OnboardingGuard` and mount `TrackPreferenceSelector` under `Settings`.
- Create comprehensive automated integration tests in Vitest and verify 100% test passing before merging into `main`.

### 2. Architectural Decisions
- **Database Schema & AI Telemetry:** Created migration `supabase/migrations/20261010100000_onboarding_wizard_backend.sql` (and synced `COMPLETE_BACKEND_SETUP.sql`). Added `onboarding_completed`, `primary_track`, `track_5_challenge_active`, `daily_focus_target_minutes`, `selected_bottleneck`, `social_mode`, and `onboarding_metadata` to `public.profiles`. Created `public.onboarding_telemetry` audit log with RLS for AI fine-tuning.
- **Atomic RPC (`complete_onboarding`):** Implemented PostgreSQL SECURITY DEFINER RPC that validates track choice, updates profiles & user_settings, logs AI telemetry, seeds starter habits with Track 5 challenge layers, and provisions random 6-character squad invite codes for `create_squad` mode in a single ACID transaction.
- **Frontend Submission & Query Invalidation:** Wired `OnboardingWizard` submit handler to execute `supabase.rpc('complete_onboarding')`, trigger `NotificationType.Success` haptics on native Capacitor, invalidate React Query cache (`['profile']`), and navigate to `/dashboard`.
- **Native Haptics & Back Button:** Bound `@capacitor/haptics` with `ImpactStyle.Light` across track selection, drill chips, bottleneck options, and next/back buttons with web-safe `.catch(() => {})`. Bound `@capacitor/app` back-button listener to step back if `step > 1` and call `App.exitApp()` on `step === 1`.
- **Route Guarding & Settings:** Wired `OnboardingGuard` in `App.tsx` guarding `/onboarding`, `/dashboard`, `/focus-rooms`, `/social`, and `/settings`. Created `src/pages/Settings.tsx` housing the "Active Track & Discipline" section with `TrackPreferenceSelector` updating Supabase `profiles`.
- **Integration Test Suite:** Built `src/components/onboarding/__tests__/OnboardingWizardIntegration.test.tsx` testing the 4-step wizard transitions, Track 5 habit additions, RPC contract verification, and guard redirection across authenticated/unauthenticated states.

### 3. Shipped Files
- `src/types/onboarding.ts`
- `src/constants/onboardingPresets.ts`
- `src/components/onboarding/OnboardingWizard.tsx`
- `src/components/onboarding/ScreenTrackSelection.tsx`
- `src/components/onboarding/ScreenTrackDrill.tsx`
- `src/components/onboarding/ScreenSocialBridge.tsx`
- `src/components/onboarding/ScreenFinalReview.tsx`
- `src/components/onboarding/__tests__/onboarding.test.tsx`
- `src/components/onboarding/__tests__/OnboardingWizardIntegration.test.tsx`
- `src/routes/OnboardingGuard.tsx`
- `src/components/settings/TrackPreferenceSelector.tsx`
- `src/pages/Onboarding.tsx`
- `src/pages/Settings.tsx`
- `src/App.tsx`
- `package.json`
- `supabase/migrations/20261010100000_onboarding_wizard_backend.sql`
- `supabase/COMPLETE_BACKEND_SETUP.sql`
- `docs/DASHBOARD_UX_PROPOSAL.md`
- `docs/DECISION_LOG.md`

### 4. Verification
- **Vite Production Build:** `npm run build` completed in 4.69s with zero errors.
- **Automated Test Suite:** 32/32 suites passing (175/175 tests passing with zero errors).
- **Git Branch Status:** Merged `feat/onboarding-wizard-ui` cleanly into `main`.

---

## [Entry 2026-10-08: Sprint 3 — Capacitor Android Native Build, Safe Areas & Native Haptics]

### 1. Context & Objectives
- Execute Month 1, Week 3 of the launch blueprint.
- Transform PPS into an installed, production-grade Android application with native haptic feedback, safe area compliance, and hardware back-button handling.
- Verify the Android Capacitor build pipeline and assemble the debug APK (`app-debug.apk`).

### 2. Architectural Decisions
- **Capacitor Configuration & Plugins:** Audited `capacitor.config.ts`, setting `appId` to `com.personalperformancesystem.app`, `appName` to `Personal Performance System`, and `webDir` to `dist`. Installed and synced core plugins: `@capacitor/app`, `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/local-notifications`, and `@capacitor/status-bar`.
- **Haptic Feedback Integration:** Integrated `@capacitor/haptics` with `ImpactStyle.Medium` upon habit completion, batch completion (`markAllDone`), focus timer session completion (`use-focus-timer.tsx`), and autonomous time-block completion (`use-vayu.ts`). Wrapped calls with async `.catch(() => {})` for seamless web and Vitest headless fallbacks.
- **Hardware Back Button Handling:** Integrated `App.addListener('backButton')` in `src/App.tsx` via `NativeAppController`. It automatically closes active modals/sheets (via synthetic `Escape` key event dispatch), navigates history back on nested routes, and exits the app when on root views (`/` or `/dashboard`).
- **Safe Area Inset Compliance:** Verified `<meta name="viewport" ... viewport-fit=cover>` in `index.html`. Added `.safe-area-bottom` and updated `.safe-pb` in `src/index.css` to respect `padding-bottom: max(1rem, env(safe-area-inset-bottom))` across mobile navigation docks and drawers.
- **Android Manifest & Build Configuration:** Added `android.permission.VIBRATE` to `android/app/src/main/AndroidManifest.xml`. Configured `applicationId "com.personalperformancesystem.app"` in `android/app/build.gradle` and `strings.xml`. Configured Java 17 compileOptions across subprojects and set `org.gradle.vfs.watch=false` in `gradle.properties` for reliable Windows build execution.

### 3. Shipped Files
- `capacitor.config.ts`
- `package.json`
- `src/App.tsx`
- `src/hooks/use-habits.tsx`
- `src/hooks/use-focus-timer.tsx`
- `src/hooks/use-vayu.ts`
- `src/index.css`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/res/values/strings.xml`
- `android/app/build.gradle`
- `android/build.gradle`
- `android/gradle.properties`
- `docs/DECISION_LOG.md`

### 4. Verification
- **Vite Production Build:** `npm run build` completed in 4.97s with zero errors.
- **Capacitor Android Sync:** `npx cap sync android` successfully synchronized web assets and all 5 native plugins.
- **Gradle Android Assemble:** `./gradlew assembleDebug` assembled `app-debug.apk` (6.69 MB) with `BUILD SUCCESSFUL`.
- **Automated Test Suite:** 30/30 suites passing (158/158 tests passing in 27.20s with zero errors).

---

## [Entry 2026-10-08: Sprint 2 — Monetization Wiring & Database Performance Indexing]

### 1. Context & Objectives
- Execute Month 1, Week 2 of the launch blueprint.
- Eliminate the dormant billing stub in `use-subscription.tsx` and wire live checkout sessions via Supabase Edge Function `create-checkout-session` into Stripe.
- Add compound database performance indexes across high-traffic tables to prevent full-table scans.
- Provide DPDP / GDPR compliant account deletion RPC (`delete_user_account`).

### 2. Architectural Decisions
- **Live Checkout Wiring:** Replaced early-access toast stub in `use-subscription.tsx` with authentic `supabase.functions.invoke('create-checkout-session')` call. On response, redirects to `data.url` with seamless sonner toast states. Supported both monthly and annual price intervals with environment variable fallbacks.
- **Performance Indexing:** Created migration `20261008120000_performance_indexes.sql` adding compound indexes:
  - `idx_habits_user_active` on `habits(user_id, is_active)`
  - `idx_habits_user_archived` on `habits(user_id, archived)`
  - `idx_habit_completions_user_date` on `habit_completions(user_id, completed_date)`
  - `idx_habit_logs_user_date` on `habit_logs(user_id, completed_date)`
  - `idx_vayu_daily_plans_user_date` on `vayu_daily_plans(user_id, plan_date)`
  - `idx_squad_messages_room_created` on `squad_messages(room_id, created_at DESC)`
  - `idx_channel_messages_group_created` on `channel_messages(group_id, created_at DESC)`
- **DPDP / GDPR Compliance:** Implemented `delete_user_account()` `SECURITY DEFINER` Postgres function that authoritatively takes `auth.uid()` and cascade purges all user data across all tables and `auth.users`.
- **Vitest Windows Resilience:** Configured `pool: "forks"` in `vitest.config.ts` to prevent worker IPC timeouts.

### 3. Shipped Files
- `src/hooks/use-subscription.tsx`
- `src/pages/Pricing.tsx`
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/migrations/20261008120000_performance_indexes.sql`
- `supabase/COMPLETE_BACKEND_SETUP.sql`
- `vitest.config.ts`

### 4. Verification
- **Build Status:** `npm run build` completed with zero TypeScript errors.
- **Test Suite Status:** 30/30 suites passing (158/158 tests passing).

---

## [Entry 2026-10-08: Sprint 1 — Security Remediation & Navigation Pruning]

### 1. Context & Objectives
- Remediate SEC-001 (Edge Function CORS wildcard) and SEC-002 (JWT authentication bypass in checkout).
- Prune unreleased modules (Video Rooms, Whiteboard, Teacher Marketplace) behind a central feature flag configuration.
- Clean residual hardcoded regex in `vayuPlanner.ts`.

### 2. Architectural Decisions
- Restrict CORS in all 6 Edge Functions to allowed domains: `https://jayadeep-koundinya-r.github.io`, `http://localhost:5173`, `capacitor://localhost`, `http://localhost`.
- Authoritative user JWT extraction in `create-checkout-session/index.ts` via `supabase.auth.getUser(token)`.
- Central feature flag repository `src/config/features.ts` with `ENABLE_VIDEO_ROOMS: false`, `ENABLE_WHITEBOARD: false`, and `ENABLE_TEACHER_MARKETPLACE: false`.

---

## [Entry 2026-10-06: Unfiltered 360° Executive Reality Audit]

### 1. Context & Objectives
- Conduct a brutally honest 6-part executive-level audit across the entire PPS codebase, treating it as a VC due-diligence exercise.
- Benchmark PPS against market leaders (Habitica, Forest, Notion, Opal, One Sec) with verifiable feature-by-feature comparison.
- Produce investor-grade technical maturity scorecard, security posture audit, monetization readiness assessment, and 90-day critical path.

### 2. Key Findings
- **Competitor Benchmark:** PPS is the only product combining habit engine + AI planner + focus timer + social squads + video rooms. Genuine differentiation exists, but 0 users vs. competitors' millions.
- **Technical Maturity:** 7/10 Code Quality, 8/10 Architecture, 5/10 Security, 3/10 DevOps. Strong engineering for a solo developer; weak on operational readiness.
- **Security Gaps Identified:** 2 CRITICAL (CORS wildcard, JWT bypass in checkout), 2 HIGH (no CSP, no server-side rate limiting), 3 MEDIUM.
- **Monetization:** Complete Stripe billing stack exists in edge functions but is functionally dormant — `startCheckout` returns null.
- **Launch Verdict:** NOT READY. 4 launch blockers identified (billing, mobile, CORS, beta testers).

### 3. Shipped Files
- `docs/EXECUTIVE_REALITY_AUDIT.md`: Complete 6-part audit covering competitor benchmark, technical deep dive, security posture, monetization readiness, investor scorecard, and go-to-market plan.

### 4. Test Verification
- **Test Suite Status:** 30/30 Test Suites Passing (158 Tests Total, 0 Failures).
- **Duration:** 59.15s total runtime.

### 5. Critical Next Action
- **Fix SEC-001 (CORS) and SEC-002 (JWT bypass)** before any user-facing deployment. These are non-negotiable security blockers.
- **Ship to 10 real users this month.** The codebase is technically ready; the product has never been tested by a real user.

---

## [Entry 2026-10-05: Strict Architectural Audit & Roadmap Commitment]

### 1. Context & Objectives
- Conduct a zero-placeholder architectural audit across all 11 repository subsystems.
- Categorize every feature into `[PRODUCTION-READY]`, `[CLIENT-SIDE MOCK/PARTIAL]`, or `[SECURITY RISK/BROKEN]`.
- Enforce DOMPurify sanitization and eliminate hardcoded regex from the Vayu natural language parser.
- Establish the 6-Month 5-Phase Product Roadmap (`Agni` ➔ `Vayu` ➔ `Prana` ➔ `Tejas` ➔ `Akash`) and commit the daily 4-hour learning/building split.

### 2. Architectural Decisions
- **Decision 1 (Intent Parsing Audit):** Eliminated hardcoded completion regex in `vayuPlanner.ts`. Connected directly to the Phase 1 local classifier (`classifyIntent`) and integrated semantic token overlap (`findBestTokenMatch`) with low-confidence fallback to the Supabase Gemini edge function.
- **Decision 2 (DOMPurify Standard):** Wrapped DOMPurify into `src/lib/security.ts` as the mandatory sanitization boundary before writing any user-generated text to state or Supabase.
- **Decision 3 (Zero Speculative UI):** Freezed new speculative frontend components until every existing engine's runtime wiring, database schemas, and offline failure modes are comprehensively verified and documented.

### 3. Shipped Files & Code Modifications
- `docs/FEATURE_AUDIT.md`: Complete zero-placeholder audit of all 11 PPS engines.
- `docs/DECISION_LOG.md`: Daily engineering decision tracking initialized.
- `docs/ROADMAP_6_MONTH.md`: 5-phase roadmap and 4-hour daily learning/building split committed.
- `src/lib/security.ts`: Enhanced with `sanitizeWithDOMPurify` and deep object sanitization.
- `src/lib/vayu/vayuPlanner.ts`: Audited to eliminate hardcoded regex, connected to Phase 1 intent classifier and Gemini edge function fallback.
- `src/hooks/use-vayu.ts`: Updated to enforce DOMPurify before state mutations and Supabase upserts.
- `src/lib/vayu/__tests__/vayu-planner.test.ts`: Added test cases for Phase 1 classifier parsing, edge fallback, and DOMPurify sanitization.

### 4. Test Verification
- **Test Suite Status:** 30/30 Test Suites Passing (158 Tests Total, 0 Failures).
- **Core Suites Verified:**
  - `src/lib/vayu/__tests__/vayu-planner.test.ts` (7 tests passing)
  - `src/hooks/__tests__/use-vayu.test.ts` (4 tests passing)
  - `src/lib/__tests__/security.test.ts` (5 tests passing)
  - `src/hooks/__tests__/daily-video-room.test.ts` (4 tests passing)
  - `src/test/e2e-user-journey.test.tsx` (Integration user journey passing)
- **Production Build:** `vite build` completed cleanly in under 20s with 0 bundle errors.

### 5. Blockers & Mitigation
- **Blocker 1 (WebRTC Mesh NAT Traversal):** Direct peer-to-peer WebRTC mesh lacks dedicated TURN servers, causing connection failures across symmetric NATs or corporate firewalls.
  - *Remediation:* Daily.co managed video calling wrapper implemented; next step is provisioning managed Daily.co credentials or LiveKit instance in Phase 3 (Prana).
- **Blocker 2 (Stripe/UPI Checkout Dormant):** Marketplace and Pro upgrade buttons display early-access modal without live payment webhooks.
  - *Remediation:* Scheduled for Phase 4 (Tejas) implementation with Supabase Edge Functions and Stripe / Razorpay webhooks.

---

## [Entry 2026-10-04: Vayu Launch Elevation & DOMPurify Security Hardening]

### 1. Context & Objectives
- Elevate PPS from manual button-driven habit management to autonomous real-time flow (Vayu Launch).
- Implement dynamic daily scheduling, focus timer auto-completion, and natural language input intake.

### 2. Architectural Decisions
- Created `vayu_daily_plans` table with Row Level Security (RLS) and realtime publication in Supabase.
- Developed `useVayu` reactive hook with 15-second ambient heartbeat to detect active time-blocks against system clock.
- Linked Pomodoro timer completion (`pps_focus_session_completed` custom window event) to auto-complete active Vayu blocks and award XP without manual clicks.
- Integrated `VayuPulseBanner` glassmorphic HUD into `DashboardSection.tsx`.

---

## [Entry 2026-08-24: Agni Launch Stabilization & Truth-in-Features Audit]

### 1. Context & Objectives
- Stabilize core habit engine, streak protection, XP progression, and multi-user study squads.
- Eliminate false celebrations on hydration/page refresh.

### 2. Architectural Decisions
- Fixed hydration gating in `use-habits.tsx` to prevent premature confetti celebrations on initial login.
- Integrated unique 6-character study squad invite codes and Postgres Realtime message delivery.
- Replaced mocked syllabus parsing with client-side NLP keyword parser in `syllabusParser.ts`.
