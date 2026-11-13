import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Plus,
  Bot,
  Headphones,
  Users,
  Maximize2,
  Shield,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  Flame,
  CheckCircle2,
  X,
  Clock,
  Compass,
} from "lucide-react";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { ambientAudio, AmbienceType } from "@/lib/audio/ambientSynthesizer";
import { feedbackSounds } from "@/lib/audio/clickFeedback";
import { toast } from "sonner";

interface Props {
  onAddHabitClick?: () => void;
  onOpenAiAgent?: () => void;
  onToggleZenMode?: () => void;
  isZenMode?: boolean;
  onNavigate?: (section: string) => void;
  maxStreak?: number;
  freezeCredits?: number;
  hasAiRecommendation?: boolean;
}

export const InteractiveQuickDock: React.FC<Props> = ({
  onAddHabitClick,
  onOpenAiAgent,
  onToggleZenMode,
  isZenMode = false,
  onNavigate,
  maxStreak = 0,
  freezeCredits = 0,
  hasAiRecommendation = false,
}) => {
  const focusTimer = useFocusTimer();

  // Ambient audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(() => {
    try {
      if (typeof ambientAudio?.getIsPlaying === "function") {
        return ambientAudio.getIsPlaying();
      }
      return ambientAudio?.getCurrentType?.() !== "none";
    } catch {
      return false;
    }
  });
  const [currentAmbience, setCurrentAmbience] = useState<AmbienceType>(() => {
    try {
      return ambientAudio?.getCurrentType?.() || "none";
    } catch {
      return "none";
    }
  });
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSprintMenu, setShowSprintMenu] = useState(false);
  const [showShieldModal, setShowShieldModal] = useState(false);

  const toggleAmbientAudio = (type?: AmbienceType) => {
    feedbackSounds.playClick();
    if (isPlayingAudio && (!type || type === currentAmbience)) {
      ambientAudio.stop();
      setIsPlayingAudio(false);
      toast.info("Ambient soundscape stopped");
    } else {
      const targetType = type || currentAmbience;
      ambientAudio.start(targetType);
      setCurrentAmbience(targetType);
      setIsPlayingAudio(true);
      toast.success(`Playing ${targetType === "lofi" ? "Lo-Fi 432Hz" : targetType === "rain" ? "Soft Rain" : targetType === "binaural" ? "Binaural Alpha" : "Library Focus"} 🎧`);
    }
  };

  const launchSprint = (minutes: number, label: string) => {
    feedbackSounds.playSprintLaunch();
    focusTimer.changeTimerMode("pomodoro", minutes);
    focusTimer.setActiveTaskName(label);
    focusTimer.startTimer();
    setShowSprintMenu(false);
    toast.success(`⚡ ${minutes}m Focus Sprint Launched!`, {
      description: `Task: ${label}. Stay locked in.`,
    });
  };

  return (
    <div className="relative z-20">
      {/* ── Floating Speed-Dial Command Dock ── */}
      <div className="p-2 sm:p-2.5 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/80 shadow-lg flex items-center justify-between gap-1.5 sm:gap-2 flex-wrap">
        
        {/* Left: Quick Sprint & Timer Trigger */}
        <div className="relative">
          {focusTimer.isRunning ? (
            <button
              type="button"
              onClick={() => {
                feedbackSounds.playClick();
                focusTimer.toggleTimer();
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-primary/20 border border-emerald-500/50 text-emerald-400 text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.02] shadow-sm animate-pulse"
              title="Focus Sprint active — click to pause/resume"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{Math.floor(focusTimer.remainingSec / 60)}:{(focusTimer.remainingSec % 60).toString().padStart(2, "0")}</span>
              <span className="text-[10px] text-muted-foreground uppercase hidden sm:inline">Pause</span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowSprintMenu((prev) => !prev)}
                className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:bg-primary/90 shadow-md shadow-primary/25 hover:scale-[1.02]"
                title="Launch a focused deep work sprint"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Quick Sprint</span>
                <kbd className="hidden md:inline-block text-[9px] bg-white/20 text-white px-1 py-0.2 rounded font-mono font-normal">Space</kbd>
              </button>
            </div>
          )}

          {/* Quick Sprint Dropdown Menu */}
          <AnimatePresence>
            {showSprintMenu && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                className="absolute top-full left-0 mt-2 w-56 p-2 rounded-2xl bg-card/95 backdrop-blur-xl border border-primary/30 shadow-2xl z-50 space-y-1"
              >
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1 flex items-center justify-between">
                  <span>Sprint Durations</span>
                  <button onClick={() => setShowSprintMenu(false)} className="hover:text-foreground">✕</button>
                </div>
                {[
                  { m: 15, label: "15m Micro Sprint", icon: "⚡", desc: "Beat procrastination fast" },
                  { m: 25, label: "25m Classic Pomodoro", icon: "🍅", desc: "Gold standard focus cycle" },
                  { m: 50, label: "50m Deep Flow Sprint", icon: "🌊", desc: "Complex coding or studying" },
                  { m: 90, label: "90m Ultradian Marathon", icon: "🏔️", desc: "Maximum deep work capacity" },
                ].map((s) => (
                  <button
                    key={s.m}
                    type="button"
                    onClick={() => launchSprint(s.m, s.label)}
                    className="w-full text-left p-2 rounded-xl hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{s.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-foreground group-hover:text-primary">{s.label}</div>
                        <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center: Action Buttons Group */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {/* Quick Add Habit */}
          {onAddHabitClick && (
            <button
              type="button"
              onClick={() => {
                feedbackSounds.playClick();
                onAddHabitClick();
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface border border-border/80 text-foreground hover:border-primary/40 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 hover:bg-surface/90 shadow-xs"
              title="Add a new habit or daily task"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Add Task</span>
              <kbd className="hidden md:inline-block text-[9px] bg-muted px-1 py-0.2 rounded font-mono text-muted-foreground">Q</kbd>
            </button>
          )}

          {/* AI Executive Agent Trigger */}
          {onOpenAiAgent && (
            <button
              type="button"
              onClick={() => {
                feedbackSounds.playClick();
                onOpenAiAgent();
              }}
              className="relative px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/15 via-primary/10 to-purple-500/15 border border-primary/35 text-primary hover:border-primary text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:scale-105"
              title="Open Pro AI Cognitive Copilot"
            >
              <Bot className="w-3.5 h-3.5 text-primary" />
              <span>AI Agent</span>
              <span className="text-[9px] font-mono uppercase bg-primary/20 px-1 rounded-sm text-primary font-black">PRO</span>
              {hasAiRecommendation && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5" title="AI recommendation active">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500 border-2 border-background"></span>
                </span>
              )}
            </button>
          )}

          {/* Ambient Soundscapes Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAudioMenu((prev) => !prev)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                isPlayingAudio
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-500 font-bold"
                  : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
              }`}
              title="432Hz Ambient Soundscapes"
            >
              <Headphones className={`w-3.5 h-3.5 ${isPlayingAudio ? "text-amber-500 animate-pulse" : ""}`} />
              <span className="hidden sm:inline">{isPlayingAudio ? "Audio On" : "432Hz Sound"}</span>
              <kbd className="hidden md:inline-block text-[9px] bg-muted px-1 py-0.2 rounded font-mono text-muted-foreground">A</kbd>
            </button>

            {/* Audio Selection Popover */}
            <AnimatePresence>
              {showAudioMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  className="absolute top-full right-0 sm:left-0 mt-2 w-52 p-2 rounded-2xl bg-card/95 backdrop-blur-xl border border-amber-500/30 shadow-2xl z-50 space-y-1"
                >
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1 flex items-center justify-between">
                    <span>Soundscape Generator</span>
                    <button onClick={() => setShowAudioMenu(false)} className="hover:text-foreground">✕</button>
                  </div>
                  {[
                    { id: "lofi" as AmbienceType, label: "Lo-Fi 432Hz", icon: "☕", desc: "Warm rhythmic acoustic" },
                    { id: "rain" as AmbienceType, label: "Soft Rain", icon: "🌧️", desc: "Natural binaural rainfall" },
                    { id: "binaural" as AmbienceType, label: "Alpha Waves (432Hz)", icon: "🧠", desc: "Deep flow state focus" },
                    { id: "library" as AmbienceType, label: "Silent Library", icon: "📚", desc: "Subtle acoustic rustle" },
                  ].map((aud) => {
                    const isSelected = isPlayingAudio && currentAmbience === aud.id;
                    return (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => toggleAmbientAudio(aud.id)}
                        className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                          isSelected ? "bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{aud.icon}</span>
                          <div>
                            <div className="text-xs">{aud.label}</div>
                            <div className="text-[9px] text-muted-foreground">{aud.desc}</div>
                          </div>
                        </div>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
                      </button>
                    );
                  })}
                  {isPlayingAudio && (
                    <button
                      type="button"
                      onClick={() => toggleAmbientAudio()}
                      className="w-full text-center py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg font-bold transition-all cursor-pointer mt-1"
                    >
                      Mute Audio 🔇
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Whiteboard & Co-Work Room */}
          {onNavigate && (
            <button
              type="button"
              onClick={() => {
                feedbackSounds.playClick();
                onNavigate("social");
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface border border-border/80 text-foreground hover:border-cyan-500/40 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 hover:bg-surface/90 shadow-xs"
              title="Open Focus Room & Whiteboard"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Squad Room</span>
            </button>
          )}

          {/* Zen Focus Mode Toggle */}
          {onToggleZenMode && (
            <button
              type="button"
              onClick={() => {
                feedbackSounds.playClick();
                onToggleZenMode();
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                isZenMode
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-400 font-bold"
                  : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
              }`}
              title="Toggle Single-Task Zen Spotlight View"
            >
              <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Zen Mode</span>
              <kbd className="hidden md:inline-block text-[9px] bg-muted px-1 py-0.2 rounded font-mono text-muted-foreground">Z</kbd>
            </button>
          )}
        </div>

        {/* Right: Streak & Shield Status Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowShieldModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface/80 border border-border/60 hover:border-primary/40 transition-all cursor-pointer text-xs font-mono"
            title="Streak Protection & Freeze Credits"
          >
            <Flame className="w-3.5 h-3.5 text-pps-orange" />
            <span className="font-bold text-foreground">{maxStreak}d</span>
            <span className="text-muted-foreground">|</span>
            <Shield className="w-3 h-3 text-cyan-400" />
            <span className="text-cyan-400 font-bold">{freezeCredits}</span>
          </button>
        </div>
      </div>

      {/* Streak Shield Modal Drawer */}
      <AnimatePresence>
        {showShieldModal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-3.5 rounded-2xl bg-card border border-cyan-500/30 text-xs font-mono shadow-xl space-y-2"
          >
            <div className="flex items-center justify-between font-bold text-foreground border-b border-border/50 pb-1.5">
              <span className="flex items-center gap-2 text-cyan-400">
                <Shield className="w-4 h-4" />
                <span>Streak Auto-Shield Engine</span>
              </span>
              <button onClick={() => setShowShieldModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1">
              <div>• Active Streak: <strong className="text-foreground">{maxStreak} consecutive days</strong></div>
              <div>• Protected Freeze Credits: <strong className="text-cyan-400">{freezeCredits} remaining</strong></div>
              <div>• If you take a planned Rest Day or Sick Day, your streak is shielded with zero penalty!</div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    setShowShieldModal(false);
                    onNavigate("streak");
                  }}
                  className="mt-1 text-primary hover:underline text-[11px] font-bold flex items-center gap-1 cursor-pointer pt-1 border-t border-border/40"
                >
                  <span>Open Full Streak Engine →</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
