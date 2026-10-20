import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHabits, Habit } from '@/hooks/use-habits';
import { useFocusTimer } from '@/hooks/use-focus-timer';
import { AlertTriangle, Shield, Zap, CheckCircle2, X, ArrowRight, Play, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export const TRIAGE_STORAGE_KEY = 'pps_emergency_triage_state';

export interface TriageState {
  isActive: boolean;
  targetHabitId: string | null;
  targetHabitName: string;
  activatedAt: string;
  sprint1Done: boolean; // Warmup (15m)
  sprint2Done: boolean; // Deep Core (25m)
  sprint3Done: boolean; // Final Polish (15m)
}

export function loadTriageState(): TriageState {
  try {
    const raw = localStorage.getItem(TRIAGE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Verify date is still today
      const today = new Date().toISOString().split('T')[0];
      if (parsed.activatedAt && parsed.activatedAt.startsWith(today)) {
        return parsed;
      }
    }
  } catch {}

  return {
    isActive: false,
    targetHabitId: null,
    targetHabitName: '',
    activatedAt: '',
    sprint1Done: false,
    sprint2Done: false,
    sprint3Done: false,
  };
}

export function saveTriageState(state: TriageState): void {
  try {
    localStorage.setItem(TRIAGE_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('pps_triage_state_changed', { detail: state }));
  } catch {}
}

export interface EmergencyTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriageActivated?: (targetHabit: Habit) => void;
}

