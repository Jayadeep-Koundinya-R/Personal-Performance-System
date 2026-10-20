/**
 * 🌬️ Vayu Autonomous Flow — Core Type Definitions
 * 
 * Vayu represents the vital life force / ambient breath of the Personal Performance System.
 * Rather than demanding manual button clicks, Vayu actively plans, monitors real time,
 * tracks completion rates, and adjusts schedules dynamically.
 */

export type VayuBlockCategory =
  | "Deep Work"
  | "Learning"
  | "Health"
  | "Mindset"
  | "Rest"
  | "Habit Check"
  | "Custom";

export type VayuBlockStatus =
  | "pending"
  | "in_progress"
  | "active"
  | "completed"
  | "delayed"
  | "skipped";

export type VayuEnergyLevel = "peak" | "medium" | "recharge";

export interface VayuTimeBlock {
  id: string;
  title: string;
  description?: string;
  category: VayuBlockCategory;
  habitId?: string;
  linkedHabitId?: string;
  habitName?: string;
  startTime: string; // HH:MM in 24hr format, e.g. "09:00"
  endTime: string;   // HH:MM in 24hr format, e.g. "09:45"
  durationMinutes: number;
  status: VayuBlockStatus;
  energyLevel: VayuEnergyLevel;
  completionPercentage: number; // 0 - 100
  completionSource?: "autonomous_timer" | "natural_language" | "proactive_check" | "manual";
  completedAt?: string;
  xpAwarded: number;
  autoManaged: boolean;
}

export interface VayuDailyPlan {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  blocks: VayuTimeBlock[];
  totalTargetMinutes: number;
  completedMinutes: number;
  overallCompletionRate: number; // 0 - 100
  aiStrategySummary: string;
  currentVitalFocus: string;
  lastRecalibratedAt: string;
  createdAt: string;
  needsRebalance?: boolean;
  rebalanceExplanation?: string;
  minutesPushedForward?: number;
}

export interface VayuAutonomousState {
  plan: VayuDailyPlan | null;
  currentBlock: VayuTimeBlock | null;
  nextBlock: VayuTimeBlock | null;
  completionRate: number;
  isAutonomousActive: boolean;
  activeSessionElapsedMinutes: number;
  todayTotalMinutesPlanned: number;
  todayTotalMinutesCompleted: number;
  lastActionMessage: string | null;
  needsRebalance: boolean;
}

export interface VayuNaturalInputResult {
  matchedBlockId?: string;
  matchedHabitId?: string;
  action: "completed_block" | "completed_habit" | "plan_created" | "schedule_rebalanced" | "start_sprint" | "clarification_needed";
  completionPercentage: number;
  feedback: string;
  xpAwarded: number;
  suggestedDurationMinutes?: number;
}

