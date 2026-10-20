import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadTriageState, saveTriageState, TriageState } from './EmergencyTriageModal';
import { useFocusTimer } from '@/hooks/use-focus-timer';
import { AlertTriangle, Play, CheckCircle2, RotateCcw, Shield, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export interface TriageActiveBannerProps {
  onOpenModal: () => void;
}

export const TriageActiveBanner: React.FC<TriageActiveBannerProps> = ({ onOpenModal }) => {
  const [triage, setTriage] = useState<TriageState>(() => loadTriageState());
  const { changeTimerMode, startTimer, setActiveTaskName, setLinkedHabitId } = useFocusTimer();

  useEffect(() => {
    const handleStorage = () => setTriage(loadTriageState());
    window.addEventListener('pps_triage_state_changed', handleStorage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('pps_triage_state_changed', handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  if (!triage.isActive) return null;

  const handleStartSprint = (sprintNum: 1 | 2 | 3, durationMins: number, label: string) => {
    setActiveTaskName(`[Sprint ${sprintNum}/3] ${triage.targetHabitName}: ${label}`);
    if (triage.targetHabitId) {
      setLinkedHabitId(triage.targetHabitId);
    }
    changeTimerMode('custom', durationMins);
    startTimer();
    toast.success(`⚡ Sprint ${sprintNum} (${durationMins}m) launched!`);
  };

  const handleToggleSprintDone = (key: 'sprint1Done' | 'sprint2Done' | 'sprint3Done') => {
    const updated = { ...triage, [key]: !triage[key] };
    setTriage(updated);
    saveTriageState(updated);
    if (updated.sprint1Done && updated.sprint2Done && updated.sprint3Done) {
      toast.success('🎉 ALL 3 EMERGENCY SPRINTS COMPLETED! You conquered the day!');
    }
  };

  const handleExit = () => {
    const cleared: TriageState = {
      isActive: false,
      targetHabitId: null,
      targetHabitName: '',
      activatedAt: '',
      sprint1Done: false,
      sprint2Done: false,
      sprint3Done: false,
    };
    setTriage(cleared);
    saveTriageState(cleared);
    toast.info('Restored normal workspace cockpit');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-3xl bg-gradient-to-r from-rose-950/80 via-card to-amber-950/80 border-2 border-rose-500/50 shadow-xl shadow-rose-950/40 space-y-3 mb-6 relative overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 text-xl shadow-inner animate-pulse flex-shrink-0">
            🚨
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Triage Protocol Active
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                <Shield className="w-3 h-3" /> Streak Protected
              </span>
            </div>
            <h3 className="text-sm font-black text-foreground mt-0.5 truncate max-w-md">
              Single Focus Target: <span className="text-rose-400">{triage.targetHabitName}</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onOpenModal}
            className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-foreground hover:bg-card transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Manage</span>
          </button>
          <button
            onClick={handleExit}
            className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Exit Triage</span>
          </button>
        </div>
      </div>

      {/* 3-Sprint Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        {/* Sprint 1 */}
        <div
          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
            triage.sprint1Done
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-surface/80 border-border/80 text-foreground'
          }`}
        >
          <div className="flex items-center gap-2 truncate pr-1">
            <button
              onClick={() => handleToggleSprintDone('sprint1Done')}
              className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer ${
                triage.sprint1Done
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-border hover:border-primary text-transparent'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
            <span className="truncate text-[11px] font-bold">1. Warmup (15m)</span>
          </div>
          <button
            onClick={() => handleStartSprint(1, 15, 'Warmup')}
            className="p-1 px-2 rounded-lg bg-primary/20 hover:bg-primary text-primary hover:text-white transition-colors cursor-pointer text-[10px] font-mono font-black"
          >
            Run
          </button>
        </div>

        {/* Sprint 2 */}
        <div
          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
            triage.sprint2Done
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-surface/80 border-border/80 text-foreground'
          }`}
        >
          <div className="flex items-center gap-2 truncate pr-1">
            <button
              onClick={() => handleToggleSprintDone('sprint2Done')}
              className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer ${
                triage.sprint2Done
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-border hover:border-primary text-transparent'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
            <span className="truncate text-[11px] font-bold">2. Deep Core (25m)</span>
          </div>
          <button
            onClick={() => handleStartSprint(2, 25, 'Deep Core')}
            className="p-1 px-2 rounded-lg bg-primary/20 hover:bg-primary text-primary hover:text-white transition-colors cursor-pointer text-[10px] font-mono font-black"
          >
            Run
          </button>
        </div>

        {/* Sprint 3 */}
        <div
          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
            triage.sprint3Done
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-surface/80 border-border/80 text-foreground'
          }`}
        >
          <div className="flex items-center gap-2 truncate pr-1">
            <button
              onClick={() => handleToggleSprintDone('sprint3Done')}
              className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer ${
                triage.sprint3Done
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-border hover:border-primary text-transparent'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
            <span className="truncate text-[11px] font-bold">3. Polish & Ship (15m)</span>
          </div>
          <button
            onClick={() => handleStartSprint(3, 15, 'Polish & Ship')}
            className="p-1 px-2 rounded-lg bg-primary/20 hover:bg-primary text-primary hover:text-white transition-colors cursor-pointer text-[10px] font-mono font-black"
          >
            Run
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TriageActiveBanner;
