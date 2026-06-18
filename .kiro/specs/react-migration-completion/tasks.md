# Implementation Plan: React Migration Completion (PPS)

## Overview

Close the three concrete gaps in the React migration: wire all interactive buttons, restore the glassmorphism UI, and fix data-visualisation rendering. Then create the two new components (`PerfectDayModal`, `SocialView`), add `reportUtils.ts` + PDF export, and validate all 14 correctness properties with property-based tests.

Tasks are ordered: CSS/token foundation → utilities & hooks → components → new components → integration → tests.

---

## Tasks

- [x] 1. Install test dependencies and configure Vitest
  - [x] 1.1 Install fast-check and Vitest test runner
    - Run `npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom fast-check`
    - Add `"test": "vitest --run"` and `"test:watch": "vitest"` to `package.json` scripts
    - Create `vitest.config.ts` in `Personal-Performance-System/` with jsdom environment and globals enabled
    - Create `src/test/setup.ts` importing `@testing-library/jest-dom/vitest`
    - _Requirements: Testing Strategy (design doc)_


- [x] 2. Audit and patch `src/index.css` CSS token gaps
  - [x] 2.1 Add missing CSS custom properties and Tailwind @theme tokens
    - Verify `--color-muted-bright`, `--color-purple`, `--color-blue`, `--color-cyan` are present in both `:root` and `@theme` blocks
    - Add `--color-amber` alias `--amber` mapping in `@theme` if missing (`--color-amber: #f5a623`)
    - Add `shadow-glow-amber`, `shadow-glow-cyan`, `shadow-glow-green` to `@theme` shadow entries
    - Confirm `bg-surface-2`, `bg-surface-3`, `bg-card`, `bg-card-hover` utility classes resolve via `@theme`
    - Add `.light` class overrides for `--color-*` tokens so Tailwind utility classes respect light mode
    - _Requirements: 2.1, 2.2, 2.3, 2.15_
  - [x]* 2.2 Write unit test: light-theme CSS variable override
    - Create `src/test/theme.test.ts`
    - Test that adding `.light` class to `document.documentElement` causes `getComputedStyle` to return light `--bg` value (`#f1f5f9`)
    - _Requirements: 2.15_


- [ ] 3. Extend `src/utils/habitUtils.ts` with `buildWeeklyBars` export and `sortIntoLanes` export
  - [ ] 3.1 Export `buildWeeklyBars` and `sortIntoLanes` as named exports from `habitUtils.ts`
    - Move `buildWeeklyBars` function from `DashboardView.tsx` into `habitUtils.ts` as a standalone export
    - Move `sortIntoLanes` function from `DashboardView.tsx` into `habitUtils.ts` as a standalone export
    - Update `DashboardView.tsx` to import them from `habitUtils`
    - Confirm existing `buildHeatmapData`, `getHabitSuccessRates`, `getBestStreak`, `getOverallCompletionRate` signatures are unchanged
    - _Requirements: 3.10, 3.14_
  - [ ]* 3.2 Write property test for `buildWeeklyBars` minimum-height invariant (Property 13)
    - Create `src/test/habitUtils.property.test.ts`
    - **Property 13: Weekly bar chart minimum height invariant**
    - **Validates: Requirements 3.10**
    - For any habits array, every bar produced by `buildWeeklyBars` must have `count >= 0` and the rendered `Math.max(heightPct, 4)` guard guarantees at least 4% height
    - Use `fc.array(fc.record({ completedDates: fc.array(fc.string()) }))`, assert `Math.max((bar.count / maxCount) * 100, 4) >= 4` for all bars
    - `numRuns: 100`
    - _Requirements: 3.10_
  - [ ]* 3.3 Write property test for `sortIntoLanes` focus lane sort invariant (Property 12)
    - **Property 12: Focus lane sort invariant**
    - **Validates: Requirements 3.14**
    - For any habits array, union of all five lane arrays equals full array (no habit lost or duplicated); `critical` has only `priority === 'High'` incomplete; `done` has only habits with today in `completedDates`
    - Use `fc.array(habitArbitrary)` where `habitArbitrary` generates valid `Habit` objects
    - `numRuns: 100`
    - _Requirements: 3.14_


- [ ] 4. Property-based tests for `habitUtils.ts` pure functions
  - [ ]* 4.1 Write property test for heatmap intensity formula (Property 9)
    - Add to `src/test/habitUtils.property.test.ts`
    - **Property 9: Heatmap intensity levels match the completion-ratio formula**
    - **Validates: Requirements 3.1, 3.2**
    - For any habits array and `heatmapRange` in `[91, 182, 365]`, every cell from `buildHeatmapData` satisfies the 5-bucket intensity rule exactly
    - Use `fc.array(fc.record({ completedDates: fc.array(fc.constantFrom(...pastDates)) }))` and `fc.constantFrom(91, 182, 365)`
    - `numRuns: 100`
    - _Requirements: 3.1, 3.2_
  - [ ]* 4.2 Write property test for success index percentage clamp (Property 10)
    - **Property 10: Success index percentage is clamped to 100%**
    - **Validates: Requirements 3.7**
    - For any habits array and `windowDays` in `[7, 30]`, `getHabitSuccessRates` returns `percent` in `[0, 100]` for all entries
    - `numRuns: 100`
    - _Requirements: 3.7_
  - [ ]* 4.3 Write property test for Analytics KPI formula accuracy (Property 11)
    - **Property 11: Analytics KPI values match their formulas exactly**
    - **Validates: Requirements 3.9**
    - For any habits array and profile object, verify `getOverallCompletionRate` = `round(totalCompletions / (habits.length * 30) * 100)` clamped; `getBestStreak` = `max(0, ...habits.map(h => h.streak))`; `totalCompletions` = sum of `completedDates.length`
    - `numRuns: 100`
    - _Requirements: 3.9_
  - [ ]* 4.4 Write property test for toggle-completion round-trip (Property 4)
    - **Property 4: Toggle completion is a round-trip**
    - **Validates: Requirements 1.5, 1.22**
    - For any valid `Habit` object, calling `toggleHabitCompletion(toggleHabitCompletion(habit, true), false)` returns `completedDates` identical to the original array
    - `numRuns: 100`
    - _Requirements: 1.5, 1.22_
  - [ ]* 4.5 Write property test for delete removes exactly the target (Property 3)
    - **Property 3: Delete removes exactly the targeted habit**
    - **Validates: Requirements 1.4, 6.2**
    - For any non-empty habits array, `deleteHabit(habits, habits[i].id)` produces a list of length `habits.length - 1` containing no element with that id and all other elements unchanged
    - `numRuns: 100`
    - _Requirements: 1.4, 6.2_
  - [ ]* 4.6 Write property test for addHabit list grows by exactly one (Property 1)
    - **Property 1: Habit list grows by exactly one on valid add**
    - **Validates: Requirements 1.1**
    - For any habits array and valid non-empty name string, `addHabit(habits, createHabit(name, ...))` produces a list of `habits.length + 1`; the new habit is the last element and has the supplied name
    - `numRuns: 100`
    - _Requirements: 1.1_


- [ ] 5. Create `src/utils/reportUtils.ts`
  - [ ] 5.1 Implement `buildReportHTML` pure function
    - Create `src/utils/reportUtils.ts`
    - Export `buildReportHTML({ profile, habits, tasks }: ReportData): string`
    - The returned string is a complete self-contained HTML document with embedded CSS for print styling
    - Include: user display name, level, total XP, best streak, freeze credits used
    - Include a per-habit table with columns: Habit Name, Category, Period, Priority, Streak, Completions, Success Rate (%)
    - Include a 7-day completion summary section
    - Match the vanilla reference at `vanilla_backup/js/app.js` `exportToPDF` logic
    - _Requirements: 1.25_
  - [ ]* 5.2 Write unit tests for `buildReportHTML`
    - Create `src/test/reportUtils.test.ts`
    - Test: returned string contains `profile.display_name`, `profile.level`, `profile.total_xp`, and best streak value
    - Test: HTML contains `<table>` element with one row per habit
    - Test: empty habits array produces a valid HTML string (no crash)
    - _Requirements: 1.25_


