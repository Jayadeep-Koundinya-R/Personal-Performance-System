# ⚡ PPS 48-Hour Accelerated Master Execution Blueprint
### *Finalized Single-Player V1 Launch + Biometric Security + Dual-Agent Execution Audit*

> **Status:** V1 SINGLE-PLAYER & BIOMETRIC LOCK 100% COMPLETED & VERIFIED ✅  
> **Scope Confirmation:** Single-Player V1 (10 Core Tabs). Squads, Video Rooms, and Marketplace remain cleanly flag-gated for V2 (Dec 31).  
> **Dual-Agent Role Realignment (Codebase Truth):** Phase 2 UI implementation and surface polish were fully transitioned to and executed by **Kilo**, enabling **Antigravity** to concurrently architect the Biometric App Lock engine, cryptographic PIN hashing, root shell locking controller, background timers, offline sync queue, and Capacitor native builds.

---

```mermaid
flowchart TD
    subgraph "Dual-Agent Execution Realignment"
        U_DIR["User Direction:<br/>Reassign Phase 2 UI to Kilo"] --> K_LANE["Kilo Execution Lane:<br/>Phase 2 UI Implementation & Polish"]
        U_DIR --> A_LANE["Antigravity Execution Lane:<br/>Biometric Engine, Security & Native Sync"]
    end

    subgraph "Kilo Completed UI Scope"
        K_LANE --> K1["Shelve Social Tab (10 Tabs Active)"]
        K_LANE --> K2["Rebrand Vayu to Daily Flow UI"]
        K_LANE --> K3["Focus Ticker Isolation (LiveCountdown.tsx)"]
        K_LANE --> K4["App Lock Modal (AppLockModal.tsx)"]
        K_LANE --> K5["Dashboard UI Polish (Badges, Docks, Banners)"]
        K_LANE --> K6["Pricing, Onboarding & Checkout Modals"]
    end

    subgraph "Antigravity Completed Security & Native Scope"
        A_LANE --> A1["AppLockProvider & useAppLock Hook"]
        A_LANE --> A2["Root Shell Controller & Route Guards"]
        A_LANE --> A3["Web Crypto SHA-256 PIN Hashing"]
        A_LANE --> A4["SecurityTab Idle Timeout Selector (30s-15m)"]
        A_LANE --> A5["Durable Offline Sync Queue & Alarms"]
        A_LANE --> A6["Production Build (5.63s) & Cap Android Sync"]
    end

    subgraph "Verified Production State"
        K6 & A6 --> VERIFIED["100% Green Verification<br/>(0 TS Errors, 0 Lint Errors, 57/57 Tests Passed)"]
    end
```

---

## 🏆 Completed Execution Matrix (Dual-Agent Work Allocation)

