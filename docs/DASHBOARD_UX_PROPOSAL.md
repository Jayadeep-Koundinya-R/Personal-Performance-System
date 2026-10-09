# PPS Dashboard Architecture RFC & UX Proposal
**Doc ID:** RFC-2025-02-DASHBOARD-UX
**Author:** Jules (Software Engineer)
**Status:** Under Review
**Branch:** `feat/onboarding-wizard-ui`

---

## Executive Summary

As the Personal Performance System (PPS) expands from an individual habit tracker into a multi-track, squad-driven accountability platform, the dashboard UX must seamlessly unify three high-priority behavioral layers:

1. **The Primary Execution Loop & Circadian Clock:** Vayu circadian flow, daily habit checklists, focus timers, and streak shields.
2. **Track Community Channels:** Focused asynchronous & real-time discussions, problem sets, and resource feeds specific to the user's active track (e.g., *Campus Placements*, *GATE/CAT MCQs*, *Core Engineering*, *Fitness*).
3. **Peer Squads & Real-time Presence:** Intimate peer accountability groups (3–8 friends) with live focus status, co-working rooms, and daily activity nudges.

This proposal evaluates leading UX paradigms, details three candidate layout models, and defines the recommended responsive dashboard architecture for upcoming development cycles.

---

## 1. Industry Benchmark Research

| Platform | Core UX Mechanics | Key Takeaways for PPS Dashboard |
| :--- | :--- | :--- |
| **Linear** | • Ultra-high information density<br>• Zero-latency keyboard shortcuts (`G` + `D`, `/`)<br>• Contextual split panes | • High-density execution cards without visual clutter.<br>• Keyboard navigation for rapid habit logging & timer triggers.<br>• Minimalist dark obsidian aesthetic. |
| **Discord** | • Server / Channel sidebar hierarchy<br>• Visual presence indicators (Online, Idle, In Focus Room)<br>• Integrated voice/video stages | • Left-hand channel switcher for execution tracks.<br>• Squad presence pills showing live co-working sessions.<br>• Unread indicators for track announcement channels. |
| **Notion** | • Modular drag-and-drop block layouts<br>• View toggles (Board, List, Calendar, Timeline)<br>• Collapsible sidebar sections | • Customizable widget grid (re-arrangeable priority cards).<br>• Toggleable views between daily checklist, weekly matrix, and monthly trends. |
| **Duolingo** | • Prominent streak counter & freeze shields<br>• Gamified quest progress bars<br>• Immediate visual feedback on task completion | • Micro-celebrations and XP progress bars.<br>• Prominent streak shield status widget on the top navbar. |

---

## 2. Comparative Analysis of 3 Multi-Channel Layout Options

### Option A: Discord-Style Dual Sidebar Layout (Track & Squad Channel Centric)
* **Description:** A fixed left sidebar contains server icons for Track Channels and Squads, followed by a channel list. The center stage hosts active track feeds, while a right collapsible drawer displays the primary habit checklist and Vayu clock.
* **Pros:**
  * Highly familiar to developer and student demographics.
  * Frictionless switching between general track discussions and squad rooms.
* **Cons:**
  * Shifts attention away from personal habit execution towards passive social scrolling.
  * High horizontal pixel cost on laptop screens (13" / 14").

---

### Option B: Linear-Style Focused Execution Workspace (Task & Matrix First)
* **Description:** The primary center stage is exclusively dedicated to the user's active habits, Pomodoro focus timer, and Vayu circadian clock. Track channels and squad presence are housed in clean collapsible drawer tabs or floating command palettes.
* **Pros:**
  * Maximum focus on deep work and habit execution (zero distraction).
  * Extremely clean, high-density layout optimized for speed.
* **Cons:**
  * Lower social visibility for track channels and peer squad activities.
  * Users may underutilize community channels if hidden in drawers.

---

### Option C: Hybrid "Command Center" Modular Grid (RECOMMENDED)
* **Description:** A responsive 3-column desktop view (collapsing into a bottom navigation dock on mobile) that balances individual execution, circadian context, and squad social presence into a cohesive, non-distracting matrix.

```
+-----------------------------------------------------------------------------------+
|  [Logo] PPS Workspace | Track: Placements & DSA 🎓  | 🔥 5-Day Streak  [Avatar]   |
+-------------------+---------------------------------------+-----------------------+
| TRACK CHANNELS    | CENTER EXECUTION STAGE                | SQUAD & CIRCADIAN     |
|                   |                                       |                       |
| # placements-gen  | [ 🌅 Vayu Circadian Clock: 07:30 AM ] | [ 👥 Squad: Algorithm ]|
| # dsa-daily-2     |                                       | • Alex (In Focus 💻)  |
| # os-dbms-theory  | [ 🎯 Active Execution Matrix ]        | • Sarah (Idle ☕)     |
| # aptitude-sprint |   [x] Solve 2 LeetCode Problems      |                       |
|                   |   [ ] OS Memory Revision              | [ ⚡ Quick Join Room ] |
| SPECIAL OVERLAY   |   [ ] 45-Min Aptitude Sprint          |   [Join Video Room]   |
| ⚙️ Track 5 Agni    |                                       |                       |
|                   | [ 📈 Weekly Focus Velocity: 24h/28h ] | [ 🏆 Track Leaderboard]|
+-------------------+---------------------------------------+-----------------------+
```

* **Pros:**
  * Keeps personal habit execution front and center while maintaining constant, low-friction visibility into peer squad presence.
  * Seamlessly integrates Track 5 (Agni Circadian Challenge) as a persistent overlay banner.
  * Fully responsive: Desktop 3-column grid collapses into a clean mobile tab dock (`Execution`, `Track Feed`, `Squad`).

---

## 3. Recommended Architectural Blueprint

### Desktop Layout (>= 1024px)
1. **Left Navigation Panel (240px):** Channel selector for active primary track, Track 5 overlay switch, and quick settings.
2. **Center Stage (Flex 1):** Vayu Circadian Clock widget, daily habit checklist with instant checkbox triggers, and focus studio session launcher.
3. **Right Contextual Bar (300px):** Live squad presence avatars, active WebRTC room launcher, and track progress leaderboard.

### Mobile Mobile-First Layout (< 768px)
* Bottom Navigation Bar with 4 primary touch targets:
  1. ⚡ **Execute:** Daily habits, Vayu clock, and quick timer.
  2. 💬 **Channels:** Track discussion feeds and problem sets.
  3. 👥 **Squad:** Peer presence and live focus room join.
  4. ⚙️ **Settings:** Track switcher and account management.

---

## 4. Next Implementation Steps for Engineering
1. Integrate `TrackPreferenceSelector` across dashboard widgets so track context updates dynamically.
2. Expand `useChannels` and `useGroups` hooks to support track-specific community feeds.
3. Prepare Supabase migrations for channel message threads and squad presence heartbeats.
