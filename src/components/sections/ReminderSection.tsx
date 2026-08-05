/*
  🔔 Masterwork Reminders & Persistent Alarm Studio
  
  Features:
  - 1-Click Circadian Alarm Presets (Morning 7am, Afternoon 1pm, Evening 9:30pm)
  - 🔊 Web Audio Live Chime & Alarm Sound Tester
  - 🚨 Persistent Alarm vs 📱 Passive Banner Modes
  - 💤 Quick 1-Click Snooze Actions (+15m, +1h)
  - 🔗 Habit-Linked Alarms with 1-Click Execution
  - High-Contrast Crisp Glassmorphic Typography
*/

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReminders } from "@/hooks/use-reminders";
import { useHabits } from "@/hooks/use-habits";
import { useUserSettings } from "@/hooks/use-user-settings";
import { Bell, Clock, Volume2, Plus, Check, Trash2, Shield, Sparkles, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const CIRCADIAN_PRESETS = [
  { label: "Morning Hero Stack Alarm 🌅", time: "07:00", repeat: "Daily", deliveryType: "alarm", desc: "Start your day with hydration & mindfulness" },
  { label: "Afternoon Deep Work Review ☀️", time: "13:00", repeat: "Daily", deliveryType: "notification", desc: "Midday momentum check-in" },
  { label: "Night Recovery & Screen Detox 🌙", time: "21:30", repeat: "Daily", deliveryType: "alarm", desc: "Prepare body & mind for sleep" },
];

const REPEAT_OPTIONS = [
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
  { value: "One-time", label: "One-time" }
];

const DELIVERY_OPTIONS = [
  { value: "alarm", label: "🚨 Persistent Alarm Chime" },
  { value: "notification", label: "📱 Passive Banner Alert" }
];

// Web Audio Synthetic Sound Generator for Alarm Testing
function playAlarmPreviewSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.error("Web Audio preview error:", e);
  }
}

