/*
  💡 Habit Manager Section
  Same as your #habitManagerSection — add/edit/delete habits.
*/

import { useState } from "react";
import { useHabits, Habit } from "@/hooks/use-habits";

const HabitManagerSection = () => {
  const { habits, addHabit, deleteHabit, updateHabit } = useHabits();

  // Add form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [period, setPeriod] = useState("Daily");
  const [priority, setPriority] = useState("High");
  const [startDate, setStartDate] = useState("");
  const [nameError, setNameError] = useState(false);

  // Edit modal state
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPeriod, setEditPeriod] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editDate, setEditDate] = useState("");

  const handleAdd = () => {
    if (!name.trim()) { setNameError(true); return; }
    setNameError(false);
    addHabit(name.trim(), category.trim(), period, priority, startDate || null);
    setName(""); setCategory(""); setPeriod("Daily"); setPriority("High"); setStartDate("");
  };

  const openEdit = (h: Habit) => {
    setEditHabit(h);
    setEditName(h.name);
    setEditCategory(h.category);
    setEditPeriod(h.period);
    setEditPriority(h.priority);
    setEditDate(h.dueDate ? new Date(h.dueDate).toISOString().split("T")[0] : "");
  };

  const saveEdit = () => {
    if (!editHabit || !editName.trim()) return;
    updateHabit(editHabit.id, {
      name: editName.trim(),
      category: editCategory.trim() || "Uncategorized",
      period: editPeriod as Habit["period"],
      priority: editPriority as Habit["priority"],
      ...(editDate ? { dueDate: new Date(editDate + "T12:00:00").toISOString() } : {}),
    });
    setEditHabit(null);
  };

  const priClass: Record<string, string> = {
    High: "bg-destructive/15 text-destructive", Medium: "bg-pps-yellow/15 text-pps-yellow",
    Low: "bg-pps-green/15 text-pps-green", Optional: "bg-primary/15 text-primary/70",
  };

  const priorities = ["High", "Medium", "Low", "Optional"];
  const priBg: Record<string, string> = { High: "bg-[#7f1d1d]", Medium: "bg-[#78350f]", Low: "bg-[#14532d]", Optional: "bg-[#374151]" };
  const priBorder: Record<string, string> = { High: "border-destructive", Medium: "border-pps-orange", Low: "border-pps-green", Optional: "border-muted-foreground" };

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div>
      <div className="mb-6"><h1 className="text-[22px] font-bold">Habit Manager</h1><div className="text-[13px] text-muted-foreground mt-0.5">Add, edit or remove habits</div></div>

      {/* Add form */}
      <div className="bg-card border border-border p-5 rounded-lg mb-5">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Add New Habit</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Habit Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Workout 30 mins"
              className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full" />
            {nameError && <small className="text-[11px] text-destructive">Habit name is required</small>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Fitness"
              className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}
              className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full">
              <option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option><option value="Today">Today Only</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Start Date <span className="text-muted-foreground text-[10px] normal-case">(optional)</span></label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {priorities.map((p) => (
                <label key={p} className={`px-3.5 py-1.5 rounded-full cursor-pointer text-[13px] border-2 transition-all flex items-center gap-1.5 ${priBg[p]} ${priority === p ? priBorder[p] : "border-transparent"}`}>
                  <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} className="hidden" />
                  <span className={priority === p ? "font-bold" : ""}>{p}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <button onClick={handleAdd} className="mt-3 bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 px-5 rounded-lg text-[13.5px] font-semibold hover:-translate-y-0.5 transition-all">
          + Add Habit
        </button>
      </div>

      {/* Habit list */}
      <div className="bg-card border border-border p-5 rounded-lg" style={{ boxShadow: "var(--card-shadow)" }}>
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Your Habits ({habits.length})</h3>
        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6">
            <div className="text-5xl mb-3">🌱</div>
            <h3 className="text-lg font-semibold mb-1">No habits yet</h3>
            <p className="text-[13px] text-muted-foreground text-center max-w-[280px]">
              Create your first habit above and start building consistency. Every habit completed earns you 10 XP!
            </p>
          </div>
        ) : (
          habits.map((h) => (
            <div key={h.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 px-4 bg-surface border border-border rounded-[10px] mb-2.5 hover:bg-primary/[0.02] hover:border-primary/20 transition-colors">
              <div>
                <h4 className="text-sm font-semibold mb-0.5">{h.name}</h4>
                <div className="text-xs text-muted-foreground">{h.category} &nbsp;•&nbsp; {h.period} &nbsp;•&nbsp; Next due: {formatDate(h.dueDate)} &nbsp;•&nbsp; 🔥 {h.streak} streak</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold font-mono ${priClass[h.priority] || priClass.Optional}`}>{h.priority}</span>
                <button onClick={() => openEdit(h)} className="bg-transparent text-muted-foreground border border-border py-1.5 px-3.5 rounded-lg text-[12.5px] font-display hover:text-foreground hover:border-muted-foreground">Edit</button>
                <button onClick={() => { if (confirm(`Delete "${h.name}"?`)) deleteHabit(h.id); }} className="bg-destructive/10 text-destructive border border-destructive/20 py-1.5 px-3.5 rounded-lg text-[12.5px] font-display hover:bg-destructive/20">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editHabit && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-[1000]" onClick={() => setEditHabit(null)}>
          <div className="bg-card border border-border rounded-2xl p-7 w-[480px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-bold">Edit Habit</h2>
              <button onClick={() => setEditHabit(null)} className="bg-transparent border-none text-muted-foreground text-xl cursor-pointer hover:text-foreground">✕</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
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
                <select value={editPeriod} onChange={(e) => setEditPeriod(e.target.value)} className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full">
                  <option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option><option value="Today">Today Only</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Due Date</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full" />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {priorities.map((p) => (
                    <label key={p} className={`px-3.5 py-1.5 rounded-full cursor-pointer text-[13px] border-2 transition-all ${priBg[p]} ${editPriority === p ? priBorder[p] : "border-transparent"}`}>
                      <input type="radio" name="editPriority" value={p} checked={editPriority === p} onChange={() => setEditPriority(p)} className="hidden" />
                      <span className={editPriority === p ? "font-bold" : ""}>{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2.5 justify-end mt-2">
              <button onClick={() => setEditHabit(null)} className="bg-transparent text-muted-foreground border border-border py-1.5 px-3.5 rounded-lg text-[12.5px] hover:text-foreground hover:border-muted-foreground">Cancel</button>
              <button onClick={saveEdit} className="bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 px-5 rounded-lg text-[13.5px] font-semibold hover:-translate-y-0.5 transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HabitManagerSection;
