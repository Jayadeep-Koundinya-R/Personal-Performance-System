import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHabits, Habit } from '@/hooks/use-habits';
import { useFocusTimer } from '@/hooks/use-focus-timer';
import { Clock, Zap, Shield, Sparkles, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export interface ParkinsonsLawInverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetHabit?: Habit | null;
  onSprintStarted?: (habitId: string, durationMinutes: number) => void;
}

export const ParkinsonsLawInverterModal: React.FC<ParkinsonsLawInverterModalProps> = ({
  isOpen,
  onClose,
  targetHabit,
  onSprintStarted,
}) => {
  const { habits, updateHabit } = useHabits();
  const { changeTimerMode, startTimer, setActiveTaskName, setLinkedHabitId, startHabitFocus } = useFocusTimer();

  // If no targetHabit was passed, allow selecting from the user's active habits
  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const [selectedHabitId, setSelectedHabitId] = useState<string>(() => targetHabit?.id || '');

  const effectiveHabit = useMemo(() => {
    if (targetHabit) return targetHabit;
    return activeHabits.find((h) => h.id === selectedHabitId) || activeHabits[0] || null;
  }, [targetHabit, activeHabits, selectedHabitId]);

  // Slicing states
  const [selectedMinutes, setSelectedMinutes] = useState<number>(15);
  const [microStep, setMicroStep] = useState<string>('Outline the first page & set up workspace');
  const [armEarlyCheckpoint, setArmEarlyCheckpoint] = useState<boolean>(true);

  // Calculate days remaining
  const daysRemaining = useMemo(() => {
    if (!effectiveHabit?.dueDate) return 7;
    const dueTime = new Date(effectiveHabit.dueDate).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }, [effectiveHabit]);

  const handleLaunchSprint = async () => {
    if (!effectiveHabit) {
      toast.error('Please select an active task to slice');
      return;
    }

    try {
      // 1. Arm 48h artificial early horizon if requested
      if (armEarlyCheckpoint) {
        const hardDate = effectiveHabit.dueDate ? new Date(effectiveHabit.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const earlyDate = new Date(hardDate.getTime() - 48 * 60 * 60 * 1000);
        localStorage.setItem(
          `pps_early_horizon_${effectiveHabit.id}`,
          JSON.stringify({
            armedAt: new Date().toISOString(),
            earlyCheckpointDate: earlyDate.toISOString(),
            hardDueDate: hardDate.toISOString(),
            habitId: effectiveHabit.id,
            habitName: effectiveHabit.name,
          })
        );
        if (effectiveHabit.dueDate && typeof updateHabit === 'function') {
          await updateHabit(effectiveHabit.id, {
            dueDate: earlyDate.toISOString(),
          });
        }
      }

      // 2. Configure and launch focus timer
      const sprintLabel = `${effectiveHabit.name}: ${microStep || 'Micro-Sprint'}`;
      setActiveTaskName(sprintLabel);
      setLinkedHabitId(effectiveHabit.id);
      changeTimerMode('custom', selectedMinutes);
      startTimer();
      if (typeof startHabitFocus === 'function') {
        startHabitFocus(effectiveHabit, selectedMinutes);
      }

      // 3. Callback & notification
      if (onSprintStarted) {
        onSprintStarted(effectiveHabit.id, selectedMinutes);
      }

      toast.success(`⚡ Anti-procrastination sprint launched! 15 minutes to freedom.`, {
        description: `Micro-bite locked: "${sprintLabel}"`,
      });

      onClose();
    } catch (err: any) {
      toast.error('Failed to start sprint: ' + (err.message || 'Unknown error'));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-card border border-primary/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-primary/25 via-card to-amber-500/20 border-b border-border/80 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl shadow-inner">
                ⏳
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-foreground tracking-tight">
                    Parkinson’s Law Inverter
                  </h3>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Anti-Procrastination
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  Slice monolithic deadlines into immediate dopamine micro-bites.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 pb-6 space-y-3.5 overflow-y-auto flex-1">
            {/* Task Selector (if not pre-targeted) */}
            {!targetHabit && activeHabits.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                  Target Project or Habit
                </label>
                <select
                  value={effectiveHabit?.id || ''}
                  onChange={(e) => setSelectedHabitId(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-foreground focus:outline-hidden focus:border-primary"
                >
                  {activeHabits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.priority} Priority • {h.period})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Empty State if user has zero habits */}
            {!effectiveHabit ? (
              <div className="p-8 text-center bg-surface/50 rounded-2xl border border-dashed border-border space-y-2">
                <div className="text-3xl">📋</div>
                <div className="text-sm font-bold text-foreground">No Active Habits Found</div>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Create a habit with a future due date first, then launch the Parkinson’s Law Inverter to break it into micro-bites.
                </p>
              </div>
            ) : (
              <>
                {/* The Psychological Diagnosis Callout */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>The Diagnosis (Parkinson’s Law):</span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed font-sans">
                    <strong className="text-primary font-bold">"{effectiveHabit.name}"</strong> has a deadline ~
                    <span className="font-mono font-black text-amber-400">{daysRemaining} days away</span>.
                    Because the horizon feels far, the human brain assigns near-zero urgency today, causing passive delay until the panic of Day {Math.max(1, daysRemaining - 1)}.
                  </p>
                </div>

                {/* Step 1: Interactive Time-Horizon Slicing */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>1. If you sat down right now, how long would the first micro-step take?</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[10, 15, 20].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setSelectedMinutes(mins)}
                        className={`py-3 px-2 rounded-2xl border text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          selectedMinutes === mins
                            ? 'bg-primary/20 border-primary text-primary shadow-sm scale-102'
                            : 'bg-surface border-border text-muted-foreground hover:text-foreground hover:bg-surface/80'
                        }`}
                      >
                        <span className="text-base font-mono">{mins}m</span>
                        <span className="text-[9.5px] font-normal uppercase tracking-wider">
                          {mins === 15 ? 'Recommended' : mins === 10 ? 'Quick Warmup' : 'Deep Chunk'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Micro-Step Definition */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    2. Define the single physical action:
                  </label>
                  <input
                    type="text"
                    value={microStep}
                    onChange={(e) => setMicroStep(e.target.value)}
                    placeholder="e.g., Outline Page 1, draft introduction, test DB connection"
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-hidden focus:border-primary"
                  />
                </div>

                {/* Step 3: Artificial Early Checkpoint */}
                <div className="p-3.5 rounded-2xl bg-surface border border-border/80 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="arm-early-checkpoint"
                    checked={armEarlyCheckpoint}
                    onChange={(e) => setArmEarlyCheckpoint(e.target.checked)}
                    className="mt-0.5 rounded-sm border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="arm-early-checkpoint" className="text-xs text-foreground cursor-pointer space-y-0.5">
                    <span className="font-bold flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-pps-green" />
                      <span>Arm Artificial Early Checkpoint (48h buffer)</span>
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Schedules your target milestone 48 hours before the hard deadline, protecting against surprise emergencies.
                    </p>
                  </label>
                </div>

                {/* The "Micro-Bite" Dopamine Hook */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/15 via-surface to-primary/5 border border-primary/30 text-center space-y-1">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-primary font-bold">
                    The Guilt-Free Dopamine Contract
                  </div>
                  <p className="text-xs font-medium text-foreground leading-relaxed">
                    Knock out <strong className="text-primary font-bold">"{microStep || 'this step'}"</strong> in {selectedMinutes} minutes right now, and you can take the entire rest of your evening off 100% guilt-free.
                  </p>
                </div>

                {/* Action CTA */}
                <div className="pt-2">
                  <button
                    onClick={handleLaunchSprint}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground font-black text-xs sm:text-sm shadow-xl shadow-primary/25 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>⚡ Launch {selectedMinutes}m Micro-Sprint Now</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ParkinsonsLawInverterModal;
