import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReflections } from "@/hooks/use-reflections";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Star, Heart, Sun, Moon, Zap, CheckCircle2, Calendar, X } from "lucide-react";
import { toast } from "sonner";

// Discipline Score weights per mood/energy level
const DISCIPLINE_SCORE_WEIGHTS: Record<string, number> = {
  exceptional: 100,
  great: 75,
  good: 50,
  okay: 25,
};

const REWARD_ANIMATION_DURATION_MS = 2000;

interface DisciplineRewardProps {
  score: number;
  onAnimateComplete: () => void;
}

function DisciplineRewardAnimation({ score, onAnimateComplete }: DisciplineRewardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ 
        opacity: [0, 1, 1, 0], 
        scale: [0.5, 1.2, 1, 0.8],
        y: [20, -30, 0, -40] 
      }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      onAnimationComplete={onAnimateComplete}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      <motion.div
        className="bg-gradient-to-br from-amber-500/20 to-purple-600/20 backdrop-blur-sm rounded-3xl p-8 border border-amber-500/30 shadow-2xl text-center max-w-sm mx-4"
        animate={{
          boxShadow: [
            "0 0 20px rgba(245, 166, 35, 0.3)",
            "0 0 40px rgba(245, 166, 35, 0.6)",
            "0 0 20px rgba(245, 166, 35, 0.3)"
          ]
        }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [-5, 5, -5]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="mb-6"
        >
          <Sparkles className="w-24 h-24 text-amber-400 mx-auto drop-shadow-2xl" />
        </motion.div>
        
        <h3 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-purple-400 bg-clip-text text-transparent mb-4">
          Discipline Score +
        </h3>
        
        <div className="text-6xl font-black text-white mb-2 drop-shadow-lg font-mono">
          {score}
        </div>
        
        <p className="text-slate-400 text-sm">
          Your morning ritual is complete!
        </p>
      </motion.div>
    </motion.div>
  );
}

interface MorningRitualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MorningRitualModal({ isOpen, onClose }: MorningRitualModalProps) {
  const { user } = useAuth();
  const { saveEntry } = useReflections();
  const { markRitualDone } = useUserSettings();
  
  const [mood, setMood] = useState("great");
  const [energy, setEnergy] = useState("great");
  const [priority, setPriority] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [disciplineScore, setDisciplineScore] = useState(0);
  