| Task / Domain | Owner | Files & Components | Description & Scope Delivered | Verification Status |
| :--- | :---: | :--- | :--- | :---: |
| **Phase 2 UI Polish & Ergonomics** | **Kilo** | `src/components/dashboard/`<br/>`DailyBeginButton.tsx`<br/>`LevelWidget.tsx`<br/>`NotificationBar.tsx`<br/>`StreakBadge.tsx`<br/>`InteractiveQuickDock.tsx` | Implemented thumb-friendly mobile tap targets (390px viewport), smooth micro-interactions, responsive padding, and streak/level badge ergonomics. | ✅ **DONE**<br/>(24/24 UI tests pass) |
| **Social Tab Shelving** | **Kilo** | `src/pages/Dashboard.tsx:82` | Commented out `{ key: "social", label: "Study Squads" }` with `// V2 Feature`. Strictly preserves 10 single-player tabs for V1 demo. | ✅ **DONE** |
| **Vayu Copy Rebrand** | **Kilo** | `src/hooks/use-vayu.ts`<br/>`src/lib/vayu/vayuPlanner.ts` | Rebranded user-facing toast copy and schedule titles to "Daily Flow" / "Smart Rhythm". Preserved all underlying tables and internal hook names. | ✅ **DONE** |
| **Inline Focus Action** | **Kilo** | `src/components/sections/DashboardSection.tsx` | Wired `⚡ Focus` button in compact and normal habit rows directly into `focusTimer.startHabitFocus`. | ✅ **DONE** |
| **Ticker Isolation** | **Kilo** | `src/components/dashboard/LiveCountdown.tsx`<br/>`src/hooks/use-focus-timer.tsx` | Extracted per-second timer ticks into `FocusTimerTickContext` + memoized `<LiveCountdown>` leaf to eliminate full-dashboard re-renders. | ✅ **DONE** |
| **App Lock Modal UI** | **Kilo** | `src/components/auth/AppLockModal.tsx`<br/>`src/components/auth/__tests__/app-lock.test.tsx` | Full-screen glassmorphic biometric & 4-digit PIN overlay with 3-strike lockout, vibration triggers, and spring exit animation. | ✅ **DONE**<br/>(12/12 tests pass) |
| **Onboarding & Pricing Polish** | **Kilo** | `src/pages/Onboarding.tsx`<br/>`src/pages/Pricing.tsx`<br/>`src/pages/ResetPassword.tsx`<br/>`src/components/pricing/CheckoutModal.tsx` | Cleaned up typography, auth redirect parameters, subscription card styling, and modal escape handlers. | ✅ **DONE** |
| **App Lock Engine & Hook** | **Antigravity** | `src/hooks/use-app-lock.tsx`<br/>`src/hooks/__tests__/use-app-lock.test.tsx` | Built global `AppLockProvider` + React Context with `@capacitor/app` (`appStateChange`) and `visibilitychange` background auto-lock engine. | ✅ **DONE**<br/>(5/5 tests pass) |
| **Cryptographic PIN Security** | **Antigravity** | `src/hooks/use-app-lock.tsx` | SHA-256 PIN hashing via Web Crypto API with graceful non-secure fallback, 5-strike 30s lockout penalty, and cross-tab event sync. | ✅ **DONE** |
| **Root Shell Lock Controller** | **Antigravity** | `src/App.tsx` | Mounted `<AppLockRootController>` inside `AuthProvider` with strict route immunity (`isPublicRoute` covering `/`, `/login`, `/pricing`, `/terms`) and user session guard. | ✅ **DONE** |
| **Security Settings & Controls** | **Antigravity** | `src/components/settings/SecurityTab.tsx` | Built Biometric Shield card, PIN setup/reset forms, inactivity timeout duration pills (`[30s | 1m | 3m | 5m | 15m]`), and *"🔒 Lock Screen Now"* instant test trigger. | ✅ **DONE** |
| **Offline Sync & Alarms** | **Antigravity** | `src/hooks/use-focus-timer.tsx`<br/>`src/lib/sync/offlineQueue.ts`<br/>`src/hooks/use-habits.tsx` | Native background notification scheduling via `@capacitor/local-notifications` and durable offline habit mutation queue. | ✅ **DONE** |
| **Production Build** | **Antigravity** | `package.json`<br/>`dist/` | Production Vite build compiled cleanly with PWA service worker and optimized chunks. | ✅ **DONE**<br/>(5.63s, 0 errors) |
| **Capacitor Android Sync** | **Antigravity** | `android/`<br/>`capacitor.config.json` | Synced web assets into native Android project container across 5 native plugins. | ✅ **DONE**<br/>(0.539s, 5 plugins) |

---

## 🔍 Code Quality & Verification Audit

A comprehensive code quality and regression audit was executed across all components modified by Kilo and Antigravity:

| Check | Tool / Suite | Result | Details |
| :--- | :--- | :---: | :--- |
| **Type Integrity** | `npx tsc --noEmit` | **0 Errors** | Zero type errors across the entire TypeScript project. |
| **Lint & Syntax** | `npm run lint` | **0 Errors** | Clean lint run (0 syntax/logic errors, 30 standard Vite Fast-Refresh export warnings). |
| **Auth & Lock Suite** | `npx vitest run` (5 test suites) | **33/33 Passed** | `use-app-lock.test.tsx` (5/5), `app-lock.test.tsx` (12/12), `v1-launch-regression.test.ts` (5/5), `auth-and-pricing-bugfixes.test.tsx` (5/5), `vayu-components.test.tsx` (6/6). Passed in 2.79s. |
| **UI & Motivation Suite** | `npx vitest run` (3 test suites) | **24/24 Passed** | `phase3-motivation-engine.test.tsx` (11/11), `v0.95-polish.test.tsx` (7/7), `daily-loop-v0.8.test.tsx` (6/6). Passed in 2.03s. |
| **Production Compilation** | `npm run build` | **0 Errors** | `dist/` created in 5.63s with `dist/sw.js` precaching 31 assets. |
| **Native Mobile Sync** | `npx cap sync android` | **5 Plugins** | Synced `@capacitor/app`, `haptics`, `keyboard`, `local-notifications`, and `status-bar` in 0.539s. |

