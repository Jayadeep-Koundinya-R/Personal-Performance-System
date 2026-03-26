/* ================= UTILS / PURE HELPERS ================= */
import { CONFIG } from './config.js';
import { getState } from './state.js';

/* ── Priority ── */
export function getPriorityColor(priority) {
    switch (priority) {
        case "High": return "#ef4444";
        case "Medium": return "#eab308";
        case "Low": return "#22c55e";
        default: return "#64748b";
    }
}

export const priorityOrder = { High: 1, Medium: 2, Low: 3, Optional: 4 };

/* ── Due-date generators ── */
export function generateInitialDueDate(period) {
    var d = new Date();
    if (period === "Weekly") d.setDate(d.getDate() + 7);
    if (period === "Monthly") d.setMonth(d.getMonth() + 1);
    return d.toISOString();
}

export function updateNextDueDate(habit) {
    var d = new Date(habit.dueDate);
    if (habit.period === "Daily") d.setDate(d.getDate() + 1);
    else if (habit.period === "Weekly") d.setDate(d.getDate() + 7);
    else if (habit.period === "Monthly") d.setMonth(d.getMonth() + 1);
    else return;          // "Today" — never advances
    habit.dueDate = d.toISOString();
}

/* ── XP / Level ── */
export let XP_PER = CONFIG.XP_PER_COMPLETION || 10;
export let LVL_XP = CONFIG.LEVEL_XP_THRESHOLD || 100;

export function calculateWeeklyPoints(habits) {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    var pts = 0;
    habits.forEach(function (h) {
        h.completedDates.forEach(function (ds) {
            if (new Date(ds) >= cutoff) pts += XP_PER;
        });
    });
    return pts;
}

export function calculateTotalXP(habits) {
    return habits.reduce(function (sum, h) {
        return sum + h.completedDates.length * XP_PER;
    }, 0);
}

export function calculateLevel(habits) {
    return Math.floor(calculateTotalXP(habits) / LVL_XP) + 1;
}

/* ── Date helpers ── */
export function getTodayStr() {
    return getState()?.selectedDate || new Date().toISOString().split("T")[0];
}

export function getToday() {
    var str = getTodayStr();
    var d = new Date(str + "T00:00:00");
    d.setHours(0, 0, 0, 0);
    return d;
}

export function formatDateDMY(isoStr) {
    if (!isoStr) return "—";
    return new Date(isoStr).toLocaleDateString("en-GB", {
        day: "2-digit", month: "2-digit", year: "numeric"
    });
}

/* ── DOM helpers ── */
export function setEl(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
}

export function setBar(id, pct, gradient) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.width = Math.min(pct, 100) + "%";
    if (gradient) el.style.background = gradient;
}