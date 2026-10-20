import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHabits } from '@/hooks/use-habits';
import {
  CURATED_BLUEPRINTS,
  extractTopicsFromText,
  decomposeIntoDailySequence,
  getBlueprintTopics,
  SyllabusItem,
} from '@/lib/syllabus/syllabusParser';
import { BookOpen, Sparkles, X, CheckCircle2, Calendar, ArrowRight, Layers, FileText } from 'lucide-react';
import { toast } from 'sonner';

export interface SyllabusDecomposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDecompositionApplied?: (items: SyllabusItem[]) => void;
}

export const SyllabusDecomposerModal: React.FC<SyllabusDecomposerModalProps> = ({
  isOpen,
  onClose,
  onDecompositionApplied,
}) => {
  const { addHabit } = useHabits();

  // Mode: "blueprint" or "custom_text"
  const [mode, setMode] = useState<'blueprint' | 'custom_text'>('blueprint');
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>('gate_cse');
  const [rawText, setRawText] = useState<string>('');
  const [totalDays, setTotalDays] = useState<number>(30);
  const [isInjecting, setIsInjecting] = useState<boolean>(false);

  // Active Blueprint
  const activeBlueprint = useMemo(() => {
    return CURATED_BLUEPRINTS.find((b) => b.id === selectedBlueprintId) || CURATED_BLUEPRINTS[0];
  }, [selectedBlueprintId]);

  // Derived topics
  const effectiveTopics = useMemo(() => {
    if (mode === 'blueprint') {
      return getBlueprintTopics(selectedBlueprintId).map((t) => t.topic);
    }
    return extractTopicsFromText(rawText);
  }, [mode, selectedBlueprintId, rawText]);

  // Decomposed 15/30/60-day schedule
  const dailySequence = useMemo(() => {
    const moduleName = mode === 'blueprint' ? activeBlueprint.title : 'Course Syllabus';
    return decomposeIntoDailySequence(effectiveTopics, totalDays, new Date(), moduleName);
  }, [effectiveTopics, totalDays, mode, activeBlueprint]);

  // Inject into user's live habits
  const handleInjectHabits = async () => {
    if (dailySequence.length === 0) {
      toast.error('No topics available to inject. Please enter topics or select a blueprint.');
      return;
    }

    setIsInjecting(true);
    try {
      // Inject the first 7 days immediately so user's checklist is primed without cluttering 60 items at once
      const initialBatch = dailySequence.slice(0, 14);
      let injectedCount = 0;

      for (const item of initialBatch) {
        const habitName = `[Day ${item.day}] ${item.topic}`;
        const category = mode === 'blueprint' ? activeBlueprint.category : 'Studies';
        await addHabit(
          habitName,
          category,
          'Daily',
          'High',
          item.dateStr,
          item.timeBlock === 'morning' ? '08:00' : item.timeBlock === 'afternoon' ? '14:00' : '19:00',
          item.timeBlock === 'morning' ? '08:30' : item.timeBlock === 'afternoon' ? '14:30' : '19:30'
        );
        injectedCount++;
      }

      toast.success(`🚀 Injected ${injectedCount} sequential syllabus habits into your daily checklist!`, {
        description: `Spaced repetition sequence active for "${mode === 'blueprint' ? activeBlueprint.title : 'Custom Syllabus'}"`,
      });

      if (onDecompositionApplied) {
        onDecompositionApplied(dailySequence);
      }

      onClose();
    } catch (err: any) {
      toast.error('Failed to inject syllabus habits: ' + (err.message || 'Unknown error'));
    } finally {
      setIsInjecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-card border border-primary/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/25 via-card to-cyan-500/20 border-b border-border/80 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl shadow-inner">
                📚
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-foreground tracking-tight">
                    Syllabus-to-Habit Decomposer
                  </h3>
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    Spaced Repetition
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  Deconstruct monolithic exam roadmaps into a 30-day sequential habit track.
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

          {/* Mode Switcher */}
          <div className="px-6 pt-4 pb-2 border-b border-border/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setMode('blueprint')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'blueprint'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🎓 Curated Blueprints
              </button>
              <button
                type="button"
                onClick={() => setMode('custom_text')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'custom_text'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ✍️ Paste Custom Syllabus
              </button>
            </div>

            {/* Total Days Selector */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">Duration:</span>
              {[15, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setTotalDays(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                    totalDays === d
                      ? 'bg-cyan-500 text-white shadow-xs'
                      : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {mode === 'blueprint' ? (
              /* Blueprint Grid */
              <div className="space-y-3">
                <label className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                  Select Exam or Engineering Track:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CURATED_BLUEPRINTS.map((b) => {
                    const isSelected = selectedBlueprintId === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBlueprintId(b.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'bg-primary/15 border-primary shadow-xs'
                            : 'bg-surface border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="text-2xl flex-shrink-0 mt-0.5">{b.icon}</span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-foreground truncate">{b.title}</h4>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                            {b.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Custom Textarea */
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Paste raw syllabus topics or course outline:</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {effectiveTopics.length} topics detected
                  </span>
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Example:\n1. B-Trees & B+ Trees Indexing\n2. SQL Nested Subqueries\n3. Banker's Deadlock Algorithm\n4. Paging & Virtual Memory\n5. TCP Congestion Control`}
                  className="w-full h-32 bg-surface border border-border rounded-2xl p-3.5 text-xs text-foreground font-mono focus:outline-hidden focus:border-primary resize-none"
                />
              </div>
            )}

            {/* Sequence Preview */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Spaced-Repetition Daily Track ({dailySequence.length} Days)</span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Includes Days 7, 14, 21, 30 active recall reviews
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 rounded-2xl bg-surface/50 border border-border p-2">
                {dailySequence.slice(0, 10).map((item) => (
                  <div
                    key={item.day}
                    className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                      item.isReviewDay
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold'
                        : 'bg-card border-border/60 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-[10px] font-mono font-black opacity-75 min-w-[45px]">
                        Day {item.day}
                      </span>
                      <span className="truncate">{item.topic}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                      {item.durationMinutes}m • {item.timeBlock}
                    </span>
                  </div>
                ))}
                {dailySequence.length > 10 && (
                  <div className="text-center text-[11px] text-muted-foreground py-1 font-mono">
                    + {dailySequence.length - 10} more sequential daily blocks...
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="pt-2">
              <button
                onClick={handleInjectHabits}
                disabled={isInjecting || dailySequence.length === 0}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-primary to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-cyan-500/25 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>
                  {isInjecting
                    ? 'Injecting Habits...'
                    : `🚀 Inject ${totalDays}-Day Syllabus Track into Workspace`}
                </span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SyllabusDecomposerModal;