- [ ] 6. Property-based tests for localStorage key isolation (Property 5) and theme toggle (Property 8)
  - [ ]* 6.1 Write property test for localStorage key isolation (Property 5)
    - Create `src/test/storageKeys.property.test.ts`
    - **Property 5: CRUD operations use the correct localStorage key**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6**
    - For any email string (non-empty) and guest flag, `buildStorageKey(email)` returns `habits_${email}` and `buildStorageKey(undefined)` returns `habits_guest`; assert no cross-contamination
    - `numRuns: 100`
    - _Requirements: 4.3, 4.4, 4.5, 4.6_
  - [ ]* 6.2 Write property test for theme toggle inverse (Property 8)
    - Add to `src/test/theme.test.ts`
    - **Property 8: Theme toggle is its own inverse**
    - **Validates: Requirements 1.18**
    - For any starting boolean `isLight`, toggling twice via `toggleTheme()` logic must return `document.documentElement.classList` and `localStorage.getItem('pps_theme')` to pre-toggle values
    - `numRuns: 50`
    - _Requirements: 1.18_


- [ ] 7. Fix `src/components/Login.tsx` — restore premium styling
  - [ ] 7.1 Restore Login page orb, gradient button, and guest button styling
    - Replace `min-height-screen` className typo with `min-h-screen` on the outer `<div>`
    - Ensure orb `<div>` elements carry both `bg-accent/5` and `bg-accent2/5` with `blur-[80px]` as spec'd in Requirement 2.19
    - Add `cursor-pointer` to the primary Sign In / Create Account button
    - Style the Guest Mode button to use `bg-surface-2 border border-border hover:border-border-bright text-text-2 hover:text-text` per Requirement 2.19
    - Ensure the OR divider span's background is `bg-[var(--card)]` (not a hardcoded hex) so it works in light mode
    - Add `text-text` explicitly to all input fields to ensure visibility (Requirement 2.20)
    - _Requirements: 2.19, 2.20, 4.1, 4.2_


- [ ] 8. Fix `src/components/Sidebar.tsx` — apply `nav-item` / `nav-item.active` classes
  - [ ] 8.1 Replace inline-style nav buttons with `nav-item` CSS class
    - Replace each `<button>` in the navigation `<ul>` with a button that receives `className={`nav-item${isActive ? ' active' : ''}`}`
    - Remove all inline `style={{...}}` overrides for `color`, `background`, `borderLeft`, `fontSize`, and `fontWeight` from nav buttons — these are now handled by `.nav-item` and `.nav-item.active` in `index.css`
    - Remove the `onMouseEnter` / `onMouseLeave` handlers from nav buttons — hover is handled by `.nav-item:hover` CSS
    - Keep `title={isCollapsed ? item.label : undefined}` and `onClick={() => handleNav(item.id)}` intact
    - For collapsed mode, add `justify-center` and `p-2.5` classes; for expanded, remove those overrides — use a conditional className string
    - _Requirements: 2.5, 2.6_
  - [ ]* 8.2 Write smoke test for Sidebar active state
    - Create `src/test/Sidebar.test.tsx`
    - Render `<Sidebar currentSection="dashboard" .../>` and assert the Dashboard button has class `nav-item active`
    - Render with `currentSection="analytics"` and assert Dashboard button has class `nav-item` (not active)
    - _Requirements: 2.6_


- [ ] 9. Fix `src/components/views/HabitManagerView.tsx` — button wiring and edit modal
  - [ ] 9.1 Add inline error state and disabled/loading states to all HabitManager buttons
    - Add `editError: string | null` state; set in `editHabit` `onError` callback; clear on next submit
    - Render `editError` as an inline `<div>` inside the edit modal form (same `bg-red/10` style as other views)
    - Add `disabled={isDeleting}` and loading spinner to each delete button (use `isDeleting` from `useHabits`)
    - Add `disabled={isEditing}` + spinner to the "Save Changes" button
    - Ensure "Add Habit Metric" button has `disabled:opacity-60 disabled:cursor-not-allowed` classes
    - Verify `addHabit` `onSuccess` callback clears `formError`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.23_
  - [ ]* 9.2 Write property test for edit modal pre-population (Property 2)
    - Add to `src/test/habitUtils.property.test.ts`
    - **Property 2: Edit modal pre-population is exact**
    - **Validates: Requirements 1.2**
    - For any `Habit` object generated via `fc.record(...)`, simulate `handleOpenEdit(habit)` logic and assert all five state fields equal the habit's corresponding values with no truncation or coercion
    - `numRuns: 100`
    - _Requirements: 1.2_


