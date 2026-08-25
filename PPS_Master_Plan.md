# PPS (Personal Performance System) — Master Plan & Status Document

> **Purpose of this document:** A single source of truth for Jayadeep, Claude, and AG (Antigravity) to stay in sync. Update this every time something is completed, fixed, or decided. Reopen this anytime instead of scrolling back through old chats.

**Last updated:** August 21, 2026  
**Decision on payments:** Real payments delayed until closer to launch (test mode only when we do activate it — no real charges risk).  
**Decision on plan limits:** NOT enforced yet — deliberately delayed until users have built trust in the product first.  

---

## 0. THE LAUNCH ROADMAP — NAMING & PHILOSOPHY

PPS will not go from "in development" to "final product" in one leap. It moves through **5 named launches**, each one a real, usable milestone, before the final product:

| Launch | Element | Meaning | Focus |
|---|---|---|---|
| 🔥 **Agni** (current) | Fire | First ignition — get the core solid, real, and fast. No moving to the next launch until this one is genuinely correct, not just "looks done." | Stabilize everything in Section 2-6 below. Make what's real, real. Remove/label what's fake. |
| 🌬️ **Vayu** (next) | Wind | Spread and reach — this is where the product becomes something people *want* to use and comfortably adopt. Growth, polish, delight. | UI/UX comfort, real social features (video, leaderboard), broader appeal |
| *(3 more launches — to be named and defined as we approach them)* | | | |
| **Final Product** | | Complete, institution-ready, monetized | |

### The Agni Rule (working principle for this phase)
> **Perfectionism over speed of shipping, but speed of iteration.** We move fast on TRYING things and fast on TESTING them — but we do not call something "done" or move to the next task until it is verified correct, with real proof (2-account tests, before/after evidence), not just a confident report. Fire moves fast, but it doesn't skip fuel — every step must actually burn clean before adding the next log.

---

## 0.1 THE TEAM & WORKFLOW

- **Jayadeep** — Vision holder, final decision-maker, tester-in-chief. Provides direction, reviews real app behavior with his own hands (2-device tests), makes product/business calls.
- **Claude** — Strategic partner. Turns vision into small, safely-scoped instructions. Reviews AG's reports for gaps, overclaims, or missed edge cases before they're trusted. Keeps this document updated and keeps the team aligned across sessions.
- **AG (Antigravity)** — Implementer. Writes and fixes code, runs tests, and reports honestly — including what it could NOT verify, not just what it did.

### Session Handoff Protocol (so nothing is forgotten between sessions)
Every time work stops for the day (credits run out, or Jayadeep needs to leave), AG should be asked to:
1. **Summarize exactly what was completed** in that session, matched against the task list in Section 10 below
2. **Clearly flag anything that was started but not finished or not tested**
3. **Never push to git without explicit permission**
4. **Update the checkboxes/status in this document**

---

## 1. THE ORIGINAL VISION (why this project exists)

- Started as a resume project, grew into something you want to actually launch and grow into a business.
- Core idea: not just a habit tracker — a **discipline system** that helps people (starting with students) build consistency, focus, and self-improvement, inspired by Japanese Kaizen philosophy.
- Bigger dream: make this "essential" like WhatsApp/Instagram — through social accountability (Study Squads), not just personal tracking.
- Long-term audience ladder: **Individual students (free/Pro) → Teachers/Mentors (marketplace) → Schools/Colleges (institutional licensing)**.
- Target market: primarily Indian students first, with global pricing also supported.
- Key differentiator: no single competitor combines habit gamification + live study rooms + AI coaching + teacher marketplace + institutional licensing in one product.

---

## 2. WHAT IS FULLY WORKING TODAY (verified, trustworthy)

