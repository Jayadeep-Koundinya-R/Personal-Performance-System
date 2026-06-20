import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAchievements(userId?: string, isGuest?: boolean) {
  const [unlockedKeys, setUnlockedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId || isGuest) {
      setUnlockedKeys(new Set());
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("achievements").select("badge_key").eq("user_id", userId);
    setUnlockedKeys(new Set((data || []).map((a) => a.badge_key)));
    setLoading(false);
  }, [userId, isGuest]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unlockBadge = useCallback(async (badgeKey: string) => {
    if (!userId || isGuest || unlockedKeys.has(badgeKey)) return;
    const { error } = await supabase.from("achievements").insert({ user_id: userId, badge_key: badgeKey });
    if (!error) {
      setUnlockedKeys((prev) => new Set([...prev, badgeKey]));
    }
  }, [userId, isGuest, unlockedKeys]);

  const syncBadges = useCallback(async (earnedKeys: string[]) => {
    if (!userId || isGuest) return;
    const newKeys = earnedKeys.filter((k) => !unlockedKeys.has(k));
    for (const key of newKeys) {
      await unlockBadge(key);
    }
  }, [userId, isGuest, unlockedKeys, unlockBadge]);

  return { unlockedKeys, loading, unlockBadge, syncBadges, refresh };
}
