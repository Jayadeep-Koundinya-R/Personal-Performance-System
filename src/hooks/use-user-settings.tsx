import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserSettings {
  theme: string;
  onboardingCompleted: boolean;
  notificationPrefs: { email: boolean; push: boolean };
  ritualLastDone: string | null;
  identityClass: string | null;
}

interface UserSettingsContextType {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  markRitualDone: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  theme: "system",
  onboardingCompleted: false,
  notificationPrefs: { email: true, push: false },
  ritualLastDone: null,
  identityClass: null,
};

const UserSettingsContext = createContext<UserSettingsContextType | null>(null);
const GUEST_ONBOARD_KEY = (email: string | null) => `pps_onboarded_${email || "guest"}`;

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
    if (isGuest || !userId) {
      const onboarded = localStorage.getItem(GUEST_ONBOARD_KEY(userEmail)) === "true";
      setSettings({ ...defaultSettings, onboardingCompleted: onboarded });
      setLoading(false);
      return;
    }

    const { data } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
    if (data) {
      setSettings({
        theme: data.theme || "system",
        onboardingCompleted: data.onboarding_completed,
        notificationPrefs: (data.notification_prefs as UserSettings["notificationPrefs"]) || defaultSettings.notificationPrefs,
        ritualLastDone: data.ritual_last_done,
        identityClass: null,
      });
    }
    setLoading(false);
  }, [userId, userEmail, isGuest]);

  useEffect(() => {
    load();
  }, [load]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));

    if (isGuest || !userId) return;

    const payload: Record<string, unknown> = {};
    if (updates.theme !== undefined) payload.theme = updates.theme;
    if (updates.onboardingCompleted !== undefined) payload.onboarding_completed = updates.onboardingCompleted;
    if (updates.notificationPrefs !== undefined) payload.notification_prefs = updates.notificationPrefs;
    if (updates.ritualLastDone !== undefined) payload.ritual_last_done = updates.ritualLastDone;

    await supabase.from("user_settings").upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
  }, [userId, isGuest]);

  const completeOnboarding = useCallback(async () => {
    if (isGuest || !userId) {
      localStorage.setItem(GUEST_ONBOARD_KEY(userEmail), "true");
    }
    await updateSettings({ onboardingCompleted: true });
  }, [userId, userEmail, isGuest, updateSettings]);

  const markRitualDone = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    await updateSettings({ ritualLastDone: today });
  }, [updateSettings]);

  return (
    <UserSettingsContext.Provider value={{ settings, loading, updateSettings, completeOnboarding, markRitualDone }}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) throw new Error("useUserSettings must be used within UserSettingsProvider");
  return ctx;
}
