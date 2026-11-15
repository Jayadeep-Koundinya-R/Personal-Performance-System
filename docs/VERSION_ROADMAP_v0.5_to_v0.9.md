# 🎯 PPS Version Roadmap (v0.5 → v0.9): From Prototype to Real Working Loop

> **Core Mandate:** Stop adding features. Stop marketing unbuilt modules. One working daily loop with authentic authentication and multi-device sync before any further UI chrome.

---

## The Version Milestones

| Version | Milestone Name | Objective | Status |
|:---|:---|:---|:---|
| **v0.5** | **Auth Truth** | Remove fake `@pps.local` logins; real Supabase email auth; guest strictly labeled as local demo with no fake Pro; single onboarding flag. | ✅ COMPLETED |
| **v0.6** | **Data Truth** | Signed-in user data stored in Supabase only; multi-device habit sync (phone sees PC habits); guest data stays local until account creation. | ✅ COMPLETED |
| **v0.7** | **Surface Clean-Up** | Hide unbuilt features (marketplace, video rooms, whiteboard); remove fake AI/leaderboard bots; align UI with real capabilities. | 🔄 NEXT UP |
| **v0.8** | **Focused Daily Loop UI** | Fast habit check-off in under 10 seconds; clean mobile ergonomics at 390px; reduce visual noise and excess overlays. | ⏳ QUEUED |
| **v0.9** | **Closed Beta Ready** | Public deploy URL (Vercel/Pages); 5–10 real friends testing for 7 consecutive days; zero localStorage sync confusion. | ⏳ QUEUED |

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

## 🛠️ v0.7 Implementation Checklist (Surface Clean-Up) — 🔄 NEXT UP

- [ ] **Task 0.7.1:** Audit sidebar navigation and route registry to hide unbuilt / speculative features (Marketplace, Daily Video Rooms, Collaborative Whiteboard) behind feature flags or clean "Coming Soon" badges.
- [ ] **Task 0.7.2:** Clean fake/simulated leaderboard and social activity feeds so only real user activity is rendered.
- [ ] **Task 0.7.3:** Ensure all visible UI buttons in core screens map to working endpoints or real workflows.
- [ ] **Task 0.7.4:** Add verification tests for clean navigation surfaces and zero mock bots.
