# Design Document — React Migration Completion (PPS)

## Overview

The Personal Performance System (PPS) is a React 18 + TypeScript + Vite single-page application migrated from a vanilla HTML/JS/CSS prototype. The skeleton (components, hooks, and utils) is in place; this design closes three concrete gaps to make the app production-ready:

1. **All interactive buttons must be functional** — every onClick handler wired to a TanStack React Query mutation must show loading state, handle errors inline, and reset correctly on success.
2. **Premium glassmorphism UI must be fully restored** — CSS variables in `index.css` drive all visual tokens; Tailwind v4 `@theme` mappings and utility helpers ensure every component references these tokens consistently.
3. **Data-visualisation components render correctly** — the heatmap, donut chart, progress circle, KPI cards, and bar chart all consume pure functions from `habitUtils.ts` with the correct call signatures.

Three new components are also specified here: `PerfectDayModal`, `SocialView`, and `XpPopAnimation`. The design covers their architecture, integration points, and behavioural contracts.

The vanilla backup (`vanilla_backup/`) is the authoritative reference for both business logic and visual design. Where the React port diverges from the backup, the backup wins unless an explicit design decision below overrides it.

---

## Architecture

### High-Level Component Tree

```
App
├── AuthProvider (Context)
│   └── QueryClientProvider (TanStack RQ v5)
│       ├── Login            ← shown when !user
│       └── MainLayout       ← shown when user exists
│           ├── Sidebar (glass-sidebar, collapsible/drawer)
│           ├── MobileHeader (☰ button, hidden ≥1024px)
│           ├── PerfectDayModal (portal, triggered via CustomEvent)
│           └── <CurrentView> (one of 11 views, routed by state)
```

### State Management Strategy

| Concern | Owner | Notes |
|---|---|---|
| Auth session + user profile | `AuthContext` (React Context) | Single source; persists to `localStorage` for guest |
| Habits, tasks, reflections, reminders | TanStack React Query (`useQuery` + `useMutation`) | Cache key: `[entity, userId]`; invalidated on mutation success |
| UI-only state (modals, filters, form fields) | Local `useState` within each view | Never lifted above the view boundary |
| Theme preference | `localStorage` `pps_theme` + `document.documentElement.classList` | Initialised in `App.tsx` `useEffect` |
| Sidebar collapse / drawer | `App.tsx` state, passed down as props | `isCollapsed` drives both the CSS class and the backdrop overlay |

### Data Flow for Mutations (Standard Pattern)

Every mutation-backed button follows this invariant contract:

```
Button click
  → isPending? → show inline spinner, disable button
  → call mutationFn (localStorage or Supabase)
  → onSuccess → invalidateQueries + reset local form state
  → onError   → set inline error string, do NOT update cache
```

This pattern is already implemented for `addHabit` / `editHabit` / `deleteHabit`. All other mutations (tasks, reflections, reminders, streak freezes) must follow the same pattern exactly.

---

## Components and Interfaces

### 1. PerfectDayModal (`src/components/PerfectDayModal.tsx`)

**Trigger:** `useHabits.toggleCompletionMutation` dispatches `document.dispatchEvent(new CustomEvent('perfectDayUnlocked', { detail: { streak } }))` when all due habits are completed on the current day and today is not already in `profile.perfect_days`.

**Mounting:** The modal is rendered as a React Portal (`ReactDOM.createPortal`) appended to `document.body` inside `App.tsx`. It listens for the `perfectDayUnlocked` custom event via `useEffect` on mount.

**Interface:**
```tsx
interface PerfectDayModalProps {
  // no props — driven entirely by the CustomEvent
}

// Internal state:
// isOpen: boolean
// streakCount: number   — extracted from event.detail.streak
```