| Feature | Notes |
|---|---|
| Habit tracking (create/edit/delete/archive) | Full Supabase sync, real database |
| Streak engine + freeze credits | Working, includes auto-freeze option |
| XP & Levels | 10 XP per completion, level-up celebrations |
| Achievements/Badges | 6 core badges + Pro-exclusive teases |
| Personal Pomodoro Timer | **Cross-device sync verified working** — start on laptop, see live countdown on phone |
| Deep Analytics | Heatmaps, category breakdown, AI velocity predictor |
| Interactive Calendar | Month/week/agenda views |
| Daily Reflections Journal | **Now real cloud-saved** (was localStorage-only, fixed) |
| Circadian Alarm/Reminder system | Reminders + habit start/end alarms actually fire now |
| AI Performance Coach | **Already built** — intent classifier (16 intents) works free/offline. Real Gemini connection is built and tested but dormant (no API key added yet, by choice) |
| Procedural Soundscapes | Rain, Lo-Fi, Coffee Shop, Library — 100% real, zero cost |
| PDF/CSV/JSON Reports & Export | Working |
| Dark/Light Theme | **Now account-wide synced** across devices (was browser-only, fixed) |
| Auth (Email/Password + Guest) | Working, with guest-to-account migration |
| Onboarding flow | Shows once for new users only |
| Voice Commands | Real browser speech recognition |
| Android App (Capacitor) | Installed and tested on your phone, works like the website |
| Automated test suite | 131 tests passing, includes real integration tests (not just unit tests) |
| **Study Squads (Groups)** | **Now real** — Supabase-backed, invite codes work across accounts, properly isolated per user |
| **Group Chat Channels** | **Now real** — live messages sync between different accounts/devices, confirmed with 2-account test |
| **Leave Group** | Working, handles host-leaving and last-member cleanup |
| **Real Presence** (who's online) | Now uses genuine Supabase Presence — no more fake names |
| **Synced Group Pomodoro** | Now genuinely synced across group members via Realtime |
| **Cross-User Leaderboard** | **Real Supabase query** — queries `profiles` ordered by `total_xp DESC` with realtime `postgres_changes`; zero fake bots |
| Google OAuth (code) | Code is correct; needs manual Supabase + Google Cloud allowlisting |

---

## 3. WHAT'S PARTIALLY WORKING (looks real, isn't fully)

| Feature | What's real | What's missing |
|---|---|---|
| **Video/Audio Focus Rooms (Task 10)** | Local camera/mic preview & raw signaling code in `use-focus-room.ts` | **Unverified across 2 devices; no TURN server configured (will fail on restrictive NATs/firewalls). Needs Daily.co/LiveKit SDK integration.** |
| **Screen Sharing** | Captures local screen (`getDisplayMedia`) | Transmission across 2 separate devices unverified |
| **Shared Whiteboard (Task 12)** | Real drawing canvas, pen/eraser/colors, PNG export, broadcast listener in `WhiteboardModal.tsx` | **No 2-account cross-device live stroke test has been executed** |
| **Co-Op Quests (Task 13)** | Quest definitions, individual progress tracking, broadcast listener in `SocialSection.tsx` | **Simultaneous multi-user group sync integration test has not been executed** |
| **Teacher Marketplace** | Browse mentor classes, client-side NLP syllabus extractor & 1-click habit installer | Paid ticket checkout is in Coming Soon / Early Access mode |
| **Pop-out Meeting Window** | Opens a real new window | Cross-window state is fragile/independent, not truly synced |
| **Accountability Circles** | Matching UI exists | No real peer discovery logic yet |

---

## 4. WHAT'S FAKE / PLACEHOLDER ONLY (should be clearly labeled or removed)

| Item | Status | Risk if left as-is |
|---|---|---|
| Home page testimonials | Replaced with honest User Personas & Workflows | Resolved |
| Leaderboard entries | Now queries real Supabase profiles table only | Resolved |
| "AI Lecture Extractor" in Teacher Marketplace | Now uses real client-side regex/keyword NLP parser | Resolved |
| Campus Institutional License | Inquiry form only, no backend | Fine for now — clearly stays "Coming Soon" |
| Stripe/UPI Payments | "Upgrade to Pro" button opens honest Early Access modal | Resolved |
| iOS App, Biometric Sync, LMS Connector, Multi-lingual Voice | Roadmap ideas only | Fine — future roadmap items |

---

## 5. DECISIONS ALREADY MADE (so we don't re-debate these)

1. **Payments**: Delayed. Real payments delayed until closer to launch (test mode only when activated).
2. **Plan limits (free tier caps)**: Delayed on purpose until users build trust in the product first.
3. **Real Gemini AI**: Built and tested, but dormant until explicitly enabled.
4. **Video calls**: Acknowledged as the single biggest gap. Needs real WebRTC or Daily.co.
5. **Testing discipline**: Every new "sync" feature must be tested with 2 real separate accounts/devices before being trusted.

---

## 6. WHAT'S LEFT TO DO — PRIORITY ORDER

### 🔴 Phase 1 — Fix & Stabilize (Agni Focus)
1. Fix notification dropdown z-index/overlap bug
2. Clarify and scope the "GitHub-style" notification/sidebar idea
3. Replace broken "Upgrade to Pro" button with honest "Coming Soon"
4. Remove/label fake leaderboard entries
5. Remove/label fake testimonials on landing page
6. Remove/fix fake "AI Lecture Extractor"
7. Split `DashboardSection.tsx` into smaller components
8. Split `SettingsSection.tsx` into smaller components
9. Write core E2E tests (signup → habit → streak → analytics → export)

### 🟡 Phase 2 — Make Social Real (Vayu Focus)
10. Real WebRTC/Daily.co video calling
11. Real cross-user leaderboard (Supabase query)
12. Multi-user whiteboard sync
13. Real Co-Op Quest group progress sync

---

## 7. PRICING & GROWTH STRATEGY

| Plan | India | Global |
|---|---|---|
| Free | ₹0 | $0 |
| Student Pro | ₹99/mo or ₹799/yr | $6.99/mo or $59.99/yr |
| Squad Pro (new idea) | ₹299/mo for 5 friends | $19.99/mo for 5 |
| Teacher Studio | 10% commission, first 5 classes/month free | same |
| Campus/Institution | ₹1,200/student/year (bundles AI usage) | $39/student/year |

---

## 8. OPEN QUESTIONS

1. Video calling implementation: Daily.co vs raw WebRTC mesh.
2. Institutional billing bundling AI usage: hard cap vs unlimited monitored.
3. Post-Phase 1 testing milestone.
4. Notification/sidebar "GitHub-style" redesign exact UX specification.

---

## 9. HOW TO USE THIS DOCUMENT GOING FORWARD

- **Jayadeep**: Reopen this file anytime to check the single source of truth.
- **AG**: Update this file whenever tasks are completed or decisions change. Never push without explicit approval.
- **Claude**: Guides scoping, checks AG's reports, and keeps strategy aligned.

---

## 10. AGNI LAUNCH — TASK CHECKLIST

- ✅ **Task 1: Fix notification dropdown z-index/overlap bug**
- ✅ **Task 2: GitHub-style notification center (All vs Unread pills) & collapsible sidebar**
- ✅ **Task 3: Replace broken "Upgrade to Pro" button with honest Early Access / Coming Soon modal**
- ✅ **Task 4: Remove/label fake leaderboard entries with honest Beta Benchmark labels**
- ✅ **Task 5: Replace fake testimonials with honest User Personas & Workflows on landing page**
- ✅ **Task 6: Replace fake "AI Lecture Extractor" with real client-side NLP parser & 1-click habit installer**
- ✅ **Task 7: Split `DashboardSection.tsx` into modular components (MotivationalQuoteWidget)**
- ✅ **Task 8: Split `SettingsSection.tsx` into modular components (AutomationTab, SecurityTab, DataVaultTab)**
- ✅ **Task 9: Write core E2E tests (signup → habit → streak → analytics → export)**
- ⚠️ **Task 10: Real WebRTC video calls** *(Partial — Signaling & local media capture exist in `use-focus-room.ts`, but peer connection is unverified across 2 separate devices and lacks a TURN server; needs Daily.co/LiveKit SDK integration for reliable real-world calls)*
- ✅ **Task 11: Real cross-user leaderboard** *(Verified — queries real Supabase `profiles` table ordered by `total_xp DESC` with `postgres_changes` realtime listener; zero fake bots injected)*
- ⚠️ **Task 12: Multi-user whiteboard sync** *(Partial — Local drawing canvas & PNG export work 100%; broadcast listener code exists in `WhiteboardModal.tsx`, but no 2-account cross-device live stroke synchronization test has been performed)*
- ⚠️ **Task 13: Real Co-Op Quest group progress sync** *(Partial — Individual quest tracking works; broadcast listener exists in `SocialSection.tsx`, but simultaneous multi-user group sync integration test has not been executed)*

*(Payments, plan-limit enforcement, and institutional billing are intentionally deferred to Vayu Launch or later per Section 5 decisions.)*

