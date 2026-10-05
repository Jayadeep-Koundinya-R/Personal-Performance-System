import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useGroups } from "@/hooks/use-groups";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { HABIT_TEMPLATES } from "@/lib/habitTemplates";
import { Check, Flame, Users, Clock, Sparkles, ChevronRight, ArrowRight, X, Shield, Award, Play } from "lucide-react";
import { toast } from "sonner";

interface InteractiveOnboardingModalProps {
  onDismiss: () => void;
  onNavigateToSection?: (section: string) => void;
  onApplyTemplate?: (templateId: string) => Promise<void>;
}

export const InteractiveOnboardingModal: React.FC<InteractiveOnboardingModalProps> = ({
  onDismiss,
  onNavigateToSection,
  onApplyTemplate,
}) => {
  const { habits, addHabit } = useHabits();
  const { groups, loadSampleSquad } = useGroups();
  const timer = useFocusTimer();

  // Active step: 0 = Welcome/Select Persona Stack, 1 = Add First Habit, 2 = Join Study Squad, 3 = Launch Focus Pomodoro, 4 = Ready/Complete
  const [currentStep, setCurrentStep] = useState(0);

  // Custom habit input state
  const [customHabitName, setCustomHabitName] = useState("");
  const [customHabitCategory, setCustomHabitCategory] = useState("Productivity");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>("student_focus");

  // Local completion trackers for the interactive session
  const [hasAddedHabit, setHasAddedHabit] = useState(habits.length > 0);
  const [hasSquad, setHasSquad] = useState(groups.length > 0);
  const [hasLaunchedTimer, setHasLaunchedTimer] = useState(timer.isRunning);

  // Quick Starter Options
  const STARTER_SUGGESTIONS = [
    { icon: "💻", name: "30-min Deep Study Sprint", cat: "Productivity", priority: "High" as const },
    { icon: "💧", name: "Morning Sunlight & 1L Water", cat: "Health", priority: "High" as const },
    { icon: "📚", name: "Read 10 Pages Notes / Book", cat: "Learning", priority: "Medium" as const },
    { icon: "🧘", name: "5-min Nightly Reflection", cat: "Mindset", priority: "Low" as const },
  ];

  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (onApplyTemplate) {
      await onApplyTemplate(templateId);
      setHasAddedHabit(true);
      toast.success("🎯 Habit pack installed! Step 1 complete (+10 XP)!");
    }
  };

  const handleQuickAddSingle = async (name: string, cat: string, priority: "High" | "Medium" | "Low") => {
    await addHabit(name, cat, "Daily", priority);
    setHasAddedHabit(true);
    toast.success(`⚡ Added "${name}"! (+10 XP)`);
  };

  const handleAddCustomHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customHabitName.trim()) return;
    await addHabit(customHabitName.trim(), customHabitCategory, "Daily", "High");
    setCustomHabitName("");
    setHasAddedHabit(true);
    toast.success(`⚡ Added "${customHabitName.trim()}"! (+10 XP)`);
  };

  const handleLoadSquad = async () => {
    loadSampleSquad();
    setHasSquad(true);
    toast.success("👥 Joined 'Mastery & Focus Squad'! Live study presence & group chat unlocked.");
  };

  const handleStart5MinPomodoro = () => {
    timer.setActiveTaskName("Interactive Onboarding Sprint 🚀");
    timer.changeTimerMode("custom", 5);
    timer.startTimer();
    setHasLaunchedTimer(true);
    toast.success("⏱️ 5-Minute Focus Sprint started! 432Hz binaural focus active.");
  };


  const stepsList = [
    { title: "Choose Your Path", desc: "Pick your focus routine pack" },
    { title: "Add 1st Habit", desc: "Set your daily baseline" },
    { title: "Join Study Squad", desc: "Social accountability" },
    { title: "Focus Sprint", desc: "Launch synced Pomodoro" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2050] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="bg-card border border-border/80 rounded-3xl p-5 sm:p-8 max-w-xl w-full shadow-2xl relative overflow-hidden my-auto"
      >
        {/* Glow ambient accent */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header & Progress Stepper */}
        <div className="flex items-center justify-between pb-4 border-b border-border/60 mb-5 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🚀</span>
              <h2 className="text-base sm:text-lg font-black text-foreground font-mono">
                Interactive Onboarding
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Build your complete discipline system in 3 interactive steps
            </p>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
            title="Skip onboarding for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4-Step Interactive Progress Tracker */}
        <div className="grid grid-cols-4 gap-1.5 mb-6 relative z-10">
          {stepsList.map((st, i) => {
            const isCompleted = i < currentStep || (i === 1 && hasAddedHabit) || (i === 2 && hasSquad) || (i === 3 && hasLaunchedTimer);
            const isCurrent = currentStep === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentStep(i)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-primary/15 border-primary/40 ring-1 ring-primary/30"
                    : isCompleted
                    ? "bg-pps-green/10 border-pps-green/30"
                    : "bg-surface/50 border-border/40 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">Step {i + 1}</span>
                  {isCompleted && <Check className="w-3 h-3 text-pps-green stroke-[3]" />}
                </div>
                <div className={`text-[11px] font-extrabold truncate mt-0.5 ${isCurrent ? "text-primary" : "text-foreground"}`}>
                  {st.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── STEP 0: Welcome & Starter Persona Pack ── */}
        {currentStep === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4 relative z-10"
          >
            <div className="text-center space-y-1 py-1">
              <span className="text-4xl inline-block mb-1">🎯</span>
              <h3 className="text-base font-extrabold text-foreground">Welcome to PPS (Personal Performance System)</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                PPS is a complete discipline engine. Instead of starting with an empty screen, pick a curated starter pack tailored to your goals.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[40vh] overflow-y-auto pr-1">
              {HABIT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    selectedTemplateId === tmpl.id
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md shadow-primary/10"
                      : "border-border/80 bg-surface/70 hover:border-primary/40 hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl">{tmpl.icon}</span>
                    {selectedTemplateId === tmpl.id && (
                      <span className="text-[10px] font-mono font-bold text-primary bg-primary/20 px-2 py-0.5 rounded-full">
                        Selected ✓
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-black text-foreground">{tmpl.name}</div>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {tmpl.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-muted-foreground hover:text-foreground font-mono cursor-pointer"
              >
                Skip to Custom Habits →
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-black hover:scale-105 transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 1: Interactive Habit Builder ── */}
        {currentStep === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4 relative z-10"
          >
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-primary uppercase tracking-wider">
                <span>Step 1 of 3</span>
                <span>•</span>
                <span>Active Habits: {habits.length}</span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-foreground mt-0.5">
                Add Your Core Daily Habits
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click any 1-tap starter below or type a custom habit to begin earning daily XP.
              </p>
            </div>

            {/* Quick 1-tap starters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STARTER_SUGGESTIONS.map((st, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickAddSingle(st.name, st.cat, st.priority)}
                  className="p-2.5 rounded-xl bg-surface/80 border border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex items-center justify-between group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    <span className="text-base">{st.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {st.name}
                      </div>
                      <div className="text-[9.5px] text-muted-foreground font-mono">{st.cat}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all flex-shrink-0">
                    + Add
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Add Form */}
            <form onSubmit={handleAddCustomHabit} className="flex gap-2 pt-1">
              <input
                type="text"
                value={customHabitName}
                onChange={(e) => setCustomHabitName(e.target.value)}
                placeholder="Or type custom habit (e.g., Solve 5 JEE Physics Problems)..."
                className="flex-1 bg-surface border border-border px-3 py-2 rounded-xl text-xs outline-none focus:border-primary text-foreground"
              />
              <button
                type="submit"
                disabled={!customHabitName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40 cursor-pointer"
              >
                + Add
              </button>
            </form>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="text-xs text-muted-foreground hover:text-foreground font-mono cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-black hover:scale-105 transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center gap-1.5"
              >
                <span>Next: Join Study Squad</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Interactive Study Squad ── */}
        {currentStep === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4 relative z-10"
          >
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-primary uppercase tracking-wider">
                <span>Step 2 of 3</span>
                <span>•</span>
                <span>Social Accountability</span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-foreground mt-0.5">
                Join a Study Squad Circle
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Studying alone leads to burnout. Squads sync group Pomodoros, live chat channels, and competitive XP leaderboards.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface/70 border border-border/80 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary border border-secondary/30 flex items-center justify-center text-2xl flex-shrink-0">
                  👥
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-foreground">Mastery & Focus Squad</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    Live study room with synced group timer, shared notes channel, and weekly accountability streak pact.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20 font-bold">
                      Code: FOCUS1
                    </span>
                    <span className="text-[10px] text-muted-foreground">Public • 20 max members</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLoadSquad}
                className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-black text-xs hover:bg-secondary/90 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <span>⚡ Join Squad Instantly</span>
                {hasSquad && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-muted-foreground hover:text-foreground font-mono cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-black hover:scale-105 transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center gap-1.5"
              >
                <span>Next: Launch Pomodoro</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Interactive Focus Studio Pomodoro ── */}
        {currentStep === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4 relative z-10"
          >
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-primary uppercase tracking-wider">
                <span>Step 3 of 3</span>
                <span>•</span>
                <span>Execution Engine</span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-foreground mt-0.5">
                Launch Your First Focus Sprint
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Experience high-performance deep work with synced timers, procedural soundscapes, and mini-PiP persistence.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-surface to-secondary/10 border border-primary/30 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/20 text-primary border border-primary/40 text-2xl animate-pulse">
                ⏱️
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-foreground">05:00</div>
                <div className="text-[11px] text-muted-foreground font-mono">Starter 5-Minute Sprint</div>
              </div>

              <button
                type="button"
                onClick={handleStart5MinPomodoro}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-black text-xs hover:scale-102 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-primary/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{hasLaunchedTimer ? "Restart 5-Min Sprint" : "Start 5-Min Sprint Now"}</span>
              </button>
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs text-muted-foreground hover:text-foreground font-mono cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={async () => {
                  toast.success("🏆 You are ready! Entering your Command Dashboard.");
                  onDismiss();
                }}
                className="px-5 py-2.5 rounded-xl bg-pps-green text-white text-xs font-black hover:scale-105 transition-all shadow-md shadow-pps-green/20 cursor-pointer flex items-center gap-1.5"
              >
                <span>Complete Onboarding ✓</span>
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};
