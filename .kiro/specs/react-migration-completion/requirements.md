# Requirements Document

## Introduction

This feature covers completing the in-progress migration of the Personal Performance System (PPS) from a vanilla HTML/JS/CSS implementation to a React + TypeScript + Tailwind CSS + Supabase stack. The migration skeleton (components, hooks, utilities) is already in place; this spec focuses on the three concrete gaps that must close to ship a production-ready frontend today:

1. **All interactive buttons must be functional** — many buttons currently do nothing because the onClick handlers are wired but the underlying mutation callbacks are passed incorrectly or the UI state machine is incomplete.
2. **The premium dark / glassmorphism UI styling must be fully restored** — custom CSS variables exist in `index.css` but several Tailwind utility classes that reference them are missing, and a handful of components lost their visual fidelity during porting.
3. **Analytics heatmap, KPI stat cards, and the Progress Circle in DailyTracker must render correctly** — these depend on pure data-transformation functions that already exist in `habitUtils.ts` but are not always invoked with correct parameters.

The vanilla backup (`vanilla_backup/`) serves as the authoritative reference for logic and visual design.

---

## Glossary

- **PPS** — Personal Performance System; the React + Vite application being completed.
- **Habit** — A recurring performance metric tracked in `habits` (Supabase) or `localStorage` (guest).
- **Completion** — A single "tick" recorded against a habit on a specific date (`YYYY-MM-DD`).
- **Streak** — The count of consecutive periods (days/weeks/months) a habit has been completed.
- **Freeze Credit** — A one-time shield that prevents a streak reset when a habit is missed.
- **DailyTracker** — The view where users tick off today's due habits.
- **HabitManager** — The view where habits are created, edited, and deleted.
- **Dashboard** — The landing view showing KPI cards, focus lanes, and progress widgets.
- **StreakEngine** — The view for monitoring momentum and purchasing freeze credits.
- **Achievements** — The badge cabinet view that awards milestones.
- **Reflections** — The daily journal / mood log view.
- **Reminders** — The browser notification alarm scheduling view.
- **Tasks** — The one-off planner task view.
- **Settings** — The control panel for profile, theme, preferences, and data backups.
- **Analytics** — The insights view with heatmap, category donut, and success-rate table.
- **GlassPanel** — The `.glass-panel` CSS class providing the glassmorphism card aesthetic.
- **GuestMode** — Local-only mode using `localStorage` when no Supabase env vars are set.
- **TailwindV4** — Tailwind CSS v4 used in this project; theme tokens are declared via `@theme` in `index.css`.
- **QueryClient** — TanStack React Query client that wraps the app in `main.tsx`.

---

## Requirements

### Requirement 1: All CRUD Buttons Are Functional

**User Story:** As a user, I want every button in the app to respond to my click and perform its described action so that I can manage my habits, tasks, reflections, and reminders without dead interactions.

#### Acceptance Criteria