**Rendering structure:**
```
<Portal>
  <div className="fixed inset-0 bg-bg/80 backdrop-blur-md flex items-center justify-center z-[60]">
    <div className="glass-panel p-8 rounded-radius border border-accent/30 shadow-glow-accent text-center max-w-sm w-full space-y-4">
      <div className="text-6xl animate-flame">🏆</div>
      <h2 className="font-syne text-2xl font-extrabold text-text">Perfect Day!</h2>
      <p className="text-muted text-sm">All {count} habits completed. +50 XP bonus awarded.</p>
      <p className="text-accent font-mono text-xs">Streak: {streakCount} days</p>
      <button onClick={close} className="bg-gradient-to-r from-accent to-accent2 text-white font-bold px-6 py-2.5 rounded-radius text-sm shadow-glow-accent">
        Continue 🔥
      </button>
    </div>
  </div>
</Portal>
```

**Auto-dismiss:** The modal closes automatically after 6 seconds if the user does not click the button.

---

### 2. SocialView (`src/components/views/SocialView.tsx`)

The Social view replaces the `SocialComingSoon` placeholder in `App.tsx`. It renders mock data (no backend) for MVP.

**Interface (internal state):**
```tsx
interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  streak: number;
  badge: string; // emoji
}

interface WeeklyChallenge {
  title: string;
  description: string;
  targetCompletions: number;
  currentCompletions: number; // derived from local habits
}
```

**Rendering structure:**
- Header with Beta badge
- Weekly Challenge card: gradient progress bar from `var(--accent)` to `var(--accent2)`
- Leaderboard table: top 10 mock entries, current user highlighted with `border-accent/30` row
- `currentCompletions` is computed from the real `useHabits()` data for the current 7-day window, giving the user a real contribution to the mock challenge

---

### 3. XpPopAnimation (inline component in `DailyTrackerView.tsx`)

The XP pop animation is already implemented as an inline `FloatingPop` mechanism in `DailyTrackerView`. It spawns absolutely-positioned `+XP` text elements at the toggle button's bounding rect and applies the `animate-xp-pop` keyframe (defined in `index.css`).

**Key behaviours:**
- Spawned on `isNowCompleted === true` in `handleToggle`
- Each pop is identified by `Date.now() + Math.random()` to prevent key collisions on rapid clicks
- Removed from state after 800 ms (100 ms before the 900 ms total animation duration ends, per `xpPopAnim` which runs for 1.1s)
- Uses `position: fixed` coordinates from `getBoundingClientRect()` to place the pop above the button regardless of scroll position

**No changes needed** — this component is already complete in the current codebase.

---

### 4. Sidebar — Mobile Drawer vs Inline (existing `Sidebar.tsx`)

The existing sidebar already implements the two-mode behaviour via the `.sidebar` / `.sidebar.collapsed` CSS classes in `index.css`:

| Viewport | Behaviour | CSS |
|---|---|---|
| ≥ 1024px | Inline, 240px expanded / 68px collapsed | `.sidebar` / `.sidebar.collapsed` |
| < 1024px | Fixed overlay drawer; collapsed = `translateX(-100%)` | `@media (max-width: 1023px)` block in `index.css` |

`App.tsx` manages `isSidebarCollapsed` state and passes it to `Sidebar`. The `handleResize` effect in `App.tsx` sets `isSidebarCollapsed(true)` on screens narrower than 1024px (which translates the sidebar off-screen) and `isSidebarCollapsed(false)` on wide screens (which brings it back inline at full width). The `MobileHeader` hamburger button calls `setIsSidebarCollapsed(false)`.

**One gap to close:** When resizing from narrow → wide while the mobile backdrop is visible, the backdrop overlay div must also be unmounted. The current condition `!isSidebarCollapsed && window.innerWidth < 1024` in `App.tsx` already handles this correctly because the resize handler sets `isSidebarCollapsed(false)` which removes the backdrop.

---

### 5. Button Loading / Error State Pattern

Every CTA button that triggers a mutation follows this render pattern:

```tsx
<button
  type="submit"
  disabled={isMutating}
  className="... cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
>
  {isMutating ? (
    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  ) : (
    'Button Label'
  )}
</button>
```

