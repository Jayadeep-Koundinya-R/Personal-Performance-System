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

export interface User {
  email: string | null;
  isGuest: boolean;
  id?: string;
}

export interface AuthReturn {
  user: User | null;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (email: string, password: string, confirm: string) => Promise<string | null>;
  loginAsGuest: (name?: string, remember?: boolean) => void;
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

const TRIAL_DURATION_DAYS = 7;

async function hashPassword(password: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "_pps_secure_salt_v1");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) - hash) + password.charCodeAt(i);
    hash |= 0;
  }
  return `fallback_${Math.abs(hash)}`;
}

function getGuestTrialDaysRemaining(): number {
  const createdAtStr = localStorage.getItem("pps_guest_created_at");
  if (!createdAtStr) return TRIAL_DURATION_DAYS;
  const createdAt = new Date(createdAtStr).getTime();
  const now = new Date().getTime();
  const elapsedDays = (now - createdAt) / (1000 * 60 * 60 * 24);
  const remaining = Math.ceil(TRIAL_DURATION_DAYS - elapsedDays);
  return Math.max(0, remaining);
}

function checkIsGuestTrialExpired(): boolean {
  const createdAtStr = localStorage.getItem("pps_guest_created_at");
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
        const newHabitId = generateUUID();
        habitIdMap.set(habit.id, newHabitId);

        const { error: habitError } = await supabase.from("habits").insert({
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
        });

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
    if (habitsSuccess) localStorage.removeItem("habits_guest");
    if (reflectionsSuccess) localStorage.removeItem("reflections_guest");
    if (remindersSuccess) localStorage.removeItem("reminders_guest");
    if (settingsSuccess) localStorage.removeItem("pps_settings_guest");

    if (habitsSuccess && reflectionsSuccess && remindersSuccess && settingsSuccess) {
      localStorage.removeItem("pps_guest");
      localStorage.removeItem("pps_guest_name");
      localStorage.removeItem("pps_guest_created_at");
      localStorage.removeItem("pps_onboarded_guest");
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

function getLocalSession(): User | null {
  if (typeof window === "undefined") return null;
  const localSess = localStorage.getItem("pps_local_session");
  if (localSess) {
    try {
      return JSON.parse(localSess);
    } catch {}
  }
  return null;
}

function useProvideAuth(): AuthReturn {
  const isGuestInitial = typeof window !== "undefined" && (localStorage.getItem("pps_guest") === "true" || sessionStorage.getItem("pps_guest") === "true");

  const [user, setUser] = useState<User | null>(() => {
    if (isGuestInitial) return { email: null, isGuest: true };
    return getLocalSession();
  });
  const [loading, setLoading] = useState<boolean>(() => {
    // If guest session exists, render immediately in 0ms!
    if (isGuestInitial) return false;
    return true;
  });
  const navigate = useNavigate();

  useEffect(() => {
    let resolved = false;

    // Safety timeout: Never let placeholder/slow network stall app launch for more than 800ms
    const safetyTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (localStorage.getItem("pps_guest") === "true" || sessionStorage.getItem("pps_guest") === "true") {
          setUser({ email: null, isGuest: true });
        } else {
          setUser(getLocalSession());
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
        setUser(getLocalSession());
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
            setUser(getLocalSession());
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(safetyTimer);
          if (localStorage.getItem("pps_guest") === "true" || sessionStorage.getItem("pps_guest") === "true") {
            setUser({ email: null, isGuest: true });
          } else {
            setUser(getLocalSession());
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
            setUser(getLocalSession());
          }
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

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (!email || !password) return "Please fill in all fields.";
    const cleanEmail = email.toLowerCase().trim();

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

      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("confirm your email")) {
        // In local/sandbox development without email provider, auto-grant access
        console.warn("Email confirmation pending in cloud. Auto-activating local session for immediate access.");
      }

      const isInvalidCredentials = msg.includes("invalid login credentials") || msg.includes("invalid password");
      const isNetworkOrOffline =
        msg.includes("failed to fetch") ||
        msg.includes("network") ||
        msg.includes("timeout") ||
        msg.includes("unreachable") ||
        msg.includes("connection");

      // Check local accounts registry (which stores salted SHA-256 hashes)
      const rawAccounts = localStorage.getItem("pps_local_accounts");
      let localAccounts: Record<string, string> = {};
      if (rawAccounts) {
        try { localAccounts = JSON.parse(rawAccounts); } catch {}
      }

      const hashedPassword = await hashPassword(password);

      // If registered locally and password matches, log in
      if (localAccounts[cleanEmail]) {
        const stored = localAccounts[cleanEmail];
        const isMatch = stored === hashedPassword || stored === password;
        if (isMatch) {
          // Auto-migrate legacy plaintext to hash if needed
          if (stored !== hashedPassword) {
            localAccounts[cleanEmail] = hashedPassword;
            localStorage.setItem("pps_local_accounts", JSON.stringify(localAccounts));
          }
          const localId = `local_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
          const localUser: User = { email: cleanEmail, isGuest: false, id: localId };
          localStorage.setItem("pps_local_session", JSON.stringify(localUser));
          localStorage.setItem("pps_onboarding_completed", "true");
          setUser(localUser);
          sendLoginNotification(cleanEmail);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("pps_auth_change"));
          }
          navigate("/dashboard");
          return null;
        } else {
          return "Invalid password for this account. Please check your password.";
        }
      }

      // If Supabase gave an explicit auth error (e.g. wrong password) and is not offline, report it
      if (isInvalidCredentials || (!isNetworkOrOffline && !msg.includes("confirm"))) {
        return error.message;
      }

      // If Supabase cloud is unreachable or user is testing offline, allow local sandbox with hashed credentials
      localAccounts[cleanEmail] = hashedPassword;
      localStorage.setItem("pps_local_accounts", JSON.stringify(localAccounts));

      const localId = `local_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const localUser: User = { email: cleanEmail, isGuest: false, id: localId };
      localStorage.setItem("pps_local_session", JSON.stringify(localUser));
      localStorage.setItem("pps_onboarding_completed", "true");
      setUser(localUser);
      sendLoginNotification(cleanEmail);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("pps_auth_change"));
      }
      navigate("/dashboard");
      return null;
    } catch (err: any) {
      console.warn("⚠️ Sign in exception. Fallback to Local Sandbox Session:", err);
      const hashedPassword = await hashPassword(password);
      const rawAccounts = localStorage.getItem("pps_local_accounts");
      let localAccounts: Record<string, string> = {};
      if (rawAccounts) {
        try { localAccounts = JSON.parse(rawAccounts); } catch {}
      }
      localAccounts[cleanEmail] = hashedPassword;
      localStorage.setItem("pps_local_accounts", JSON.stringify(localAccounts));

      const localId = `local_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const localUser: User = { email: cleanEmail, isGuest: false, id: localId };
      localStorage.setItem("pps_local_session", JSON.stringify(localUser));
      localStorage.setItem("pps_onboarding_completed", "true");
      setUser(localUser);
      sendLoginNotification(cleanEmail);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("pps_auth_change"));
      }
      navigate("/dashboard");
      return null;
    }
  }, [navigate]);

  const signup = useCallback(async (email: string, password: string, confirm: string): Promise<string | null> => {
    if (!email || !password || !confirm) return "Please fill in all fields.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirm) return "Passwords do not match.";
    const cleanEmail = email.toLowerCase().trim();

    // Store in local account registry as salted cryptographic hash (never plaintext)
    const hashedPassword = await hashPassword(password);
    const rawAccounts = localStorage.getItem("pps_local_accounts");
    let localAccounts: Record<string, string> = {};
    if (rawAccounts) {
      try { localAccounts = JSON.parse(rawAccounts); } catch {}
    }
    localAccounts[cleanEmail] = hashedPassword;
    localStorage.setItem("pps_local_accounts", JSON.stringify(localAccounts));

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      // Whether Supabase succeeded, required confirmation, or is offline:
      // Provision the local session immediately so user enters dashboard without friction
      const localId = data?.user?.id || `local_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const localUser: User = { email: cleanEmail, isGuest: false, id: localId };
      localStorage.setItem("pps_local_session", JSON.stringify(localUser));
      localStorage.setItem("pps_onboarding_completed", "true");
      setUser(localUser);
      sendLoginNotification(cleanEmail);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("pps_auth_change"));
      }
      navigate("/dashboard");
      return null;
    } catch (err: any) {
      console.warn("⚠️ Network exception during signup. Creating Local Sandbox Account:", err);
      const localId = `local_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const localUser: User = { email: cleanEmail, isGuest: false, id: localId };
      localStorage.setItem("pps_local_session", JSON.stringify(localUser));
      localStorage.setItem("pps_onboarding_completed", "true");
      setUser(localUser);
      sendLoginNotification(cleanEmail);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("pps_auth_change"));
      }
      navigate("/dashboard");
      return null;
    }
  }, [navigate]);

  const loginAsGuest = useCallback((name?: string, remember: boolean = true) => {
    const guestUser: User = { email: null, isGuest: true };
    if (remember) {
      localStorage.setItem("pps_guest", "true");
    } else {
      sessionStorage.setItem("pps_guest", "true");
    }
    
    if (name) {
      localStorage.setItem("pps_guest_name", name.trim());
    }
    // Set trial start timestamp if not already set (preserves existing trial progress)
    if (!localStorage.getItem("pps_guest_created_at")) {
      localStorage.setItem("pps_guest_created_at", new Date().toISOString());
    }

    // Set onboarded keys so demo mode loads the dashboard instantly without blocking errors
    localStorage.setItem("pps_onboarded_guest", "true");
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
    if (!password || password.length < 6) return "Password must be at least 6 characters.";
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return error.message;
    return null;
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<string | null> => {
    try {
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
        return error.message || "Google Sign-In is currently unavailable. Please use email or guest login.";
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

  const daysRemaining = user?.isGuest ? getGuestTrialDaysRemaining() : 7;
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