const ReminderSection = () => {
  const { reminders, addReminder, toggleReminder, removeReminder, loading } = useReminders();
  const { habits } = useHabits();
  const { settings } = useUserSettings();

  // Form State
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("");
  const [repeat, setRepeat] = useState("Daily");
  const [channel, setChannel] = useState("in_app");
  const [deliveryType, setDeliveryType] = useState("alarm");
  const [habitId, setHabitId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (settings?.defaultReminderSettings) {
      setRepeat(settings.defaultReminderSettings.repeat || "Daily");
      setChannel(settings.defaultReminderSettings.channel || "in_app");
      setDeliveryType(settings.defaultReminderSettings.deliveryType || "alarm");
    }
  }, [settings]);

  // Handle Add Reminder
  const save = async () => {
    if (!time) {
      toast.error("Please select a time for the reminder!");
      return;
    }

    const finalLabel = label.trim() || (habitId ? `Complete: ${habits.find((h) => h.id === habitId)?.name}` : "Habit Reminder");
    const err = await addReminder(finalLabel, time, repeat, habitId || null, channel, deliveryType);

    if (err) {
      toast.error(err);
    } else {
      setLabel("");
      setTime("");
      setHabitId("");
      setIsFormOpen(false);
      toast.success("Reminder added to your alarm schedule!");
    }
  };

  // Add Circadian Preset
  const addPreset = async (preset: typeof CIRCADIAN_PRESETS[0]) => {
    const err = await addReminder(preset.label, preset.time, preset.repeat, null, "in_app", preset.deliveryType);
    if (err) toast.error(err);
    else toast.success(`Added ${preset.label}!`);
  };

  // 1-Click Snooze Action
  const snoozeReminder = (reminderLabel: string, mins: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + mins);
    const newTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    
    addReminder(`[Snoozed +${mins}m] ${reminderLabel}`, newTime, "One-time", null, "in_app", "alarm");
    toast.success(`Snoozed for ${mins} minutes! New alert set for ${newTime}`);
  };

  // Helper format time
  const formatTime = (t: string) => {
    if (!t) return "—";
    const [hh, mm] = t.split(":").map(Number);
    const ampm = hh >= 12 ? "PM" : "AM";
    const h12 = hh % 12 || 12;
    return `${h12 < 10 ? "0" : ""}${h12}:${mm < 10 ? "0" : ""}${mm} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3.5"></div>
        <div className="text-slate-300 text-sm font-extrabold font-mono">Loading alarm studio...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>🔔 Reminders & Alarm Studio</span>
            <span className="text-[11px] font-mono bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
              Smart Alerts
            </span>
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            Configure habit-linked alarms, circadian schedule presets, audio sound previews, and quick snoozes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playAlarmPreviewSound();
              toast.info("🔊 Playing Web Audio Alarm Chime Preview!");
            }}
            className="text-xs bg-surface border border-border/80 text-foreground px-3.5 py-2 rounded-2xl font-extrabold hover:bg-muted/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Test Alarm Sound"
          >
            <Volume2 className="w-4 h-4 text-primary" />
            <span>Test Sound 🔊</span>
          </button>

          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="text-xs bg-primary text-primary-foreground font-extrabold px-4 py-2 rounded-2xl hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{isFormOpen ? "Close Form" : "Set New Alarm"}</span>
          </button>
        </div>
      </div>

      {/* ── 1. CIRCADIAN ALARM PRESETS BAR ── */}
      <div className="bg-card border border-border p-5 rounded-3xl shadow-xl space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
            <span>🌅 Circadian Alarm Presets</span>
          </h3>
          <span className="text-[11px] font-mono font-bold text-sky-300">1-Click Quick Add</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CIRCADIAN_PRESETS.map((p) => (
            <div
              key={p.label}
              className="p-3.5 bg-surface/60 border border-border/80 rounded-2xl space-y-2 flex flex-col justify-between hover:border-primary/40 transition-all"
            >
              <div>
                <div className="text-xs font-extrabold text-foreground">{p.label}</div>
                <div className="text-[11px] font-mono font-extrabold text-primary mt-0.5">{formatTime(p.time)}</div>
                <div className="text-[10.5px] text-slate-300 font-medium mt-1">{p.desc}</div>
              </div>

              <button
                onClick={() => addPreset(p)}
                className="w-full text-xs font-extrabold bg-primary/15 text-primary border border-primary/30 py-1.5 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer font-mono mt-2"
              >
                + Add Preset
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. NEW ALARM FORM (DRAWER) ── */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border border-primary/30 p-5 sm:p-6 rounded-3xl shadow-xl space-y-4 relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-foreground flex items-center gap-2">
                <span>⏰ Configure New Alarm / Reminder</span>
              </h3>
              <span className="text-xs font-mono font-bold text-primary">Smart Schedule</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground font-mono">1. Alarm Label / Task Name</label>
                <input
                  type="text"
                  placeholder="e.g. Drink 500ml Water"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground focus:border-primary"
                />
              </div>

              {/* Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground font-mono">2. Alarm Time *</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-surface border border-border/80 text-xs font-mono font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground focus:border-primary cursor-pointer"
                />
              </div>

              {/* Linked Habit */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground font-mono">3. Link to Specific Habit (Optional)</label>
                <select
                  value={habitId}
                  onChange={(e) => setHabitId(e.target.value)}
                  className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground cursor-pointer"
                >
                  <option value="">-- No Linked Habit --</option>
                  {habits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.period})
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground font-mono">4. Delivery Mode</label>
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value)}
                  className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground cursor-pointer"
                >
                  <option value="alarm">🚨 Persistent Alarm Chime</option>
                  <option value="notification">📱 Passive Banner Alert</option>
                </select>
              </div>

              {/* Repeat Frequency */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground font-mono">5. Repeat Frequency</label>
                <select
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                  className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground cursor-pointer"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="One-time">One-time</option>
                </select>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-2 flex justify-end gap-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-xs font-bold text-slate-300 px-4 py-2 rounded-xl hover:bg-surface transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="text-xs bg-primary text-primary-foreground font-extrabold px-5 py-2 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
              >
                Save Alarm
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3. ACTIVE REMINDERS & ALARMS LIST ── */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            🔔 Active Alarms & Reminders Schedule
          </h2>
          <span className="text-xs text-slate-300 font-mono font-bold">
            {reminders.length} Active Alarms
          </span>
        </div>

        <div className="space-y-2.5">
          {reminders.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-3xl text-slate-300 text-xs font-medium space-y-2">
              <div className="text-3xl">🔔</div>
              <div>No active alarms configured. Use the form above or 1-click circadian presets!</div>
            </div>
          ) : (
            reminders.map((r) => {
              const linkedHabit = habits.find((h) => h.id === r.habitId);
              const isPersistent = r.deliveryType === "alarm";

              return (
                <motion.div
                  key={r.id}
                  whileHover={{ scale: 1.01 }}
                  className={`p-4 bg-card border rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                    r.enabled ? "border-border/80" : "border-border/40 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 font-mono font-bold ${
                      isPersistent ? "bg-pps-orange/15 border border-pps-orange/30 text-pps-orange" : "bg-primary/15 border border-primary/30 text-primary"
                    }`}>
                      {isPersistent ? "🚨" : "📱"}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-foreground">{r.label}</span>
                        {linkedHabit && (
                          <span className="text-[10px] font-mono font-bold bg-primary/15 text-primary border border-primary/30 px-2 py-0.2 rounded-full">
                            🔗 {linkedHabit.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono font-extrabold text-slate-300 mt-0.5">
                        <span className="text-primary font-extrabold">{formatTime(r.time)}</span>
                        <span>•</span>
                        <span>{r.repeat}</span>
                        <span>•</span>
                        <span className={isPersistent ? "text-pps-orange font-bold" : "text-sky-300"}>
                          {isPersistent ? "Persistent Alarm" : "Passive Banner"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                    {/* Snooze Buttons */}
                    <button
                      onClick={() => snoozeReminder(r.label, 15)}
                      className="text-[10.5px] font-mono font-extrabold bg-surface border border-border/80 text-slate-200 hover:text-foreground px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                      title="Snooze for 15 mins"
                    >
                      💤 +15m
                    </button>

                    <button
                      onClick={() => snoozeReminder(r.label, 60)}
                      className="text-[10.5px] font-mono font-extrabold bg-surface border border-border/80 text-slate-200 hover:text-foreground px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                      title="Snooze for 1 hour"
                    >
                      💤 +1h
                    </button>

                    {/* Enable Toggle */}
                    <button
                      onClick={() => toggleReminder(r.id)}
                      className={`text-xs font-mono font-extrabold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        r.enabled
                          ? "bg-pps-green/15 text-pps-green border-pps-green/30"
                          : "bg-surface text-slate-400 border-border/80"
                      }`}
                    >
                      {r.enabled ? "Active ✓" : "Off"}
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => {
                        removeReminder(r.id);
                        toast.success("Reminder deleted");
                      }}
                      className="p-1.5 bg-surface border border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl transition-all cursor-pointer"
                      title="Delete Reminder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ReminderSection;
