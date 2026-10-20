/**
 * 🌬️ useVayu Hook — The Autonomous Operating System for Personal Performance
 * 
 * Provides continuous real-time orchestration:
 * - Dynamic daily flow planning (VayuDailyPlan) with 45/15 Ultradian rhythms
 * - 60-second ambient heartbeat comparing local device time against scheduled blocks
 * - Delay detection (>20m) flagging `needsRebalance: true` with zero guilt / no failure marks
 * - Pure Zero-Guilt Schedule Rebalancer protecting 22:00 Agni Curfew
 * - Automated session completion when focus timers end (no manual clicks needed)
 * - Natural language input intake ("finished algorithms", "completed workout 50%", "start sprint")
 * - Offline-first caching with Supabase cloud persistence
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useHabits } from "@/hooks/use-habits";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import {
  VayuDailyPlan,
  VayuTimeBlock,
  VayuAutonomousState,
  VayuNaturalInputResult,
} from "@/lib/vayu/types";
import {
  generateCircadianPlan,
  generateVayuPlan,
  rebalanceSchedule,
  rebalanceVayuSchedule,
  parseVayuNaturalInput,
  timeToMinutes,
  minutesToTime,
} from "@/lib/vayu/vayuPlanner";
import { sanitizeWithDOMPurify } from "@/lib/security";

const VAYU_CACHE_KEY_PREFIX = "pps_vayu_daily_plan_";

export function useVayu() {
  const { user, isGuest } = useAuth();
  const { habits, toggleCompletion, isHabitDueToday } = useHabits();
  const { profile, addXP } = useProfile();

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const cacheKey = `${VAYU_CACHE_KEY_PREFIX}${user?.id || "guest"}_${todayStr}`;

  // ── 1. Plan State ──
  const [plan, setPlan] = useState<VayuDailyPlan | null>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
    return null;
  });

  const [isAutonomousActive, setIsAutonomousActive] = useState<boolean>(true);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  // ── 2. Persist to Storage & Cloud (DOMPurify Sanitized) ──
  const persistPlan = useCallback(
    async (updatedPlan: VayuDailyPlan) => {
      // Ensure all text fields strictly pass through DOMPurify before state or Supabase
      const purifiedPlan: VayuDailyPlan = {
        ...updatedPlan,
        aiStrategySummary: sanitizeWithDOMPurify(updatedPlan.aiStrategySummary || ""),
        currentVitalFocus: sanitizeWithDOMPurify(updatedPlan.currentVitalFocus || ""),
        rebalanceExplanation: updatedPlan.rebalanceExplanation ? sanitizeWithDOMPurify(updatedPlan.rebalanceExplanation) : undefined,
        blocks: updatedPlan.blocks.map((b) => ({
          ...b,
          title: sanitizeWithDOMPurify(b.title),
          description: b.description ? sanitizeWithDOMPurify(b.description) : undefined,
          habitName: b.habitName ? sanitizeWithDOMPurify(b.habitName) : undefined,
        })),
      };

      setPlan(purifiedPlan);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(purifiedPlan));
      } catch {}

      // Supabase Cloud Sync if authenticated
      if (!isGuest && user?.id) {
        try {
          await supabase.from("vayu_daily_plans").upsert(
            {
              id: purifiedPlan.id,
              user_id: user.id,
              plan_date: purifiedPlan.date,
              blocks: purifiedPlan.blocks,
              total_target_minutes: purifiedPlan.totalTargetMinutes,
              completed_minutes: purifiedPlan.completedMinutes,
              completion_rate: purifiedPlan.overallCompletionRate,
              strategy_summary: purifiedPlan.aiStrategySummary,
              last_recalibrated_at: purifiedPlan.lastRecalibratedAt,
            },
            { onConflict: "user_id,plan_date" }
          );
        } catch {}
      }
    },
    [cacheKey, isGuest, user]
  );

  // ── 3. Initial Plan Generation if None Exists ──
  useEffect(() => {
    if (!plan && habits.length > 0) {
      const dueHabits = habits.filter((h) => (typeof isHabitDueToday === "function" ? isHabitDueToday(h) : true));
      const freshPlan = generateCircadianPlan({
        userId: user?.id || "guest",
        habits: dueHabits.length > 0 ? dueHabits : habits,
        activeTrack: profile?.primary_track,
        targetDate: todayStr,
      });
      persistPlan(freshPlan);
    }
  }, [plan, habits, user, todayStr, profile?.primary_track, isHabitDueToday, persistPlan]);

  // ── 4. Ambient Heartbeat (60s timer) & Delay Detection (>20m) ──
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const checkScheduleHeartbeat = () => {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      setCurrentTimeMinutes(currentMins);

      // Check for delays in active plan (>20m behind)
      setPlan((currentPlan) => {
        if (!currentPlan || !currentPlan.blocks || currentPlan.blocks.length === 0) {
          return currentPlan;
        }

        // If schedule already flagged as needing rebalance, skip
        if (currentPlan.needsRebalance) {
          return currentPlan;
        }

        const isDelayed = currentPlan.blocks.some((b) => {
          if (b.status === "completed" || b.completionPercentage === 100 || b.status === "skipped") {
            return false;
          }
          const startMins = timeToMinutes(b.startTime);
          // If current time exceeds start time by more than 20 minutes without completion
          return currentMins - startMins > 20;
        });

        if (isDelayed) {
          const updated: VayuDailyPlan = {
            ...currentPlan,
            needsRebalance: true,
            rebalanceExplanation: "Schedule has slipped more than 20 minutes behind local time. Fluid rebalance ready with zero guilt.",
          };
          try {
            localStorage.setItem(cacheKey, JSON.stringify(updated));
          } catch {}
          return updated;
        }

        return currentPlan;
      });
    };

    // Run check immediately
    checkScheduleHeartbeat();

    // Run every 60 seconds
    const interval = setInterval(checkScheduleHeartbeat, 60000);
    return () => clearInterval(interval);
  }, [cacheKey]);

  // Derive active and next blocks based on current time
  const { currentBlock, nextBlock } = useMemo(() => {
    if (!plan || plan.blocks.length === 0) {
      return { currentBlock: null, nextBlock: null };
    }

    let active: VayuTimeBlock | null = null;
    let next: VayuTimeBlock | null = null;

    for (let i = 0; i < plan.blocks.length; i++) {
      const b = plan.blocks[i];
      const start = timeToMinutes(b.startTime);
      const end = timeToMinutes(b.endTime);

      if (currentTimeMinutes >= start && currentTimeMinutes < end) {
        active = b;
        next = plan.blocks[i + 1] || null;
        break;
      }

      if (currentTimeMinutes < start && !next) {
        next = b;
      }
    }

    // If no block currently active, pick next upcoming or first pending
    if (!active) {
      active = plan.blocks.find((b) => b.status === "pending" || b.status === "delayed" || b.status === "in_progress") || null;
    }

    return { currentBlock: active, nextBlock: next };
  }, [plan, currentTimeMinutes]);

  // ── 5. Recalculate Totals & Completion Rate ──
  const recalculateStats = useCallback((blocks: VayuTimeBlock[]): { totalMins: number; completedMins: number; rate: number } => {
    const totalMins = blocks.reduce((acc, b) => acc + b.durationMinutes, 0);
    const completedMins = blocks.reduce((acc, b) => {
      if (b.status === "completed" || b.completionPercentage === 100) {
        return acc + b.durationMinutes;
      }
      return acc + Math.round((b.durationMinutes * (b.completionPercentage || 0)) / 100);
    }, 0);

    const rate = totalMins > 0 ? Math.round((completedMins / totalMins) * 100) : 0;
    return { totalMins, completedMins, rate };
  }, []);

  // ── 6. Complete Block Automatically ──
  const completeBlock = useCallback(
    async (
      blockId: string,
      percentage: number = 100,
      source: VayuTimeBlock["completionSource"] = "manual"
    ) => {
      if (!plan) return;

      let habitToToggleId: string | undefined;
      let blockTitle = "";

      const updatedBlocks = plan.blocks.map((b) => {
        if (b.id === blockId) {
          blockTitle = b.title;
          habitToToggleId = b.habitId || b.linkedHabitId;
          const xp = percentage >= 100 ? 15 : 10;
          return {
            ...b,
            status: "completed" as const,
            completionPercentage: percentage,
            completionSource: source,
            completedAt: new Date().toISOString(),
            xpAwarded: xp,
          };
        }
        return b;
      });

      const { totalMins, completedMins, rate } = recalculateStats(updatedBlocks);

      const updatedPlan: VayuDailyPlan = {
        ...plan,
        blocks: updatedBlocks,
        totalTargetMinutes: totalMins,
        completedMinutes: completedMins,
        overallCompletionRate: rate,
        lastRecalibratedAt: new Date().toISOString(),
      };

      await persistPlan(updatedPlan);

      // Auto-complete corresponding habit if linked and not already completed
      if (habitToToggleId) {
        const targetHabit = habits.find((h) => h.id === habitToToggleId);
        if (targetHabit && !targetHabit.completed && !targetHabit.completedDates?.includes(todayStr)) {
          if (typeof toggleCompletion === "function") {
            toggleCompletion(habitToToggleId, todayStr);
          }
        }
      }

      // Award XP
      try {
        addXP(percentage >= 100 ? 15 : 10);
      } catch {}

      // Native Haptics
      try {
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      } catch {}

      const msg = `🌬️ Vayu Auto-Completed: "${blockTitle}" (+15 XP). Vital day rate is now ${rate}%.`;
      setLastActionMessage(msg);
      toast.success(msg);
    },
    [plan, recalculateStats, persistPlan, habits, toggleCompletion, todayStr, addXP]
  );

  // ── 7. Generate Fresh Plan with Optional Directive ──
  const generateNewPlan = useCallback(
    (directive?: string) => {
      const sanitized = sanitizeWithDOMPurify(directive || "");
      const dueHabits = habits.filter((h) => (typeof isHabitDueToday === "function" ? isHabitDueToday(h) : true));
      const freshPlan = generateCircadianPlan({
        userId: user?.id || "guest",
        habits: dueHabits.length > 0 ? dueHabits : habits,
        activeTrack: profile?.primary_track,
        userDirective: sanitized,
        targetDate: todayStr,
      });

      persistPlan(freshPlan);
      toast.success("🌬️ Vayu Circadian Plan Generated", {
        description: sanitized ? `Directive: "${sanitized}"` : "45/15 Ultradian rhythm aligned with your biological windows.",
      });
    },
    [user, habits, profile?.primary_track, isHabitDueToday, todayStr, persistPlan]
  );

  // ── 8. Fluid Zero-Guilt Auto-Rebalance ──
  const rebalance = useCallback(
    (curfewTimeStr: string = "22:00") => {
      if (!plan) return;
      const now = new Date();
      const currentTimeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      const rebalanced = rebalanceSchedule(plan, currentTimeStr, curfewTimeStr);
      persistPlan(rebalanced);
      toast.info("🌬️ Vayu Flow Fluidly Rebalanced", {
        description: rebalanced.rebalanceExplanation || "Schedule shifted forward seamlessly with zero guilt.",
      });
    },
    [plan, persistPlan]
  );

  // ── 9. Natural Language Input Intake (Voice / Text) ──
  const processNaturalInput = useCallback(
    async (rawInput: string): Promise<VayuNaturalInputResult> => {
      const cleanInput = sanitizeWithDOMPurify(rawInput);
      const result = await parseVayuNaturalInput(cleanInput, plan, habits);

      if (result.action === "completed_block" && result.matchedBlockId) {
        await completeBlock(result.matchedBlockId, result.completionPercentage, "natural_language");
      } else if (result.action === "completed_habit" && result.matchedHabitId) {
        const targetHabit = habits.find((h) => h.id === result.matchedHabitId);
        if (targetHabit && !targetHabit.completed && !targetHabit.completedDates?.includes(todayStr)) {
          if (typeof toggleCompletion === "function") {
            toggleCompletion(targetHabit.id, todayStr);
          }
        }
        try {
          addXP(result.xpAwarded);
        } catch {}

        // Check if there is an uncompleted block matching this habit
        if (plan) {
          const matchingBlock = plan.blocks.find(
            (b) => (b.habitId === result.matchedHabitId || b.linkedHabitId === result.matchedHabitId) && b.status !== "completed"
          );
          if (matchingBlock) {
            await completeBlock(matchingBlock.id, 100, "natural_language");
          }
        }
        toast.success(result.feedback);
      } else if (result.action === "schedule_rebalanced") {
        rebalance();
      } else if (result.action === "plan_created") {
        generateNewPlan();
      } else if (result.action === "start_sprint") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("pps_start_focus_timer", {
              detail: {
                durationMins: result.suggestedDurationMinutes || 45,
                taskName: currentBlock?.title || "Vayu Focus Sprint",
                linkedHabitId: currentBlock?.habitId || currentBlock?.linkedHabitId,
              },
            })
          );
        }
        toast.success(result.feedback);
      } else if (result.action === "task_completed") {
        try {
          addXP(result.xpAwarded);
        } catch {}
        toast.success(result.feedback);
      } else {
        toast.info(result.feedback);
      }

      setLastActionMessage(result.feedback);
      return result;
    },
    [plan, habits, completeBlock, toggleCompletion, todayStr, addXP, rebalance, generateNewPlan, currentBlock]
  );

  // ── 10. Automated Focus Timer Session Integration ──
  const onFocusSessionEnded = useCallback(
    async (durationMinutes: number, habitId?: string) => {
      if (!plan) return;

      // Find matching block for this habit or current active block
      let targetBlock = habitId
        ? plan.blocks.find((b) => (b.habitId === habitId || b.linkedHabitId === habitId) && b.status !== "completed")
        : null;

      if (!targetBlock) {
        targetBlock = currentBlock && currentBlock.status !== "completed" ? currentBlock : null;
      }

      if (targetBlock) {
        await completeBlock(targetBlock.id, 100, "autonomous_timer");
      } else {
        // General focus session completed
        try {
          addXP(20);
        } catch {}
        toast.success(`🌬️ Focus Session Logged (+20 XP)! Vayu updated your cognitive momentum.`);
      }
    },
    [plan, currentBlock, completeBlock, addXP]
  );

  // ── 11. Global Focus Timer Event Listener ──
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFocusCompleted = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};
      onFocusSessionEnded(detail.durationMins || 25, detail.linkedHabitId);
    };

    window.addEventListener("pps_focus_session_completed", handleFocusCompleted);
    return () => window.removeEventListener("pps_focus_session_completed", handleFocusCompleted);
  }, [onFocusSessionEnded]);

  const state: VayuAutonomousState = {
    plan,
    currentBlock,
    nextBlock,
    completionRate: plan?.overallCompletionRate || 0,
    isAutonomousActive,
    activeSessionElapsedMinutes: 0,
    todayTotalMinutesPlanned: plan?.totalTargetMinutes || 0,
    todayTotalMinutesCompleted: plan?.completedMinutes || 0,
    lastActionMessage,
    needsRebalance: Boolean(plan?.needsRebalance),
  };

  return {
    ...state,
    generateNewPlan,
    completeBlock,
    rebalanceSchedule: rebalance,
    processNaturalInput,
    onFocusSessionEnded,
    setIsAutonomousActive,
  };
}
