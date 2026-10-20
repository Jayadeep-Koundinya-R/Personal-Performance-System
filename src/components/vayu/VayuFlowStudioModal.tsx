import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Wind,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Plus,
  Zap,
  Target,
  Flame,
  Award,
  Play,
  Coffee,
  ShieldAlert,
} from "lucide-react";
import { VayuDailyPlan, VayuTimeBlock } from "@/lib/vayu/types";
import { formatDisplayTime } from "@/lib/vayu/vayuPlanner";

interface VayuFlowStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: VayuDailyPlan | null;
  onGenerateNewPlan: (directive?: string) => void;
  onRebalance: () => void;
  onCompleteBlock: (blockId: string, percentage?: number) => void;
  onStartSprint?: (block: VayuTimeBlock) => void;
}

export const VayuFlowStudioModal: React.FC<VayuFlowStudioModalProps> = ({
  isOpen,
  onClose,
  plan,
  onGenerateNewPlan,
  onRebalance,
  onCompleteBlock,
  onStartSprint,
}) => {
  const [promptText, setPromptText] = useState("");

  const handleRegenerate = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerateNewPlan(promptText.trim());
    setPromptText("");
  };

  const handleLaunchSprint = (block: VayuTimeBlock) => {
    if (onStartSprint) {
      onStartSprint(block);
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pps_start_focus_timer", {
          detail: {
            durationMins: block.durationMinutes,
            taskName: block.title,
            linkedHabitId: block.habitId || block.linkedHabitId,
          },
        })
      );
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card dark:bg-slate-950 border-cyan-500/30 text-foreground p-5 sm:p-6 shadow-2xl shadow-cyan-950/40">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-md shadow-cyan-500/30">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-card dark:bg-slate-950">
                <Wind className="h-5 w-5 text-cyan-500 dark:text-cyan-300" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Vayu Flow Studio
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                  45/15 Ultradian Engine
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Circadian rhythm orchestration, 4 biological energy windows, and zero-guilt schedule rebalancing.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Task 2.2: Rebalance Alert Banner */}
        {plan?.needsRebalance && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/40 bg-cyan-50/90 dark:bg-cyan-950/40 p-3 text-xs text-cyan-900 dark:text-cyan-100 my-2 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <RefreshCw className="h-4 w-4 text-cyan-600 dark:text-cyan-300 shrink-0 animate-spin-slow" />
              <div className="min-w-0">
                <span className="font-semibold text-cyan-950 dark:text-cyan-200">Schedule delay detected (&gt;20m)</span>
                <p className="text-[11px] text-cyan-700 dark:text-cyan-300/80 truncate">
                  {plan.rebalanceExplanation || "Slide remaining blocks forward to protect 22:00 Agni Curfew."}
                </p>
              </div>
            </div>
            <button
              onClick={onRebalance}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:from-cyan-400 hover:to-emerald-400 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Rebalance Schedule (Zero Guilt)</span>
            </button>
          </div>
        )}

        {/* Circadian Windows & Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3">
          <div className="rounded-xl border border-cyan-500/20 bg-surface/70 dark:bg-slate-900/50 p-3 flex flex-col">
            <span className="text-[11px] text-muted-foreground">Planned Flow</span>
            <span className="text-base font-bold text-cyan-600 dark:text-cyan-200">
              {plan ? plan.totalTargetMinutes : 0} mins
            </span>
            <span className="text-[10px] text-muted-foreground/80 mt-0.5">45m Deep / 15m Vital</span>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-surface/70 dark:bg-slate-900/50 p-3 flex flex-col">
            <span className="text-[11px] text-muted-foreground">Completed</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-300">
              {plan ? plan.completedMinutes : 0} mins
            </span>
            <span className="text-[10px] text-muted-foreground/80 mt-0.5">Focus momentum</span>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-surface/70 dark:bg-slate-900/50 p-3 flex flex-col">
            <span className="text-[11px] text-muted-foreground">Vital Day Rate</span>
            <span className="text-base font-bold text-amber-600 dark:text-amber-300">
              {plan ? plan.overallCompletionRate : 0}%
            </span>
            <span className="text-[10px] text-muted-foreground/80 mt-0.5">Daily trajectory</span>
          </div>

          <div className="rounded-xl border border-purple-500/20 bg-surface/70 dark:bg-slate-900/50 p-3 flex flex-col">
            <span className="text-[11px] text-muted-foreground">Agni Curfew</span>
            <span className="text-base font-bold text-purple-600 dark:text-purple-300">
              10:00 PM
            </span>
            <span className="text-[10px] text-muted-foreground/80 mt-0.5">Screen cutoff lock</span>
          </div>
        </div>

        {/* Prompt Directive Bar */}
        <form onSubmit={handleRegenerate} className="flex gap-2 my-2">
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Give Vayu a directive (e.g. 'Prioritize DSA and system design today')..."
            className="flex-1 rounded-xl border border-border/80 bg-surface dark:bg-slate-900/80 px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-400 focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:from-cyan-400 hover:to-emerald-400 transition-all shrink-0 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate Flow</span>
          </button>
        </form>

        {/* Timeline Blocks */}
        <div className="space-y-2 mt-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
            <span>Ultradian Sequence (08:00 – 22:00 Curfew)</span>
            <button
              onClick={onRebalance}
              className="flex items-center gap-1 text-cyan-500 dark:text-cyan-400 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Fluid Rebalance</span>
            </button>
          </div>

          {plan && plan.blocks.length > 0 ? (
            plan.blocks.map((block, index) => {
              const isDone = block.status === "completed" || block.completionPercentage === 100;
              const isRecharge = block.energyLevel === "recharge" || block.category === "Rest";

              return (
                <div
                  key={block.id}
                  className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                    isDone
                      ? "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 text-foreground"
                      : isRecharge
                      ? "border-emerald-500/20 bg-surface/60 dark:bg-slate-900/30 text-foreground"
                      : "border-border/80 bg-card/90 dark:bg-slate-900/50 text-foreground hover:border-cyan-500/30"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {block.title}
                        </span>

                        {/* Energy Level Badge */}
                        {block.energyLevel === "peak" && (
                          <span className="text-[10px] rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 border border-amber-500/30 font-medium">
                            ⚡ Peak
                          </span>
                        )}
                        {block.energyLevel === "medium" && (
                          <span className="text-[10px] rounded-md bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.2 border border-cyan-500/30 font-medium">
                            🎯 Tactical
                          </span>
                        )}
                        {block.energyLevel === "recharge" && (
                          <span className="text-[10px] rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 border border-emerald-500/30 font-medium">
                            🌿 Recharge
                          </span>
                        )}

                        <span className="text-[10px] rounded-md bg-surface px-1.5 py-0.2 text-muted-foreground border border-border/70">
                          {block.category}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDisplayTime(block.startTime)} – {formatDisplayTime(block.endTime)} ({block.durationMinutes}m)
                        </span>
                        {block.habitName && (
                          <span className="text-cyan-600 dark:text-cyan-400 truncate">• Linked: {block.habitName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Block Actions */}
                  <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                    {isDone ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Done (+15 XP)
                      </span>
                    ) : (
                      <>
                        {!isRecharge && (
                          <button
                            onClick={() => handleLaunchSprint(block)}
                            className="rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-1.5 text-xs font-medium text-cyan-300 transition-all flex items-center gap-1 cursor-pointer"
                            title="Launch focus sprint timer for this block"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>Sprint ({block.durationMinutes}m)</span>
                          </button>
                        )}
                        <button
                          onClick={() => onCompleteBlock(block.id)}
                          className="rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1.5 text-xs font-medium text-emerald-300 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Complete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500">
              <Wind className="h-8 w-8 mx-auto mb-2 text-slate-600 animate-pulse" />
              <p className="text-sm">No circadian flow generated yet.</p>
              <button
                onClick={() => onGenerateNewPlan()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Initialize 45/15 Circadian Flow
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
