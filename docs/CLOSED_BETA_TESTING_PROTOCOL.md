# 🚀 PPS Closed Beta Testing Protocol (v0.9)

> **Mandate:** 5–10 real testers running the core habit loop across 2+ distinct devices (phone + PC) for 7 consecutive days with zero data loss and zero localStorage confusion.

---

## 👥 Cohort Profile & Hardware Matrix

- **Cohort Size:** 5–10 real users (e.g. students, builders, engineers).
- **Target Devices:**
  - Primary Mobile: iOS Safari / Android Chrome (viewport: 390px – 430px).
  - Secondary Desktop: macOS / Windows (Chrome, Safari, Edge).
- **Network Conditions:** Real 4G/5G mobile data and home Wi-Fi with occasional tab switches.

---

## 📅 7-Day Day-by-Day Verification Schedule

### **Day 1: Authentic Onboarding & Habit Stack Setup**
- [ ] Sign up using genuine email + password on Supabase cloud.
- [ ] Confirm new account starts with an authentic empty state (zero demo habits injected).
- [ ] Create 3 core habits:
  1. **Anchor Habit (Focus Sprint):** Requires 25m focus sprint.
  2. **Circadian Habit:** Morning window (e.g. 07:00 – 11:00).
  3. **Daily Atomic Habit:** Standard daily check-off.
- [ ] Log in on secondary device (phone) and verify all 3 habits appear immediately.

### **Day 2: Rapid 1-Tap Daily Habit Check-Off**
- [ ] Open PPS on phone during morning routine.
- [ ] Tap the 44px thumb touch target to check off Habit 3 in under 10 seconds.
- [ ] Verify optimistic UI updates instantly with audio chime and haptics.
- [ ] Without refreshing, glance at desktop screen; verify Supabase Realtime channel reflects the completion automatically.

### **Day 3: Focus Sprint & Ambient Procedural Soundscape**
- [ ] Launch a 25-minute Pomodoro focus session from the Quick Dock on desktop.
- [ ] Turn on 432Hz Ambient Soundscape (Lo-Fi or Binaural Alpha).
- [ ] Confirm zero CPU stutter and verify countdown timer persists across tab navigation.
- [ ] Complete the sprint and verify verified proof-of-focus check-off unlocks.

### **Day 4: Low Energy & 2-Minute Micro-Habit Scaling**
- [ ] Simulate low-energy day: tap the "2m Micro" pill on a difficult habit.
- [ ] Confirm habit completes with +2 XP and streak count increases without penalty.
- [ ] Verify micro-habit weekly allowance counter correctly tracks (max 3/week).

### **Day 5: Honored Rest Day & Recovery XP**
- [ ] Tap the habit action menu and select "Rest Day".
- [ ] Confirm +5 Recovery XP is awarded and streak is protected.
- [ ] Confirm user feels zero guilt and the app does not show shaming notifications.

### **Day 6: Multi-Device Cold Refresh & Data Truth Audit**
- [ ] Close the browser completely on both phone and laptop.
- [ ] Clear browser cache/cookies on phone (or open incognito and log back in).
- [ ] Verify all habit completion dates, streak counters, and vitality stats load identically from Supabase.
- [ ] Confirm zero localStorage key collisions or ghost habits.

### **Day 7: Weekly Analytics & Level-Up Celebration**
- [ ] View the weekly vitality score and rolling 7-day consistency metric.
- [ ] Verify Level-Up celebration modal triggers smoothly with non-blocking dismiss controls.
- [ ] Submit weekly feedback survey via the in-app feedback channel.

---

## 🐞 Bug Reporting & Telemetry Standard
- Any UI clipping or alignment issue on mobile screens (<400px width).
- Any discrepancy between mobile and desktop habit status.
- Any unexpected modal trap or recurring overlay.
