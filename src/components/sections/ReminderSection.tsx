import { useState } from "react";
import { useReminders } from "@/hooks/use-reminders";
import { Link } from "react-router-dom";

const ReminderSection = () => {
  const { reminders, addReminder, toggleReminder, removeReminder, loading } = useReminders();
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("");
  const [repeat, setRepeat] = useState("Every Day");
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  const save = async () => {
    const err = await addReminder(label, time, repeat);
    if (err) {
      setStatus({ text: err, ok: false });
    } else {
      setLabel("");
      setTime("");
      setStatus({ text: "Saved ✓", ok: true });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const formatTime = (t: string) => {
    const [hh, mm] = t.split(":").map(Number);
    const ampm = hh >= 12 ? "PM" : "AM";
    const h12 = hh % 12 || 12;
    return `${h12 < 10 ? "0" : ""}${h12}:${mm < 10 ? "0" : ""}${mm} ${ampm}`;
  };

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading reminders...</div>;
  }

  return (
    <div>
      <div className="mb-6"><h1 className="text-[22px] font-bold">Reminders</h1><div className="text-[13px] text-muted-foreground mt-0.5">Set times to be nudged</div></div>

      <div className="bg-card border border-border p-5 rounded-lg mb-5">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Active Reminders</h3>
        {reminders.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-[13px]"><div className="text-[28px] mb-2">🔔</div>No reminders yet — add one below.</div>
        ) : reminders.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3.5 px-4 bg-surface border border-border rounded-[10px] mb-2.5">
            <div>
              <div className="text-sm font-semibold">{r.label}</div>
              <div className="text-xs text-muted-foreground">{r.repeat}</div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[13px] text-secondary">{formatTime(r.time)}</span>
              <div
                className={`w-[38px] h-5 rounded-full relative cursor-pointer transition-colors ${r.enabled ? "bg-primary" : "bg-border"}`}
                onClick={() => toggleReminder(r.id)}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${r.enabled ? "left-[21px]" : "left-[3px]"}`} />
              </div>
              <button onClick={() => removeReminder(r.id)} className="bg-destructive/10 text-destructive border border-destructive/20 py-1 px-2.5 rounded-lg text-[11px] font-display hover:bg-destructive/20">✕</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border p-5 rounded-lg">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Add New Reminder</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3.5 mb-4.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Label</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Morning routine"
              className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Repeat</label>
            <select value={repeat} onChange={(e) => setRepeat(e.target.value)}
              className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full">
              <option>Every Day</option><option>Weekdays</option><option>Weekends</option><option>Custom</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <button onClick={save} className="bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 px-5 rounded-lg text-[13.5px] font-semibold hover:-translate-y-0.5 transition-all">Save Reminder</button>
          {status && <span className="text-xs font-semibold" style={{ color: status.ok ? "#22c55e" : "#ef4444" }}>{status.text}</span>}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Free plan: 1 reminder. Pro: unlimited + email delivery. <Link to="/pricing" className="text-primary hover:underline">See plans</Link>
        </p>
      </div>
    </div>
  );
};

export default ReminderSection;
