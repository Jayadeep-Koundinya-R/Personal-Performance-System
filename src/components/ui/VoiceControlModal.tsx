import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import { useHabits } from "@/hooks/use-habits";
import { useSubscription } from "@/hooks/use-subscription";
import { Mic, MicOff, Volume2, Sparkles, X, Check, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface VoiceControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (section: string) => void;
}

export default function VoiceControlModal({ isOpen, onClose, onNavigate }: VoiceControlModalProps) {
  const { habits, toggleCompletion, isHabitDueToday, getTodayStr } = useHabits();
  const { isPro } = useSubscription();
  const [lastCommandText, setLastCommandText] = useState("");
  const [feedback, setFeedback] = useState("");

  const processVoiceCommand = useCallback((rawText: string) => {
    const text = rawText.toLowerCase().trim();
    setLastCommandText(rawText);

    if (!text) return;

    // Command 1: Complete / Done habit
    if (text.includes("complete") || text.includes("done") || text.includes("check off")) {
      const cleanName = text.replace(/(complete|done|check off|habit)/gi, "").trim();
      if (cleanName) {
        const matched = habits.find((h) => h.name.toLowerCase().includes(cleanName));
        if (matched) {
          toggleCompletion(matched.id);
          const msg = `Completed habit "${matched.name}"!`;
          setFeedback(`✓ ${msg}`);
          toast.success(msg);
          speak(msg);
          return;
        }
      }
      // If no name matched or cleanName was empty, try completing first pending habit
      const todayStr = getTodayStr();
      const pending = habits.filter((h) => isHabitDueToday(h) && !h.completedDates.includes(todayStr));
      if (pending.length > 0) {
        toggleCompletion(pending[0].id);
        const msg = `Completed "${pending[0].name}"!`;
        setFeedback(`✓ ${msg}`);
        toast.success(msg);
        speak(msg);
        return;
      }
    }

    // Command 2: Pending habits status
    if (text.includes("how many") || text.includes("pending") || text.includes("status")) {
      const todayStr = getTodayStr();
      const due = habits.filter((h) => isHabitDueToday(h));
      const done = due.filter((h) => h.completedDates.includes(todayStr));
      const remaining = due.length - done.length;
      const msg = `You have ${remaining} pending habits remaining today out of ${due.length} total.`;
      setFeedback(msg);
      toast.info(msg);
      speak(msg);
      return;
    }

    // Command 3: Navigate to sections
    if (text.includes("analytics") || text.includes("chart")) {
      if (onNavigate) onNavigate("analytics");
      setFeedback("Navigating to Analytics Studio...");
      speak("Navigating to Analytics");
      onClose();
      return;
    }
    if (text.includes("reflection") || text.includes("journal")) {
      if (onNavigate) onNavigate("reflections");
      setFeedback("Navigating to Reflections Studio...");
      speak("Navigating to Reflections");
      onClose();
      return;
    }
    if (text.includes("tracker") || text.includes("focus") || text.includes("timer")) {
      if (onNavigate) onNavigate("tracker");
      setFeedback("Opening Focus Studio...");
      speak("Opening Focus Studio");
      onClose();
      return;
    }

    // Command 4: Unrecognized command
    const fallbackMsg = `Recognized: "${rawText}". Try saying "Complete meditation" or "How many habits left?".`;
    setFeedback(fallbackMsg);
    toast.info(fallbackMsg);
  }, [habits, toggleCompletion, isHabitDueToday, getTodayStr, onNavigate, onClose]);

  const { isListening, transcript, isSupported, startListening, stopListening, speak } =
    useVoiceCommands(processVoiceCommand);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[10000] flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          className="bg-card border border-primary/40 rounded-3xl p-7 max-w-md w-full text-center shadow-2xl space-y-6 relative overflow-hidden"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full w-max mx-auto uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Voice Command Studio {isPro ? "Pro 👑" : ""}</span>
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-foreground">Speak Your Command</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Control your habits, focus sessions, and navigation with your voice.
            </p>
          </div>

          {/* Glowing Mic Trigger */}
          <div className="relative py-4">
            <motion.button
              onClick={isListening ? stopListening : startListening}
              animate={isListening ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl mx-auto shadow-2xl transition-all cursor-pointer ${
                isListening
                  ? "bg-destructive text-white shadow-destructive/50 ring-4 ring-destructive/30 animate-pulse"
                  : "bg-gradient-to-br from-primary to-accent text-white shadow-primary/40 hover:scale-105"
              }`}
            >
              {isListening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
            </motion.button>

            <div className="text-xs font-mono font-bold text-slate-300 mt-4">
              {isListening ? "🎙️ Listening... Speak now!" : "Tap microphone to start listening"}
            </div>
          </div>

          {/* Transcript display */}
          {(transcript || lastCommandText) && (
            <div className="bg-surface border border-border/80 rounded-2xl p-4 text-left space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">Hearing:</div>
              <div className="text-sm font-mono font-bold text-primary">
                "{transcript || lastCommandText}"
              </div>
              {feedback && (
                <div className="text-xs text-pps-green font-medium pt-1 border-t border-border/40 mt-1">
                  {feedback}
                </div>
              )}
            </div>
          )}

          {/* Command Suggestions */}
          <div className="text-left space-y-2 pt-2 border-t border-border/40">
            <div className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-primary" />
              <span>Sample Voice Commands:</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-300">
              <div className="p-2 bg-surface/60 border border-border/60 rounded-xl font-mono">
                🗣️ <span className="text-primary font-bold">"Complete meditation"</span> — Marks habit done
              </div>
              <div className="p-2 bg-surface/60 border border-border/60 rounded-xl font-mono">
                🗣️ <span className="text-primary font-bold">"How many habits left?"</span> — Reads count aloud
              </div>
              <div className="p-2 bg-surface/60 border border-border/60 rounded-xl font-mono">
                🗣️ <span className="text-primary font-bold">"Go to Analytics"</span> — Navigates to section
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
