import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export interface User {
  email: string | null;
  isGuest: boolean;
  id?: string;
}

interface AuthReturn {
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

const TRIAL_DURATION_DAYS = 7;

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

        await supabase.from("user_settings").upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
      } catch (e) {
        console.error("Failed to migrate guest settings:", e);
      }
    }

    localStorage.removeItem("habits_guest");
    localStorage.removeItem("reflections_guest");
    localStorage.removeItem("reminders_guest");
    localStorage.removeItem("pps_settings_guest");
    localStorage.removeItem("pps_guest");
    localStorage.removeItem("pps_guest_created_at");
    try { sessionStorage.removeItem("pps_guest"); } catch {}
    console.log("Guest data successfully migrated to database.");
  } catch (err) {
    console.error("Failed to complete guest data migration:", err);
  } finally {
    migrationInProgress = false;
  }
}

export function useAuth(): AuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isGuestPersistent = localStorage.getItem("pps_guest") === "true";
  const isGuestSession = sessionStorage.getItem("pps_guest") === "true";
  const hasGuestSession = isGuestPersistent || isGuestSession;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapUser(session.user));
        migrateGuestData(session.user.id);
      } else if (localStorage.getItem("pps_guest") === "true" || sessionStorage.getItem("pps_guest") === "true") {
        setUser({ email: null, isGuest: true });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapUser(session.user));
        migrateGuestData(session.user.id);
      } else if (localStorage.getItem("pps_guest") === "true" || sessionStorage.getItem("pps_guest") === "true") {
        setUser({ email: null, isGuest: true });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (!email || !password) return "Please fill in all fields.";
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("email not confirmed") || msg.includes("confirm your email")) {
          return "Your email address has not been confirmed yet. Please check your inbox for a confirmation link.";
        }
        if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
          return "Invalid email or password. Please try again or click Reset Password.";
        }
        return error.message;
      }
      navigate("/dashboard");
      return null;
    } catch (err: any) {
      return err?.message || "An unexpected error occurred during sign in. Please try again.";
    }
  }, [navigate]);

  const signup = useCallback(async (email: string, password: string, confirm: string): Promise<string | null> => {
    if (!email || !password || !confirm) return "Please fill in all fields.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirm) return "Passwords do not match.";

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      });
      if (error) return error.message;

      // If Supabase has email confirmation enabled, user session won't be immediately active
      if (data?.user && !data.session) {
        return "SUCCESS_CONFIRMATION_REQUIRED";
      }

      navigate("/dashboard");
      return null;
    } catch (err: any) {
      return err?.message || "An unexpected error occurred during registration.";
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
    if (!localStorage.getItem("pps_guest_created_at")) {
      localStorage.setItem("pps_guest_created_at", new Date().toISOString());
    }
    setUser(guestUser);
    navigate("/dashboard");
  }, [navigate]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("pps_guest");
    try { sessionStorage.removeItem("pps_guest"); } catch {}
    setUser(null);
    navigate("/login");
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
      const origin = window.location.origin.replace(/\/+$/, "");
      const basePath = (import.meta.env.BASE_URL || "").replace(/\/+$/, "");
      const redirectUrl = `${origin}${basePath}/dashboard`;

      console.log("🌐 Initiating Google OAuth with redirect URL:", redirectUrl);

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
        console.error("Google Sign-In OAuth error:", error);
        const msg = error.message.toLowerCase();
        if (msg.includes("provider") || msg.includes("not enabled") || msg.includes("unsupported")) {
          return "Google Authentication is not enabled in your Supabase project. Please configure the Google Provider in Supabase Auth Dashboard.";
        }
        return error.message;
      }

      if (data?.url) {
        window.location.href = data.url;
        return null;
      }

      return null;
    } catch (err: any) {
      console.error("Google Sign-In exception:", err);
      return err?.message || "Failed to initiate Google Authentication.";
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