Error messages are rendered as sibling `<div>` elements inside the same `<form>`:
```tsx
{mutationError && (
  <div className="p-3 rounded-radius-sm bg-red/10 border border-red/20 text-red text-xs font-mono">
    ⚠️ {mutationError}
  </div>
)}
```

The `mutationError` string is set in the mutation's `onError` callback and cleared in `onSuccess` and at the top of the event handler.

---

### 6. Analytics Heatmap — CSS Grid Approach

The heatmap renders via a CSS `grid-flow-col` grid with 7 rows and `heatmapData.weeks` auto-generated columns.

```tsx
<div
  className="grid grid-rows-7 grid-flow-col gap-[3px]"
  style={{
    gridTemplateColumns: `repeat(${heatmapData.weeks}, minmax(0, 1fr))`,
    width: `${heatmapData.weeks * 13}px`,
  }}
>
  {heatmapData.cells.map((cell) => (
    <div className={`w-[10px] h-[10px] rounded-[2px] border ${getIntensityClass(cell.intensity)}`} />
  ))}
</div>
```

`getIntensityClass` maps intensity 0–4 to Tailwind opacity-variant classes:

| Intensity | Class |
|---|---|
| 0 | `bg-surface-3 border-white/5` |
| 1 | `bg-accent/20 border-accent/10` |
| 2 | `bg-accent/40 border-accent/20` |
| 3 | `bg-accent/75 border-accent/30` |
| 4 | `bg-accent border-accent/45 shadow-glow-accent` |

This is **already implemented** in `AnalyticsView.tsx`. No changes are needed to the heatmap rendering logic.

**Intensity thresholds** (from requirements 3.1): 0 completions → 0; 1–24% of habit count → 1; 25–49% → 2; 50–74% → 3; ≥75% → 4. These match the `buildHeatmapData` function in `habitUtils.ts` exactly.

---

### 7. SVG Donut Chart — AnalyticsView

The donut chart uses SVG `<circle>` elements with `strokeDasharray` and `strokeDashoffset` calculated from percentage data. The SVG coordinate space uses radius `15.91549430918954` (= 100 / (2π)) so that 1 unit of `strokeDasharray` equals 1% of circumference.

```
strokeDasharray  = `${pct} ${100 - pct}`
strokeDashoffset = 100 - accumulatedPercent + 25   // +25 rotates to 12 o'clock
```

This is **already implemented** in `AnalyticsView.tsx`. The placeholder for empty data (`categoryStats.length === 0`) is also already in place.

---

### 8. DailyTracker SVG Progress Circle

The progress circle uses a 96×96 SVG (viewBox implied by `w-24 h-24`) with radius 36, rotated -90° so 0% starts at 12 o'clock.

```
circumference    = 2 * π * 36 ≈ 226.19
strokeDashoffset = circumference - (completionPercentage / 100) * circumference
```

The `<circle>` element carries `className="stroke-accent transition-all duration-500 ease-out"` for the 500 ms smooth transition required by Requirement 3.13. This is **already implemented** in `DailyTrackerView.tsx`.

---

### 9. Focus Lane Dynamic Sorting (`DashboardView`)

The `sortIntoLanes` helper partitions habits due today into four priority buckets, with completed items always sinking to a dedicated `done` lane:

```
critical = dueToday WHERE priority==='High'    AND NOT completedToday
high     = dueToday WHERE priority==='Medium'  AND NOT completedToday
medium   = dueToday WHERE priority IN ['Low','Optional'] AND NOT completedToday
done     = dueToday WHERE completedToday
upcoming = NOT dueToday
```

This is **already implemented** in `DashboardView.tsx`. The `FocusLane` component renders each lane and calls `toggleCompletion` on click, which triggers a React Query cache invalidation and causes the lane assignment to recompute on the next render cycle (optimistic update via cache invalidation).

---

### 10. PDF Export — SettingsView

**Approach:** Generate an HTML string in memory (no third-party PDF library), open it in a new browser tab, and call `window.print()` after an 800 ms delay. This mirrors the vanilla `exportToPDF()` function in `vanilla_backup/js/app.js`.