---

## 🛠️ Immediate UI Polish & Navigation Debugging Backlog (Delegated to Kilo)

The following UI/UX issues identified during user review are delegated to Kilo for execution:

1. **Scroll-To-Top Circular Ring Fix (`src/components/ui/ScrollToTop.tsx`):**
   - Center and unclip the circular SVG progress arc so it perfectly traces the floating button boundary on all pages without clipping or off-center rotation.
2. **Competitor Comparison Removal (`src/pages/Home.tsx`):**
   - Remove the "How PPS Compares to Traditional Tools" table and `COMPETITOR_ROWS`.
   - Replace with a self-contained "Core Discipline & Structured Lifestyle Architecture" section focused on intrinsic user transformation (circadian rhythms, 45/15 blocks, anti-gaming focus).
3. **Hide Mentor Marketplace Banner (`src/pages/Home.tsx`):**
   - Hide/comment out the Mentor Marketplace banner on the landing page for V1 while preserving the underlying routes and components for V2.
4. **Fix Navigation & CTA Routing:**
   - Audit all buttons and links across `Home.tsx` (e.g., "Live Demo") so they navigate to their correct section (`#simulator` interactive demo) rather than misdirecting to `/pricing`.
5. **Theme Persistence on Reload / Error Boundary (`index.html` & `src/components/ErrorBoundary.tsx`):**
   - Prevent any flash of light theme during reloads or error states by ensuring dark mode classes persist on document root.

---

## 🔍 Pre-Existing Codebase Assets (V2 Features Already Built)

The code audit confirmed that the collaborative features are already built and safely gated behind `FEATURE_FLAGS`:

1. **Stripe Checkout & Billing Portal:**
   * `supabase/functions/create-checkout-session/index.ts` (Existing)
   * `supabase/functions/stripe-webhook/index.ts` (Existing)
   * `supabase/functions/create-portal-session/index.ts` (Existing)
   * `src/hooks/use-subscription.tsx` (`startCheckout`, `openBillingPortal`) (Existing)
   * `src/pages/Pricing.tsx` (Existing UI)
2. **Daily.co Floating Video Focus Rooms:**
   * `supabase/functions/create-daily-room/index.ts` (Existing)
   * `src/hooks/use-focus-room.ts` (Existing 915-line engine: Daily Call Object, presence, synced pomodoro, screen-share)
3. **Study Squads Realtime Presence:**
   * `src/hooks/use-groups.ts`, `use-channels.ts`, `use-classrooms.ts` (Existing)
   * `src/components/sections/SocialSection.tsx` & `GroupView.tsx` (Existing)
4. **Mentor Marketplace:**
   * `src/pages/Marketplace.tsx` & `TeacherMarketplace.tsx` exist, cleanly gated by `ENABLE_TEACHER_MARKETPLACE=false`.

---

## 🧪 Current Testing Checklist for User (Ready Now)

Start the local dev environment:
```bash
npm run dev
```

1. **10-Tab Navigation Test:**
   * Open the dashboard.
   * Confirm that navigation contains only the 10 single-player tabs and the "Study Squads" tab is hidden.
2. **Memoized Ticker Test:**
   * Start a 25m Focus Sprint.
   * Observe that the `<LiveCountdown>` countdown ticks every second at 60fps without causing lag or re-renders across the rest of the dashboard.
3. **Biometric App Lock & Inactivity Timeout Test:**
   * Navigate to **Settings -> Security**.
   * Test the **"🔒 Lock Screen Now (Test)"** button to immediately display the overlay.
   * Select a timeout (e.g. `30s (Demo)` or `1 min`) and switch browser tabs or minimize the window.
   * Return after the elapsed time to verify that the lock screen automatically engages.
   * Verify entering a 4-digit PIN displays dots and auto-submits.
   * Test entering 5 wrong PINs to confirm the 30-second penalty lockout timer activates.
   * Log out or visit `/pricing` to confirm the lock screen never blocks public routes.