- [ ] 10. Fix `src/components/views/DailyTrackerView.tsx` — SVG progress circle and button states
  - [ ] 10.1 Verify and fix SVG progress circle dimensions and stroke
    - Confirm `<svg className="w-24 h-24">` uses `viewBox="0 0 96 96"` (currently missing `viewBox`) — add `viewBox="0 0 96 96"`
    - Confirm both `<circle>` elements use `cx="48" cy="48" r={radius}` where `radius = 36`
    - Confirm progress circle has `className="stroke-accent transition-all duration-500 ease-out"` for the 500ms transition (Requirement 2.10, 3.13)
    - Confirm `strokeDasharray={circumference}` and `strokeDashoffset={strokeDashoffset}` are set as numeric props (not string)
    - Confirm background circle has `className="stroke-surface-3"` (not inline fill)
    - _Requirements: 2.10, 3.13_
  - [ ] 10.2 Add `disabled` state and `disabled:opacity-60` to habit toggle buttons during mutation
    - Read `isToggling` from `useHabits()` hook
    - Add `disabled={isToggling}` to each toggle button `<button>` in the checklist grid
    - Add `disabled:cursor-not-allowed` class to the toggle button
    - _Requirements: 1.5, 1.23_


- [ ] 11. Fix `src/components/views/TasksView.tsx` — button wiring
  - [ ] 11.1 Wire `connectCalendar` buttons with loading and error states
    - Add `connectError: string | null` state; render inline below the calendar panel on error
    - Add `disabled={isConnecting}` + spinner to "Connect Google" and "Connect Outlook" buttons
    - Add `disabled:opacity-60 disabled:cursor-not-allowed` to both buttons
    - _Requirements: 1.21, 1.23_
  - [ ] 11.2 Add loading state to task checkbox toggle and delete buttons
    - Add `disabled={isToggling}` to each active task checkbox button; add `disabled:opacity-60`
    - Add `disabled={isDeleting}` to each delete (🗑️) button in the task list; add `disabled:cursor-not-allowed`
    - Add `taskError: string | null` state; display inline on `deleteTask` `onError`
    - _Requirements: 1.7, 1.8, 1.23_


- [ ] 12. Fix `src/components/views/ReflectionsView.tsx` — button wiring
  - [ ] 12.1 Add loading and error state to deleteReflection button
    - Add `deleteError: string | null` state; render as `<div className="p-3 ... bg-red/10 ...">` near the reflection list header
    - Add `disabled={isDeleting}` to each delete icon button; add `disabled:opacity-60 disabled:cursor-not-allowed`
    - Clear `deleteError` at the start of each `deleteReflection` call
    - _Requirements: 1.10, 1.23_

- [ ] 13. Fix `src/components/views/RemindersView.tsx` — button wiring
  - [ ] 13.1 Add loading and error states to toggleReminder and deleteReminder buttons
    - Add `deleteError: string | null` state; render inline above the reminders list on error
    - Add `disabled={isToggling}` to each toggle switch `<input>` element
    - Add `disabled={isDeleting}` to each delete button; add `disabled:opacity-60 disabled:cursor-not-allowed`
    - _Requirements: 1.12, 1.13, 1.23_


- [ ] 14. Fix `src/components/views/StreakEngineView.tsx` — XP atomicity and button states
  - [ ] 14.1 Add disabled states and loading spinner to Charge Shield buttons
    - Add `isBuying: boolean` state; set `true` before async calls, `false` in `finally`
    - Add `disabled={isBuying}` to "Charge Shield" button and all "Charge (75 XP)" per-habit buttons
    - Replace button text with `<span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin">` when `isBuying`
    - Confirm `handleBuyGlobalFreeze` and `handleBuyHabitFreeze` do NOT call `updateProfile` / `editHabit` if `addXp` throws (already gated by `try/catch` but verify `await` ordering is correct)
    - _Requirements: 1.14, 1.15, 1.23_
  - [ ]* 14.2 Write property test for XP atomicity (Property 7)
    - Add to `src/test/streakEngine.property.test.ts`
    - **Property 7: XP mutation atomicity — freeze credit only changes if XP deduction succeeds**
    - **Validates: Requirements 1.14, 1.15**
    - For any `total_xp` value and `freeze_credits` value, if `addXp(-cost)` is simulated to throw, then `freeze_credits` must remain unchanged at its pre-attempt value
    - Model the two-step transaction logic as a pure function and test with `fc.integer({ min: 0 })` for xp and `fc.integer({ min: 0, max: 5 })` for credits
    - `numRuns: 100`
    - _Requirements: 1.14, 1.15_