**React implementation in `SettingsView`:**
```tsx
const handleExportPDF = () => {
  const reportHTML = buildReportHTML({ profile, habits, tasks });
  try {
    const win = window.open('', '_blank');
    if (!win) throw new Error('popup blocked');
    win.document.write(reportHTML);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 800);
  } catch {
    // Fallback: download as .html file
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'PPS_Report.html'; a.click();
    URL.revokeObjectURL(url);
  }
};
```

`buildReportHTML` is a pure function that accepts profile, habits, and tasks data and returns a complete HTML string with embedded CSS for print styling, level/XP statistics, best streak, and a per-habit completion table (name, category, period, priority, streak, completions, success rate). It lives in `src/utils/reportUtils.ts`.

---

### 11. Theme Toggle Persistence

The theme toggle is implemented in `SettingsView` and initialised in `App.tsx`. The contract:

- On every page load `App.tsx` reads `localStorage.getItem('pps_theme')` and adds/removes the `.light` class from `document.documentElement`.
- `SettingsView` maintains `isLight` state, initialised from `document.documentElement.classList.contains('light')`.
- Clicking the button calls `toggleTheme()`:
  1. Flips `isLight` local state
  2. Adds/removes `.light` class on `document.documentElement`
  3. Writes `'light'` or `'dark'` to `localStorage` under key `pps_theme`
- The `.light` class overrides in `index.css` take effect immediately since they shadow all `:root` variable values.

This is **already fully implemented** in the current `SettingsView.tsx` and `App.tsx`.

---

## Data Models

### Habit (from `habitUtils.ts`)
```typescript
interface Habit {
  id: number;                 // Date.now() at creation
  name: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low' | 'Optional';
  period: 'Daily' | 'Weekly' | 'Monthly' | 'Today';
  dueDate: string;            // ISO — next due date
  completedDates: string[];   // 'YYYY-MM-DD' strings
  streak: number;
  lastCompletedDate: string | null;
  freezeCredits: number;      // 0–3 per habit
}
```

### UserProfile (from `useAuth.tsx`)
```typescript
interface UserProfile {
  id?: string;
  display_name: string;
  total_xp: number;
  level: number;
  streak: number;             // overall login/momentum streak
  freeze_credits: number;     // global freeze credits
  total_credits_used: number;
  perfect_days: string[];     // 'YYYY-MM-DD' strings
  login_streak: number;
  last_login_date: string | null;
  xp_per_completion: number;  // configurable, default 10
  max_freeze_credits: number; // configurable, default 2
}
```

### TaskItem (from `useTasks.ts`)
```typescript
interface TaskItem {
  id: number | string;
  title: string;
  dueDate: string;
  note: string;
  emailReminder: boolean;
  done: boolean;
  createdAt: string;
}
```

### ReflectionEntry (from `useReflections.ts`)
```typescript
interface ReflectionEntry {
  id?: number | string;
  date: string;               // 'YYYY-MM-DD'
  text: string;
  mood: 'great' | 'okay' | 'low' | 'stress';
  habitId: number | null;
  habitName: string | null;
}
```

### ReminderItem (from `useReminders.ts`)
```typescript
interface ReminderItem {
  id: number | string;
  label: string;
  time: string;               // 'HH:MM'
  repeat: 'Every Day' | 'Weekdays' | 'Weekends';
  enabled: boolean;
}
```

### localStorage Key Schema

| Key pattern | Owner | Content |
|---|---|---|
| `habits_{email\|guest}` | `useHabits` | `Habit[]` |
| `pps_tasks_{email\|guest}` | `useTasks` | `TaskItem[]` |
| `reflections_{email\|guest}` | `useReflections` | `ReflectionEntry[]` |
| `reminders_{email\|guest}` | `useReminders` | `ReminderItem[]` |
| `pps_profile_{email\|guest}` | `useAuth` | `UserProfile` |
| `currentUser` | `useAuth` | `AuthUser` (with expiry for guests) |
| `pps_theme` | `SettingsView` / `App` | `'light' \| 'dark'` |
| `pps_calendar_connection_{email\|guest}` | `useTasks` | `CalendarConnection` |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Habit list grows by exactly one on valid add

