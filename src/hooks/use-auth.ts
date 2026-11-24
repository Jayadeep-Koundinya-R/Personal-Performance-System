/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  CRITICAL AUTH CODE — DO NOT MODIFY WITHOUT TESTING  ⚠️   ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  This file handles user authentication for the entire app.      ║
 * ║  Breaking changes here will lock users out or corrupt data.      ║
 * ║                                                                ║
 * ║  Before modifying:                                              ║
 * ║  1. Read docs/AUTH_README.md for the full auth flow             ║
 * ║  2. Run: npx vitest run src/hooks/__tests__/use-auth.test.ts  ║
 * ║  3. Test all 4 login modes: Sign In, Sign Up, Demo, Google     ║
 * ║  4. Test offline behavior (disconnect internet)                  ║
 * ║  5. Test demo trial expiry flow                                  ║
 * ║  6. Test mobile viewport (390px)                                 ║
 * ║  7. Run: npm test && npm run build && npm run lint             ║
 * ║                                                                ║
 * ║  Auth bugs are P0 priority. When in doubt, ask before editing. ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
import { useState, useCallback, useEffect, createContext, useContext, ReactNode, createElement } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { sendLoginNotification, sendFreeTrialNotification } from "@/lib/native-notifications";
import { queryClient } from "@/lib/queryClient";

/**
 * P1 Security Remediation: Centralized session storage purge routine.
 * Removes all active user credentials, guest cache, habit/reflection/reminder stores,
 * chat histories, and squad/track keys while preserving device configurations (theme, audio mute, regional pricing).
 */