- [ ] 15. Fix `src/components/views/SettingsView.tsx` — wire PDF export and fix button states
  - [ ] 15.1 Implement `handleExportPDF` in SettingsView using `buildReportHTML`
    - Import `buildReportHTML` from `../utils/reportUtils`
    - Implement `handleExportPDF` as described in design section 10:
      - Call `buildReportHTML({ profile, habits, tasks })`
      - Try `window.open('', '_blank')`, write HTML, call `win.print()` after 800ms delay
      - Catch block: create `Blob`, `URL.createObjectURL`, create `<a>` tag, trigger download as `PPS_Report.html`, then `URL.revokeObjectURL`
    - Add an "Export PDF Report" button to the Backup & Data Controls panel that calls `handleExportPDF`
    - _Requirements: 1.25_
  - [ ] 15.2 Add loading/disabled states to all SettingsView form submit buttons
    - Add `isUpdatingName: boolean` state; set around `updateDisplayName` call
    - Add `isUpdatingPassword: boolean` state; set around `updatePassword` call
    - Add `isSavingPrefs: boolean` state; set around `updateProfile` call
    - Add spinner + `disabled` prop to "Update Name", "Change Password", and "Save Preferences" buttons
    - _Requirements: 1.16, 1.17, 1.23_
  - [ ]* 15.3 Write unit test for PDF export popup-blocked fallback
    - Add to `src/test/reportUtils.test.ts`
    - Mock `window.open` to return `null`
    - Call the export logic and assert a `<a>` element was created and `.click()` was called with `download` attribute ending in `.html`
    - _Requirements: 1.25_


- [ ] 16. Fix `src/components/views/DashboardView.tsx` — KPI cards and widget wiring
  - [ ] 16.1 Fix DashboardView imports to use exported `buildWeeklyBars` and `sortIntoLanes` from `habitUtils`
    - Replace the local `buildWeeklyBars` function definition with the import from `../../utils/habitUtils`
    - Replace the local `sortIntoLanes` function definition with the import from `../../utils/habitUtils`
    - Confirm `DashboardView.tsx` still compiles with no duplicate identifier errors
    - _Requirements: 3.10, 3.14_
  - [ ] 16.2 Fix KPI card gradient backgrounds to use CSS variable strings
    - Verify `KpiCard` `gradient` prop for card 01 is `"var(--kpi-purple-bg)"` (not a bare color) — this is already correct but confirm it resolves in light mode too
    - Add `hover:shadow-glow-amber`, `hover:shadow-glow-cyan`, `hover:shadow-glow-green` utility classes as needed to KPI cards 02–04 (classes exist in `index.css` but may be missing from KpiCard JSX)
    - _Requirements: 2.8, 3.9_
  - [ ] 16.3 Fix DashboardView focus lane toggle to call `toggleCompletion`
    - Confirm `handleToggle` in `DashboardView` passes correct `{ habit, isCompleted }` to `toggleCompletion` — already present; verify `isCompleted` is `!isDone` (the inverse of current state)
    - Add `disabled:opacity-60` to `FocusLane` item buttons when `isToggling` is true (pass `isToggling` from `useHabits` down to `FocusLane` as prop)
    - _Requirements: 1.22, 1.23_


- [ ] 17. Fix `src/components/views/AnalyticsView.tsx` — verify chart correctness
  - [ ] 17.1 Confirm heatmap, donut chart, and success index use correct data
    - Verify `buildHeatmapData(habits, heatmapRange)` call passes the full `habits` array (not a slice)
    - Verify the donut `<svg>` uses `viewBox="0 0 42 42"` and radius `15.91549430918954` — already correct; add `transform="rotate(-90 21 21)"` to the SVG root so the chart starts at 12 o'clock position
    - Verify `getHabitSuccessRates(habits, successWindow)` passes the numeric `successWindow` not a string
    - Add the empty-state fallback for the donut chart (already present) — confirm the condition is `categoryStats.length === 0` not `habits.length === 0`
    - _Requirements: 3.1, 3.3, 3.5, 3.6, 3.7, 3.8_
  - [ ] 17.2 Wire heatmap range buttons correctly
    - Confirm each range button's `onClick` calls `setHeatmapRange(opt.val as 91 | 182 | 365)` — already present; add `cursor-pointer` class to range buttons
    - Confirm 7D/30D window buttons call `setSuccessWindow(w as 7 | 30)` — already present; add `cursor-pointer`
    - _Requirements: 3.3, 3.8_


