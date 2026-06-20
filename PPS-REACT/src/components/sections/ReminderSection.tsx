/*
  💡 Reminders Section — same as your inline reminders JS
*/

import { useState, useEffect, useCallback } from "react";

interface Reminder {
  id: number;
  label: string;
  time: string;
  repeat: string;
  enabled: boolean;
}

const ReminderSection = ({ userEmail }: { userEmail: string | null }) => {
  const storageKey = `reminders_${userEmail || "guest"}`;
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("");
  const [repeat, setRepeat] = useState("Every Day");
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(() => {
    try { setReminders(JSON.parse(localStorage.getItem(storageKey) || "[]")); } catch { setReminders([]); }
  }, [storageKey]);

  useEffect(() => { load(); }, [load]);

  const save = () => {
    if (!label.trim()) { setStatus({ text: "Enter a label.", ok: false }); return; }
    if (!time) { setStatus({ text: "Pick a time.", ok: false }); return; }
    const list = [...reminders, { id: Date.now(), label: label.trim(), time, repeat, enabled: true }];
    localStorage.setItem(storageKey, JSON.stringify(list));
    setReminders(list);
    setLabel(""); setTime("");
    setStatus({ text: "Saved ✓", ok: true });
    setTimeout(() => setStatus(null), 3000);
  };

  const toggle = (id: number) => {
    const list = reminders.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r);
    localStorage.setItem(storageKey, JSON.stringify(list));
    setReminders(list);
  };

  const remove = (id: number) => {
    if (!confirm("Delete this reminder?")) return;
    const list = reminders.filter((r) => r.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(list));
    setReminders(list);
  };

  const formatTime = (t: string) => {
    const [hh, mm] = t.split(":").map(Number);
    const ampm = hh >= 12 ? "PM" : "AM";
    const h12 = hh % 12 || 12;
    return `${h12 < 10 ? "0" : ""}${h12}:${mm < 10 ? "0" : ""}${mm} ${ampm}`;
  };

  return (
    <div>
      <div className="mb-6"><h1 className="text-[22px] font-bold">Reminders</h1><div className="text-[13px] text-muted-foreground mt-0.5">Set times to be nudged</div></div>

      {/* Active list */}
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
                onClick={() => toggle(r.id)}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${r.enabled ? "left-[21px]" : "left-[3px]"}`} />
              </div>
              <button onClick={() => remove(r.id)} className="bg-destructive/10 text-destructive border border-destructive/20 py-1 px-2.5 rounded-lg text-[11px] font-display hover:bg-destructive/20">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
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
      </div>
    </div>
  );
};

export default ReminderSection;
