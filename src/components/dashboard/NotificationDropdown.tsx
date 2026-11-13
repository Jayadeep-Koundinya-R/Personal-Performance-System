import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X } from "lucide-react";

export interface Notification {
  id: string;
  type?: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  notifFilter: "all" | "unread";
  onFilterChange: (f: "all" | "unread") => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigateReminders: () => void;
  /** max height of the scrollable list area */
  maxListHeight?: string;
}

function getTypeColor(type?: string) {
  switch (type) {
    case "alarm": return "text-rose-400 bg-rose-500/15 border-rose-500/30";
    case "streak": return "text-amber-400 bg-amber-500/15 border-amber-500/30";
    case "levelup": return "text-purple-400 bg-purple-500/15 border-purple-500/30";
    case "achievement": return "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
    case "quest": return "text-indigo-400 bg-indigo-500/15 border-indigo-500/30";
    default: return "text-cyan-400 bg-cyan-500/15 border-cyan-500/30";
  }
}

function getTypeIcon(type?: string) {
  switch (type) {
    case "alarm": return "⏰";
    case "streak": return "🔥";
    case "levelup": return "👑";
    case "achievement": return "🏅";
    case "quest": return "⚔️";
    default: return "📋";
  }
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  notifFilter,
  onFilterChange,
  onMarkAllRead,
  onClearAll,
  onMarkRead,
  onDismiss,
  onNavigateReminders,
  maxListHeight = "max-h-80",
}) => {
  const filtered = notifications.filter((n) => notifFilter === "unread" ? !n.read : true);

  return (
    <>
      {/* Filter Ribbon */}
      <div className="px-3.5 py-2.5 border-b border-border/80 bg-surface/90 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-card p-0.5 rounded-xl border border-border/60">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={(e) => { e.stopPropagation(); onFilterChange(f); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                notifFilter === f
                  ? "bg-primary text-primary-foreground font-black shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{f === "all" ? `All (${notifications.length})` : "Unread"}</span>
              {f === "unread" && unreadCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkAllRead(); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface text-[11px] font-bold transition-colors cursor-pointer"
              title="Mark all as read"
            >
              ✓ Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onClearAll(); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-surface text-[11px] font-bold transition-colors cursor-pointer"
              title="Clear all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List or Empty State */}
      {filtered.length === 0 ? (
        <div className="px-6 py-10 text-center text-muted-foreground bg-card">
          <div className="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl shadow-inner">✨</div>
          <div className="text-xs font-bold text-foreground">
            {notifFilter === "unread" ? "All Caught Up!" : "Inbox is Empty"}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px] mx-auto leading-relaxed">
            {notifFilter === "unread"
              ? "You have completed all active habit alerts and streak reminders."
              : "Habit alerts, streak freezes, and milestone updates will appear here."}
          </p>
        </div>
      ) : (
        <div className={`${maxListHeight} overflow-y-auto p-2 space-y-1.5 bg-card`}>
          {filtered.slice(0, 15).map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={(e) => { e.stopPropagation(); onMarkRead(n.id); }}
              className={`p-3 rounded-2xl border transition-all cursor-pointer relative group flex items-start gap-3 ${
                !n.read
                  ? "bg-gradient-to-r from-primary/10 via-card to-card border-primary/40 shadow-xs"
                  : "bg-surface/40 border-border/50 hover:border-border hover:bg-surface/70"
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-surface border border-border/60 flex items-center justify-center text-sm flex-shrink-0 shadow-2xs mt-0.5">
                {getTypeIcon(n.type)}
              </div>
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[8.5px] font-mono uppercase font-black px-1.5 py-0.5 rounded-md border ${getTypeColor(n.type)}`}>
                    {n.type || "alert"}
                  </span>
                  <span className="text-xs font-bold text-foreground truncate">{n.title}</span>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse ml-auto" />}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug mt-1 line-clamp-2">{n.message}</div>
                <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-border/30 text-[9.5px] text-muted-foreground font-mono">
                  <span>{n.time}</span>
                  {!n.read && <span className="text-primary font-bold hover:underline">Click to mark read</span>}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDismiss(n.id); }}
                title="Dismiss"
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-surface transition-all cursor-pointer absolute top-2.5 right-2.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-3.5 py-2 border-t border-border/80 bg-surface/60 flex items-center justify-between text-[11px]">
        <button
          onClick={(e) => { e.stopPropagation(); onNavigateReminders(); }}
          className="text-muted-foreground hover:text-primary font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>🔔 Manage Alert Preferences →</span>
        </button>
      </div>
    </>
  );
};