*For any* habit list and any valid (non-empty name) habit input, calling `addHabit` should result in the list length increasing by exactly 1 and the new habit appearing as the last element.

**Validates: Requirements 1.1**

---

### Property 2: Edit modal pre-population is exact

*For any* habit object in the habits array, opening the edit modal should populate the form fields with values that exactly match the habit's `name`, `category`, `period`, `priority`, and `freezeCredits` fields — no truncation, no type coercion.

**Validates: Requirements 1.2**

---

### Property 3: Delete removes exactly the targeted habit

*For any* habit list containing a habit with a given `id`, calling `deleteHabit(id)` should produce a new list in which no element has that `id`, and all other elements remain unchanged in order and value.

**Validates: Requirements 1.4, 6.2**

---

### Property 4: Toggle completion is a round-trip

*For any* habit and any toggle state, calling `toggleCompletion` twice (complete then uncomplete, or vice versa) should return the `completedDates` array to its original contents. Streak values should also return to their pre-toggle state if no daily reset has occurred between the two calls.

**Validates: Requirements 1.5, 1.22**

---

### Property 5: CRUD operations use the correct localStorage key

*For any* user session (guest or authenticated), every read and write operation on habits, tasks, reflections, and reminders must use a storage key that ends with `_{user.email}` for authenticated users and ends with `_guest` for guest users. No operation should ever read from or write to a key belonging to a different user's session.

**Validates: Requirements 4.3, 4.4, 4.5, 4.6**

---

### Property 6: Expired guest sessions are always cleared

*For any* `AuthUser` object stored in `localStorage` under `currentUser` where `isGuest === true` and `expiry < Date.now()`, the `AuthProvider` initialisation path must remove the entry and set `user` to `null`, never rendering the main app.

**Validates: Requirements 4.10**

---

### Property 7: XP mutation atomicity — freeze credit only changes if XP deduction succeeds

*For any* StreakEngine freeze credit purchase attempt, if the call to `addXp(-cost)` throws or rejects, then `freeze_credits` in the profile must remain unchanged from its pre-attempt value. The two-step sequence (deduct XP, then increment freeze) must not leave the system in a half-applied state.

**Validates: Requirements 1.14, 1.15**

---

### Property 8: Theme toggle is its own inverse

*For any* starting theme state (`isLight`), toggling the theme twice must return `document.documentElement.classList` and `localStorage.pps_theme` to exactly their pre-toggle values.

**Validates: Requirements 1.18**

---

### Property 9: Heatmap intensity levels match the completion-ratio formula

*For any* habits array and any `heatmapRange` value (91, 182, or 365), every cell produced by `buildHeatmapData` must satisfy:
- `count === 0` → `intensity === 0`
- `0 < count / habitCount < 0.25` → `intensity === 1`
- `0.25 ≤ count / habitCount < 0.5` → `intensity === 2`
- `0.5 ≤ count / habitCount < 0.75` → `intensity === 3`
- `count / habitCount ≥ 0.75` → `intensity === 4`

where `habitCount` is `Math.max(1, habits.length)`.

**Validates: Requirements 3.1, 3.2**

---

### Property 10: Success index percentage is clamped to 100%

*For any* habit with any number of `completedDates` and any `windowDays` value (7 or 30), `getHabitSuccessRates` must return a `percent` value in the range `[0, 100]` inclusive, calculated as `min(round(doneInPeriod / windowDays * 100), 100)`.

**Validates: Requirements 3.7**

---

### Property 11: Analytics KPI values match their formulas exactly

*For any* habits array and profile object, the four KPI values rendered in `AnalyticsView` must equal:
- `overallCompRate = round(totalCompletions / (habits.length * 30) * 100)`, clamped to 100% and 0% (returns 0 when `habits.length === 0`)
- `bestStreak = max(0, ...habits.map(h => h.streak))`
- `totalCompletions = sum of h.completedDates.length for all h`
- `totalXP = profile.total_xp`

