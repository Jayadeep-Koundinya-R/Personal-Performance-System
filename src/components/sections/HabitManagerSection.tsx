/*
  ⚙️ Habit Architect & Routine Hub
  
  Features:
  - Atomic Habit Stacking Builder (Trigger ➔ Action ➔ Reward)
  - Micro-Goal Unit Tracking (Target + Units e.g. 2000 ml, 15 pages)
  - Curated Routine Starter Bundles (Morning Hero, Deep Work Beast, Evening Recovery)
  - Live Search & Category Filter Tabs
  - Active vs Archived Management
  - High-Contrast Glassmorphic Crisp Design
*/

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHabits, Habit } from "@/hooks/use-habits";
import { useSubscription } from "@/hooks/use-subscription";
import { HABIT_TEMPLATES, HabitTemplate } from "@/lib/habitTemplates";
import { Button } from "@/components/ui/button";
import { Search, Plus, Sparkles, Layers, Check, Edit2, Trash2, Archive, Bell, Clock, Calendar, Shield, Tag, Zap } from "lucide-react";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";
import { CustomSelect } from "@/components/ui/CustomSelect";

const ROUTINE_BUNDLES = [
  {
    name: "Morning Hero Stack 🌅",
    category: "Health",
    desc: "Kickstart your day with hydration, mindfulness, and daily focus planning.",
    habits: [
      { name: "Morning Hydration (500ml)", category: "Health", period: "Daily", priority: "High" },
      { name: "10-Min Mindfulness Meditation", category: "Mindfulness", period: "Daily", priority: "High" },
      { name: "Daily Priority Alignment (5m)", category: "Productivity", period: "Daily", priority: "High" },
    ],
  },
  {
    name: "Deep Work Beast ⚡",
    category: "Productivity",
    desc: "Maximize cognitive stamina with structured deep-work sprints.",
    habits: [
      { name: "90-Min Deep Work Sprint", category: "Productivity", period: "Daily", priority: "High" },
      { name: "Code / Project Review", category: "Productivity", period: "Daily", priority: "Medium" },
      { name: "Daily Accomplishment Log", category: "Productivity", period: "Daily", priority: "Medium" },
    ],
  },
  {
    name: "Evening Wind-Down 🌙",
    category: "Wellness",
    desc: "Prepare body and mind for restorative sleep.",
    habits: [
      { name: "Digital Screen Detox (1 Hour Before Sleep)", category: "Health", period: "Daily", priority: "High" },
      { name: "Evening Book Reading (15 Pages)", category: "Learning", period: "Daily", priority: "Medium" },
      { name: "Gratitude & Reflection Journal", category: "Mindfulness", period: "Daily", priority: "Low" },
    ],
  },
];

const COLOR_PALETTE = [
  { value: "indigo", label: "Indigo", bg: "bg-secondary", border: "border-secondary/40", text: "text-secondary" },
  { value: "emerald", label: "Emerald", bg: "bg-pps-green", border: "border-pps-green/40", text: "text-pps-green" },
  { value: "amber", label: "Amber", bg: "bg-pps-orange", border: "border-pps-orange/40", text: "text-pps-orange" },
  { value: "rose", label: "Rose", bg: "bg-destructive", border: "border-destructive/40", text: "text-destructive" },
  { value: "sky", label: "Sky", bg: "bg-secondary", border: "border-secondary/40", text: "text-secondary" },
  { value: "violet", label: "Violet", bg: "bg-accent", border: "border-accent/40", text: "text-accent" },
];

const PRIORITY_BADGES: Record<string, string> = {
  High: "bg-destructive/20 text-destructive border-destructive/30",
  Medium: "bg-pps-orange/20 text-pps-orange border-pps-orange/30",
  Low: "bg-pps-green/20 text-pps-green border-pps-green/30",
  Optional: "bg-primary/20 text-primary border-primary/30",
};