export function clearUserSessionStorage(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    const totalKeys = localStorage.length;
    for (let i = 0; i < totalKeys; i++) {
      const key = localStorage.key(i);
      if (!key || key === "pps_billing_region") continue;
      if (
        key.startsWith("pps_") ||
        key.startsWith("habits_") ||
        key.startsWith("reflections_") ||
        key.startsWith("reminders_") ||
        key.startsWith("notifications_")
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch (err) {
    console.warn("Storage cleanup notice:", err);
  }
}

/**
 * One-time cleanup of legacy local-account artifacts.
 * These were used by the old offline sandbox fallback which has been removed.
 * We purge them on first load so no stale credentials linger in localStorage.
 */
function cleanupLegacyLocalAccounts(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("pps_local_accounts");
    localStorage.removeItem("pps_local_session");
  } catch {}
}

export interface User {
  email: string | null;
  isGuest: boolean;
  id?: string;
}

export interface AuthReturn {
  user: User | null;
  login: (email: string, password: string, rememberDays?: number) => Promise<string | null>;
  signup: (email: string, password: string, confirm: string) => Promise<string | null>;
  loginAsGuest: (name?: string) => void;
  logout: () => void;
  resetPassword: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  loginWithGoogle: () => Promise<string | null>;
  isLoggedIn: boolean;
  loading: boolean;
  guestDaysRemaining: number;
  isGuestTrialExpired: boolean;
}

const AuthContext = createContext<AuthReturn | null>(null);

export const TRIAL_DURATION_DAYS = 5;

/**
 * Maps a Supabase auth error to a user-friendly message.
 * Prefers error.code when available, falls back to message text matching.
 */
export function mapAuthError(error: { code?: string; message: string; status?: number }): string {
  const code = (error.code || "").toLowerCase();
  const msg = (error.message || "").toLowerCase();

  if (code === "invalid_credentials" || msg.includes("invalid login credentials") || msg.includes("invalid password")) {
    return "Email or password is incorrect. Please try again.";
  }
  if (code === "email_not_confirmed" || msg.includes("email not confirmed") || msg.includes("confirm your email")) {
    return "Please check your email and click the confirmation link before logging in.";
  }
  if (code === "user_already_exists" || msg.includes("user already registered") || msg.includes("already registered")) {
    return "An account with this email may already exist. Try logging in, or use a different email.";
  }
  if (code === "weak_password" || msg.includes("password should be at least") || msg.includes("password is too weak")) {
    return "Password must be at least 8 characters with 1 uppercase letter and 1 number.";
  }
  if (code === "over_request_rate_limit" || msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (code === "over_email_send_rate_limit" || msg.includes("email rate limit")) {
    return "Too many emails sent. Please wait a few minutes before trying again.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("timeout") || msg.includes("unreachable") || msg.includes("connection")) {
    return "Unable to connect. Please check your internet connection and try again.";
  }
  if (code === "unsupported_provider" || msg.includes("provider is not enabled") || msg.includes("unsupported provider")) {
    return "Google Sign-In is not configured. Please use email login instead.";
  }
  // Fallback: return original message
  return error.message || "An unexpected error occurred. Please try again.";
}

/**
 * Checks whether an auth error is a network/connectivity failure (vs a real auth failure).
 */
function isNetworkError(error: { message: string }): boolean {
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("unreachable") ||
    msg.includes("connection") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound")
  );
}

/**
 * Validates password strength against the app's password policy:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 * Returns an error message string if invalid, or null if valid.
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least 1 uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least 1 number.";
  return null;
}

function getStoredGuestCreatedAt(): string | null {
  if (typeof window === "undefined") return null;

  // Primary key
  const primary = localStorage.getItem("pps_guest_created_at");
  if (primary) return primary;

  // Cookie fallback (in case localStorage was cleared but cookie persists)
  try {
    if (typeof document !== "undefined" && document.cookie) {
      const match = document.cookie.match(/(?:^|;\s*)pps_gt=([^;]+)/);
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]);
        try { localStorage.setItem("pps_guest_created_at", decoded); } catch {}
        return decoded;
      }
    }
  } catch {}

  // Tamper detection: if an active guest session exists (guest markers present)
  // but the timestamp and cookie were deleted to bypass the 5-day limit,
  // treat as expired (epoch timestamp) to prevent unlimited trial resets.
  const isGuestActive = localStorage.getItem("pps_guest") === "true";
  const hasGuestHistory =
    localStorage.getItem("pps_guest_onboarded") === "true" ||
    localStorage.getItem("pps_onboarded_guest") === "true" ||
    Boolean(localStorage.getItem("pps_guest_name"));

  if (isGuestActive && hasGuestHistory) {
    return new Date(0).toISOString();
  }

  return null;
}

function getGuestTrialDaysRemaining(): number {
  const createdAtStr = getStoredGuestCreatedAt();
  if (!createdAtStr) return TRIAL_DURATION_DAYS;
  const createdAt = new Date(createdAtStr).getTime();
  const now = new Date().getTime();
  const elapsedDays = (now - createdAt) / (1000 * 60 * 60 * 24);
  const remaining = Math.ceil(TRIAL_DURATION_DAYS - elapsedDays);
  return Math.max(0, remaining);
}

function checkIsGuestTrialExpired(): boolean {
  const createdAtStr = getStoredGuestCreatedAt();
  if (!createdAtStr) return false;
  const createdAt = new Date(createdAtStr).getTime();
  const now = new Date().getTime();
  const elapsedDays = (now - createdAt) / (1000 * 60 * 60 * 24);
  return elapsedDays >= TRIAL_DURATION_DAYS;
}

function mapUser(su: SupabaseUser | null): User | null {
  if (!su) return null;
  return { email: su.email ?? null, isGuest: false, id: su.id };
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let migrationInProgress = false;

async function migrateGuestData(userId: string): Promise<void> {
  if (migrationInProgress) return;
  migrationInProgress = true;
  try {
    const rawHabits = localStorage.getItem("habits_guest");
    const rawReflections = localStorage.getItem("reflections_guest");
    const rawReminders = localStorage.getItem("reminders_guest");

    if (!rawHabits && !rawReflections && !rawReminders) return;

    console.log("Guest data found. Auto-migrating progress to account...");
    const habitIdMap = new Map<string, string>();

    let habitsSuccess = true;
    let reflectionsSuccess = true;
    let remindersSuccess = true;
    let settingsSuccess = true;

    if (rawHabits) {
      let guestHabits: any[] = [];
      try {
        guestHabits = JSON.parse(rawHabits);
      } catch (e) {
        console.error("Failed to parse guest habits:", e);
      }

      for (const habit of guestHabits) {
        // v0.6 Data Truth: Skip untouched stock demo habits so new registered accounts start with an authentic empty state
        const isUntouchedStockDemo =
          habit.id?.startsWith("demo-") &&
          (!habit.completedDates || habit.completedDates.length === 0);

        if (isUntouchedStockDemo) {
          continue;
        }

        const newHabitId = generateUUID();
        habitIdMap.set(habit.id, newHabitId);

        const habitPayload: any = {
          id: newHabitId,
          user_id: userId,
          name: habit.name,
          category: habit.category || "Uncategorized",
          priority: habit.priority || "Medium",
          period: habit.period || "Daily",
          due_date: habit.dueDate || new Date().toISOString(),
          streak: habit.streak || 0,
          freeze_credits: habit.freezeCredits || 2,
          last_completed_date: habit.lastCompletedDate || null,
          start_time: habit.startTime || null,
          end_time: habit.endTime || null,
          color: habit.color || "indigo",
          archived: habit.archived || false,
          start_alarm: habit.startAlarm || false,
          end_alarm: habit.endAlarm || false,
          requires_focus_timer: habit.requires_focus_timer || false,
          focus_duration_minutes: habit.focus_duration_minutes || 25,
          window_start: habit.window_start || null,
          window_end: habit.window_end || null,
        };

        let { error: habitError } = await supabase.from("habits").insert(habitPayload);

        // Defensive fallback: If PostgREST schema cache is missing optional columns, retry with baseline fields
        if (habitError && (habitError.message?.includes("column") || habitError.code === "PGRST204")) {
          const fallbackPayload: any = {
            id: newHabitId,
            user_id: userId,
            name: habit.name,
            category: habit.category || "Uncategorized",
            priority: habit.priority || "Medium",
            period: habit.period || "Daily",
            due_date: habit.dueDate || new Date().toISOString(),
            streak: habit.streak || 0,
            freeze_credits: habit.freezeCredits || 2,
            last_completed_date: habit.lastCompletedDate || null,
          };
          const fallbackRes = await supabase.from("habits").insert(fallbackPayload);
          habitError = fallbackRes.error;
        }

        if (habitError) {
          console.error(`Failed to migrate habit "${habit.name}":`, habitError);
          habitsSuccess = false;
          continue;
        }

        if (habit.completedDates && habit.completedDates.length > 0) {
          const completionsToInsert = habit.completedDates.map((dateStr: string) => ({
            habit_id: newHabitId,
            user_id: userId,
            completed_date: dateStr,
          }));

          const { error: compError } = await supabase.from("habit_completions").insert(completionsToInsert);
          if (compError) {
            console.error(`Failed to migrate completions for habit "${habit.name}":`, compError);
            habitsSuccess = false;
          }
        }
      }
    }

    if (rawReflections) {
      let guestReflections: any[] = [];
      try {
        guestReflections = JSON.parse(rawReflections);
      } catch (e) {
        console.error("Failed to parse guest reflections:", e);
      }

      const reflectionsToInsert = guestReflections.map((r: any) => ({
        user_id: userId,
        reflection_date: r.date,
        content: r.text,
        mood: r.mood,
        habits_log: r.habitsLog || [],
      }));

      if (reflectionsToInsert.length > 0) {
        const { error: refError } = await supabase.from("reflections").insert(reflectionsToInsert);
        if (refError) {
          console.error("Failed to migrate guest reflections:", refError);
          reflectionsSuccess = false;
        }
      }
    }

    if (rawReminders) {
      let guestReminders: any[] = [];
      try {
        guestReminders = JSON.parse(rawReminders);
      } catch (e) {
        console.error("Failed to parse guest reminders:", e);
      }

      const remindersToInsert = guestReminders.map((r: any) => ({
        user_id: userId,
        habit_id: r.habitId ? habitIdMap.get(r.habitId) || null : null,
        label: r.label,
        reminder_time: r.time,
        repeat_pattern: r.repeat || "Every Day",
        enabled: r.enabled ?? true,
        channel: r.channel || "in_app",
        delivery_type: r.deliveryType || "notification",
      }));

      if (remindersToInsert.length > 0) {
        const { error: remError } = await supabase.from("reminders").insert(remindersToInsert);
        if (remError) {
          console.error("Failed to migrate guest reminders:", remError);
          remindersSuccess = false;
        }
      }
    }

    const rawSettings = localStorage.getItem("pps_settings_guest");
    if (rawSettings) {
      try {
        const settings = JSON.parse(rawSettings);
        const payload: Record<string, any> = {};
        if (settings.theme !== undefined) payload.theme = settings.theme;
        if (settings.onboardingCompleted !== undefined) payload.onboarding_completed = settings.onboardingCompleted;
        if (settings.notificationPrefs !== undefined) payload.notification_prefs = settings.notificationPrefs;
        if (settings.ritualLastDone !== undefined) payload.ritual_last_done = settings.ritualLastDone;
        if (settings.defaultReminderSettings !== undefined) payload.default_reminder_settings = settings.defaultReminderSettings;
        if (settings.autoStreakFreeze !== undefined) payload.auto_streak_freeze = settings.autoStreakFreeze;

        const { error: settingsError } = await supabase.from("user_settings").upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
        if (settingsError) {
          console.error("Failed to migrate guest settings:", settingsError);
          settingsSuccess = false;
        }
      } catch (e) {
        console.error("Failed to migrate guest settings:", e);
        settingsSuccess = false;
      }
    }

    // Only remove local guest data if the corresponding migration succeeded to prevent network loss
    if (habitsSuccess) {
      localStorage.removeItem("habits_guest");
      // Remove any lingering habits_* keys from guest session
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("habits_")) toRemove.push(k);
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
    if (reflectionsSuccess) localStorage.removeItem("reflections_guest");
    if (remindersSuccess) localStorage.removeItem("reminders_guest");
    if (settingsSuccess) localStorage.removeItem("pps_settings_guest");

    if (habitsSuccess && reflectionsSuccess && remindersSuccess && settingsSuccess) {
      localStorage.removeItem("pps_guest");
      localStorage.removeItem("pps_guest_name");
      localStorage.removeItem("pps_guest_created_at");
      localStorage.removeItem("pps_guest_onboarded");
      localStorage.removeItem("pps_ai_chat_guest");
      localStorage.removeItem("pps_ai_chat_history");
      try { sessionStorage.removeItem("pps_guest"); } catch {}
    }

    // P0: Invalidate React Query cache so newly migrated database records refetch immediately
    queryClient.invalidateQueries();
    console.log("Guest data successfully migrated to database.");
  } catch (err) {
    console.error("Failed to complete guest data migration:", err);
  } finally {
    migrationInProgress = false;
  }
}

function useProvideAuth(): AuthReturn {
  const isGuestInitial = typeof window !== "undefined" && (localStorage.getItem("pps_guest") === "true" || sessionStorage.getItem("pps_guest") === "true");

  const [user, setUser] = useState<User | null>(() => {
    if (isGuestInitial) return { email: null, isGuest: true };
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    // If guest session exists, render immediately in 0ms!
    if (isGuestInitial) return false;
    return true;
  });
  const navigate = useNavigate();

  useEffect(() => {
    let resolved = false;

    // One-time cleanup of legacy local-account artifacts (pps_local_accounts / pps_local_session)
    cleanupLegacyLocalAccounts();

    // Check if the user's session duration has expired.
    // This is a convenience check, not a security control — only signs out on explicit expiry.
    // CRITICAL: Never sign out on network errors — only on real session expiry.
    const checkSessionExpiry = () => {
      try {
        const loginTimestamp = localStorage.getItem("pps_login_timestamp");
        const sessionDuration = localStorage.getItem("pps_session_duration");
        if (loginTimestamp && sessionDuration) {
          const elapsed = Date.now() - parseInt(loginTimestamp);
          const maxMs = parseInt(sessionDuration) * 24 * 60 * 60 * 1000;
          if (elapsed > maxMs) {
            // Session expired by convenience check — sign out
            supabase.auth.signOut().then(() => {
              clearUserSessionStorage();
              setUser(null);
              queryClient.clear();
            }).catch((err) => {
              // Network error during signOut — do NOT force sign out locally.
              // The user will be signed out on next successful auth check.
              console.warn("Session expiry signOut notice:", err);
            });
          }
        }
      } catch {
        // Storage access error — ignore, don't sign out
      }
    };
    checkSessionExpiry();

    // Safety timeout: Never let placeholder/slow network stall app launch for more than 800ms
    const safetyTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (localStorage.getItem("pps_guest") === "true" || sessionStorage.getItem("pps_guest") === "true") {
          setUser({ email: null, isGuest: true });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    }, 800);

    // P1: Handle OAuth hash tokens if present before HashRouter navigation
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash;
      if (hash.includes("access_token=") || hash.includes("error_description=")) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setUser(mapUser(session.user));
            migrateGuestData(session.user.id);
            window.location.hash = "#/dashboard";
          }
        }).catch((err) => {
          console.warn("OAuth hash token parse notice:", err);
        });
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      resolved = true;
      clearTimeout(safetyTimer);
      if (session?.user) {
        setUser(mapUser(session.user));
        migrateGuestData(session.user.id);
        if (event === "SIGNED_IN") {
          sendLoginNotification(session.user.email);
        }
      } else if (localStorage.getItem("pps_guest") === "true" || sessionStorage.getItem("pps_guest") === "true") {
        setUser({ email: null, isGuest: true });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(safetyTimer);
          if (session?.user) {
            setUser(mapUser(session.user));
            migrateGuestData(session.user.id);
          } else if (localStorage.getItem("pps_guest") === "true" || sessionStorage.getItem("pps_guest") === "true") {
            setUser({ email: null, isGuest: true });
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        // Network error during getSession — do NOT sign out, just finish loading.
        // The safety timer will have already handled guest detection.
        if (!resolved) {
          resolved = true;
          clearTimeout(safetyTimer);
          if (localStorage.getItem("pps_guest") === "true" || sessionStorage.getItem("pps_guest") === "true") {
            setUser({ email: null, isGuest: true });
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      });

    // Instant local and cross-tab reactive synchronization
    const handleAuthChange = () => {
      const isGuest = localStorage.getItem("pps_guest") === "true" || sessionStorage.getItem("pps_guest") === "true";
      if (!isGuest) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setUser(mapUser(session.user));
          } else {
            setUser(null);
          }
        }).catch(() => {
          // Network error — don't change state
        });
      } else {
        setUser({ email: null, isGuest: true });
      }
    };

    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("pps_auth_change", handleAuthChange);

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("pps_auth_change", handleAuthChange);
    };
  }, []);

  const login = useCallback(async (email: string, password: string, rememberDays?: number): Promise<string | null> => {
    if (!email || !password) return "Please fill in all fields.";
    const cleanEmail = email.toLowerCase().trim();
    const days = rememberDays || 7;

    // Store session duration preference for app-load expiry check
    try {
      localStorage.setItem("pps_session_duration", String(days));
      localStorage.setItem("pps_login_timestamp", String(Date.now()));
    } catch {}

    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!error) {
          sendLoginNotification(cleanEmail);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("pps_auth_change"));
          }
          navigate("/dashboard");
          return null;
        }

        // If network error and we have retries left, back off and retry
        if (isNetworkError(error) && attempt < MAX_RETRIES - 1) {
          const backoff = 1000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }

        // Non-network error or retries exhausted — return mapped message
        return mapAuthError(error);
      } catch (err: any) {
        if (attempt < MAX_RETRIES - 1) {
          const backoff = 1000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        return "Unable to connect. Please check your internet connection and try again.";
      }
    }

    return "Unable to connect. Please check your internet connection and try again.";
  }, [navigate]);

  const signup = useCallback(async (email: string, password: string, confirm: string): Promise<string | null> => {
    if (!email || !password || !confirm) return "Please fill in all fields.";
    const cleanEmail = email.toLowerCase().trim();

    // Password strength validation (client-side; Supabase also enforces server-side)
    const pwError = validatePasswordStrength(password);
    if (pwError) return pwError;
    if (password !== confirm) return "Passwords do not match.";

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) {
        // NO auto-retry for signup — could spam confirmation emails and hit rate limits
        return mapAuthError(error);
      }

      // With email confirmation OFF (beta default), signUp returns a session immediately.
      // Run demo data migration if we have a session.
      if (data?.session?.user) {
        localStorage.setItem("pps_login_timestamp", String(Date.now()));
        localStorage.setItem("pps_session_duration", "7");
        setUser(mapUser(data.user));
        await migrateGuestData(data.user.id);
        sendLoginNotification(cleanEmail);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("pps_auth_change"));
        }
        navigate("/dashboard");
        return null;
      }

      // No session returned — email confirmation is required
      return "SUCCESS_CONFIRMATION_REQUIRED";
    } catch (err: any) {
      // NO local fallback — block with clear error
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("timeout")) {
        return "Unable to connect. Please check your internet connection and try again.";
      }
      return "Unable to create account. Please try again later.";
    }
  }, [navigate]);

  const loginAsGuest = useCallback((name?: string) => {
    const existingTimestamp = getStoredGuestCreatedAt();
    const guestUser: User = { email: null, isGuest: true };

    if (!existingTimestamp) {
      const nowISO = new Date().toISOString();
      localStorage.setItem("pps_guest_created_at", nowISO);
      try {
        if (typeof document !== "undefined") {
          document.cookie = `pps_gt=${encodeURIComponent(nowISO)}; max-age=31536000; path=/`;
        }
      } catch {}
    } else {
      localStorage.setItem("pps_guest_created_at", existingTimestamp);
      try {
        if (typeof document !== "undefined") {
          document.cookie = `pps_gt=${encodeURIComponent(existingTimestamp)}; max-age=31536000; path=/`;
        }
      } catch {}
    }

    // Always use localStorage for guest session (no sessionStorage)
    localStorage.setItem("pps_guest", "true");

    if (name) {
      localStorage.setItem("pps_guest_name", name.trim());
    }

    // Set onboarded keys so demo mode loads the dashboard instantly
    localStorage.setItem("pps_guest_onboarded", "true");
    localStorage.setItem("pps_onboarding_completed", "true");
    if (!localStorage.getItem("pps_active_track")) {
      localStorage.setItem("pps_active_track", "placements");
    }

    sendFreeTrialNotification(name || localStorage.getItem("pps_guest_name") || "Explorer");
    setUser(guestUser);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("pps_auth_change"));
    }
    navigate("/dashboard");
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase sign out notice:", err);
    }

    // P1 Security Remediation: Comprehensive storage wipe
    clearUserSessionStorage();

    // P0 Security Remediation: Purge React Query cache
    queryClient.clear();

    setUser(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("pps_auth_change"));
    }
    navigate("/login", { replace: true });
  }, [navigate]);

  const resetPassword = useCallback(async (email: string): Promise<string | null> => {
    if (!email) return "Please enter your email address.";
    try {
      const origin = window.location.origin.replace(/\/+$/, "");
      const basePath = (import.meta.env.BASE_URL || "").replace(/\/+$/, "");
      const redirectUrl = `${origin}${basePath}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: redirectUrl,
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("configuration") || msg.includes("provider") || error.status === 400 || error.status === 422) {
          return "Password reset service is currently unconfigured or unavailable. Please contact support or try logging in with your password.";
        }
        return error.message;
      }
      return null;
    } catch (err: any) {
      return "Unable to connect to authentication service. Please check your internet connection.";
    }
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<string | null> => {
    const pwError = validatePasswordStrength(password);
    if (pwError) return pwError;
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return mapAuthError(error);
      return null;
    } catch (err: any) {
      return "Unable to connect. Please check your internet connection and try again.";
    }
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<string | null> => {
    try {
      // Check if Supabase is properly configured (not using placeholder URL)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl.includes("placeholder") || supabaseUrl === "https://your-project-id.supabase.co") {
        console.warn("🔴 Google OAuth unavailable: VITE_SUPABASE_URL is not configured (placeholder detected).");
        return "Google Sign-In requires a configured Supabase backend. Please use the Demo tab or Email Sign-In instead.";
      }

      // P1: Sanitize redirect URL avoiding trailing hashes that break OAuth callback parsing
      const origin = window.location.origin.replace(/\/+$/, "");
      const basePath = (import.meta.env.BASE_URL || "").replace(/\/+$/, "");
      const redirectUrl = `${origin}${basePath}/`;

      console.log("🌐 Initiating Google OAuth with sanitized redirect URL:", redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.warn("Google OAuth cloud provider error:", error.message);
        return mapAuthError(error);
      }

      if (data?.url) {
        window.location.href = data.url;
        return null;
      }

      return null;
    } catch (err: any) {
      console.warn("Google Sign-In exception:", err);
      return "Unable to connect to Google authentication. Please try again or use email login.";
    }
  }, []);

  const daysRemaining = user?.isGuest ? getGuestTrialDaysRemaining() : 5;
  const isExpired = user?.isGuest ? checkIsGuestTrialExpired() : false;

  return {
    user,
    login,
    signup,
    loginAsGuest,
    logout,
    resetPassword,
    updatePassword,
    loginWithGoogle,
    isLoggedIn: user !== null,
    loading,
    guestDaysRemaining: daysRemaining,
    isGuestTrialExpired: isExpired,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useProvideAuth();
  return createElement(AuthContext.Provider, { value: auth }, children);
}

export function useAuth(): AuthReturn {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
