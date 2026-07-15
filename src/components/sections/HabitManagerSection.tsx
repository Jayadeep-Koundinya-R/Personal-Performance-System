/*
  💡 Habit Manager Section
  Same as your #habitManagerSection — add/edit/delete habits.
*/

import { useState } from "react";
import { useHabits, Habit } from "@/hooks/use-habits";
import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { HABIT_TEMPLATES, HabitTemplate } from "@/lib/habitTemplates";
import { toast } from "sonner";
import { CustomSelect } from "@/components/ui/CustomSelect";

const HABIT_STACKS = [
  { label: "Morning Stack", name: "Morning routine", category: "Health", period: "Daily", priority: "High" },
  { label: "After coffee → Journal", name: "5-min journal", category: "Mind", period: "Daily", priority: "Medium" },
  { label: "Check-in Accountability", name: "Review status with friend", category: "Social", period: "Daily", priority: "Medium" }
];

const AVAILABLE_COLORS = [
  { value: "indigo", label: "Indigo", bg: "bg-indigo-500", text: "text-indigo-500", border: "border-indigo-500/30" },
  { value: "emerald", label: "Emerald", bg: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500/30" },
  { value: "amber", label: "Amber", bg: "bg-amber-500", text: "text-amber-500", border: "border-amber-500/30" },
  { value: "rose", label: "Rose", bg: "bg-rose-500", text: "text-rose-500", border: "border-rose-500/30" },
  { value: "sky", label: "Sky", bg: "bg-sky-500", text: "text-sky-500", border: "border-sky-500/30" },
  { value: "violet", label: "Violet", bg: "bg-violet-500", text: "text-violet-500", border: "border-violet-500/30" }
];

export const COLOR_MAP: Record<string, { bg: string; text: string; border: string; raw: string }> = {
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-500", border: "border-indigo-500/30", raw: "#6366f1" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30", raw: "#10b981" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30", raw: "#f59e0b" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/30", raw: "#f43f5e" },
  sky: { bg: "bg-sky-500/10", text: "text-sky-500", border: "border-sky-500/30", raw: "#0ea5e9" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/30", raw: "#8b5cf6" },
};

const PERIOD_OPTIONS = [
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
  { value: "Today", label: "Today Only" }
];

const PRIORITY_OPTIONS = [
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
  { value: "Optional", label: "Optional" }
];

const HabitManagerSection = () => {
  const { habits, addHabit, deleteHabit, updateHabit } = useHabits();
  const { limits } = useSubscription();

  // Add form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [period, setPeriod] = useState("Daily");
  const [priority, setPriority] = useState("High");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [color, setColor] = useState("indigo");
  const [startAlarm, setStartAlarm] = useState(false);
  const [endAlarm, setEndAlarm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [nameError, setNameError] = useState(false);

  // Edit modal state
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPeriod, setEditPeriod] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editColor, setEditColor] = useState("indigo");
  const [editStartAlarm, setEditStartAlarm] = useState(false);
  const [editEndAlarm, setEditEndAlarm] = useState(false);

  // Tab state (active vs archived)
  const [viewTab, setViewTab] = useState<"active" | "archived">("active");

  // Template modal state
  const [showTemplates, setShowTemplates] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) { setNameError(true); return; }
    setNameError(false);
    const err = await addHabit(name.trim(), category.trim(), period, priority, startDate || null, startTime || null, endTime || null, color, startAlarm, endAlarm);
    if (err) { toast.error(err); return; }
    setName(""); setCategory(""); setPeriod("Daily"); setPriority("High"); setStartDate(""); setStartTime(""); setEndTime(""); setColor("indigo"); setStartAlarm(false); setEndAlarm(false);
    toast.success("Habit added successfully!");
  };

  const applyTemplate = async (template: HabitTemplate) => {
    const habitsToAdd = template.habits.filter((h) => {
      return !habits.some((existing) => existing.name === h.name);
    });

    if (habitsToAdd.length === 0) {
      toast.info("All habits from this template already exist.");
      return;
    }

    const habitsRemaining = limits.maxHabits - habits.length;
    if (habitsToAdd.length > habitsRemaining && limits.maxHabits !== Infinity) {
      toast.error(`Can only add ${habitsRemaining} more habits. Upgrade to Pro for unlimited.`);
      return;
    }

    let addedCount = 0;
    for (const habit of habitsToAdd) {
      const err = await addHabit(habit.name, habit.category, habit.period, habit.priority);
      if (!err) addedCount++;
    }

    if (addedCount > 0) {
      toast.success(`Added ${addedCount} habits from ${template.name} template!`);
    }
    setShowTemplates(false);
  };

  const openEdit = (h: Habit) => {
    setEditHabit(h);
    setEditName(h.name);
    setEditCategory(h.category);
    setEditPeriod(h.period);
    setEditPriority(h.priority);
    setEditDate(h.dueDate ? new Date(h.dueDate).toISOString().split("T")[0] : "");
    setEditStartTime(h.startTime || "");
    setEditEndTime(h.endTime || "");
    setEditColor(h.color || "indigo");
    setEditStartAlarm(h.startAlarm || false);
    setEditEndAlarm(h.endAlarm || false);
  };

  const saveEdit = () => {
    if (!editHabit || !editName.trim()) return;
    updateHabit(editHabit.id, {
      name: editName.trim(),
      category: editCategory.trim() || "Uncategorized",
      period: editPeriod as Habit["period"],
      priority: editPriority as Habit["priority"],
      ...(editDate ? { dueDate: new Date(editDate + "T12:00:00").toISOString() } : {}),
      startTime: editStartTime || null,
      endTime: editEndTime || null,
      color: editColor,
      startAlarm: editStartAlarm,
      endAlarm: editEndAlarm,
    });
    setEditHabit(null);
  };

  const priClass: Record<string, string> = {
    High: "bg-destructive/15 text-destructive border border-destructive/25",
    Medium: "bg-pps-orange/15 text-pps-orange border border-pps-orange/25",
    Low: "bg-pps-green/15 text-pps-green border border-pps-green/25",
    Optional: "bg-primary/15 text-primary border border-primary/25",
  };

  const priorities = ["High", "Medium", "Low", "Optional"];

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div>
      <div className="mb-6"><h1 className="text-[22px] font-bold">Habit Manager</h1><div className="text-[13px] text-muted-foreground mt-0.5">Add, edit or remove habits ({habits.length}{limits.maxHabits !== Infinity ? `/${limits.maxHabits}` : ""})</div></div>

      <div className="bg-card border border-border rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">Habit Templates</h3>
          <button
            onClick={() => setShowTemplates(true)}
            className="text-[11px] bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
          >
            Browse All Templates
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {HABIT_STACKS.map((stack) => (
            <button
              key={stack.label}
              onClick={async () => {
                const err = await addHabit(stack.name, stack.category, stack.period, stack.priority);
                if (err) toast.error(err);
                else toast.success(`Added "${stack.name}" habit!`);
              }}
              className="text-[12px] px-3 py-1.5 rounded-lg border border-border hover:border-primary bg-surface"
            >
              {stack.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Quick-add habits or browse full template packs.</p>
        {habits.length >= limits.maxHabits && limits.maxHabits !== Infinity && (
          <p className="text-[11px] text-primary mt-1"><Link to="/pricing">Upgrade to Pro</Link> for unlimited habits.</p>
        )}
      </div>

      {/* Add form */}
      <div className="bg-card border border-border p-6 rounded-lg mb-5 space-y-5">
        <h3 className="text-[13.5px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">Add New Habit</h3>
        
        {/* Group 1: Basic Info */}
        <div className="space-y-3.5">
          <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">📋 Basic Info</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-surface/30 p-4 border border-border/60 rounded-xl">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Habit Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Workout 30 mins"
                className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full" />
              {nameError && <small className="text-[11px] text-destructive font-semibold">Habit name is required</small>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Fitness"
                className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Period</label>
              <CustomSelect value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Start Date <span className="text-muted-foreground text-[10px] normal-case">(optional)</span></label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {priorities.map((p) => {
                  const isSelected = priority === p;
                  let activeStyle = "";
                  if (p === "High") activeStyle = isSelected ? "bg-destructive/20 border-destructive text-destructive" : "bg-destructive/5 border-transparent text-destructive/60 hover:bg-destructive/10";
                  else if (p === "Medium") activeStyle = isSelected ? "bg-pps-orange/20 border-pps-orange text-pps-orange" : "bg-pps-orange/5 border-transparent text-pps-orange/60 hover:bg-pps-orange/10";
                  else if (p === "Low") activeStyle = isSelected ? "bg-pps-green/20 border-pps-green text-pps-green" : "bg-pps-green/5 border-transparent text-pps-green/60 hover:bg-pps-green/10";
                  else activeStyle = isSelected ? "bg-primary/20 border-primary text-primary" : "bg-primary/5 border-transparent text-primary/60 hover:bg-primary/10";

                  return (
                    <label key={p} className={`px-3.5 py-1.5 rounded-full cursor-pointer text-[13px] border-2 transition-all flex items-center gap-1.5 ${activeStyle}`}>
                      <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} className="hidden" />
                      <span className={isSelected ? "font-bold" : ""}>{p}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Group 2: Appearance */}
        <div className="space-y-3.5">
          <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">🎨 Appearance</h4>
          <div className="bg-surface/30 p-4 border border-border/60 rounded-xl flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Habit Accent Color</label>
            <div className="flex gap-2.5 flex-wrap">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-all border-2 ${c.bg} ${color === c.value ? "border-foreground scale-115 shadow-md" : "border-transparent opacity-85 hover:scale-105"}`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Group 3: Schedule & Alerts */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">⏳ Schedule & Alerts <span className="text-muted-foreground text-[10px] lowercase font-normal">(optional)</span></h4>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[12px] font-semibold text-primary hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1"
            >
              {showAdvanced ? "Hide settings ▲" : "Show settings ▼"}
            </button>
          </div>
          
          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 bg-surface/30 border border-border/60 rounded-xl animate-fadeIn">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full"
                />
                <span className="text-[10px] text-muted-foreground">Triggers automatic "Time to start" reminder</span>
                {startTime && (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="startAlarm"
                      checked={startAlarm}
                      onChange={(e) => setStartAlarm(e.target.checked)}
                      className="accent-primary w-3.5 h-3.5 cursor-pointer"
                    />
                    <label htmlFor="startAlarm" className="text-[11.5px] text-muted-foreground cursor-pointer font-semibold">🚨 Start Alarm Override</label>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full"
                />
                <span className="text-[10px] text-muted-foreground">Triggers automatic "Time's up" reminder if incomplete</span>
                {endTime && (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="endAlarm"
                      checked={endAlarm}
                      onChange={(e) => setEndAlarm(e.target.checked)}
                      className="accent-primary w-3.5 h-3.5 cursor-pointer"
                    />
                    <label htmlFor="endAlarm" className="text-[11.5px] text-muted-foreground cursor-pointer font-semibold">🚨 End Alarm Override</label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button onClick={handleAdd} className="w-full sm:w-auto bg-gradient-to-br from-primary to-accent text-white py-2.5 px-6 rounded-lg text-[13.5px] font-semibold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 shadow-md">
          + Add Habit
        </button>
      </div>

      {/* Habit list */}
      <div className="bg-card border border-border p-5 rounded-lg" style={{ boxShadow: "var(--card-shadow)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-border pb-3">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">Your Habits</h3>
          <div className="flex gap-1.5 bg-surface p-1 rounded-lg border border-border/80">
            <button
              onClick={() => setViewTab("active")}
              className={`px-3 py-1 text-[12px] font-semibold rounded-md transition-all ${viewTab === "active" ? "bg-primary text-primary-foreground shadow" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Active ({habits.filter(h => !h.archived).length})
            </button>
            <button
              onClick={() => setViewTab("archived")}
              className={`px-3 py-1 text-[12px] font-semibold rounded-md transition-all ${viewTab === "archived" ? "bg-primary text-primary-foreground shadow" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Archived ({habits.filter(h => h.archived).length})
            </button>
          </div>
        </div>

        {habits.filter(h => viewTab === "active" ? !h.archived : h.archived).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6">
            <div className="text-5xl mb-3">{viewTab === "active" ? "🌱" : "📁"}</div>
            <h3 className="text-lg font-semibold mb-1">{viewTab === "active" ? "No habits yet" : "No archived habits"}</h3>
            <p className="text-[13px] text-muted-foreground text-center max-w-[280px]">
              {viewTab === "active"
                ? "Create your first habit above and start building consistency. Every habit completed earns you 10 XP!"
                : "Archived habits keep all historical completion data but stay hidden from your trackers."}
            </p>
          </div>
        ) : (
          [...habits].filter(h => viewTab === "active" ? !h.archived : h.archived).sort((a, b) => {
            const priorityWeight: Record<string, number> = { High: 3, Medium: 2, Low: 1, Optional: 0 };
            const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
            if (pDiff !== 0) return pDiff;
            const catDiff = (a.category || "").localeCompare(b.category || "");
            if (catDiff !== 0) return catDiff;
            const periodOrder: Record<string, number> = { Today: 0, Daily: 1, Weekly: 2, Monthly: 3 };
            const periodDiff = (periodOrder[a.period] ?? 0) - (periodOrder[b.period] ?? 0);
            if (periodDiff !== 0) return periodDiff;
            return a.name.localeCompare(b.name);
          }).map((h) => {
            const colorMeta = COLOR_MAP[h.color || "indigo"];
            return (
              <div key={h.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 px-4 bg-surface border border-border rounded-[10px] mb-2.5 hover:bg-primary/[0.02] hover:border-primary/20 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-semibold">{h.name}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${colorMeta.bg} ${colorMeta.text} border ${colorMeta.border}`}>
                      {h.category}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {h.period} &nbsp;•&nbsp; 
                    {h.startTime && h.endTime ? (
                      <span className="text-primary font-semibold">⏳ {h.startTime.substring(0, 5)} - {h.endTime.substring(0, 5)} &nbsp;•&nbsp; </span>
                    ) : h.startTime ? (
                      <span className="text-primary font-semibold">⏳ Starts: {h.startTime.substring(0, 5)} &nbsp;•&nbsp; </span>
                    ) : h.endTime ? (
                      <span className="text-primary font-semibold">⏳ Ends: {h.endTime.substring(0, 5)} &nbsp;•&nbsp; </span>
                    ) : null}
                    Next due: {formatDate(h.dueDate)} &nbsp;•&nbsp; 🔥 {h.streak} streak
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold font-mono ${priClass[h.priority] || priClass.Optional}`}>{h.priority}</span>
                  {viewTab === "active" ? (
                    <>
                      <button onClick={() => openEdit(h)} className="bg-transparent text-muted-foreground border border-border py-1.5 px-3 rounded-lg text-[12.5px] hover:text-foreground hover:bg-surface transition-all duration-200">Edit</button>
                      <button onClick={() => { updateHabit(h.id, { archived: true }); toast.success(`"${h.name}" archived.`); }} className="bg-transparent text-muted-foreground border border-border py-1.5 px-3 rounded-lg text-[12.5px] hover:text-foreground hover:bg-surface transition-all duration-200">Archive</button>
                      <button onClick={() => { if (confirm(`Delete "${h.name}"?`)) deleteHabit(h.id); }} className="bg-destructive/10 text-destructive border border-destructive/20 py-1.5 px-3 rounded-lg text-[12.5px] hover:bg-destructive/20 transition-all duration-200">Delete</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { updateHabit(h.id, { archived: false }); toast.success(`"${h.name}" restored.`); }} className="bg-primary/10 text-primary border border-primary/20 py-1.5 px-3 rounded-lg text-[12.5px] hover:bg-primary/20 transition-all duration-200">Restore</button>
                      <button onClick={() => { if (confirm(`Permanently delete "${h.name}"?`)) deleteHabit(h.id); }} className="bg-destructive/10 text-destructive border border-destructive/20 py-1.5 px-3 rounded-lg text-[12.5px] hover:bg-destructive/20 transition-all duration-200">Delete Permanent</button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {editHabit && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-[1000]" onClick={() => setEditHabit(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-[520px] max-w-[95vw] max-h-[90vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border pb-2.5">
              <h2 className="text-base font-bold">Edit Habit</h2>
              <button onClick={() => setEditHabit(null)} className="bg-transparent border-none text-muted-foreground text-xl cursor-pointer hover:text-foreground">✕</button>
            </div>
            
            {/* Group 1: Basic Info */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">📋 Basic Info</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-surface/30 p-4 border border-border/60 rounded-xl">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Habit Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                  <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Period</label>
                  <CustomSelect value={editPeriod} onChange={setEditPeriod} options={PERIOD_OPTIONS} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Due Date</label>
                  <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full" />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {priorities.map((p) => {
                      const isSelected = editPriority === p;
                      let activeStyle = "";
                      if (p === "High") activeStyle = isSelected ? "bg-destructive/25 border-destructive text-destructive" : "bg-destructive/5 border-transparent text-destructive/60 hover:bg-destructive/10";
                      else if (p === "Medium") activeStyle = isSelected ? "bg-pps-orange/20 border-pps-orange text-pps-orange" : "bg-pps-orange/5 border-transparent text-pps-orange/60 hover:bg-pps-orange/10";
                      else if (p === "Low") activeStyle = isSelected ? "bg-pps-green/20 border-pps-green text-pps-green" : "bg-pps-green/5 border-transparent text-pps-green/60 hover:bg-pps-green/10";
                      else activeStyle = isSelected ? "bg-primary/20 border-primary text-primary" : "bg-primary/5 border-transparent text-primary/60 hover:bg-primary/10";

                      return (
                        <label key={p} className={`px-3.5 py-1.5 rounded-full cursor-pointer text-[13px] border-2 transition-all flex items-center gap-1.5 ${activeStyle}`}>
                          <input type="radio" name="editPriority" value={p} checked={editPriority === p} onChange={() => setEditPriority(p)} className="hidden" />
                          <span className={isSelected ? "font-bold" : ""}>{p}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Group 2: Appearance */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">🎨 Appearance</h4>
              <div className="bg-surface/30 p-4 border border-border/60 rounded-xl flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Accent Color</label>
                <div className="flex gap-2.5 flex-wrap">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setEditColor(c.value)}
                      className={`w-7 h-7 rounded-full transition-all border-2 ${c.bg} ${editColor === c.value ? "border-foreground scale-115 shadow-md" : "border-transparent opacity-85 hover:scale-105"}`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Group 3: Schedule & Alerts */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">⏳ Schedule & Alerts <span className="text-muted-foreground text-[10px] lowercase font-normal">(optional)</span></h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-surface/30 p-4 border border-border/60 rounded-xl">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Start Time <span className="text-[9px] text-muted-foreground normal-case">(optional)</span></label>
                  <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full" />
                  {editStartTime && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="checkbox"
                        id="editStartAlarm"
                        checked={editStartAlarm}
                        onChange={(e) => setEditStartAlarm(e.target.checked)}
                        className="accent-primary w-3.5 h-3.5 cursor-pointer"
                      />
                      <label htmlFor="editStartAlarm" className="text-[11.5px] text-muted-foreground cursor-pointer font-semibold">🚨 Start Alarm Override</label>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">End Time <span className="text-[9px] text-muted-foreground normal-case">(optional)</span></label>
                  <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full" />
                  {editEndTime && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="checkbox"
                        id="editEndAlarm"
                        checked={editEndAlarm}
                        onChange={(e) => setEditEndAlarm(e.target.checked)}
                        className="accent-primary w-3.5 h-3.5 cursor-pointer"
                      />
                      <label htmlFor="editEndAlarm" className="text-[11.5px] text-muted-foreground cursor-pointer font-semibold">🚨 End Alarm Override</label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 justify-end border-t border-border pt-3.5">
              <button onClick={() => setEditHabit(null)} className="bg-transparent text-muted-foreground border border-border py-2 px-4 rounded-lg text-[12.5px] hover:text-foreground hover:bg-surface transition-all">Cancel</button>
              <button onClick={saveEdit} className="bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2 px-5 rounded-lg text-[13px] font-semibold hover:-translate-y-0.5 transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-[1000]" onClick={() => setShowTemplates(false)}>
          <div className="bg-card border border-border rounded-2xl p-7 w-[600px] max-w-[95vw] max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold">Habit Templates</h2>
              <button onClick={() => setShowTemplates(false)} className="bg-transparent border-none text-muted-foreground text-xl cursor-pointer hover:text-foreground">✕</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {HABIT_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="bg-surface border border-border rounded-xl p-4 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => applyTemplate(template)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">{template.icon}</div>
                    <div>
                      <h3 className="font-semibold text-sm">{template.name}</h3>
                      <p className="text-xs text-muted-foreground">{template.habits.length} habits</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {template.habits.slice(0, 3).map((h, i) => (
                      <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {h.name}
                      </span>
                    ))}
                    {template.habits.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{template.habits.length - 3} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HabitManagerSection;
