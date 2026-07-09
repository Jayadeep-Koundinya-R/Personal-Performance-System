import { useState, useEffect } from "react";
import { useReminders } from "@/hooks/use-reminders";
import { useHabits } from "@/hooks/use-habits";
import { useUserSettings } from "@/hooks/use-user-settings";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const REPEAT_OPTIONS = [
  { value: "One-time", label: "One-time" },
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" }
];

const CHANNEL_OPTIONS = [
  { value: "in_app", label: "🔔 In-App Alert" },
  { value: "email", label: "✉️ Email Message" }
];

const DELIVERY_OPTIONS = [
  { value: "notification", label: "📱 Passive Banner" },
  { value: "alarm", label: "🚨 Persistent Alarm" }
];

const ReminderSection = () => {
  const { reminders, addReminder, toggleReminder, removeReminder, loading } = useReminders();
  const { habits } = useHabits();
  const { settings } = useUserSettings();
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("");
  
  const [repeat, setRepeat] = useState("Daily");
  const [channel, setChannel] = useState("in_app");
  const [deliveryType, setDeliveryType] = useState("notification");
  const [habitId, setHabitId] = useState("");
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [showTestAlarm, setShowTestAlarm] = useState(false);

  useEffect(() => {
    if (settings?.defaultReminderSettings) {
      setRepeat(settings.defaultReminderSettings.repeat || "Daily");
      setChannel(settings.defaultReminderSettings.channel || "in_app");
      setDeliveryType(settings.defaultReminderSettings.deliveryType || "notification");
    }
  }, [settings]);

  const save = async () => {
    const finalLabel = label.trim() || (habitId ? `Complete: ${habits.find(h => h.id === habitId)?.name}` : "Habit Reminder");
    const err = await addReminder(
      finalLabel,
      time,
      repeat,
      habitId || null,
      channel,
      deliveryType
    );
    if (err) {
      setStatus({ text: err, ok: false });
    } else {
      setLabel("");
      setTime("");
      setHabitId("");
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
      <div className="mb-6">
        <h1 className="text-[22px] font-bold">Reminders</h1>
        <div className="text-[13px] text-muted-foreground mt-0.5">Set alarm-style or soft notification alerts</div>
      </div>

      {/* Active Reminders List */}
      <div className="bg-card border border-border p-5 rounded-lg mb-5">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Active Reminders</h3>
        {reminders.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-[13px]">
            <div className="text-[28px] mb-2">🔔</div>No reminders yet — add one below.
          </div>
        ) : (
          reminders.map((r) => {
            const linkedHabit = habits.find((h) => h.id === r.habitId);
            return (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 px-4 bg-surface border border-border rounded-[10px] mb-2.5 hover:bg-primary/[0.01] transition-colors">
                <div className="mb-2 sm:mb-0">
                  <div className="text-sm font-semibold">{r.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-1.5 items-center">
                    <span className="bg-surface border border-border/80 text-foreground/85 px-1.5 py-0.5 rounded font-mono uppercase text-[9px] font-bold">{r.repeat}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${r.channel === "email" ? "bg-pps-green/10 text-pps-green" : "bg-primary/10 text-primary"}`}>
                      {r.channel === "email" ? "✉️ Email" : "🔔 In-App"}
                    </span>
                    {r.channel !== "email" && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${r.deliveryType === "alarm" ? "bg-destructive/10 text-destructive animate-pulse" : "bg-secondary/10 text-secondary"}`}>
                        {r.deliveryType === "alarm" ? "🚨 Alarm" : "📱 Notification"}
                      </span>
                    )}
                    {linkedHabit && (
                      <span className="bg-primary/5 text-primary border border-primary/10 px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-0.5">
                        🎯 {linkedHabit.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 justify-between sm:justify-end border-t border-border/50 sm:border-0 pt-2 sm:pt-0">
                  <span className="font-mono text-[13px] text-secondary font-bold">{formatTime(r.time)}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-[38px] h-5 rounded-full relative cursor-pointer transition-colors ${r.enabled ? "bg-primary" : "bg-border"}`}
                      onClick={() => toggleReminder(r.id)}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${r.enabled ? "left-[21px]" : "left-[3px]"}`} />
                    </div>
                    <button onClick={() => removeReminder(r.id)} className="bg-destructive/10 text-destructive border border-destructive/20 py-1 px-2.5 rounded-lg text-[11px] font-display hover:bg-destructive/20 transition-all">✕</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add New Reminder Form */}
      <div className="bg-card border border-border p-5 rounded-lg">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Add New Reminder</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-3.5 mb-4.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Label (Optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={habitId ? `Complete: ${habits.find(h => h.id === habitId)?.name}` : "e.g. Meditate daily"}
              className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Repeat</label>
            <CustomSelect value={repeat} onChange={setRepeat} options={REPEAT_OPTIONS} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Link to Habit</label>
            <CustomSelect value={habitId} onChange={setHabitId} options={[
              { value: "", label: "None (General Reminder)" },
              ...habits.filter(h => !h.archived).map(h => ({ value: h.id, label: h.name }))
            ]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Delivery Channel</label>
            <CustomSelect value={channel} onChange={setChannel} options={CHANNEL_OPTIONS} />
          </div>

          {channel === "in_app" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Delivery Type</label>
              <CustomSelect value={deliveryType} onChange={setDeliveryType} options={DELIVERY_OPTIONS} className="animate-fadeIn" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button
            onClick={save}
            disabled={!time}
            className="bg-gradient-to-br from-primary to-accent text-white py-2.5 px-5 rounded-lg text-[13.5px] font-semibold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none shadow-md"
          >
            Save Reminder
          </button>
          
          {channel === "in_app" && deliveryType === "alarm" && (
            <button
              onClick={() => setShowTestAlarm(true)}
              type="button"
              className="bg-transparent text-primary border border-primary/20 hover:bg-primary/5 py-2.5 px-4 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5"
            >
              🚨 Test Alarm Preview
            </button>
          )}

          {status && (
            <span className="text-xs font-semibold" style={{ color: status.ok ? "#22c55e" : "#ef4444" }}>
              {status.text}
            </span>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground mt-3">
          🌐 Reminders trigger in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}).
        </p>

        {/* Local Test Alarm Overlay Preview */}
        <AnimatePresence>
          {showTestAlarm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[3000] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 30, opacity: 0 }}
                className="bg-card border-2 border-destructive/30 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-destructive animate-pulse" />
                <div className="text-6xl mb-4 animate-bounce">⏰</div>
                <h2 className="text-2xl font-bold text-destructive mb-2">Habit Alarm!</h2>
                <p className="text-sm font-semibold mb-6 text-foreground">
                  [TEST PREVIEW] {label.trim() || (habitId ? `Complete: ${habits.find(h => h.id === habitId)?.name}` : "Meditate daily")}
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowTestAlarm(false);
                      toast.success("Test: Habit completed successfully! (+10 XP preview)");
                    }}
                    className="w-full bg-pps-green text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-pps-green/90 transition-colors"
                  >
                    ✓ Complete Habit Now
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowTestAlarm(false);
                        toast.info("Test: Snoozed alarm for 10 minutes.");
                      }}
                      className="flex-1 bg-surface border border-border py-2.5 rounded-xl text-sm font-semibold hover:bg-muted transition-colors text-foreground"
                    >
                      💤 Snooze (10m)
                    </button>
                    <button
                      onClick={() => setShowTestAlarm(false)}
                      className="flex-1 bg-destructive/10 text-destructive border border-destructive/20 py-2.5 rounded-xl text-sm font-semibold hover:bg-destructive/20 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReminderSection;

