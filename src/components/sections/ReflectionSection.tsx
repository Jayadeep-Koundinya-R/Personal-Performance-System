/*
  📝 Masterwork Daily Reflections & Journal Studio
  
  Features:
  - Guided Reflection Prompts (Morning Intention, Evening Review, Focus Post-Mortem)
  - Granular Mood & Energy Level Selector (1-10 Scale)
  - Journal Entry Tagging (#win, #blocker, #gratitude, #idea, #growth)
  - Live Reflection Search & Filter Bar
  - Historical Reflection Timeline Cards
  - High-Contrast Crisp Glassmorphic Typography
*/

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReflections } from "@/hooks/use-reflections";
import { useSubscription } from "@/hooks/use-subscription";
import { BookOpen, Sparkles, Search, Tag, Smile, Frown, Meh, Flame, Zap, Trash2, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const MOODS = [
  { key: "unstoppable", emoji: "🔥", label: "Unstoppable", color: "text-amber-400" },
  { key: "great", emoji: "😊", label: "Great", color: "text-pps-green" },
  { key: "okay", emoji: "😐", label: "Okay", color: "text-primary" },
  { key: "low", emoji: "😔", label: "Low Energy", color: "text-pps-orange" },
  { key: "stress", emoji: "😤", label: "Stressed", color: "text-destructive" },
];

const GUIDED_PROMPTS = [
  {
    title: "Morning Intention 🌅",
    text: "🌅 MORNING INTENTION:\n1. Top #1 Goal for Today: \n2. My Energy Anchor: \n3. Potential Blocker to Avoid: ",
  },
  {
    title: "Evening Review 🌙",
    text: "🌙 EVENING REVIEW:\n1. Biggest Win Today: \n2. What Held Me Back: \n3. One Thing to Improve Tomorrow: ",
  },
  {
    title: "Deep Focus Post-Mortem ⚡",
    text: "⚡ FOCUS POST-MORTEM:\n1. Total Focus Time Completed: \n2. Distractions Overcome: \n3. Mindset Rating (1-10): ",
  },
];

const TAG_SUGGESTIONS = ["#win", "#blocker", "#gratitude", "#idea", "#growth"];

const ReflectionSection = () => {
  const { entries, saveEntry, deleteEntry, loading } = useReflections();
  const { isPro } = useSubscription();

  const [text, setText] = useState("");
  const [mood, setMood] = useState("great");
  const [energyLevel, setEnergyLevel] = useState(8);
  const [selectedTag, setSelectedTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Save Reflection Entry
  const save = async () => {
    if (!text.trim()) {
      toast.error("Please write something before saving your reflection!");
      return;
    }

    const tagString = selectedTag ? ` [Tag: ${selectedTag}]` : "";
    const energyString = ` [Energy: ${energyLevel}/10]`;
    const finalText = `${text.trim()}${energyString}${tagString}`;

    const err = await saveEntry(finalText, mood);
    if (err) {
      toast.error(err);
    } else {
      setText("");
      setMood("great");
      setEnergyLevel(8);
      setSelectedTag("");
      toast.success("Reflection saved to your growth timeline!");
    }
  };

  // Filtered Reflections List
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchSearch = e.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.mood.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [entries, searchQuery]);

  // Insert Guided Prompt into Editor
  const insertPrompt = (promptText: string) => {
    setText((prev) => (prev ? `${prev}\n\n${promptText}` : promptText));
    toast.info("Inserted guided prompt into editor!");
  };

  // Copy entry to clipboard
  const copyEntry = (entryText: string) => {
    navigator.clipboard.writeText(entryText);
    toast.success("Copied entry to clipboard!");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3.5"></div>
        <div className="text-slate-300 text-sm font-extrabold font-mono">Loading reflections timeline...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>📝 Daily Reflections & Journal</span>
            <span className="text-[11px] font-mono bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
              Mindset & Growth
            </span>
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            Write daily intentions, track emotional energy ratings, insert guided prompts, and build your growth journal
          </p>
        </div>

        <div className="text-xs font-mono font-extrabold bg-card border border-border/80 px-3.5 py-1.5 rounded-2xl shadow-xs text-foreground">
          📖 {entries.length} Entries Logged
        </div>
      </div>

      {/* ── 1. GUIDED PROMPTS BAR ── */}
      <div className="bg-card border border-border p-4 rounded-3xl shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
            <span>💡 1-Click Guided Prompts</span>
          </h3>
          <span className="text-[11px] font-mono font-bold text-sky-300">Click to Insert</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {GUIDED_PROMPTS.map((p) => (
            <button
              key={p.title}
              onClick={() => insertPrompt(p.text)}
              className="text-xs font-extrabold bg-surface border border-border/80 text-foreground hover:border-primary/40 hover:bg-primary/10 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>{p.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. NEW REFLECTION EDITOR CARD ── */}
      <div className="bg-card border border-primary/30 p-5 sm:p-6 rounded-3xl shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
            <span>✏️ Today's Mindset Entry</span>
          </h3>
          <span className="text-xs font-mono font-bold text-slate-300">Write, Reflect, Grow</span>
        </div>

        {/* Text Area */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="How did today go? What was your biggest win? What distractions did you overcome?"
          className="w-full h-36 bg-surface border border-border/80 rounded-2xl p-4 text-foreground text-xs font-medium outline-none resize-none focus:border-primary transition-all leading-relaxed"
        />

        {/* Controls Row (Mood + Energy + Tags) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/40 pt-4">
          {/* Mood Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-foreground font-mono">1. Select Mood</label>
            <div className="flex items-center gap-2 pt-1">
              {MOODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMood(m.key)}
                  className={`text-2xl cursor-pointer transition-all duration-200 ${
                    mood === m.key ? "scale-125 opacity-100 drop-shadow-md" : "opacity-40 hover:opacity-80"
                  }`}
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Energy Rating Slider (1-10) */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-extrabold text-foreground font-mono">
              <span>2. Energy Level</span>
              <span className="text-primary font-bold">{energyLevel} / 10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={energyLevel}
              onChange={(e) => setEnergyLevel(parseInt(e.target.value, 10))}
              className="w-full accent-primary cursor-pointer mt-2"
            />
          </div>

          {/* Tag Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-foreground font-mono">3. Add Tag</label>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
              {TAG_SUGGESTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                  className={`text-[11px] font-mono px-2 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                    selectedTag === tag
                      ? "bg-secondary text-secondary-foreground border-secondary shadow-xs"
                      : "bg-surface border-border/80 text-slate-300 hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button Row */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={save}
            className="text-xs bg-primary text-primary-foreground font-extrabold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Save Reflection Entry</span>
          </button>
        </div>
      </div>

      {/* ── 3. SEARCH & HISTORICAL TIMELINE ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            📜 Historical Reflection Timeline
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reflections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl pl-9 pr-3.5 py-2 outline-none text-foreground focus:border-primary"
            />
          </div>
        </div>

        {/* Entries Stream */}
        <div className="space-y-3">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-3xl text-slate-300 text-xs font-medium space-y-2">
              <div className="text-3xl">📝</div>
              <div>No reflection entries found. Write your first reflection above!</div>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const d = new Date(entry.date + "T12:00:00");
              const dstr = d.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
              const moodObj = MOODS.find((m) => m.key === entry.mood) || MOODS[1];

              return (
                <motion.div
                  key={entry.id}
                  whileHover={{ scale: 1.005 }}
                  className="bg-card border border-border p-5 rounded-3xl shadow-xl space-y-3 relative overflow-hidden transition-all"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-300">
                      <span>{dstr}</span>
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] ${moodObj.color} bg-surface border-border/80`}>
                        {moodObj.emoji} {moodObj.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyEntry(entry.text)}
                        className="p-1.5 bg-surface border border-border/80 text-slate-300 hover:text-foreground rounded-lg transition-all cursor-pointer"
                        title="Copy to Clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          deleteEntry(entry.id);
                          toast.success("Reflection deleted");
                        }}
                        className="p-1.5 bg-surface border border-destructive/40 text-destructive hover:bg-destructive/10 rounded-lg transition-all cursor-pointer"
                        title="Delete Reflection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-foreground font-medium leading-relaxed whitespace-pre-line">
                    {entry.text}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {!isPro && (
        <p className="text-[11px] text-slate-300 font-mono font-medium mt-4">
          Free plan retains 7 days of reflection history. <Link to="/pricing" className="text-primary font-bold hover:underline">Upgrade to Pro</Link> for unlimited history.
        </p>
      )}
    </div>
  );
};

export default ReflectionSection;
