import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";

export interface LifecycleNudge {
  id: string;
  type: "welcome" | "milestone" | "trial_ending";
  icon: string;
  title: string;
  message: string;
  ctaText: string;
  ctaAction: "starter_pack" | "signup" | "pricing" | "dismiss";
}

export function useLifecycleNudges(): LifecycleNudge | null {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return null;

    if (user.isGuest) {
      const createdAtStr = localStorage.getItem("pps_guest_created_at");
      const createdAt = createdAtStr ? new Date(createdAtStr).getTime() : Date.now();
      const elapsedDays = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));

      // Day 6-7: Trial Ending Banner
      if (elapsedDays >= 5) {
        return {
          id: "guest_trial_ending",
          type: "trial_ending",
          icon: "⏰",
          title: "Guest Trial Ending Soon",
          message: "Create a free account to permanently save your habits, streak history, and earned XP!",
          ctaText: "Save My Progress Now →",
          ctaAction: "signup",
        };
      }

      // Day 3-4: 3-Day Consistency Milestone
      if (elapsedDays >= 2 && elapsedDays <= 4) {
        return {
          id: "guest_milestone_day3",
          type: "milestone",
          icon: "🔥",
          title: "3-Day Consistency Streak!",
          message: "Great work building daily momentum. Create an account to compete on global leaderboards!",
          ctaText: "Create Account",
          ctaAction: "signup",
        };
      }

      // Day 1: Welcome Nudge
      if (elapsedDays <= 1) {
        return {
          id: "guest_welcome",
          type: "welcome",
          icon: "🌱",
          title: "Welcome to PPS Demo Mode",
          message: "Explore Focus Studio, streak tracking, and daily reflections. All your data will migrate seamlessly on signup.",
          ctaText: "Create Account Anytime",
          ctaAction: "signup",
        };
      }
    }

    return null;
  }, [user]);
}