export const EmergencyTriageModal: React.FC<EmergencyTriageModalProps> = ({
  isOpen,
  onClose,
  onTriageActivated,
}) => {
  const { habits, applyStreakFreeze, isHabitDueToday, getTodayStr } = useHabits();
  const { changeTimerMode, startTimer, setActiveTaskName, setLinkedHabitId } = useFocusTimer();

  const [triageState, setTriageState] = useState<TriageState>(() => loadTriageState());
  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const pendingHabits = useMemo(() => {
    const today = typeof getTodayStr === 'function' ? getTodayStr() : new Date().toISOString().split('T')[0];
    return activeHabits.filter((h) => (typeof isHabitDueToday === 'function' ? isHabitDueToday(h) : true) && !(h.completedDates || []).includes(today));
  }, [activeHabits, isHabitDueToday, getTodayStr]);

  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [customGoal, setCustomGoal] = useState<string>('');

  useEffect(() => {
    if (pendingHabits.length > 0 && !selectedHabitId) {
      setSelectedHabitId(pendingHabits[0].id);
    }
  }, [pendingHabits, selectedHabitId]);

  const selectedHabit = useMemo(() => {
    return activeHabits.find((h) => h.id === selectedHabitId) || null;
  }, [activeHabits, selectedHabitId]);

  // Activate Triage Mode (Quarantine secondary habits, arm streak shield)
  const handleActivateTriage = async () => {
    const targetName = selectedHabit ? selectedHabit.name : customGoal.trim();
    if (!targetName) {
      toast.error('Please pick or enter the single non-negotiable objective');
      return;
    }

    // 1. Arm streak shields for other habits if available
    try {
      if (selectedHabit) {
        await applyStreakFreeze(selectedHabit.id);
      }
    } catch {
      // Graceful fallback
    }

    const newState: TriageState = {
      isActive: true,
      targetHabitId: selectedHabit?.id || null,
      targetHabitName: targetName,
      activatedAt: new Date().toISOString(),
      sprint1Done: false,
      sprint2Done: false,
      sprint3Done: false,
    };

    setTriageState(newState);
    saveTriageState(newState);

    toast.success('🚨 Emergency Triage Protocol Engaged!', {
      description: `Cockpit stripped. Focus locked exclusively to "${targetName}".`,
    });

    if (selectedHabit && onTriageActivated) {
      onTriageActivated(selectedHabit);
    }

    onClose();
  };

  // Launch a specific sprint in the 3-sprint timeline
  const handleStartSprint = (sprintNumber: 1 | 2 | 3, durationMins: number, label: string) => {
    const taskName = `[Sprint ${sprintNumber}/3] ${triageState.targetHabitName}: ${label}`;
    setActiveTaskName(taskName);
    if (triageState.targetHabitId) {
      setLinkedHabitId(triageState.targetHabitId);
    }
    changeTimerMode('custom', durationMins);
    startTimer();
    toast.success(`⚡ Sprint ${sprintNumber} (${durationMins}m) launched!`);
    onClose();
  };

  // Toggle sprint completion
  const handleToggleSprintDone = (sprintKey: 'sprint1Done' | 'sprint2Done' | 'sprint3Done') => {
    const updated = {
      ...triageState,
      [sprintKey]: !triageState[sprintKey],
    };
    setTriageState(updated);
    saveTriageState(updated);

    if (updated.sprint1Done && updated.sprint2Done && updated.sprint3Done) {
      toast.success('🎉 ALL 3 SPRINT OBJECTIVES COMPLETED! Emergency conquered!');
    }
  };

  // Exit triage mode and restore normal cockpit
  const handleExitTriage = () => {
    const cleared: TriageState = {
      isActive: false,
      targetHabitId: null,
      targetHabitName: '',
      activatedAt: '',
      sprint1Done: false,
      sprint2Done: false,
      sprint3Done: false,
    };
    setTriageState(cleared);
    saveTriageState(cleared);
    toast.info('Restored normal workspace cockpit');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-card border border-rose-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-500/25 via-card to-amber-500/20 border-b border-border/80 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 text-xl shadow-inner animate-pulse">
                🚨
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-foreground tracking-tight">
                    Emergency Triage Mode
                  </h3>
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    Panic Button
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  Overwhelmed? Strip the noise. Shield streaks. Conquer 1 objective.
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

          {/* Content */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
            {triageState.isActive ? (
              /* ACTIVE TRIAGE 3-SPRINT COCKPIT */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase font-black text-rose-400">
                      🚨 Quarantined Single Target
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">Streaks Shielded</span>
                  </div>
                  <h4 className="text-sm font-black text-foreground">{triageState.targetHabitName}</h4>
                  <p className="text-[11px] text-muted-foreground">
                    All secondary habit alarms are muted today. Execute this 3-sprint sequence:
                  </p>
                </div>

                {/* 3-Sprint Progression */}
                <div className="space-y-2.5">
                  {/* Sprint 1 */}
                  <div
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      triageState.sprint1Done
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-surface border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleSprintDone('sprint1Done')}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                          triageState.sprint1Done
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-border hover:border-primary text-transparent'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          Sprint 1: Warmup & Workspace Setup (15m)
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Clear physical desk, open required files, outline checklist
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartSprint(1, 15, 'Warmup & Setup')}
                      className="px-3 py-1.5 rounded-xl bg-primary/15 text-primary border border-primary/30 text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>15m</span>
                    </button>
                  </div>

                  {/* Sprint 2 */}
                  <div
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      triageState.sprint2Done
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-surface border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleSprintDone('sprint2Done')}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                          triageState.sprint2Done
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-border hover:border-primary text-transparent'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          Sprint 2: Deep Core Execution (25m)
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Solve the hardest technical block, zero-interruption flow
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartSprint(2, 25, 'Deep Core Execution')}
                      className="px-3 py-1.5 rounded-xl bg-primary/15 text-primary border border-primary/30 text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>25m</span>
                    </button>
                  </div>

                  {/* Sprint 3 */}
                  <div
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      triageState.sprint3Done
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-surface border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleSprintDone('sprint3Done')}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                          triageState.sprint3Done
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-border hover:border-primary text-transparent'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          Sprint 3: Final Polish & Submit (15m)
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Review, commit code, turn in assignment, clean closure
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartSprint(3, 15, 'Final Polish & Submit')}
                      className="px-3 py-1.5 rounded-xl bg-primary/15 text-primary border border-primary/30 text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>15m</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={handleExitTriage}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-surface transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Exit Triage & Restore Cockpit</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVATION WIZARD */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>The Zero-Guilt Quarantine Rule:</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    When you are swamped, trying to do 10 things results in 0 completed. Selecting 1 priority today automatically mutes all other habit alerts and activates your streak shields.
                  </p>
                </div>

                {/* Target Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">
                    What is the single non-negotiable outcome that MUST happen today?
                  </label>

                  {pendingHabits.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {pendingHabits.map((h) => {
                        const isSelected = selectedHabitId === h.id;
                        return (
                          <div
                            key={h.id}
                            onClick={() => setSelectedHabitId(h.id)}
                            className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-primary/20 border-primary text-primary'
                                : 'bg-surface border-border text-foreground hover:border-primary/50'
                            }`}
                          >
                            <span>{h.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {h.period} • {h.priority}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={customGoal}
                        onChange={(e) => setCustomGoal(e.target.value)}
                        placeholder="e.g. Finish Operating Systems Project 2"
                        className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-hidden focus:border-primary"
                      />
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="pt-2">
                  <button
                    onClick={handleActivateTriage}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-rose-500/25 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4 fill-current" />
                    <span>🚨 Engage Emergency Triage Protocol</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EmergencyTriageModal;
