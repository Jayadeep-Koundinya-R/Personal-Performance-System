# 🎯 PPS Version Roadmap (v0.5 → v1.1): From Prototype to Real Working Loop

> **Core Mandate:** Stop adding features. Stop marketing unbuilt modules. One working daily loop with authentic authentication and multi-device sync before any further UI chrome.

---

## The Version Milestones

| Version | Milestone Name | Objective | Status |
|:---|:---|:---|:---|
| **v0.5** | **Auth Truth** | Remove fake `@pps.local` logins; real Supabase email auth; guest strictly labeled as local demo with no fake Pro; single onboarding flag. | ✅ COMPLETED |
| **v0.6** | **Data Truth** | Signed-in user data stored in Supabase only; multi-device habit sync (phone sees PC habits); guest data stays local until account creation. | ✅ COMPLETED |
| **v0.7** | **Surface Clean-Up** | 5-day demo trial with persistent sign-in alerts; universal 3D Aurora Mesh; remove dashboard atom; badge unbuilt modules; zero mock bots. | ✅ COMPLETED |
| **v0.8** | **Focused Daily Loop UI** | Fast habit check-off in under 10 seconds; clean mobile ergonomics at 390px; reduce visual noise and excess overlays. | ✅ COMPLETED |
| **v0.9** | **Closed Beta Ready** | Production build audit & chunk splitting; unclipped scroll progress ring; tactile 3D geometric glass objects; 7-day tester protocol. | ✅ COMPLETED |
| **v1.0** | **General Availability** | Production telemetry, error tracking, Stripe/Razorpay live checkout, native PWA offline sync. | 🔄 NEXT UP |
| **v1.1** | **Multi-Account Social P2P & Group Messaging** | WhatsApp-style 1-on-1 direct messaging, encrypted conversation threads, message delivery receipts, and peer-to-peer accountability rooms between distinct user accounts. | ⏳ DEDICATED MILESTONE |

---

## 🛠️ v0.5 Implementation Checklist (Auth Truth) — ✅ COMPLETED

- [x] **Task 0.5.1:** Remove `TEST_ACCOUNTS` array and 1-click fake login buttons from `src/pages/Login.tsx`.
- [x] **Task 0.5.2:** Delete the `@pps.local` mock login handler in `Login.tsx` and enforce genuine Supabase `signInWithPassword` and `signUp`.
- [x] **Task 0.5.3:** Ensure Guest Mode is strictly labeled as "Local Demo (This Device Only)" and never sets `pps_plan=pro` in `localStorage`.
- [x] **Task 0.5.4:** Simplify onboarding checks in `OnboardingGuard.tsx` to read the single authoritative database/profile flag (`onboarding_completed`), eliminating multi-key race conditions.
- [x] **Task 0.5.5:** Author Vitest verification suite in `src/pages/__tests__/auth-truth-v0.5.test.ts` verifying real auth flows and zero test account bypasses.

---

## 🛠️ v0.6 Implementation Checklist (Data Truth & Habit Sync) — ✅ COMPLETED

- [x] **Task 0.6.1:** Inspect and harden `src/hooks/use-habits.tsx` to ensure signed-in users load and mutate habits directly against Supabase tables (`habits`, `habit_completions`), completely isolated from `localStorage`.
- [x] **Task 0.6.2:** Restrict default/seed demo habits (`demo-1`, `demo-2`, `demo-3`) to guest/unauthenticated sessions only; new registered users start with an authentic empty state with 1-click starter stack option.
- [x] **Task 0.6.3:** Verify multi-device sync flow: Realtime postgres changes channel and tab focus / visibility-change listeners automatically refresh habits across devices (phone, desktop, tablet).
- [x] **Task 0.6.4:** Upgrade guest-to-account migration: skips untouched stock demo habits while seamlessly syncing custom and completed habits into Supabase, followed by storage cleanup.
- [x] **Task 0.6.5:** Author comprehensive Vitest suite in `src/hooks/__tests__/data-truth-v0.6.test.tsx` (7/7 tests passing) verifying database isolation, empty state, realtime sync, focus refresh, and migration filters.
- [x] **Task 0.6.6:** Author Supabase migration `20261115120000_v06_data_truth_habits_sync.sql` establishing focus/circadian columns, `REPLICA IDENTITY FULL`, and performance indexes.

---

## 🛠️ v0.7 Implementation Checklist (Surface Clean-Up) — ✅ COMPLETED

- [x] **Task 0.7.1:** Removed distracting rotating atom / gyroscope from the dashboard, replacing it with an unobstructed ambient header glow.
- [x] **Task 0.7.2:** Applied universal, modern 3D Aurora Mesh & Prismatic Glass background across all screens with smooth mouse parallax depth tilt.
- [x] **Task 0.7.3:** Adjusted demo trial duration from 7 days down to 5 days (`TRIAL_DURATION_DAYS = 5`).
- [x] **Task 0.7.4:** Configured persistent demo conversion banner with interactive goal check-in questions ("What is your primary goal for this trial?") and 1-click Google/Email sign-in prompts.
- [x] **Task 0.7.5:** Transparently badged unbuilt modules (`FEATURE_FLAGS`): Educator & Mentor Marketplace badged as "Coming Soon in v1.0", zero fake bot users in leaderboards.
- [x] **Task 0.7.6:** Author verification tests for 5-day trial duration, demo check-in, and clean surfaces.

---

## 🛠️ v0.8 Implementation Checklist (Focused Daily Loop UI) — ✅ COMPLETED

- [x] **Task 0.8.1:** Ensure habit completion check-off interaction completes in under 10 seconds without modal friction (optimistic state updates, haptic/sound chimes, 2m micro-habit fast paths).
- [x] **Task 0.8.2:** Perfect mobile ergonomics at 390px viewport width (thumb-friendly tap targets with `min-w-[44px]` checkboxes, `min-h-[40px]` Quick Dock buttons, `touch-manipulation` for zero click latency, responsive mobile label truncation).
- [x] **Task 0.8.3:** Reduce visual noise and excess overlays on dashboard load (session-persistent morning ritual dismissal, strict 5-day guest trial sync).
- [x] **Task 0.8.4:** Audit and verify all core action buttons have active event handlers (Quick Sprint, Ambient Audio, AI Agent, Zen Mode, 2m Micro, Parkinson's Slicer, Rest Day).
- [x] **Task 0.8.5:** Author Vitest verification suite in `src/pages/__tests__/daily-loop-v0.8.test.tsx` (6/6 tests passing) verifying rapid check-off, micro-habits, mobile touch targets, ritual session dismissal, and 5-day guest duration.

---

## 🛠️ v0.9 Implementation Checklist (Closed Beta Ready) — ✅ COMPLETED

- [x] **Task 0.9.1:** Production build audit (`npm run build`) with zero chunk size warnings via Rolldown functional `manualChunks` optimization (separate chunks for `vendor`, `ui`, `charts`, `motion`, `pdf`, `supabase`, `icons`).
- [x] **Task 0.9.2:** Environment variable hardening and universal export of `TRIAL_DURATION_DAYS = 5` in `src/hooks/use-auth.ts`, dynamically powering all auth screens and trial modals with zero hardcoded strings.
- [x] **Task 0.9.3:** Fixed scroll-to-top button circular progress clipping (`src/components/ui/ScrollToTop.tsx`) with dedicated 52x52 SVG `viewBox="0 0 52 52"` and `overflow-visible`.
- [x] **Task 0.9.4:** Attached authentic 3D isometric geometric objects (Prismatic Glass Cube, Concentric Cyber Torus Ring, and Faceted Pyramidal Octahedron) in `src/components/ui/ThreeDBackground.tsx` with hardware-accelerated 3D mouse parallax tracking (`perspective(1000px)`).
- [x] **Task 0.9.5:** Authored 7-day multi-device testing protocol documentation in `docs/CLOSED_BETA_TESTING_PROTOCOL.md` for initial 5–10 beta testers.
- [x] **Task 0.9.6:** Authored Vitest verification suite in `src/pages/__tests__/closed-beta-v0.9.test.ts` (3/3 tests passing).

---

## 🛠️ v1.0 Implementation Checklist (General Availability) — 🔄 NEXT UP

- [ ] **Task 1.0.1:** Production telemetry & Sentry/PostHog error logging integration.
- [ ] **Task 1.0.2:** Stripe/Razorpay live production checkout webhook handlers.
- [ ] **Task 1.0.3:** PWA Service Worker offline fallback validation.

---

## 🛠️ v1.1 Milestone Specification (Multi-Account Social P2P & Group Messaging) — ⏳ DEDICATED MILESTONE

- **Objective:** Enable authentic two-way communication between distinct user accounts (like WhatsApp 1-on-1 direct messaging and squad chat rooms).
- **Core Architecture Required:**
  1. **Database Schema:**
     - `conversations` table: `id`, `type` (`direct` | `group`), `created_by`, `created_at`.
     - `conversation_participants` table: `conversation_id`, `user_id`, `joined_at`, `last_read_at`.
     - `direct_messages` table: `id`, `conversation_id`, `sender_id`, `content`, `message_type`, `created_at`.
  2. **Security & RLS:**
     - Row Level Security policies ensuring only confirmed participants can SELECT, INSERT, or listen to message channels.
  3. **Realtime Presence & Receipts:**
     - Supabase Realtime broadcast channels for typing indicators, online presence, and delivery/read receipts.
  4. **Isolation:**
     - Kept strictly decoupled from single-user habit tracking so the core habit loop remains lightweight and ultra-fast.
