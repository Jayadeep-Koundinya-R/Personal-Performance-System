# PPS Authentication System — Developer Guide

> **CRITICAL**: This document describes the authentication flow for the entire application. Breaking changes to auth code will lock users out or corrupt their data. Always read this before modifying `src/hooks/use-auth.ts` or `src/pages/Login.tsx`.

## 1. Auth Flow Overview

The app supports 4 authentication modes:

### Sign In
1. User enters email + password on `/login`
2. `supabase.auth.signInWithPassword()` is called
3. On success → redirect to `/dashboard`
4. On failure → mapped error message displayed (see §5)
5. Network errors trigger 3 retries with exponential backoff (1s, 2s, 4s)
6. After 3 failed retries → "Unable to connect" message with manual retry button

### Sign Up
1. User enters email + password (8+ chars, 1 uppercase, 1 number) + confirm
2. `supabase.auth.signUp()` is called
3. **With email confirmation OFF (beta default)**: Session returned immediately → auto-login → redirect to `/dashboard`
4. **With email confirmation ON (future)**: No session → "Check your email" message
5. Network errors → blocked with clear error (NO auto-retry — prevents email spam)
6. Demo data migration runs automatically after signup if session exists

### Demo (Guest)
1. User picks a quick profile (Alex/Sarah/Explorer) or enters a custom name
2. `loginAsGuest(name)` creates a local guest session
3. Trial duration: **5 days** (controlled by `TRIAL_DURATION_DAYS` in `use-auth.ts`)
4. When trial expires → redirect to `/login?tab=demo&expired=true`
5. User sees "Your demo has expired. Create an account to keep your progress."

### Google OAuth
1. User clicks "Continue with Google"
2. Redirects to Google's OAuth consent screen
3. Callback returns to app with auth tokens in URL hash
4. `onAuthStateChange` listener processes the session

## 2. Supabase Configuration

### Environment Variables
```
VITE_SUPABASE_URL=https://dmsmlspmzgsbphdytout.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_IgMnDJjGE742AqKL1FMRfQ_9bYl71gx
```

### Supabase Dashboard Settings (Must Configure)
1. **Authentication → Providers → Email → Confirm email = OFF** (beta default)
   - When OFF: `signUp()` returns session immediately, no email verification needed
   - When ON (future): Users must click confirmation link before logging in
   - Re-enable when custom domain + SMTP is configured

2. **Authentication → Settings → Password → Minimum length = 8**
   - Server-side enforcement; client-side checks in `validatePasswordStrength()`

3. **Authentication → Providers → Google → Enable**
   - Configure with Google Cloud OAuth credentials

4. **Authentication → URL Configuration**
   - Site URL = production URL
   - Redirect URLs = production URL + `http://localhost:5173/` for dev

## 3. Session Management

### Session Duration
- Default: **7 days**
- Customizable via dropdown on login form: 1 day, 7 days, 30 days
- Stored in `localStorage` as `pps_session_duration` (string, in days)
- Login timestamp stored as `pps_login_timestamp` (Unix ms)

### Session Check on App Load
- On app load, the app checks if `Date.now() - pps_login_timestamp > pps_session_duration * 86400000`
- If expired → calls `supabase.auth.signOut()` → clears user state → user sees login page
- **CRITICAL**: Only signs out on explicit expiry. Never on network errors.
- If `signOut()` fails due to network error → does NOT force local sign-out (user stays logged in until next successful check)

### Guest Session Storage
- `pps_guest` = "true" (boolean flag, always localStorage)
- `pps_guest_name` = display name
- `pps_guest_created_at` = trial start timestamp (ISO string)
- `pps_guest_onboarded` = "true" (onboarding completion flag)
- Cookie `pps_gt` = backup timestamp (in case localStorage is cleared)

## 4. Demo Mode

### Trial Tracking
- `TRIAL_DURATION_DAYS = 5` in `use-auth.ts`
- Guest creation timestamp stored in `pps_guest_created_at`
- Remaining days calculated: `TRIAL_DURATION_DAYS - elapsed_days`
- When elapsed >= 5 days → `isGuestTrialExpired = true`

### Demo Expiry Flow
1. `OnboardingGuard` detects `isGuestTrialExpired`
2. Redirects to `/login?tab=demo&expired=true`
3. Login page shows success message: "Your demo has expired. Create an account to keep your progress."
4. Auto-switches to Sign Up tab

### Data Migration
- When a demo user signs up and creates an account, their guest data is automatically migrated:
  - Habits → `habits` table
  - Reflections → `reflections` table
  - Reminders → `reminders` table
  - Settings → `user_settings` table
- Migration runs in `signup()` when session is returned (confirmation OFF)
- Fallback: also runs in `onAuthStateChange` listener
- Only runs once per session (guarded by `migrationInProgress` flag)
- On success: clears all guest data from localStorage

## 5. Error Handling

### Error Mapping Table
| Supabase Error Code | Message | User-Friendly |
|---------------------|---------|---------------|
| `invalid_credentials` | "Invalid login credentials" | "Email or password is incorrect. Please try again." |
| `email_not_confirmed` | "Email not confirmed" | "Please check your email and click the confirmation link before logging in." |
| `user_already_exists` | "User already registered" | "An account with this email may already exist. Try logging in, or use a different email." |
| `weak_password` | "Password should be at least 6 characters" | "Password must be at least 8 characters with 1 uppercase letter and 1 number." |
| `over_request_rate_limit` | "Email rate limit exceeded" | "Too many attempts. Please wait a few minutes and try again." |
| Network errors | "Failed to fetch", "timeout", etc. | "Unable to connect. Please check your internet connection and try again." |
| `unsupported_provider` | "provider is not enabled" | "Google Sign-In is not configured. Please use email login instead." |
| Other | Original message | Returned as-is |

