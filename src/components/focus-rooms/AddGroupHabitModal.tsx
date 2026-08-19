import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, BookOpen, Sparkles, Clock, Check } from "lucide-react";
import { toast } from "sonner";

interface AddGroupHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  onAddHabit: (
    name: string,
    category: string,
    period: string,
    priority: string,
    startDate?: string | null,
    startTime?: string | null,
    endTime?: string | null,
    color?: string
  ) => Promise<string | null>;
}

const PRESET_HABITS = [
  { name: "📚 1-Hour Focus Session in Squad", category: "Learning", period: "Daily", priority: "High" },
  { name: "💻 Solve 2 LeetCode / Coding Tasks", category: "Productivity", period: "Daily", priority: "High" },
  { name: "🔬 Review Formula Sheet & Notes", category: "Learning", period: "Daily", priority: "Medium" },
  { name: "📝 Complete Daily Assignment / Project", category: "Work", period: "Daily", priority: "High" },
];

export const AddGroupHabitModal: React.FC<AddGroupHabitModalProps> = ({
  isOpen,
  onClose,
  groupName,
  onAddHabit,
}) => {
  const [habitName, setHabitName] = useState("");
  const [category, setCategory] = useState("Learning");
  const [period, setPeriod] = useState("Daily");
  const [priority, setPriority] = useState("High");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_HABITS[0]) => {
    setHabitName(preset.name);
    setCategory(preset.category);
    setPeriod(preset.period);
    setPriority(preset.priority);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) {
      toast.error("Please enter a habit name");
      return;
    }

    setLoading(true);
    const err = await onAddHabit(habitName.trim(), category, period, priority);
    setLoading(false);

    if (!err) {
      toast.success(`Added "${habitName}" to your Daily Habit Tracker! 🎉`);
      setHabitName("");
      onClose();
    } else {
      toast.error(err);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md overflow-hidden border border-border/80 rounded-3xl bg-card/95 shadow-2xl backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border/50 bg-gradient-to-r from-primary/10 via-card to-secondary/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground font-mono">
                  Add Study Habit
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Linked to {groupName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Quick Presets */}
            <div>
              <label className="block text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Quick Squad Presets
              </label>
              <div className="space-y-1.5">
                {PRESET_HABITS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className="w-full text-left p-2 rounded-xl bg-surface/60 border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-xs font-semibold text-foreground transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] text-primary font-mono font-bold uppercase">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Name */}
            <div>
              <label className="block text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Habit Title *
              </label>
              <input
                type="text"
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
                placeholder="e.g. 📚 Daily 1 Hour NCERT Revision"
                className="w-full px-3.5 py-2 bg-surface border border-border/80 rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                required
              />
            </div>

            {/* Category & Priority Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border/80 rounded-xl text-xs font-bold text-foreground outline-none focus:border-primary"
                >
                  <option value="Learning">Learning</option>
                  <option value="Productivity">Productivity</option>
                  <option value="Work">Work</option>
                  <option value="Fitness">Fitness</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border/80 rounded-xl text-xs font-bold text-foreground outline-none focus:border-primary"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-surface rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !habitName.trim()}
                className="px-5 py-2 bg-primary text-primary-foreground text-xs font-extrabold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40 shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{loading ? "Adding..." : "Add Habit"}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
