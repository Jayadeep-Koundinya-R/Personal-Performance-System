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
  loginAsGuest: () => void;
  logout: () => void;
  resetPassword: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  loginWithGoogle: () => Promise<string | null>;
  isLoggedIn: boolean;
  loading: boolean;
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

/**
 * Migrates local storage guest data (habits, completions, reflections, reminders)
 * into Supabase tables under the newly authenticated user.
 */
async function migrateGuestData(userId: string): Promise<void> {
  try {
    const rawHabits = localStorage.getItem("habits_guest");
    const rawReflections = localStorage.getItem("reflections_guest");
    const rawReminders = localStorage.getItem("reminders_guest");

    // Skip if there is no guest data to migrate
    if (!rawHabits && !rawReflections && !rawReminders) return;

    console.log("Guest data found. Auto-migrating progress to account...");

    const habitIdMap = new Map<string, string>();

    // 1. Migrate Habits and nested completions
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

        // Insert habit row
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
        });

        if (habitError) {
          console.error(`Failed to migrate habit "${habit.name}":`, habitError);
          continue;
        }

        // Insert completions associated with this habit
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

    // 2. Migrate Reflections
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

    // 3. Migrate Reminders (re-linking back to correct newly generated habit UUIDs)
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
      }));

      if (remindersToInsert.length > 0) {
        const { error: remError } = await supabase.from("reminders").insert(remindersToInsert);
        if (remError) {
          console.error("Failed to migrate guest reminders:", remError);
        }
      }
    }

    // Safely delete client storage variables once database returns clean states
    localStorage.removeItem("habits_guest");
    localStorage.removeItem("reflections_guest");
    localStorage.removeItem("reminders_guest");
    try {
      sessionStorage.removeItem("pps_guest");
    } catch {}
    console.log("Guest data successfully migrated to database.");
  } catch (err) {
    console.error("Failed to complete guest data migration:", err);
  }
}

export function useAuth(): AuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapUser(session.user));
        migrateGuestData(session.user.id);
      } else if (sessionStorage.getItem("pps_guest") === "true") {
        setUser({ email: null, isGuest: true });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapUser(session.user));
        migrateGuestData(session.user.id);
      } else if (sessionStorage.getItem("pps_guest") === "true") {
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
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });
    if (error) return error.message;
    navigate("/dashboard");
    return null;
  }, [navigate]);

  const signup = useCallback(async (email: string, password: string, confirm: string): Promise<string | null> => {
    if (!email || !password || !confirm) return "Please fill in all fields.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirm) return "Passwords do not match.";

    const { error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
    });
    if (error) return error.message;
    navigate("/dashboard");
    return null;
  }, [navigate]);

  const loginAsGuest = useCallback(() => {
    const guestUser: User = { email: null, isGuest: true };
    // Persist guest flag so auth listener doesn't overwrite this temporary session
    try { sessionStorage.setItem("pps_guest", "true"); } catch {}
    setUser(guestUser);
    navigate("/dashboard");
  }, [navigate]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    try { sessionStorage.removeItem("pps_guest"); } catch {}
    setUser(null);
    navigate("/login");
  }, [navigate]);

  const resetPassword = useCallback(async (email: string): Promise<string | null> => {
    if (!email) return "Please enter your email.";
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return error.message;
    return null;
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<string | null> => {
    if (!password || password.length < 6) return "Password must be at least 6 characters.";
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return error.message;
    return null;
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}dashboard`,
      },
    });
    if (error) return error.message;
    return null;
  }, []);

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
  };
}
