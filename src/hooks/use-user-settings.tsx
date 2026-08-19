import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserSettings {
  theme: string;
  onboardingCompleted: boolean;
  notificationPrefs: { email: boolean; push: boolean };
  ritualLastDone: string | null;
  identityClass: string | null;
  defaultReminderSettings: { repeat: string; channel: string; deliveryType: string };
  autoStreakFreeze: boolean;
}

interface UserSettingsContextType {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  markRitualDone: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  theme: "system",
  onboardingCompleted: false,
  notificationPrefs: { email: true, push: false },
  ritualLastDone: null,
  identityClass: null,
  defaultReminderSettings: { repeat: "Daily", channel: "in_app", deliveryType: "notification" },
  autoStreakFreeze: false,
};

const UserSettingsContext = createContext<UserSettingsContextType | null>(null);
const ONBOARD_LOCAL_KEY = (email: string | null) => `pps_onboarded_${email || "guest"}`;

export function UserSettingsProvider({
  children,
  userId,
  userEmail,
  isGuest,
}: {
  children: ReactNode;
  userId?: string;
  userEmail: string | null;
  isGuest?: boolean;
}) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Check localStorage as a reliable same-device fallback for onboarding
    let localOnboarded = false;
    try {
      localOnboarded = localStorage.getItem(ONBOARD_LOCAL_KEY(userEmail)) === "true";
    } catch {}

    if (isGuest || !userId) {
      let guestSettings = defaultSettings;
      try {
        const stored = localStorage.getItem(`pps_settings_${userEmail || "guest"}`);
        if (stored) {
          guestSettings = JSON.parse(stored);
        }
      } catch {}
      setSettings({ ...guestSettings, onboardingCompleted: localOnboarded });
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
      if (data) {
        setSettings({
          theme: data.theme || "system",
          // Use DB value OR localStorage fallback — if either says "completed", trust it
          onboardingCompleted: data.onboarding_completed || localOnboarded,
          notificationPrefs: (data.notification_prefs as UserSettings["notificationPrefs"]) || defaultSettings.notificationPrefs,
          ritualLastDone: data.ritual_last_done,
          identityClass: null,
          defaultReminderSettings: (data.default_reminder_settings as UserSettings["defaultReminderSettings"]) || defaultSettings.defaultReminderSettings,
          autoStreakFreeze: data.auto_streak_freeze ?? defaultSettings.autoStreakFreeze,
        });
      } else {
        // No DB row yet (trigger may not have fired) — use localStorage fallback
        setSettings({ ...defaultSettings, onboardingCompleted: localOnboarded });
      }
    } catch (err) {
      console.error("Failed to load user settings:", err);
      // On error, still use localStorage fallback so onboarding doesn't re-show
      setSettings({ ...defaultSettings, onboardingCompleted: localOnboarded });
    }
    setLoading(false);
  }, [userId, userEmail, isGuest]);

  useEffect(() => {
    load();

    if (!isGuest && userId) {
      const channel = supabase
        .channel("user-settings-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_settings", filter: `user_id=eq.${userId}` },
          () => {
            load();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [load, isGuest, userId]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    const previousSettings = { ...settings };
    setSettings((prev) => ({ ...prev, ...updates }));

    if (isGuest || !userId) {
      try {
        localStorage.setItem(`pps_settings_${userEmail || "guest"}`, JSON.stringify({ ...settings, ...updates }));
      } catch (e) {
        console.error("Failed to save guest settings:", e);
      }
      return;
    }

    const payload: Record<string, unknown> = {};
    if (updates.theme !== undefined) payload.theme = updates.theme;
    if (updates.onboardingCompleted !== undefined) payload.onboarding_completed = updates.onboardingCompleted;
    if (updates.notificationPrefs !== undefined) payload.notification_prefs = updates.notificationPrefs;
    if (updates.ritualLastDone !== undefined) payload.ritual_last_done = updates.ritualLastDone;
    if (updates.defaultReminderSettings !== undefined) payload.default_reminder_settings = updates.defaultReminderSettings;
    if (updates.autoStreakFreeze !== undefined) payload.auto_streak_freeze = updates.autoStreakFreeze;

    try {
      const { error } = await supabase.from("user_settings").upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (err) {
      console.error("Failed to update user settings:", err);
      setSettings(previousSettings);
      toast.error("Failed to sync settings with database. Reverting.");
    }
  }, [userId, isGuest, settings, userEmail]);

  const completeOnboarding = useCallback(async () => {
    // Always persist to localStorage as a reliable same-device fallback,
    // so even if the DB write fails, onboarding won't re-appear on refresh
    try { localStorage.setItem(ONBOARD_LOCAL_KEY(userEmail), "true"); } catch {}
    await updateSettings({ onboardingCompleted: true });
  }, [userEmail, updateSettings]);

  const resetOnboarding = useCallback(async () => {
    try { localStorage.removeItem(ONBOARD_LOCAL_KEY(userEmail)); } catch {}
    await updateSettings({ onboardingCompleted: false });
  }, [userEmail, updateSettings]);

  const markRitualDone = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    await updateSettings({ ritualLastDone: today });
  }, [updateSettings]);

  return (
    <UserSettingsContext.Provider value={{ settings, loading, updateSettings, completeOnboarding, resetOnboarding, markRitualDone }}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) throw new Error("useUserSettings must be used within UserSettingsProvider");
  return ctx;
}