1. WHEN the user clicks "Add Habit Metric" on `HabitManagerView`, THE HabitManager SHALL call `addHabit` from `useHabits`, persist the habit, and reset all form fields to their default values (name → empty string, category → empty string, period → "Daily", priority → "Medium", start date → today's date).
2. WHEN the user clicks the edit icon (✏️) on a habit card, THE HabitManager SHALL open the edit modal pre-populated with that habit's current values for name, category, period, priority, and freeze credits.
3. WHEN the user submits the edit modal form, THE HabitManager SHALL call `editHabit` from `useHabits` with the updated habit object and close the modal; IF `editHabit` fails, THEN the modal SHALL remain open and display an inline error message without applying changes.
4. WHEN the user clicks the delete icon (🗑️) on a habit card, THE HabitManager SHALL call `deleteHabit` from `useHabits` and remove the card from the list without a page reload; IF `deleteHabit` fails, THEN the card SHALL remain visible and an inline error SHALL be displayed.
5. WHEN the user clicks a habit's circular toggle button on `DailyTrackerView`, THE DailyTracker SHALL call `toggleCompletion` from `useHabits` and update the visual state of that habit card immediately (optimistic UI via React Query).
6. WHEN the user clicks "Add Performer Task" on `TasksView`, THE TaskHub SHALL call `addTask` from `useTasks`, persist the task, and reset all task form fields (title → empty, priority → "Medium", due date → empty).
7. WHEN the user clicks the checkbox on an active task card, THE TaskHub SHALL call `toggleTask({ id, done: true })` and move the card to the completed section.
8. WHEN the user clicks the delete icon on a task card, THE TaskHub SHALL call `deleteTask` and remove the card; IF `deleteTask` fails, THEN the card SHALL remain visible and display an inline error message.
9. WHEN the user clicks "Save Entry ✓" on `ReflectionsView`, THE Reflections SHALL upsert the reflection entry (insert new when no same-date + habitId entry exists; update existing when a match is found), call `saveReflection` from `useReflections` with text, mood, and optional linked habit, then clear all form fields.
10. WHEN the user clicks the delete icon on a reflection entry, THE Reflections SHALL call `deleteReflection` with that entry's id; IF `deleteReflection` fails, THEN the entry SHALL remain visible and display an inline error message.
11. WHEN the user submits the reminder creation form on `RemindersView`, THE ReminderHub SHALL call `addReminder` from `useReminders` and insert the reminder into the schedule list sorted by time ascending.
12. WHEN the user toggles the switch on a reminder row, THE ReminderHub SHALL call `toggleReminder({ id, enabled })` and update the toggle to reflect the new `enabled` value.
13. WHEN the user clicks the delete icon on a reminder, THE ReminderHub SHALL call `deleteReminder`; IF `deleteReminder` fails, THEN the reminder SHALL remain visible and display an inline error message.
14. WHEN the user clicks "Charge Shield" on `StreakEngineView` and the XP deduction via `addXp` succeeds, THE StreakEngine SHALL then update `freeze_credits` via `updateProfile` and show a success message; IF the XP deduction fails, THEN THE StreakEngine SHALL NOT update `freeze_credits` and SHALL show an error message instead.
15. WHEN the user clicks "Charge (75 XP)" on an individual habit streak card and the XP deduction succeeds, THE StreakEngine SHALL increment that habit's `freezeCredits` field via `editHabit`; IF the XP deduction fails, THEN THE StreakEngine SHALL NOT update the habit and SHALL show an error message.
16. WHEN the user clicks "Update Name" on `SettingsView`, THE Settings SHALL call `updateDisplayName` and display a success confirmation inline; IF `updateDisplayName` fails, THEN the Settings SHALL display an inline error message.
17. WHEN the user clicks "Save Preferences", THE Settings SHALL call `updateProfile` with the new `xp_per_completion` (valid range: 1–100) and `max_freeze_credits` (valid range: 1–5) values.
18. WHEN the user clicks the theme toggle button, THE Settings SHALL toggle the `light` class on `document.documentElement` and persist the choice to `localStorage` as `pps_theme` with string value `"light"` or `"dark"`.
19. WHEN the user clicks "Export JSON Backup", THE Settings SHALL create and download a `.json` file named `pps_backup_YYYY-MM-DD.json` containing `habits`, `tasks`, `reflections`, `reminders`, and `profile`.
20. WHEN the user clicks "Log Out", THE Settings SHALL call `logout` from `useAuth` and redirect to the Login screen.
21. WHEN the user clicks "Connect Google" or "Connect Outlook" on `TasksView`, THE TaskHub SHALL call `connectCalendar` with the provider name and display the pending status badge.
22. WHEN the user submits the focus lane habit toggle on `DashboardView`, THE Dashboard SHALL call `toggleCompletion` and update the lane item's visual state.
23. IF the user clicks a button and the underlying mutation is in a pending (loading) state, THEN THE System SHALL show a loading spinner on the button and disable further clicks until the mutation completes or fails.
24. WHEN a user completes the final remaining habit due for the current day, THE System SHALL immediately trigger the `PerfectDayModal` showing a celebratory reward screen, append today's date string to the profile's `perfect_days` array, and issue an automatic bonus of +50 XP via `addXp`.
25. WHEN the user clicks "Export PDF Report" on `SettingsView`, THE System SHALL compile a clean, print-formatted performance summary document layout containing current level badges, active streaks, and the 7-day completion chart.
26. WHEN the user views the `SocialView`, THE System SHALL dynamically render the weekly global challenge progress bar and a mock leaderboard matching active XP ranks.

---

### Requirement 2: Premium Dark / Glassmorphism Styling Is Fully Restored

**User Story:** As a user, I want the app to look like the original premium design (dark obsidian base, blue/cyan/amber accents, glassmorphism panels) so that the experience feels polished and motivating.

#### Acceptance Criteria

1. THE App SHALL apply the dark-mode CSS variables defined in `:root` in `src/index.css` as the default visual theme on every page load.
2. WHEN the user is in dark mode, THE App SHALL render a `#08111f` background with the `--page-gradient` radial gradients applied as a fixed background-image on `body`.
3. WHILE the current theme is dark, THE App SHALL render an ambient overlay (a `body::before` pseudo-element) using `linear-gradient(135deg, rgba(124,106,255,0.08), transparent 34%)` and a radial `rgba(0,212,255,0.08)` gradient that creates depth behind all content panels, regardless of whether the user has a stored theme preference.
4. THE GlassPanel class SHALL be applied to all major content containers: form panels, list panels, KPI cards, widget cards, and modal boxes across all views.
5. THE Sidebar SHALL use the `glass-sidebar` class providing `backdrop-filter: blur(20px)` and a 1px right border using `var(--border)`.
6. THE Sidebar's active navigation item SHALL display a 2px left-border using `var(--accent)` (`#6ea8ff`), a background color of `rgba(110,168,255,0.08)`, and the text color of `var(--text)` (`#f3f8ff`).
7. THE App SHALL load the fonts `Plus Jakarta Sans`, `DM Mono`, and `Syne` from Google Fonts (already imported in `index.css`) and apply them via the CSS custom property font stack.
8. THE DashboardView KPI cards SHALL render the correct gradient backgrounds using `var(--kpi-purple-bg)`, `var(--kpi-orange-bg)`, `var(--kpi-cyan-bg)`, and `var(--kpi-green-bg)`.
9. THE Custom scrollbar styles (4px width, `var(--border-bright)` thumb) SHALL be applied globally so all scroll containers use the slim dark scrollbar.
10. THE DailyTrackerView progress circle SHALL render a circular SVG with a `stroke` color of `var(--accent)` arc representing the completion percentage, with a 500ms ease-out CSS transition on `strokeDashoffset`.
11. WHILE the streak is greater than 0, THE Streak flame icon on `StreakEngineView` SHALL animate using the `animate-flame` keyframe (`flamePulse`, 2s duration); IF the streak drops to 0 while an animation cycle is active, THE System SHALL allow the current 2-second animation cycle to complete before stopping the animation.
12. THE XP pop animation (`animate-xp-pop` keyframe `xpPopAnim`, 1.1s duration) SHALL play at the toggle-button position when a habit is completed in `DailyTrackerView` and the DOM element SHALL be removed 800ms after the animation completes.
13. THE Toggle switch in `RemindersView` SHALL display as a rounded pill; WHEN `enabled` changes, the thumb SHALL slide from left to right (or right to left) with a 150ms CSS transition.
14. THE Modal overlay in `HabitManagerView` SHALL have `backdrop-filter: blur(12px)` applied so the background is blurred when the edit modal is open.
15. WHERE the light theme is active (`.light` class on `document.documentElement`), THE App SHALL apply the `.light` class overrides defined in `index.css`, switching backgrounds to light slate, cards to white, and text to dark slate.
16. THE Heatmap cells in `AnalyticsView` SHALL render with four intensity levels: level 0 uses `var(--surface-3)` (`rgba(255,255,255,0.04)`), and levels 1–4 use progressively opaque `var(--accent)` color.
17. THE Priority / mood badge pills and status tags SHALL use the `bg-*/10`, `text-*`, `border-*/20` Tailwind opacity variant classes already referenced in components, ensuring colors resolve from the CSS variable color tokens.
18. THE Focus lane items in `DashboardView` SHALL show a left-colored dot; WHILE an item is not yet done, hovering SHALL apply a background of `var(--surface-2)` and text color of `var(--text-2)`; WHILE an item is done, THE item SHALL render with a green strikethrough using `var(--green)`.
19. THE Login page SHALL display: two background blur orbs with `blur(80px)` filter, a centered glass card with `glass-panel` styling, gradient CTA buttons using `linear-gradient(135deg, var(--accent), var(--accent2))` for the primary action, and a secondary "Guest Mode" button styled with `var(--surface-2)` background and `var(--text-2)` text.
20. Text visibility SHALL be the absolute highest priority across all views: every text element SHALL use explicit Tailwind utility classes that guarantee high contrast against dark backgrounds (e.g., `text-zinc-100`, `text-white`, or `text-slate-200`). At no point SHALL any text color collide with or become invisible against `.glass-panel` container backgrounds. All layout containers SHALL maintain explicit padding and gap values (minimum `p-4` / `gap-3`) to fully eliminate layout overlap bugs.

---

### Requirement 3: Analytics Heatmap and Data Visualizations Render Correctly

**User Story:** As a user, I want the analytics graphs and heatmap to accurately reflect my habit data so that I can measure my consistency over time.

#### Acceptance Criteria

1. WHEN the user opens `AnalyticsView`, THE Analytics SHALL call `buildHeatmapData(habits, heatmapRange)` and render a CSS grid of `heatmapData.weeks` columns by 7 rows, where each cell's intensity (0–4) is determined by: 0% completions → level 0; 1–24% → level 1; 25–49% → level 2; 50–74% → level 3; ≥75% → level 4.
2. WHEN `habits` is empty OR when habits exist but none have any logged completions, THE Analytics SHALL display the heatmap with all cells at intensity 0 rather than an error state.
3. WHEN the user clicks a range button (3M / 6M / 12M), THE Analytics SHALL update `heatmapRange` state and re-render the heatmap within the same view without a page reload.
4. WHEN the user hovers over a heatmap cell, THE Analytics SHALL update `hoveredCell` state and display the date and completion count in the tooltip bar below the grid.
5. THE Analytics SHALL render a donut SVG chart using `strokeDasharray` and `strokeDashoffset` calculated from `categoryStats`, displaying each category as a colored arc segment.
6. WHEN no completions have been logged across all habits, OR when the SVG donut chart element is absent from the DOM, THE Analytics SHALL render a placeholder message (e.g., "No data yet") instead of an empty or broken chart.
7. THE Analytics SHALL display the Success Index table showing each habit's name, number of completions within the window, and a colored percentage bar; the percentage is calculated as `(completions_in_window / window_length_days) * 100`, clamped to 100%.
8. WHEN the user toggles the window between 7D and 30D, THE Analytics SHALL re-compute success rates using the new window length and update the table immediately.
9. THE AnalyticsView KPI cards SHALL display: overall completion rate as the ratio of total logged completion dates to total expected completions across all active habits; best streak as the highest `streak` value across all habits; total completions as the sum of all `completedDates` array lengths; and total XP from `profile?.total_xp`.
10. THE DashboardView weekly bar chart SHALL render 7 bars with heights proportional to the maximum daily completion count in the last 7 days; bars with zero completions SHALL render at a minimum visible height of 4%.
11. THE DashboardView progress widget SHALL display a gradient bar from `var(--accent)` to `var(--accent2)` filling to the percentage returned by `getDailyProgress(habits)`, clamped between 0% and 100%.
12. THE DashboardView level widget SHALL display a gradient bar from `var(--amber)` to `var(--orange)` filling to `((total_xp mod 100) / 100) * 100` percent, where `total_xp mod 100` is the XP earned within the current level, clamped between 0% and 100%.
13. WHEN the `DailyTrackerView` progress circle's `completionPercentage` changes, THE System SHALL transition `strokeDashoffset` smoothly with a 500ms CSS ease-out transition.
14. THE DashboardView focus lanes SHALL dynamically sort active habits: incomplete items with `priority` of `"High"` or `"Medium"` SHALL float to the top of their respective lane, while items already marked done SHALL move to the bottom of the lane and render with a strikethrough style.

---

### Requirement 4: Stable Guest Mode and Data Persistence

**User Story:** As a user without Supabase credentials, I want to be able to use the entire app in Guest Mode and have my data persist across page reloads within a 24-hour session so that I can evaluate the system locally.

#### Acceptance Criteria

1. IF no `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is present in the environment, THEN THE Login screen SHALL display only the Guest Mode option and SHALL NOT show email/password login fields.
2. WHEN the user clicks "Try Offline (Guest Mode)", THE AuthProvider SHALL create a guest session object with an `expiry` field set to `Date.now() + 86400000` (24 hours), persist it to `localStorage` under `currentUser`, and navigate to the main app.
3. WHILE in Guest Mode, THE useHabits hook SHALL read and write habits exclusively to `localStorage` using the key `habits_guest`.
4. WHILE in Guest Mode, THE useTasks hook SHALL read and write tasks exclusively to `localStorage` using the key `pps_tasks_guest`.
5. WHILE in Guest Mode, THE useReflections hook SHALL read and write reflections exclusively to `localStorage` using the key `reflections_guest`.
6. WHILE in Guest Mode, THE useReminders hook SHALL read and write reminders exclusively to `localStorage` using the key `reminders_guest`.
7. WHEN the user reloads the page and the `currentUser` entry in `localStorage` is a valid, non-expired guest session, THE AuthProvider SHALL restore the session and all associated data without re-prompting login.
8. WHEN the user reloads the page and `localStorage` is empty or the `currentUser` entry is missing, THE AuthProvider SHALL treat this as an expired/cleared session and display the Login screen.
9. WHEN the user reloads the page and `localStorage` contains a `currentUser` entry that is not valid JSON or is missing required fields (e.g., `isGuest`, `expiry`, `id`), THE AuthProvider SHALL remove the malformed entry and display the Login screen.
10. IF the guest session has expired (i.e., `Date.now() >= session.expiry`), THEN THE AuthProvider SHALL remove the session from `localStorage` and display the Login screen; this check SHALL occur on every page load before rendering the main app.

---

### Requirement 5: Mobile Responsive Layout

**User Story:** As a mobile user, I want the sidebar and all views to function correctly on small screens so that I can access the app from any device.

#### Acceptance Criteria

1. WHEN the viewport width is 1023px or narrower, THE App SHALL render the sidebar as a fixed overlay drawer that is initially off-screen (translated -100% on the X axis) and invisible.
2. WHEN the mobile hamburger button (☰) is clicked, THE App SHALL show the sidebar drawer by translating it to X: 0 and displaying a semi-transparent overlay backdrop behind it.
3. WHEN the backdrop is clicked, THE App SHALL hide the sidebar drawer by translating it back to X: -100%.
4. WHEN a navigation item is clicked while the drawer is open on a viewport 1023px or narrower, THE Sidebar SHALL automatically close the drawer.
5. WHILE the viewport width is 1024px or wider, THE Sidebar SHALL render as a collapsible inline panel (not a drawer), toggling between 240px (expanded) and 68px (collapsed) widths.
6. THE mobile header bar containing the hamburger button SHALL be hidden (not rendered) on viewports 1024px or wider; it SHALL be visible on viewports 1023px or narrower.
7. THE DashboardView KPI grid SHALL display 4 columns at viewports 1024px or wider, 2 columns at 640px–1023px, and 1 column below 640px.
8. THE Split layout panels (form + list columns) in `HabitManagerView`, `TasksView`, `ReflectionsView`, and `RemindersView` SHALL stack vertically on viewports narrower than 1024px.
9. WHEN the viewport is resized from below 1024px to 1024px or wider while the sidebar is in overlay/drawer mode, THE App SHALL automatically switch the sidebar to inline collapsed mode (68px width) without requiring a page reload.

---

### Requirement 6: Supabase Integration Is Correct When Configured

**User Story:** As a registered user with Supabase configured, I want my habits, profile, tasks, reflections, and reminders to be synced to the cloud database so that my data persists across devices and sessions.

#### Acceptance Criteria

1. WHEN `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set and a user signs in, THE useHabits hook SHALL fetch habits from the `habits` table filtered by `user_id`, then apply the daily reset algorithm before returning them (observable outcomes: `due_date` is advanced to today or later, `streak` is reset to 0 for missed habits that have no freeze credits, and `freeze_credits` is decremented by 1 for each missed habit that had a credit).
2. WHEN a habit is added in Supabase mode, THE useHabits hook SHALL insert a row into `habits` with all required fields (`user_id`, `name`, `category`, `priority`, `period`, `due_date`, `completed_dates`, `streak`, `freeze_credits`) and then invalidate the `['habits', userId]` React Query cache key.
3. WHEN `toggleCompletion` is called in Supabase mode, THE useHabits hook SHALL update the `completed_dates`, `streak`, `last_completed_date`, and `freeze_credits` fields on the matching row.
4. WHEN a profile row does not exist for a new user (Supabase returns error code `PGRST116`), THE useAuth hook SHALL automatically insert a default profile row with baseline values (`total_xp: 0`, `level: 1`, `streak: 0`, `freeze_credits: 2`, `xp_per_completion: 10`, `max_freeze_credits: 2`).
5. WHEN `addXp` is called with an `amount`, THE useAuth hook SHALL update `total_xp` to `current_total_xp + amount` and recalculate `level` as `floor(new_total_xp / 100) + 1`, persisting both values to local state and the `profiles` table.
6. IF any Supabase operation (insert, update, delete, select) fails, THEN THE System SHALL display the error message in the relevant form section's error alert element and SHALL NOT apply the failed changes to local React state or the React Query cache.
