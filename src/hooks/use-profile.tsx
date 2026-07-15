import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  planTier: string;
  identityClass: string | null;
  referralCode: string | null;
  totalXp: number;
  level: number;
  longestStreak: number;
  timezone: string | null;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  updateProfile: (updates: { displayName?: string; username?: string; identityClass?: string; timezone?: string }) => Promise<string | null>;
  refresh: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    displayName: (row.display_name as string) || "User",
    username: (row.username as string) || "",
    avatarUrl: row.avatar_url as string | null,
    planTier: (row.plan_tier as string) || "free",
    identityClass: row.identity_class as string | null,
    referralCode: row.referral_code as string | null,
    totalXp: (row.total_xp as number) || 0,
    level: (row.level as number) || 1,
    longestStreak: (row.longest_streak as number) || 0,
    timezone: (row.timezone as string) || "UTC",
  };
}

export function ProfileProvider({ children, userId, isGuest }: { children: ReactNode; userId?: string; isGuest?: boolean }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (isGuest) {
      // Build a synthetic guest profile from localStorage
      const guestName = localStorage.getItem("pps_guest_name") || "Guest";
      setProfile({
        id: "guest",
        userId: "guest",
        displayName: guestName,
        username: "guest",
        avatarUrl: null,
        planTier: "free",
        identityClass: null,
        referralCode: null,
        totalXp: 0,
        level: 1,
        longestStreak: 0,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setLoading(false);
      return;
    }
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) console.error("Profile load error:", error);
    
    if (data) {
      setProfile(mapProfile(data));
      // Auto-update timezone in database if missing or different from browser
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browserTimezone && data.timezone !== browserTimezone) {
        await supabase.from("profiles").update({ timezone: browserTimezone }).eq("user_id", userId);
      }
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, [userId, isGuest]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateProfile = useCallback(async (updates: { displayName?: string; username?: string; identityClass?: string; timezone?: string }) => {
    if (isGuest) {
      // Guest profile updates persist to localStorage
      if (updates.displayName !== undefined) {
        localStorage.setItem("pps_guest_name", updates.displayName.trim());
      }
      if (profile) {
        setProfile({
          ...profile,
          ...(updates.displayName !== undefined ? { displayName: updates.displayName.trim() } : {}),
          ...(updates.identityClass !== undefined ? { identityClass: updates.identityClass } : {}),
        });
      }
      return null;
    }
    if (!userId) return "Not signed in.";
    const payload: Database["public"]["Tables"]["profiles"]["Update"] = {};
    if (updates.displayName !== undefined) payload.display_name = updates.displayName.trim();
    if (updates.username !== undefined) {
      const u = updates.username.trim().toLowerCase();
      if (u.length < 3) return "Username must be at least 3 characters.";
      if (!/^[a-z0-9_]+$/.test(u)) return "Username can only contain letters, numbers, and underscores.";
      payload.username = u;
    }
    if (updates.identityClass !== undefined) payload.identity_class = updates.identityClass;
    if (updates.timezone !== undefined) payload.timezone = updates.timezone;

    const previousProfile = profile;

    if (profile) {
      setProfile({
        ...profile,
        ...(updates.displayName !== undefined ? { displayName: updates.displayName.trim() } : {}),
        ...(updates.username !== undefined ? { username: updates.username.trim().toLowerCase() } : {}),
        ...(updates.identityClass !== undefined ? { identityClass: updates.identityClass } : {}),
        ...(updates.timezone !== undefined ? { timezone: updates.timezone } : {}),
      });
    }

    const { error } = await supabase.from("profiles").update(payload).eq("user_id", userId);
    if (error) {
      setProfile(previousProfile);
      if (error.code === "23505") return "Username already taken.";
      return error.message;
    }
    await refresh();
    return null;
  }, [userId, isGuest, profile, refresh]);

  return (
    <ProfileContext.Provider value={{ profile, loading, updateProfile, refresh }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
