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
}

export const VayuFlowStudioModal: React.FC<VayuFlowStudioModalProps> = ({
  isOpen,
  onClose,
  plan,
  onGenerateNewPlan,
  onRebalance,
  onCompleteBlock,
}) => {
  const [promptText, setPromptText] = useState("");

  const handleRegenerate = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerateNewPlan(promptText.trim());
    setPromptText("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border-cyan-500/30 text-slate-100 p-6 shadow-2xl shadow-cyan-950/40">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-md shadow-cyan-500/30">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                <Wind className="h-5 w-5 text-cyan-300" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
                Vayu Flow Studio
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                  Vayu Launch
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                AI autonomous daily schedule, real-time completion tracking, and fluid timeline orchestration.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="rounded-xl border border-cyan-500/20 bg-slate-900/50 p-3 flex flex-col">
            <span className="text-[11px] text-slate-400">Planned Flow</span>
            <span className="text-base font-bold text-cyan-200">
              {plan ? plan.totalTargetMinutes : 0} mins
            </span>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-slate-900/50 p-3 flex flex-col">
            <span className="text-[11px] text-slate-400">Completed</span>
            <span className="text-base font-bold text-emerald-300">
              {plan ? plan.completedMinutes : 0} mins
            </span>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-slate-900/50 p-3 flex flex-col">
            <span className="text-[11px] text-slate-400">Vital Rate</span>
            <span className="text-base font-bold text-amber-300">
              {plan ? plan.overallCompletionRate : 0}%
            </span>
          </div>
        </div>

        {/* Prompt Directive Bar */}
        <form onSubmit={handleRegenerate} className="flex gap-2 mb-4">
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Give Vayu a directive (e.g. 'I have 3 hours, focus on LeetCode & run')..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:from-cyan-400 hover:to-emerald-400 transition-all shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate Plan</span>
          </button>
        </form>

        {/* Timeline Blocks */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span>Today's Real-Time Sequence</span>
            <button
              onClick={onRebalance}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Fluid Rebalance</span>
            </button>
          </div>

          {plan && plan.blocks.length > 0 ? (
            plan.blocks.map((block, index) => {
              const isDone = block.status === "completed" || block.completionPercentage === 100;
              return (
                <div
                  key={block.id}
                  className={`rounded-xl border p-3 flex items-center justify-between gap-3 transition-all ${
                    isDone
                      ? "border-emerald-500/30 bg-emerald-950/20 text-slate-300"
                      : "border-slate-800 bg-slate-900/40 text-slate-200 hover:border-cyan-500/30"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-slate-400">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-100 truncate">
                          {block.title}
                        </span>
                        <span className="text-[10px] rounded-md bg-slate-800/80 px-1.5 py-0.5 text-slate-400 border border-slate-700/50">
                          {block.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDisplayTime(block.startTime)} – {formatDisplayTime(block.endTime)} ({block.durationMinutes}m)
                        </span>
                        {block.habitName && (
                          <span className="text-cyan-400 truncate">• Linked: {block.habitName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isDone ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Done (+15 XP)
                      </span>
                    ) : (
                      <button
                        onClick={() => onCompleteBlock(block.id)}
                        className="rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500">
              <Wind className="h-8 w-8 mx-auto mb-2 text-slate-600 animate-pulse" />
              <p className="text-sm">No daily flow generated yet.</p>
              <button
                onClick={() => onGenerateNewPlan()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Initialize Vayu Flow
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