  // Check if already completed today
  const today = new Date().toISOString().split("T")[0];
  
  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setMood("great");
      setEnergy("great");
      setPriority("");
    }
  }, [isOpen]);

  const handleMoodSelect = useCallback((selectedMood: string) => {
    setMood(selectedMood);
  }, []);

  const handleEnergySelect = useCallback((selectedEnergy: string) => {
    setEnergy(selectedEnergy);
  }, []);

  const handlePriorityChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPriority(e.target.value);
  }, []);

  const calculateDisciplineScore = useCallback(() => {
    const baseScore = DISCIPLINE_SCORE_WEIGHTS[mood] || 50;
    const energyBonus = energy === "great" || energy === "exceptional" ? 20 : 10;
    const priorityBonus = priority.trim().length > 10 ? 30 : 20;
    
    return Math.min(baseScore + energyBonus + priorityBonus, 200);
  }, [mood, energy, priority]);

  const handleSave = useCallback(async () => {
    if (!priority.trim()) {
      toast.error("Please set your #1 deep-work priority for today.");
      return;
    }

    setIsSaving(true);

    try {
      // Save reflection entry
      const error = await saveEntry(
        `Morning Ritual: ${priority}\nMood: ${mood}\nEnergy: ${energy}`,
        mood
      );

      if (error) {
        console.error("Failed to save reflection:", error);
      }

      // Mark ritual as done
      await markRitualDone();

      // Calculate and show reward
      const score = calculateDisciplineScore();
      setDisciplineScore(score);
      setShowReward(true);

      // Close modal after reward animation
      setTimeout(() => {
        setShowReward(false);
        onClose();
      }, REWARD_ANIMATION_DURATION_MS);

    } catch (err) {
      console.error("Morning ritual save error:", err);
      toast.error("Failed to complete morning ritual. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [priority, mood, energy, saveEntry, markRitualDone, calculateDisciplineScore, onClose]);

  // Mood/Energy selection options
  const moodOptions = [
    { value: "exceptional", label: "Exceptional", icon: Sparkles, color: "text-amber-400" },
    { value: "great", label: "Great", icon: Star, color: "text-blue-400" },
    { value: "good", label: "Good", icon: Heart, color: "text-pink-400" },
    { value: "okay", label: "Okay", icon: Moon, color: "text-slate-400" },
  ];

  const energyOptions = [
    { value: "exceptional", label: "Exceptional", icon: Zap, color: "text-yellow-400" },
    { value: "great", label: "Great", icon: Sun, color: "text-orange-400" },
    { value: "good", label: "Good", icon: Star, color: "text-green-400" },
    { value: "okay", label: "Okay", icon: Moon, color: "text-slate-400" },
  ];

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {showReward && (
          <DisciplineRewardAnimation 
            score={disciplineScore} 
            onAnimateComplete={() => setShowReward(false)} 
          />
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ 
          type: "spring",
          damping: 25,
          stiffness: 300,
          duration: 0.5
        }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto relative w-full max-w-2xl">
          {/* Decorative background elements */}
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 rounded-3xl blur-xl opacity-60 animate-pulse" />
          
          <div className="relative bg-card rounded-2xl border border-border shadow-2xl overflow-hidden text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-surface/50">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-400 to-purple-400 bg-clip-text text-transparent font-mono">
                  Good Morning, Performer! 🌅
                </h2>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                  Let's set the tone for an incredible day ahead
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-surface transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Mood & Energy Section */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Mood Selector */}
                  <div className="space-y-2.5">
                    <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-500" />
                      How's your mood?
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {moodOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = mood === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleMoodSelect(option.value)}
                            className={`
                              relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl transition-all duration-200 cursor-pointer
                              ${isSelected 
                                ? "bg-pink-500/15 border-2 border-pink-500 shadow-md shadow-pink-500/20 text-foreground font-bold" 
                                : "bg-surface/70 border border-border hover:border-primary/30 hover:bg-surface text-muted-foreground hover:text-foreground"
                              }
                            `}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2">
                                <CheckCircle2 className="w-4 h-4 text-pink-500" />
                              </div>
                            )}
                            <Icon className={`w-7 h-7 mb-1.5 ${isSelected ? option.color : "text-muted-foreground"}`} />
                            <span className="text-xs font-semibold">
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Energy Selector */}
                  <div className="space-y-2.5">
                    <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      Energy level?
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {energyOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = energy === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleEnergySelect(option.value)}
                            className={`
                              relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl transition-all duration-200 cursor-pointer
                              ${isSelected 
                                ? "bg-yellow-500/15 border-2 border-yellow-500 shadow-md shadow-yellow-500/20 text-foreground font-bold" 
                                : "bg-surface/70 border border-border hover:border-primary/30 hover:bg-surface text-muted-foreground hover:text-foreground"
                              }
                            `}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2">
                                <CheckCircle2 className="w-4 h-4 text-yellow-500" />
                              </div>
                            )}
                            <Icon className={`w-7 h-7 mb-1.5 ${isSelected ? option.color : "text-muted-foreground"}`} />
                            <span className="text-xs font-semibold">
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Priority Input */}
              <div className="space-y-2.5">
                <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  What's your #1 deep-work priority block for today?
                </label>
                <textarea
                  value={priority}
                  onChange={handlePriorityChange}
                  placeholder="e.g., Complete Q3 financial report analysis..."
                  className="w-full h-20 px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none text-xs sm:text-sm"
                  maxLength={200}
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {priority.length}/200 characters
                </p>
              </div>

              {/* Discipline Score Preview */}
              <div className="bg-surface/60 rounded-xl p-3.5 sm:p-4 border border-border/80">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono font-bold mb-1">
                      Potential Discipline Score
                    </p>
                    <p className="text-sm sm:text-base font-semibold text-foreground">
                      Base: {DISCIPLINE_SCORE_WEIGHTS[mood]} + {energy === "great" || energy === "exceptional" ? "20" : "10"} + {priority.trim().length > 10 ? "30" : "20"} = <span className="text-amber-400 font-bold">{calculateDisciplineScore()}</span>
                    </p>
                  </div>
                  <div className="h-10 w-px bg-border mx-4" />
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono font-bold mb-1">
                      Time to complete
                    </p>
                    <p className="text-sm sm:text-base font-semibold text-pps-green flex items-center justify-end gap-1 font-mono">
                      <Zap className="w-4 h-4" />
                      5 min
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleSave}
                disabled={isSaving || !priority.trim()}
                className={`
                  w-full py-3.5 rounded-xl font-bold text-sm sm:text-base shadow-lg transition-all duration-300 cursor-pointer
                  ${isSaving || !priority.trim()
                    ? "bg-muted cursor-not-allowed text-muted-foreground" 
                    : "bg-gradient-to-r from-amber-500 via-purple-600 to-primary text-white hover:shadow-xl hover:opacity-95 active:scale-[0.98]"
                  }
                `}
              >
                {isSaving ? (
                  <div className="flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    <span>Saving your progress...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Complete Morning Ritual</span>
                  </div>
                )}
              </button>
            </div>

            {/* Footer */}
            <div className="px-8 py-3.5 bg-surface/50 border-t border-border text-center">
              <p className="text-[11px] text-muted-foreground">
                Daily ritual completed! You'll be rewarded with XP and discipline points.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
