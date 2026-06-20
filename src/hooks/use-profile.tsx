import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  updateProfile: (updates: { displayName?: string; username?: string; identityClass?: string }) => Promise<string | null>;
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
  };
}

export function ProfileProvider({ children, userId, isGuest }: { children: ReactNode; userId?: string; isGuest?: boolean }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId || isGuest) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) console.error("Profile load error:", error);
    setProfile(data ? mapProfile(data) : null);
    setLoading(false);
  }, [userId, isGuest]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateProfile = useCallback(async (updates: { displayName?: string; username?: string; identityClass?: string }) => {
    if (!userId) return "Not signed in.";
    const payload: Record<string, string> = {};
    if (updates.displayName !== undefined) payload.display_name = updates.displayName.trim();
    if (updates.username !== undefined) {
      const u = updates.username.trim().toLowerCase();
      if (u.length < 3) return "Username must be at least 3 characters.";
      if (!/^[a-z0-9_]+$/.test(u)) return "Username can only contain letters, numbers, and underscores.";
      payload.username = u;
    }
    if (updates.identityClass !== undefined) payload.identity_class = updates.identityClass;

    const { error } = await supabase.from("profiles").update(payload).eq("user_id", userId);
    if (error) {
      if (error.code === "23505") return "Username already taken.";
      return error.message;
    }
    await refresh();
    return null;
  }, [userId, refresh]);

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
