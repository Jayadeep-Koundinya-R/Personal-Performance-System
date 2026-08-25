import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X, Command } from "lucide-react";

interface ShortcutItem {
  keys: string[];
  description: string;
  category: "Navigation" | "Focus & Timer" | "Habits & Actions";
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ["1" , "D"], description: "Jump to Dashboard", category: "Navigation" },
  { keys: ["2", "F"], description: "Jump to Focus Studio", category: "Navigation" },
  { keys: ["3", "S"], description: "Jump to Social Hub & Quests", category: "Navigation" },
  { keys: ["4", "A"], description: "Jump to Deep Analytics", category: "Navigation" },
  { keys: ["5", "C"], description: "Jump to Calendar & Planner", category: "Navigation" },
  { keys: ["Space"], description: "Start / Pause Focus Timer", category: "Focus & Timer" },
  { keys: ["R"], description: "Reset Focus Sprint", category: "Focus & Timer" },
  { keys: ["N"], description: "Create New Habit", category: "Habits & Actions" },
  { keys: ["?"], description: "Open / Close Shortcuts Guide", category: "Habits & Actions" },
  { keys: ["Esc"], description: "Close Modals / Clear Search", category: "Habits & Actions" },
];

interface Props {
  onNavigate?: (tab: string) => void;
  onOpenNewHabit?: () => void;
}

export const KeyboardShortcutsModal: React.FC<Props> = ({ onNavigate, onOpenNewHabit }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input / textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        if (e.key === "Escape") {
          target.blur();
        }
        return;
      }

      if (e.key === "?" || (e.key === "/" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }

      // Navigation shortcuts
      if ((e.key === "1" || e.key === "d" || e.key === "D") && onNavigate) {
        onNavigate("dashboard");
      } else if ((e.key === "2" || e.key === "f" || e.key === "F") && onNavigate) {
        onNavigate("tracker");
      } else if ((e.key === "3" || e.key === "s" || e.key === "S") && onNavigate) {
        onNavigate("social");
      } else if ((e.key === "4" || e.key === "a" || e.key === "A") && onNavigate) {
        onNavigate("analytics");
      } else if ((e.key === "5" || e.key === "c" || e.key === "C") && onNavigate) {
        onNavigate("calendar");
      } else if ((e.key === "n" || e.key === "N") && onOpenNewHabit) {
        e.preventDefault();
        onOpenNewHabit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNavigate, onOpenNewHabit]);

  return (
    <>
      {/* Floating shortcut trigger icon in bottom-left */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 w-9 h-9 rounded-xl bg-card/80 backdrop-blur-md border border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center justify-center text-xs shadow-lg transition-all hover:scale-105 cursor-pointer"
        title="Keyboard Shortcuts (?)"
        aria-label="Keyboard Shortcuts"
      >
        <Keyboard className="w-4 h-4" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              className="bg-card border border-border/90 rounded-3xl shadow-2xl p-6 sm:p-7 max-w-lg w-full relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                    <Command className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-black text-foreground">
                      Power-User Shortcuts
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Navigate the Performance OS with speed
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-5 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {(["Navigation", "Focus & Timer", "Habits & Actions"] as const).map((cat) => (
                  <div key={cat} className="space-y-2">
                    <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-primary">
                      {cat}
                    </div>
                    <div className="space-y-1.5">
                      {SHORTCUTS.filter((s) => s.category === cat).map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-surface/60 border border-border/50 text-xs"
                        >
                          <span className="text-muted-foreground">{s.description}</span>
                          <div className="flex items-center gap-1">
                            {s.keys.map((k, kidx) => (
                              <React.Fragment key={kidx}>
                                {kidx > 0 && <span className="text-[10px] text-muted-foreground/60">or</span>}
                                <kbd className="px-2 py-0.5 rounded-md bg-card border border-border/80 text-[11px] font-mono font-bold text-foreground shadow-xs">
                                  {k}
                                </kbd>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span>Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px]">?</kbd> anywhere to toggle</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-opacity"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