const HabitManagerSection = () => {
  const { habits, addHabit, deleteHabit, updateHabit } = useHabits();
  const { limits } = useSubscription();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryTab, setSelectedCategoryTab] = useState("All");
  const [viewMode, setViewMode] = useState<"active" | "archived">("active");

  // Form State for New Habit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("");
  const [category, setCategory] = useState("Productivity");
  const [period, setPeriod] = useState("Daily");
  const [priority, setPriority] = useState("High");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [color, setColor] = useState("indigo");
  const [startAlarm, setStartAlarm] = useState(false);
  const [endAlarm, setEndAlarm] = useState(false);
  const [requiresFocusTimer, setRequiresFocusTimer] = useState(false);
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(25);
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [nameError, setNameError] = useState(false);

  // Edit Modal State
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPeriod, setEditPeriod] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editColor, setEditColor] = useState("indigo");
  const [editRequiresFocusTimer, setEditRequiresFocusTimer] = useState(false);
  const [editFocusDurationMinutes, setEditFocusDurationMinutes] = useState(25);
  const [editWindowStart, setEditWindowStart] = useState("");
  const [editWindowEnd, setEditWindowEnd] = useState("");

  // Routine Bundles Modal State
  const [showBundles, setShowBundles] = useState(false);

  // Categories extraction
  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(habits.map((h) => h.category || "General")))];
  }, [habits]);

  // Filtered habits list based on tab, search, category
  const filteredHabits = useMemo(() => {
    return habits.filter((h) => {
      const matchesTab = viewMode === "archived" ? h.archived : !h.archived;
      const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (h.category || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategoryTab === "All" || (h.category || "General") === selectedCategoryTab;
      return matchesTab && matchesSearch && matchesCat;
    });
  }, [habits, viewMode, searchQuery, selectedCategoryTab]);

  // Add Habit handler
  const handleAdd = async () => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);

    // Save Atomic Trigger to local storage if present
    const habitNameFinal = triggerEvent.trim() ? `${name.trim()} (After: ${triggerEvent.trim()})` : name.trim();

    const err = await addHabit(
      habitNameFinal,
      category.trim() || "General",
      period,
      priority,
      startDate || null,
      startTime || null,
      endTime || null,
      color,
      startAlarm,
      endAlarm,
      requiresFocusTimer,
      focusDurationMinutes,
      windowStart || undefined,
      windowEnd || undefined
    );

    if (err) {
      toast.error(err);
      return;
    }

    setName("");
    setTriggerEvent("");
    setCategory("Productivity");
    setPeriod("Daily");
    setPriority("High");
    setStartDate("");
    setStartTime("");
    setEndTime("");
    setColor("indigo");
    setRequiresFocusTimer(false);
    setFocusDurationMinutes(25);
    setWindowStart("");
    setWindowEnd("");
    setIsFormOpen(false);
    toast.success("Habit added to your architect stack!");
  };

  // 1-Click Bundle installation
  const installBundle = async (bundle: typeof ROUTINE_BUNDLES[0]) => {
    let addedCount = 0;
    for (const h of bundle.habits) {
      const exists = habits.some((e) => e.name.toLowerCase() === h.name.toLowerCase());
      if (!exists) {
        const err = await addHabit(h.name, h.category, h.period, h.priority);
        if (!err) addedCount++;
      }
    }

    if (addedCount > 0) {
      toast.success(`Installed ${addedCount} habits from ${bundle.name}!`);
    } else {
      toast.info("All habits in this bundle already exist.");
    }
    setShowBundles(false);
  };

  // Toggle Archive
  const toggleArchive = (h: Habit) => {
    updateHabit(h.id, { archived: !h.archived });
    toast.success(`${h.name} ${h.archived ? "restored to active" : "archived"}!`);
  };

  // Open Edit Modal
  const openEdit = (h: Habit) => {
    setEditHabit(h);
    setEditName(h.name);
    setEditCategory(h.category || "General");
    setEditPeriod(h.period);
    setEditPriority(h.priority);
    setEditStartTime(h.startTime || "");
    setEditEndTime(h.endTime || "");
    setEditColor(h.color || "indigo");
    setEditRequiresFocusTimer(h.requires_focus_timer || false);
    setEditFocusDurationMinutes(h.focus_duration_minutes || 25);
    setEditWindowStart(h.window_start || "");
    setEditWindowEnd(h.window_end || "");
  };

  // Save Edit
  const handleSaveEdit = () => {
    if (!editHabit || !editName.trim()) return;
    updateHabit(editHabit.id, {
      name: editName.trim(),
      category: editCategory.trim() || "General",
      period: editPeriod as Habit["period"],
      priority: editPriority as Habit["priority"],
      startTime: editStartTime || null,
      endTime: editEndTime || null,
      color: editColor,
      requires_focus_timer: editRequiresFocusTimer,
      focus_duration_minutes: editFocusDurationMinutes,
      window_start: editWindowStart || undefined,
      window_end: editWindowEnd || undefined,
    });
    setEditHabit(null);
    toast.success("Habit updated successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>⚙️ Habit Architect</span>
            <span className="text-[11px] font-mono bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
              Atomic Stacking & Routines
            </span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Build atomic habit stacks (Trigger ➔ Action), install routine bundles, and configure smart alarms
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowBundles(true)}
            variant="secondary"
            size="sm"
            className="bg-secondary/15 text-secondary border border-secondary/30 px-3.5 py-2 rounded-2xl font-extrabold hover:bg-secondary hover:text-secondary-foreground transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Routine Bundles</span>
          </Button>

          <Button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="bg-primary text-primary-foreground font-extrabold px-4 py-2 rounded-2xl hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{isFormOpen ? "Close Form" : "Build New Habit"}</span>
          </Button>
        </div>
      </div>

      {/* ── 1. ATOMIC HABIT STACKING FORM (DRAWER) ── */}
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
                <span>⚡ Atomic Habit Architect Builder</span>
              </h3>
              <span className="text-xs font-mono font-bold text-primary">Formula: Trigger ➔ Action</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Habit Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground font-mono">1. Habit Action Name *</label>
                <input
                  type="text"
                  placeholder="e.g. 10-Minute Mindfulness Meditation"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value) setNameError(false);
                  }}
                  className={`w-full bg-surface border text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground ${
                    nameError ? "border-destructive ring-1 ring-destructive" : "border-border/80 focus:border-primary"
                  }`}
                />
              </div>

              {/* Atomic Stacking Trigger */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-secondary font-mono flex items-center gap-1">
                  <span>2. Atomic Trigger ("After I...")</span>
                  <span className="text-[10px] text-muted-foreground font-normal">(Optional Habit Stacking)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pour my morning coffee ☕"
                  value={triggerEvent}
                  onChange={(e) => setTriggerEvent(e.target.value)}
                  className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground focus:border-primary"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground font-mono">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Health, Productivity, Mindfulness"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground"
                />
              </div>

              {/* Periodicity */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground font-mono">Periodicity</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground cursor-pointer"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Today">Today Only</option>
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground font-mono">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none text-foreground cursor-pointer"
                >
                  <option value="High">High Priority (Red)</option>
                  <option value="Medium">Medium Priority (Orange)</option>
                  <option value="Low">Low Priority (Green)</option>
                  <option value="Optional">Optional (Blue)</option>
                </select>
              </div>

              {/* Color Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground font-mono">Theme Accent Color</label>
                <div className="flex items-center gap-2 pt-1">
                  {COLOR_PALETTE.map((c) => (
                    <Button
                      key={c.value}
                      variant="ghost"
                      size="sm"
                      onClick={() => setColor(c.value)}
                      className={`w-7 h-7 rounded-full ${c.bg} cursor-pointer transition-all ${
                        color === c.value ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" : "opacity-70 hover:opacity-100"
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Proof-of-Focus Sprint Lock */}
              <div className="sm:col-span-2 p-3.5 bg-surface/50 border border-border/70 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-pps-orange font-bold text-sm">⚡</span>
                    <div>
                      <div className="text-xs font-extrabold text-foreground font-mono">Proof-of-Focus Sprint Lock (Agni 2.0)</div>
                      <div className="text-[10.5px] text-muted-foreground">Requires a verified focus sprint before this anchor habit can be marked done</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={requiresFocusTimer}
                    onChange={(e) => setRequiresFocusTimer(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                  />
                </div>
                {requiresFocusTimer && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                    <span className="text-[11px] font-mono text-muted-foreground font-semibold">Sprint Duration:</span>
                    {[15, 25, 45, 60].map((mins) => (
                      <Button
                        key={mins}
                        type="button"
                        variant={focusDurationMinutes === mins ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFocusDurationMinutes(mins)}
                        className={`text-[10.5px] font-mono font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          focusDurationMinutes === mins
                            ? "bg-pps-orange text-foreground border border-pps-orange shadow-xs"
                            : "bg-surface border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {mins}m
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Circadian Biological Energy Window */}
              <div className="sm:col-span-2 p-3.5 bg-surface/50 border border-border/70 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-secondary font-bold text-sm">⏳</span>
                    <div>
                      <div className="text-xs font-extrabold text-foreground font-mono">Circadian Biological Window</div>
                      <div className="text-[10.5px] text-muted-foreground">Align habit execution with your peak energy window</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: "🌅 Morning (08–12)", start: "08:00", end: "12:00" },
                      { label: "☀️ Afternoon (13–16)", start: "13:00", end: "16:00" },
                      { label: "🌙 Evening (17–21)", start: "17:00", end: "21:00" },
                    ].map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        variant={windowStart === preset.start && windowEnd === preset.end ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setWindowStart(preset.start);
                          setWindowEnd(preset.end);
                        }}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          windowStart === preset.start && windowEnd === preset.end
                            ? "bg-secondary/20 text-secondary border border-secondary/40 font-bold"
                            : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {preset.label}
                      </Button>
                    ))}
                    {(windowStart || windowEnd) && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setWindowStart("");
                          setWindowEnd("");
                        }}
                        className="text-[10px] text-destructive hover:underline cursor-pointer ml-1"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/40">
                  <div>
                    <label className="text-[10px] font-mono text-muted-foreground font-semibold">Window Opens (HH:MM)</label>
                    <input
                      type="time"
                      value={windowStart}
                      onChange={(e) => setWindowStart(e.target.value)}
                      className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3 py-1.5 outline-none text-foreground mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-muted-foreground font-semibold">Window Closes (HH:MM)</label>
                    <input
                      type="time"
                      value={windowEnd}
                      onChange={(e) => setWindowEnd(e.target.value)}
                      className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3 py-1.5 outline-none text-foreground mt-0.5"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-2 flex justify-end gap-2 border-t border-border/40">
              <Button
                type="button"
                onClick={() => setIsFormOpen(false)}
                variant="outline"
                size="sm"
                className="text-xs font-bold text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl hover:bg-surface transition-all cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAdd}
                className="bg-primary text-primary-foreground font-extrabold px-5 py-2 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
              >
                Save Habit to Stack
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. SEARCH & CATEGORY FILTER BAR ── */}
      <div className="bg-card border border-border p-4 rounded-3xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Active / Archived Tab Pill */}
          <div className="flex items-center gap-1 bg-surface border border-border/80 p-1 rounded-2xl">
            <Button
              onClick={() => setViewMode("active")}
              variant={viewMode === "active" ? "default" : "outline"}
              size="sm"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === "active" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active Habits ({habits.filter((h) => !h.archived).length})
            </Button>
            <Button
              onClick={() => setViewMode("archived")}
              variant={viewMode === "archived" ? "default" : "outline"}
              size="sm"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === "archived" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Archived ({habits.filter((h) => h.archived).length})
            </Button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search habits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl pl-9 pr-3.5 py-2 outline-none text-foreground focus:border-primary"
            />
          </div>
        </div>

        {/* Category Chips Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategoryTab === cat ? "secondary" : "outline"}
              size="sm"
              onClick={() => setSelectedCategoryTab(cat)}
              className={`text-[11px] px-3 py-1 rounded-lg border font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategoryTab === cat
                  ? "bg-secondary text-secondary-foreground border-secondary shadow-xs"
                  : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* ── 3. HIGH-DENSITY HABIT CARDS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHabits.length === 0 ? (
          <div className="col-span-3 bg-card border border-border/80 rounded-3xl p-4">
            <EmptyState
              icon="⚙️"
              title="No Habits Found"
              description="Create your first habit or install a 1-click curated routine bundle below!"
              actionLabel="Add Habit"
              onAction={() => setIsFormOpen(true)}
            />
          </div>
        ) : (
          filteredHabits.map((h) => {
            const priBadge = PRIORITY_BADGES[h.priority] || PRIORITY_BADGES.Optional;
            const isAtomic = h.name.includes("(After:");

            return (
              <motion.div
                key={h.id}
                whileHover={{ y: -3 }}
                className="bg-card border border-border p-5 rounded-3xl shadow-xl space-y-3.5 relative overflow-hidden transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground leading-snug">{h.name}</h3>
                      {isAtomic && (
                        <div className="text-[10.5px] font-mono text-secondary font-bold mt-0.5 flex items-center gap-1">
                          <span>🔗 Atomic Stack</span>
                        </div>
                      )}
                    </div>

                    <span className={`text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full border ${priBadge}`}>
                      {h.priority}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono font-bold flex-wrap">
                    <span className="bg-surface border border-border/80 px-2 py-0.5 rounded-lg">
                      📁 {h.category || "General"}
                    </span>
                    <span className="bg-surface border border-border/80 px-2 py-0.5 rounded-lg">
                      ⏰ {h.period}
                    </span>
                    {h.requires_focus_timer && (
                      <span className="bg-pps-orange/15 text-pps-orange border border-pps-orange/30 px-2 py-0.5 rounded-lg">
                        ⚡ Sprint ({h.focus_duration_minutes || 25}m)
                      </span>
                    )}
                    {(h.window_start || h.window_end) && (
                      <span className="bg-secondary/15 text-secondary border border-secondary/30 px-2 py-0.5 rounded-lg">
                        ⏳ {h.window_start || "00:00"} – {h.window_end || "23:59"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-pps-green">
                      ✓ {h.completedDates.length} Done
                    </span>
                    <Button
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("pps_start_focus_timer", {
                            detail: {
                              habitId: h.id,
                              habitName: h.name,
                              duration: h.focus_duration_minutes || 25,
                            },
                          })
                        );
                        toast.success(`⚡ Focus Sprint launched for "${h.name}"!`);
                      }}
                      variant="outline"
                      size="sm"
                      className="text-[10px] font-mono font-bold bg-pps-orange/15 text-pps-orange border border-pps-orange/30 hover:bg-pps-orange hover:text-black px-2 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      title="Launch Focus Sprint for this habit"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Sprint ({h.focus_duration_minutes || 25}m)</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      onClick={() => openEdit(h)}
                      variant="ghost"
                      size="sm"
                      className="p-1.5 bg-surface border border-border/80 text-muted-foreground hover:text-foreground rounded-lg transition-all cursor-pointer"
                      title="Edit Habit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      onClick={() => toggleArchive(h)}
                      variant="ghost"
                      size="sm"
                      className="p-1.5 bg-surface border border-border/80 text-muted-foreground hover:text-foreground rounded-lg transition-all cursor-pointer"
                      title={h.archived ? "Restore Habit" : "Archive Habit"}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      onClick={() => {
                        deleteHabit(h.id);
                        toast.success("Habit deleted");
                      }}
                      variant="destructive"
                      size="sm"
                      className="p-1.5 bg-surface border border-destructive/40 text-destructive hover:bg-destructive/10 rounded-lg transition-all cursor-pointer"
                      title="Delete Habit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ── 4. ROUTINE STARTER BUNDLES MODAL ── */}
      <AnimatePresence>
        {showBundles && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowBundles(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-secondary/40 rounded-3xl p-6 shadow-2xl max-w-xl w-full space-y-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div>
                  <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2 font-mono">
                    <span>🚀 Curated Routine Starter Bundles</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    1-click install high-performance habit stacks created by productivity scientists
                  </p>
                </div>
                <Button
                  onClick={() => setShowBundles(false)}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {ROUTINE_BUNDLES.map((b) => (
                  <div key={b.name} className="p-4 bg-surface/60 border border-border/80 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-foreground">{b.name}</h4>
                      <span className="text-[10px] font-mono font-bold bg-secondary/15 text-secondary border border-secondary/30 px-2.5 py-0.5 rounded-full">
                        {b.habits.length} Habits
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground font-medium">{b.desc}</p>

                    <div className="space-y-1">
                      {b.habits.map((h) => (
                        <div key={h.name} className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <span>✓</span> <span>{h.name}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={() => installBundle(b)}
                      className="w-full bg-secondary text-secondary-foreground font-extrabold text-xs py-2 rounded-xl hover:bg-secondary/90 transition-all cursor-pointer shadow-xs mt-2"
                    >
                      1-Click Install Bundle
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 5. EDIT HABIT MODAL ── */}
      <AnimatePresence>
        {editHabit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setEditHabit(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-primary/40 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <h3 className="text-base font-extrabold text-foreground font-mono">✏️ Edit Habit Architecture</h3>
                      <Button
                        onClick={() => setEditHabit(null)}
                        className="text-muted-foreground hover:text-foreground text-sm font-bold"
                      >
                        ✕
                      </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-extrabold text-foreground font-mono">Habit Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3 py-2 outline-none text-foreground mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-foreground font-mono">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3 py-2 outline-none text-foreground mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-foreground font-mono">Period</label>
                    <select
                      value={editPeriod}
                      onChange={(e) => setEditPeriod(e.target.value)}
                      className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3 py-2 outline-none text-foreground mt-1 cursor-pointer"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Today">Today Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-foreground font-mono">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="w-full bg-surface border border-border/80 text-xs font-bold rounded-xl px-3 py-2 outline-none text-foreground mt-1 cursor-pointer"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                      <option value="Optional">Optional</option>
                    </select>
                  </div>
                </div>

                {/* Edit Proof-of-Focus Lock */}
                <div className="p-3 bg-surface/50 border border-border/70 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-foreground flex items-center gap-1.5">
                      <span className="text-pps-orange">⚡</span>
                      <span>Proof-of-Focus Lock (Agni 2.0)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={editRequiresFocusTimer}
                      onChange={(e) => setEditRequiresFocusTimer(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                    />
                  </div>
                  {editRequiresFocusTimer && (
                    <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                      <span className="text-[11px] font-mono text-muted-foreground font-semibold">Duration:</span>
                      {[15, 25, 45, 60].map((mins) => (
                        <Button
                          key={mins}
                          type="button"
                          variant={editFocusDurationMinutes === mins ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEditFocusDurationMinutes(mins)}
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            editFocusDurationMinutes === mins
                              ? "bg-pps-orange text-foreground border border-pps-orange"
                              : "bg-surface border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {mins}m
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit Circadian Window */}
                <div className="p-3 bg-surface/50 border border-border/70 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-foreground flex items-center gap-1.5">
                      <span className="text-secondary">⏳</span>
                      <span>Circadian Window</span>
                    </span>
                    {(editWindowStart || editWindowEnd) && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setEditWindowStart("");
                          setEditWindowEnd("");
                        }}
                        className="text-[10px] text-destructive hover:underline cursor-pointer"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9.5px] font-mono text-muted-foreground">Start Time</label>
                      <input
                        type="time"
                        value={editWindowStart}
                        onChange={(e) => setEditWindowStart(e.target.value)}
                        className="w-full bg-surface border border-border/80 text-xs font-bold rounded-lg px-2 py-1 outline-none text-foreground mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[9.5px] font-mono text-muted-foreground">End Time</label>
                      <input
                        type="time"
                        value={editWindowEnd}
                        onChange={(e) => setEditWindowEnd(e.target.value)}
                        className="w-full bg-surface border border-border/80 text-xs font-bold rounded-lg px-2 py-1 outline-none text-foreground mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border/40">
                <Button
                  onClick={() => setEditHabit(null)}
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl hover:bg-surface"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="bg-primary text-primary-foreground font-extrabold px-5 py-2 rounded-xl hover:bg-primary/90 shadow-sm"
                >
                  Save Changes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HabitManagerSection;
