import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pin,
  CheckSquare,
  FileText,
  Copy,
  Trash2,
  Plus,
  Zap,
  Check,
  Bell,
  Clock,
  Sparkles,
  Edit2,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import { toast } from "sonner";
import { feedbackSounds } from "@/lib/audio/clickFeedback";
import { useReminders } from "@/hooks/use-reminders";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  convertedToHabit?: boolean;
  convertedToReminder?: boolean;
  reminderTime?: string;
}

interface StickyNotesWidgetProps {
  todayStr: string;
  onAddHabit?: (
    name: string,
    category: string,
    period: string,
    priority: string
  ) => Promise<string | null>;
}

export const StickyNotesWidget: React.FC<StickyNotesWidgetProps> = ({
  todayStr,
  onAddHabit,
}) => {
  const { addReminder } = useReminders();

  // Title state
  const [title, setTitle] = useState<string>(() => {
    try {
      return localStorage.getItem(`pps_sticky_title_${todayStr}`) || "To-Do List";
    } catch {
      return "To-Do List";
    }
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Mode state: text vs checklist
  const [mode, setMode] = useState<"checklist" | "text">(() => {
    try {
      return (localStorage.getItem(`pps_sticky_mode_${todayStr}`) as any) || "checklist";
    } catch {
      return "checklist";
    }
  });

  // Freeform text state
  const [noteText, setNoteText] = useState<string>(() => {
    try {
      return localStorage.getItem(`pps_daily_note_${todayStr}`) || "";
    } catch {
      return "";
    }
  });

  // Checklist items state
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(`pps_sticky_items_${todayStr}`);
      if (saved) return JSON.parse(saved);
      return [
        { id: "item-1", text: "Review today's high-priority sprint", done: false },
        { id: "item-2", text: "Drink 2L water & take short walking break", done: false },
      ];
    } catch {
      return [];
    }
  });

  const [newItemText, setNewItemText] = useState("");

  // Reminder Popover state
  const [reminderModalItem, setReminderModalItem] = useState<ChecklistItem | null>(null);
  const [selectedReminderTime, setSelectedReminderTime] = useState<string>("09:00");
  const [selectedRepeat, setSelectedRepeat] = useState<string>("One-time");

  // Persist Title
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    try {
      localStorage.setItem(`pps_sticky_title_${todayStr}`, newTitle);
    } catch {}
  };

  // Persist Mode
  const handleModeToggle = (nextMode: "checklist" | "text") => {
    setMode(nextMode);
    try {
      localStorage.setItem(`pps_sticky_mode_${todayStr}`, nextMode);
    } catch {}
  };

  // Persist Freeform Text
  const handleTextChange = (text: string) => {
    setNoteText(text);
    try {
      localStorage.setItem(`pps_daily_note_${todayStr}`, text);
    } catch {}
  };

  // Persist Checklist
  const saveItems = (updated: ChecklistItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(`pps_sticky_items_${todayStr}`, JSON.stringify(updated));
    } catch {}
  };

  // Add Item
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: newItemText.trim(),
      done: false,
    };
    saveItems([...items, newItem]);
    setNewItemText("");
    feedbackSounds.playClick();
  };

  // Toggle Item Completion
  const handleToggleItem = (id: string) => {
    const updated = items.map((it) => {
      if (it.id !== id) return it;
      const nextDone = !it.done;
      if (nextDone) {
        feedbackSounds.playSuccessChime();
      } else {
        feedbackSounds.playClick();
      }
      return { ...it, done: nextDone };
    });
    saveItems(updated);
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    saveItems(items.filter((it) => it.id !== id));
  };

  // Move Item Up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    saveItems(updated);
    feedbackSounds.playClick();
  };

  // Move Item Down
  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    saveItems(updated);
    feedbackSounds.playClick();
  };


  // 1-Click Convert to Active Today's Habit
  const handleConvertToHabit = async (item: ChecklistItem) => {
    if (!onAddHabit) return;
    try {
      const err = await onAddHabit(item.text, "General", "Today", "Medium");
      if (!err) {
        toast.success(`Converted "${item.text}" into Today's Habit! ⚡`, {
          description: "+10 XP attached. Added directly to your daily habit schedule!",
        });
        const updated = items.map((it) =>
          it.id === item.id ? { ...it, convertedToHabit: true, done: true } : it
        );
        saveItems(updated);
        feedbackSounds.playSuccessChime();
      } else {
        toast.error(err);
      }
    } catch {
      toast.error("Failed to convert item to habit");
    }
  };

  // Open Reminder Time Picker Modal
  const handleOpenReminderModal = (item: ChecklistItem) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setSelectedReminderTime(defaultTime);
    setSelectedRepeat("One-time");
    setReminderModalItem(item);
  };

  // Confirm Reminder Creation
  const handleConfirmReminder = async () => {
    if (!reminderModalItem) return;
    if (!selectedReminderTime) {
      toast.error("Please pick a time for the reminder!");
      return;
    }

    try {
      const err = await addReminder(
        reminderModalItem.text,
        selectedReminderTime,
        selectedRepeat,
        null,
        "in_app",
        "alarm"
      );

      if (err) {
        toast.error(err);
      } else {
        const [hh, mm] = selectedReminderTime.split(":").map(Number);
        const ampm = hh >= 12 ? "PM" : "AM";
        const h12 = hh % 12 || 12;
        const formatted = `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;

        toast.success(`Reminder set for ${formatted}! 🔔`, {
          description: `Alarm scheduled for "${reminderModalItem.text}".`,
        });

        const updated = items.map((it) =>
          it.id === reminderModalItem.id
            ? { ...it, convertedToReminder: true, reminderTime: formatted }
            : it
        );
        saveItems(updated);
        feedbackSounds.playSuccessChime();
        setReminderModalItem(null);
      }
    } catch {
      toast.error("Failed to schedule reminder");
    }
  };

  // Quick Preset Helper for Reminder Time
  const setQuickTime = (minsFromNow: number, repeatPattern: string = "One-time") => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minsFromNow);
    const t = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    setSelectedReminderTime(t);
    setSelectedRepeat(repeatPattern);
  };

  const setSpecificTime = (hours: number, mins: number, repeatPattern: string = "Daily") => {
    const t = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    setSelectedReminderTime(t);
    setSelectedRepeat(repeatPattern);
  };

  // Copy to Clipboard
  const handleCopy = () => {
    let content = "";
    if (mode === "checklist") {
      content = `${title.toUpperCase()}\n` + items.map((it) => `[${it.done ? "X" : " "}] ${it.text}`).join("\n");
    } else {
      content = `${title.toUpperCase()}\n${noteText}`;
    }

    navigator.clipboard.writeText(content);
    toast.success("Sticky note copied to clipboard! 📋");
  };

  // Clear Note
  const handleClear = () => {
    if (mode === "checklist") {
      saveItems([]);
    } else {
      handleTextChange("");
    }
    toast.info("Sticky note cleared 🧼");
  };

  // Determine if card is actively filled (to trigger dynamic highlighting)
  const isFilled = mode === "checklist" ? items.length > 0 : noteText.trim().length > 0;
  const completedCount = items.filter((it) => it.done).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 sm:p-5 transition-all duration-300 backdrop-blur-md relative overflow-hidden ${
        isFilled
          ? "bg-gradient-to-br from-card via-card to-amber-500/10 border-2 border-amber-500/50 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30"
          : "bg-card border border-border/80 shadow-xs"
      }`}
    >
      {/* Top Header Strip */}
      <div className="flex items-center justify-between gap-2 mb-3">
        {/* Editable Title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 flex-shrink-0">
            <Pin className="w-3.5 h-3.5" />
          </div>

          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
              className="px-2 py-0.5 bg-surface border border-amber-500 text-xs font-bold text-foreground rounded-lg outline-none max-w-[150px]"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-1.5 text-xs font-extrabold text-foreground hover:text-amber-500 transition-colors group cursor-pointer"
              title="Click to rename note (e.g. To-Do List, Study Sprint)"
            >
              <span className="truncate">{title}</span>
              <Edit2 className="w-3 h-3 text-muted-foreground group-hover:text-amber-500 opacity-70" />
            </button>
          )}

          {mode === "checklist" && items.length > 0 && (
            <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 px-1.5 py-0.2 rounded-md">
              {completedCount}/{items.length}
            </span>
          )}
        </div>

        {/* Action Controls & Mode Switcher */}
        <div className="flex items-center gap-1">
          {/* Mode Switcher */}
          <div className="flex items-center bg-surface border border-border/80 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => handleModeToggle("checklist")}
              className={`p-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                mode === "checklist"
                  ? "bg-amber-500 text-black shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Checklist View (with 1-click Habit & Reminder conversion)"
            >
              <CheckSquare className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleModeToggle("text")}
              className={`p-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                mode === "text"
                  ? "bg-amber-500 text-black shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Freeform Text View"
            >
              <FileText className="w-3 h-3" />
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-surface border border-border/80 hover:border-amber-500/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
            title="Copy Note to Clipboard"
          >
            <Copy className="w-3 h-3" />
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-surface border border-border/80 hover:border-destructive/40 text-muted-foreground hover:text-destructive transition-all cursor-pointer shadow-2xs"
            title="Clear Note"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      {mode === "checklist" ? (
        <div className="space-y-2">
          {/* Items List */}
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            <AnimatePresence>
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group flex items-center justify-between gap-2 p-2 rounded-xl border text-xs transition-all ${
                    item.done
                      ? "bg-surface/40 border-border/40 text-muted-foreground"
                      : "bg-surface/80 border-border/70 hover:border-amber-500/30 text-foreground"
                  }`}
                >
                  {/* Left: Reorder Up/Down + Checkbox + Text */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {/* Prominent Reorder Up / Down Controls */}
                    {items.length > 1 && (
                      <div className="flex flex-col -space-y-0.5 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className={`p-0.5 rounded hover:bg-amber-500/20 text-muted-foreground hover:text-amber-500 transition-all cursor-pointer ${
                            index === 0 ? "opacity-20 cursor-not-allowed pointer-events-none" : "hover:scale-110 active:scale-95"
                          }`}
                          title={index === 0 ? "Already at top" : "Move task up"}
                        >
                          <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === items.length - 1}
                          className={`p-0.5 rounded hover:bg-amber-500/20 text-muted-foreground hover:text-amber-500 transition-all cursor-pointer ${
                            index === items.length - 1 ? "opacity-20 cursor-not-allowed pointer-events-none" : "hover:scale-110 active:scale-95"
                          }`}
                          title={index === items.length - 1 ? "Already at bottom" : "Move task down"}
                        >
                          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    )}


                    <button
                      type="button"
                      onClick={() => handleToggleItem(item.id)}
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                        item.done
                          ? "bg-amber-500 border-amber-500 text-black"
                          : "border-border hover:border-amber-500 bg-surface"
                      }`}
                    >
                      {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                    <span
                      className={`truncate ${
                        item.done ? "line-through text-muted-foreground" : "font-medium"
                      }`}
                    >
                      {item.text}
                    </span>
                  </div>

                  {/* Micro Actions (Convert to Habit / Convert to Reminder / Delete) */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {/* +Habit Button */}
                    {!item.convertedToHabit && !item.done && onAddHabit && (
                      <button
                        type="button"
                        onClick={() => handleConvertToHabit(item)}
                        className="text-[10px] font-bold bg-amber-500/15 hover:bg-amber-500/30 text-amber-500 border border-amber-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 transition-all cursor-pointer"
                        title="Convert to Today's Habit (+10 XP)"
                      >
                        <Zap className="w-2.5 h-2.5 fill-amber-500" />
                        <span className="hidden sm:inline">+Habit</span>
                      </button>
                    )}

                    {/* +Reminder Button */}
                    {!item.convertedToReminder && !item.done && (
                      <button
                        type="button"
                        onClick={() => handleOpenReminderModal(item)}
                        className="text-[10px] font-bold bg-primary/15 hover:bg-primary/30 text-primary border border-primary/30 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 transition-all cursor-pointer"
                        title="Convert to Alarm / Reminder (Select Time)"
                      >
                        <Bell className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">+Remind</span>
                      </button>
                    )}

                    {/* Converted Badges */}
                    {item.convertedToHabit && (
                      <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                        ⚡ In Today
                      </span>
                    )}

                    {item.convertedToReminder && (
                      <button
                        type="button"
                        onClick={() => handleOpenReminderModal(item)}
                        className="text-[9px] font-mono font-bold text-primary bg-primary/15 border border-primary/30 px-1.5 py-0.5 rounded-md hover:bg-primary/25 cursor-pointer flex items-center gap-0.5"
                        title="Click to reschedule reminder"
                      >
                        <Bell className="w-2 h-2" />
                        <span>{item.reminderTime || "Alarm"}</span>
                      </button>
                    )}

                    {/* Delete Item */}
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
                      title="Delete Item"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>


            {items.length === 0 && (
              <div className="text-center py-3 text-muted-foreground text-xs font-medium">
                ✨ All items clear! Add a quick task below.
              </div>
            )}
          </div>

          {/* Quick Add Checklist Form */}
          <form onSubmit={handleAddItem} className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Add quick task or idea (Enter to save)..."
              className="flex-1 px-3 py-1.5 bg-surface/90 border border-border/80 focus:border-amber-500 text-xs text-foreground rounded-xl outline-none shadow-inner"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 flex-shrink-0 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>
        </div>
      ) : (
        /* Freeform Textarea */
        <div>
          <textarea
            value={noteText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Jot down quick thoughts, sprint goals, or ideas for today..."
            className="w-full bg-surface/90 border border-amber-500/20 rounded-xl p-3 text-xs outline-none focus:border-amber-500 resize-none h-28 leading-relaxed font-sans shadow-inner text-foreground"
          />
          <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1 font-mono">
            <span>{noteText.length} characters</span>
            <span>Auto-saved to today</span>
          </div>
        </div>
      )}

      {/* ── Modal / Popover: Schedule Reminder for Checklist Item (Rendered at Root via Portal) ── */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {reminderModalItem && (
              <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0 }}
                  className="bg-card border-2 border-primary/40 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 relative"
                >
                  {/* Modal Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-base shadow-xs">
                        🔔
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-foreground">Set Task Alarm</h3>
                        <p className="text-xs text-muted-foreground font-medium truncate max-w-[200px]">
                          "{reminderModalItem.text}"
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReminderModalItem(null)}
                      className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-surface cursor-pointer transition-colors"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Time Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                      Quick Presets:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickTime(15, "One-time")}
                        className="px-3 py-2 rounded-xl bg-surface border border-border/80 hover:border-primary/50 text-xs font-bold text-foreground hover:text-primary transition-all text-left flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                      >
                        <span>⚡ In 15 min</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickTime(60, "One-time")}
                        className="px-3 py-2 rounded-xl bg-surface border border-border/80 hover:border-primary/50 text-xs font-bold text-foreground hover:text-primary transition-all text-left flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                      >
                        <span>⏰ In 1 hour</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpecificTime(20, 0, "One-time")}
                        className="px-3 py-2 rounded-xl bg-surface border border-border/80 hover:border-primary/50 text-xs font-bold text-foreground hover:text-primary transition-all text-left flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                      >
                        <span>🌙 Tonight (8 PM)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpecificTime(9, 0, "Daily")}
                        className="px-3 py-2 rounded-xl bg-surface border border-border/80 hover:border-primary/50 text-xs font-bold text-foreground hover:text-primary transition-all text-left flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                      >
                        <span>☀️ Morning (9 AM)</span>
                      </button>
                    </div>
                  </div>

                  {/* Custom Time Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>Custom Alarm Time & Repeat:</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={selectedReminderTime}
                        onChange={(e) => setSelectedReminderTime(e.target.value)}
                        className="w-full px-3 py-2.5 bg-surface border border-border/80 focus:border-primary text-xs font-mono font-bold text-foreground rounded-xl outline-none"
                      />
                      <select
                        value={selectedRepeat}
                        onChange={(e) => setSelectedRepeat(e.target.value)}
                        className="w-full px-3 py-2.5 bg-surface border border-border/80 focus:border-primary text-xs font-bold text-foreground rounded-xl outline-none cursor-pointer"
                      >
                        <option value="One-time">One-time</option>
                        <option value="Daily">Daily</option>
                        <option value="Weekdays">Weekdays</option>
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons (Full Size & Clickable) */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => setReminderModalItem(null)}
                      className="px-4 py-2.5 rounded-xl bg-surface hover:bg-muted border border-border/80 text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReminder}
                      className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-98"
                    >
                      <Bell className="w-4 h-4" />
                      <span>Set Alarm</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </motion.div>
  );
};

