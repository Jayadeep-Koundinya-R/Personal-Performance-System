# 🎯 PPS Version Roadmap (v0.5 → v0.9): From Prototype to Real Working Loop

> **Core Mandate:** Stop adding features. Stop marketing unbuilt modules. One working daily loop with authentic authentication and multi-device sync before any further UI chrome.

---

## The Version Milestones

| Version | Milestone Name | Objective | Status |
|:---|:---|:---|:---|
| **v0.5** | **Auth Truth** | Remove fake `@pps.local` logins; real Supabase email auth; guest strictly labeled as local demo with no fake Pro; single onboarding flag. | 🔄 IN PROGRESS |
| **v0.6** | **Data Truth** | Signed-in user data stored in Supabase only; multi-device habit sync (phone sees PC habits); guest data stays local until account creation. | ⏳ QUEUED |
| **v0.7** | **Surface Clean-Up** | Hide unbuilt features (marketplace, video rooms, whiteboard); remove fake AI/leaderboard bots; align UI with real capabilities. | ⏳ QUEUED |
| **v0.8** | **Focused Daily Loop UI** | Fast habit check-off in under 10 seconds; clean mobile ergonomics at 390px; reduce visual noise and excess overlays. | ⏳ QUEUED |
| **v0.9** | **Closed Beta Ready** | Public deploy URL (Vercel/Pages); 5–10 real friends testing for 7 consecutive days; zero localStorage sync confusion. | ⏳ QUEUED |

---

## 🛠️ v0.5 Implementation Checklist (Auth Truth)

- [ ] **Task 0.5.1:** Remove `TEST_ACCOUNTS` array and 1-click fake login buttons from `src/pages/Login.tsx`.
- [ ] **Task 0.5.2:** Delete the `@pps.local` mock login handler in `Login.tsx` and enforce genuine Supabase `signInWithPassword` and `signUp`.
- [ ] **Task 0.5.3:** Ensure Guest Mode is strictly labeled as "Local Demo (This Device Only)" and never sets `pps_plan=pro` in `localStorage`.
- [ ] **Task 0.5.4:** Simplify onboarding checks in `OnboardingGuard.tsx` to read the single authoritative database/profile flag (`onboarding_completed`), eliminating multi-key race conditions.
- [ ] **Task 0.5.5:** Author Vitest verification suite in `src/pages/__tests__/auth-truth-v0.5.test.ts` verifying real auth flows and zero test account bypasses.