- [ ] 18. Checkpoint — verify foundation and component fixes
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run build` and confirm zero TypeScript errors
  - Run `npm run test` and confirm all property and unit tests pass

- [ ] 19. Create `src/components/PerfectDayModal.tsx`
  - [ ] 19.1 Implement PerfectDayModal as a React Portal
    - Create `src/components/PerfectDayModal.tsx`
    - Use `ReactDOM.createPortal` targeting `document.body`
    - Internal state: `isOpen: boolean`, `streakCount: number`
    - Mount a `useEffect` that adds an event listener for `'perfectDayUnlocked'` CustomEvent; extract `event.detail.streak` to set `streakCount` and set `isOpen = true`
    - Remove event listener in the effect cleanup
    - Auto-dismiss: use `useEffect` on `isOpen`; if `isOpen`, set a `setTimeout` for 6000ms that calls `setIsOpen(false)`, clear on cleanup
    - Render structure exactly as in design section 1: `fixed inset-0 bg-bg/80 backdrop-blur-md ... z-[60]` overlay with `glass-panel` card containing trophy emoji, "Perfect Day!" heading, completion count text, streak count, and "Continue 🔥" close button
    - Add bonus XP award: import `useAuth` to call `addXp(50)` when modal opens
    - Export `PerfectDayModal` as a named export
    - _Requirements: 1.24, 2.14_
  - [ ]* 19.2 Write unit test for PerfectDayModal event handling
    - Create `src/test/PerfectDayModal.test.tsx`
    - Test: modal is not visible before the `perfectDayUnlocked` event
    - Test: after dispatching `document.dispatchEvent(new CustomEvent('perfectDayUnlocked', { detail: { streak: 5 } }))`, the modal becomes visible and displays "Streak: 5 days"
    - Test: clicking "Continue 🔥" closes the modal
    - Test: modal closes automatically after 6 seconds (use `vi.useFakeTimers()`)
    - _Requirements: 1.24_


- [ ] 20. Wire `PerfectDayModal` into `App.tsx`
  - [ ] 20.1 Import and render PerfectDayModal in App.tsx
    - Import `PerfectDayModal` from `./components/PerfectDayModal`
    - Render `<PerfectDayModal />` inside the authenticated app layout, after the `<Sidebar>` and before `<main>` — the portal itself handles placement on `document.body`, so no layout impact
    - _Requirements: 1.24_

- [ ] 21. Create `src/components/views/SocialView.tsx`
  - [ ] 21.1 Implement SocialView with mock leaderboard and weekly challenge
    - Create `src/components/views/SocialView.tsx`
    - Define `LeaderboardEntry` and `WeeklyChallenge` interfaces as in design section 2
    - Hard-code 10 mock leaderboard entries; highlight the current user's row with `border-accent/30` styling
    - Compute `currentCompletions` from real `useHabits()` data: count completions in the current 7-day window
    - Render weekly challenge card with a gradient progress bar (`from-accent to-accent2`) filled to `(currentCompletions / weeklyChallenge.targetCompletions) * 100`%
    - Render leaderboard as a styled table with rank, name, XP, streak, and badge columns
    - Include the Beta badge header as in design
    - _Requirements: 1.26_
  - [ ]* 21.2 Write unit test for SocialView weekly challenge bar fill
    - Create `src/test/SocialView.test.tsx`
    - Mock `useHabits` to return habits with known completions in the last 7 days
    - Assert the challenge progress bar has the correct `width` style percentage
    - _Requirements: 1.26_


- [ ] 22. Wire `SocialView` into `App.tsx`
  - [ ] 22.1 Replace `SocialComingSoon` placeholder with real `SocialView` component
    - Import `SocialView` from `./components/views/SocialView`
    - In `renderView()`, replace the `case 'social': return <SocialComingSoon />;` line with `case 'social': return <SocialView />;`
    - Remove the `SocialComingSoon` inline component definition from `App.tsx`
    - _Requirements: 1.26_

