import { useState } from "react";
import { useReflections } from "@/hooks/use-reflections";
import { Link } from "react-router-dom";

const MOODS = [
  { key: "great", emoji: "😊", label: "Great" },
  { key: "okay", emoji: "😐", label: "Okay" },
  { key: "low", emoji: "😔", label: "Low" },
  { key: "stress", emoji: "😤", label: "Stressed" },
];

const ReflectionSection = () => {
  const { entries, saveEntry, deleteEntry, loading } = useReflections();
  const [text, setText] = useState("");
  const [mood, setMood] = useState("great");
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  const save = async () => {
    const err = await saveEntry(text, mood);
    if (err) {
      setStatus({ text: err, ok: false });
    } else {
      setText("");
      setMood("great");
      setStatus({ text: "Saved ✓", ok: true });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const moodLabel: Record<string, string> = { great: "😊 Great", okay: "😐 Okay", low: "😔 Low", stress: "😤 Stressed" };

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading reflections...</div>;
  }

  return (
    <div>
      <div className="mb-6"><h1 className="text-[22px] font-bold">Daily Reflections</h1><div className="text-[13px] text-muted-foreground mt-0.5">Write, reflect, grow</div></div>

      <div className="bg-card border border-border p-5 rounded-lg mb-5">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Today's Reflection</h3>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder="How did today go? What went well? What to improve?"
          className="w-full h-[100px] mt-2.5 bg-surface border border-border rounded-lg p-2.5 text-foreground text-[13.5px] font-display outline-none resize-none focus:border-primary"
        />
        <div className="flex items-center gap-3.5 mt-3.5 flex-wrap">
          <span className="text-[13px] text-muted-foreground">Mood:</span>
          {MOODS.map((m) => (
            <span key={m.key} onClick={() => setMood(m.key)} className="text-2xl cursor-pointer transition-opacity" style={{ opacity: mood === m.key ? 1 : 0.4 }}>
              {m.emoji}
            </span>
          ))}
          <button onClick={save} className="ml-auto bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 px-5 rounded-lg text-[13.5px] font-semibold hover:-translate-y-0.5 transition-all">
            Save Entry
          </button>
          {status && <span className="text-xs font-semibold" style={{ color: status.ok ? "#22c55e" : "#ef4444" }}>{status.text}</span>}
        </div>
      </div>

      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Past Entries</div>
      {entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-[13px]">
          <div className="text-[32px] mb-2.5">📝</div>No reflections yet — write your first one above.
        </div>
      ) : entries.map((entry) => {
        const d = new Date(entry.date + "T12:00:00");
        const dstr = d.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
        return (
          <div key={entry.id} className="bg-surface border border-border rounded-[10px] p-4 mb-3">
            <div className="flex justify-between items-center mb-2">
              <div className="text-[11px] text-muted-foreground font-mono">{dstr}</div>
              <button onClick={() => deleteEntry(entry.id)} className="bg-destructive/10 text-destructive border border-destructive/20 py-0.5 px-2.5 rounded-lg text-[11px] font-display cursor-pointer hover:bg-destructive/20">
                Delete
              </button>
            </div>
            <div className="text-[13.5px] mt-2 leading-relaxed">{entry.text}</div>
            <div className="flex gap-2 flex-wrap mt-2.5">
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-card border border-border">{moodLabel[entry.mood] || entry.mood}</span>
            </div>
          </div>
        );
      })}

      <p className="text-[11px] text-muted-foreground mt-4">
        Free plan keeps 7 days of history. <Link to="/pricing" className="text-primary hover:underline">Upgrade to Pro</Link> for unlimited.
      </p>
    </div>
  );
};

export default ReflectionSection;