### Retry Logic
- **Login**: 3 retries with exponential backoff (1s, 2s, 4s) for network errors only
- **Signup**: NO auto-retry (prevents email spam and rate limit hits)
- Manual retry button appears on login form after network error

## 6. Offline Behavior

- **Login offline**: Returns error message, NOT local sandbox fallback
- **Signup offline**: Returns error message, NOT local account creation
- **Session check offline**: Does NOT sign out — user remains logged in
- **Google OAuth offline**: Returns error message
- Old local account system (`pps_local_accounts`, `pps_local_session`) has been removed
- Legacy data is cleaned up on first app load via `cleanupLegacyLocalAccounts()`

## 7. Password Policy

### Rules
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 number (0-9)

### Where Enforced
- **Signup**: `validatePasswordStrength()` in `use-auth.ts` + visual strength meter on Login.tsx
- **Reset Password**: `ResetPassword.tsx` inline validation
- **Settings → Security → Change Password**: `SecurityTab.tsx` inline validation
- **Server-side**: Supabase Auth settings (min length = 8)

### NOT Enforced At
- **Login**: Old accounts may have 6-char passwords. Adding rules at login would lock them out.

## 8. Testing Checklist

### Manual Tests (Run After Any Auth Change)
1. [ ] Sign Up with valid email → instant dashboard access (confirmation OFF)
2. [ ] Sign Up with "password" (no uppercase/number) → error message
3. [ ] Sign Up with "Password" (no number) → error message
4. [ ] Sign Up with "Password1" → success
5. [ ] Sign In with correct credentials → dashboard
6. [ ] Sign In with wrong password → "Email or password is incorrect"
7. [ ] Demo: Click Alex quick profile → instant dashboard
8. [ ] Demo: Enter custom name → dashboard
9. [ ] Demo: Simulate 5-day expiry → redirect to `/login?expired=true`
10. [ ] Demo: Sign up after demo → data migrated to account
11. [ ] Google OAuth → redirect to Google → back to dashboard
12. [ ] Offline: Disconnect → try login → error + retry button
13. [ ] Offline: Reconnect → click retry → login succeeds
14. [ ] Offline: Try signup → error (no auto-retry)
15. [ ] Session: Login with "1 day" → change timestamp → reload → signed out
16. [ ] Session: Network error on reload → NOT signed out
17. [ ] Password: Reset with "short" → error
18. [ ] Password: Settings change with "short" → error
19. [ ] Mobile: 390px viewport → all elements fit, no overflow
20. [ ] Old data: Seed `pps_local_accounts` → reload → deleted

### Automated Tests
```bash
npx vitest run src/hooks/__tests__/use-auth.test.ts
npx tsc --noEmit
npm run lint
npm run build
```

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| User has local account from old version | Local data cleaned on first load; must sign in with Supabase |
| Supabase is down | User sees error, not local fallback |
| Email confirmation re-enabled | Signup returns "Check your email" message; migration runs on first login |
| User clears localStorage | Guest session lost; account session lost (must re-login) |
| Session duration expired while offline | User NOT signed out; signed out on next successful auth check |
| Demo user has untouched stock habits | Stock demo habits are NOT migrated (skipped in migration) |
| Double-click submit | Guarded by `submitting` flag — second click is no-op |

## 10. Do Not Modify List

The following functions are critical and must not be changed without updating tests:

- `useProvideAuth()` — Main auth hook with session management
- `login()` — Login with retry logic
- `signup()` — Signup with password validation and migration
- `loginAsGuest()` — Guest session creation
- `logout()` — Session cleanup
- `mapAuthError()` — Error message mapping
- `validatePasswordStrength()` — Password policy
- `migrateGuestData()` — Demo-to-account data migration
- `clearUserSessionStorage()` — Security cleanup on logout

## 11. File Map

| File | Purpose |
|------|---------|
| `src/hooks/use-auth.ts` | Core auth logic, session management, error mapping |
| `src/pages/Login.tsx` | Login/Signup/Demo/Forgot UI |
| `src/pages/ResetPassword.tsx` | Password reset UI |
| `src/components/settings/SecurityTab.tsx` | Change password in settings |
| `src/routes/OnboardingGuard.tsx` | Route guard for demo expiry |
| `src/hooks/__tests__/use-auth.test.ts` | Auth unit tests |
| `src/integrations/supabase/client.ts` | Supabase client config |

## 12. Changelog

### 2026-11-24: Comprehensive Login Fix
- Removed local account registry (`pps_local_accounts`, `pps_local_session`)
- Removed offline sandbox fallback — now blocks with clear error
- Added retry logic (3 retries, exponential backoff) for login
- Added session duration dropdown (1/7/30 days)
- Added offline-safe session check on app load
- Added password strength rules (8+ chars, 1 uppercase, 1 number)
- Added error mapping by `error.code`
- Removed demo remember-me checkbox
- Removed tamper detection from guest trial
- Simplified guest keys (removed `pps_guest_first_seen`, `pps_onboarded_guest`)
- Demo expiry now redirects to `/login?expired=true`
- Added inline form validation with `aria-invalid`
- Added `autoComplete`, `required`, `aria-busy` attributes
- Added legacy data cleanup on first load