**Validates: Requirements 3.9**

---

### Property 12: Focus lane sort invariant

*For any* habits array, `sortIntoLanes` must produce output such that:
- Every habit in `critical` has `priority === 'High'` and is not completed today
- Every habit in `high` has `priority === 'Medium'` and is not completed today
- Every habit in `medium` has `priority` of `'Low'` or `'Optional'` and is not completed today
- Every habit in `done` is completed today (i.e., its `completedDates` includes today's `YYYY-MM-DD` string)
- Every habit in `upcoming` fails `isHabitDueToday`
- The union of all five lane arrays equals the full habits array (no habit is lost or duplicated)

**Validates: Requirements 3.14**

---

### Property 13: Weekly bar chart minimum height invariant

*For any* habits array, every bar produced by `buildWeeklyBars` must have an effective rendered height percentage of at least 4%, even when `count === 0` for that day. The maximum bar corresponds to `heightPct = 100%` when `count === maxCount`.

**Validates: Requirements 3.10**

---

### Property 14: XP level formula is consistent

*For any* `total_xp` value ≥ 0, the computed `level` must equal `Math.floor(total_xp / 100) + 1`. After every `addXp` call that increments `total_xp` by `amount`, the new level must be re-derived from the new `total_xp` using this same formula, never from any cached intermediate value.

**Validates: Requirements 6.5**

---

## Error Handling

### Mutation Error Strategy

Every mutation (`addHabit`, `editHabit`, `deleteHabit`, `addTask`, `toggleTask`, `deleteTask`, `saveReflection`, `deleteReflection`, `addReminder`, `toggleReminder`, `deleteReminder`) follows the same error contract:

1. **Optimistic updates are NOT used** — the React Query cache is only updated on `onSuccess` (via `invalidateQueries`). This means the UI reflects the pre-mutation state until the mutation completes.
2. **Inline error display** — the calling component maintains a `string | null` error state. `onError` sets it; `onSuccess` and the next form submission clear it.
3. **No full-page error boundaries** — errors from individual mutations never crash the app. The error is scoped to the affected form section.
4. **Supabase errors** — the Supabase client throws typed errors. The `mutationFn` propagates them; the component catches them in `onError(err)` and displays `err.message`.

### Auth Error Strategy

- `login` / `signUp` errors are displayed on the `Login` component via the `error` string from `AuthContext`.
- `updateDisplayName` / `updatePassword` / `updateProfile` errors are caught within their respective `SettingsView` handlers and displayed inline.
- Profile fetch errors on initial session load fall back to a default profile object rather than blocking the app.

### Guest Mode Degradation

- If `localStorage` is unavailable (e.g., private browsing with storage blocked), all `loadHabitsFromStorage` / `saveHabitsToStorage` calls catch errors and return empty arrays / no-ops. The UI remains functional but data is not persisted.

### Supabase Unavailability

- `isSupabaseConfigured()` is checked before every Supabase call. If not configured, all hooks fall back to `localStorage` mode — even for authenticated users. This prevents hard crashes when `.env` vars are missing.

### XP / Freeze Credit Atomicity

The `handleBuyGlobalFreeze` and `handleBuyHabitFreeze` handlers in `StreakEngineView` follow a manual two-step transaction:

```
try {
  await addXp(-cost);       // Step 1: deduct XP
  await updateProfile(...); // Step 2: increment freeze
  setSuccess(...);
} catch (err) {
  setError(...);
  // freeze_credits is NOT modified because step 2 never ran
}
```

Because `addXp` and `updateProfile` both update the `profiles` table via Supabase, a network failure after step 1 but before step 2 could leave XP deducted without a freeze credit. This race is acceptable for the current MVP; a proper DB transaction or serverless function would be required to make it fully atomic.

---

## Testing Strategy

### Approach

The codebase contains a mix of pure utility functions and React components wired to TanStack React Query mutations. The testing strategy uses a **dual-layer** approach:

- **Unit / property-based tests** for pure functions in `habitUtils.ts`, `reportUtils.ts`, and the pure computation helpers embedded in view components (`sortIntoLanes`, `buildWeeklyBars`, `getIntensityClass`).
- **Component integration tests** (React Testing Library) for mutation-backed buttons, form reset behaviour, and conditional rendering (modals, error states, loading spinners).
- **Smoke / example tests** for Guest Mode session management and theme persistence.

### Property-Based Testing Library

Use **[fast-check](https://github.com/dubzzz/fast-check)** (TypeScript-native, no additional dependencies needed beyond `npm install --save-dev fast-check`). Configure each property test to run a minimum of **100 iterations** (`numRuns: 100`).

Tag format for each property test:
```
// Feature: react-migration-completion, Property N: <property_text>
```

### Unit Tests (Example-Based)

Focus on these specific scenarios that the property generators do not naturally cover:

1. `addHabit` with an empty string name is rejected with a form error and does not call the mutation.
2. `toggleCompletion` on a habit already completed today is treated as an "uncomplete" action.
3. Guest session with `expiry` in the past is cleared and the Login screen is shown.
4. Theme initialisation reads `localStorage.pps_theme` before rendering anything.
5. `PerfectDayModal` opens on `perfectDayUnlocked` event and closes after 6 seconds.
6. `SocialView` renders the weekly challenge bar at the correct fill percentage.
7. `exportToPDF` fallback: when `window.open` returns `null` (popup blocked), downloads an `.html` file instead.
8. `buildReportHTML` returns a string containing the user's display name, level, total XP, and best streak.

### Integration Tests

These cover wiring between the hooks and Supabase/localStorage but are run with 1–3 concrete examples (not randomised):

1. After `addHabit` with Supabase configured, the `['habits', userId]` React Query cache is invalidated.
2. `useAuth` creates a default profile row when Supabase returns `PGRST116` error.
3. After `toggleCompletion` that completes the last due habit, the `perfectDayUnlocked` CustomEvent is dispatched.
4. `useReminders` stores reminders sorted ascending by `time` in localStorage.

### Smoke Tests

1. App loads without console errors when no Supabase env vars are set.
2. All 10 view components render without throwing when `habits = []` and `profile = defaultGuestProfile`.
3. The `light` class on `document.documentElement` switches all CSS variable tokens to their light-mode overrides.

### Property Test Configuration

```typescript
// Example property test structure
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('Feature: react-migration-completion', () => {
  // Feature: react-migration-completion, Property 9: Heatmap intensity levels match the completion-ratio formula
  it('Property 9: Heatmap intensity levels match the completion-ratio formula', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ completedDates: fc.array(fc.string()) })),
        fc.constantFrom(91, 182, 365),
        (habits, range) => {
          const data = buildHeatmapData(habits as any, range);
          const habitCount = Math.max(1, habits.length);
          return data.cells.every(cell => {
            const ratio = cell.count / habitCount;
            const expected =
              cell.count === 0 ? 0 :
              ratio < 0.25 ? 1 :
              ratio < 0.5  ? 2 :
              ratio < 0.75 ? 3 : 4;
            return cell.intensity === expected;
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Regression Coverage

The following edge cases from the vanilla backup are explicitly covered by the unit test suite:

| Vanilla behaviour | React equivalent | Test type |
|---|---|---|
| `"Today"` period habits are not daily-reset | `applyDailyResetToHabit` skips `Today` period | Unit |
| Streak stays at 0 when same day re-toggled | `toggleHabitCompletion` diff === 0 path | Unit |
| Multiple categories → donut percentages sum ≈ 100 | `categoryStats` accumulation | Property |
| Empty habits array → `getBestStreak` returns 0 | `Math.max(0, ...empty)` safety | Unit |
| Popup blocked on PDF export → HTML download fallback | `handleExportPDF` catch block | Unit |

---
