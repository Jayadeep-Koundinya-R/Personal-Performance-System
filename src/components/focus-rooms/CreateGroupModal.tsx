import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Plus, Users, Hash, Shield } from "lucide-react";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    description: string,
    avatarEmoji: string,
    studyTopic: string,
    privacy: "public" | "private"
  ) => Promise<{ success: boolean; groupId?: string; error?: string }>;
}

const EMOJI_OPTIONS = ["📚", "⚡", "🧠", "🎯", "🎹", "💻", "🔬", "🚀", "🔥", "🎨", "🏆", "🌟"];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [studyTopic, setStudyTopic] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("📚");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a group name");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await onCreate(name, description, selectedEmoji, studyTopic, privacy);
    setLoading(false);

    if (res.success) {
      setName("");
      setDescription("");
      setStudyTopic("");
      onClose();
    } else {
      setError(res.error || "Failed to create group");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg overflow-hidden border border-border/80 rounded-3xl bg-card/95 shadow-2xl backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/50 bg-gradient-to-r from-primary/10 via-card to-secondary/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 text-2xl border rounded-2xl bg-primary/20 border-primary/30">
                {selectedEmoji}
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-foreground font-mono">
                  Create Study Group
                </h3>
                <p className="text-xs text-muted-foreground">
                  Persistent study rooms with chat, notes & focus rooms
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 transition-colors rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 text-xs font-bold text-red-400 border border-red-500/30 rounded-xl bg-red-500/10">
                {error}
              </div>
            )}

            {/* Emoji Selector */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Group Avatar Emoji
              </label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`w-9 h-9 text-lg rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                      selectedEmoji === emoji
                        ? "bg-primary/20 border-primary scale-110 shadow-md"
                        : "bg-surface border-border/60 hover:border-primary/40"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Group Name */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Group Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. AI & Algorithms Sprint Lab"
                className="w-full px-4 py-2.5 bg-surface border border-border/80 rounded-xl text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                required
              />
            </div>

            {/* Study Topic / Subject */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Subject / Focus Topic
              </label>
              <input
                type="text"
                value={studyTopic}
                onChange={(e) => setStudyTopic(e.target.value)}
                placeholder="e.g. Computer Science, GATE Prep, Music Theory"
                className="w-full px-4 py-2.5 bg-surface border border-border/80 rounded-xl text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Description & Goals
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Daily 2-hour Pomodoro sprints, sharing cheat-sheets and project updates."
                className="w-full px-4 py-2 bg-surface border border-border/80 rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Privacy Setting */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPrivacy("public")}
                className={`flex-1 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  privacy === "public"
                    ? "bg-primary/15 border-primary text-foreground"
                    : "bg-surface border-border/60 text-muted-foreground hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>Public Group</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Anyone with the invite code can drop in
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPrivacy("private")}
                className={`flex-1 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  privacy === "private"
                    ? "bg-primary/15 border-primary text-foreground"
                    : "bg-surface border-border/60 text-muted-foreground hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span>Private Room</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Host approval required to join live sessions
                </p>
              </button>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold transition-colors rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold text-primary-foreground transition-all rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-primary/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{loading ? "Creating..." : "Create Group"}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
