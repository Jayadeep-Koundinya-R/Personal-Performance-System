/**
 * utils.js
 * Pure helper functions — no DOM, no side-effects, no imports from app modules.
 * Safe to import from anywhere without creating circular dependencies.
 */

import { CONFIG, getAppSettings } from './config.js';
import { getState } from './state.js';

export function getLocalDateKey(dateLike = new Date()) {
    const date = dateLike instanceof Date ? new Date(dateLike) : new Date(dateLike);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/* ── Priority ── */
export function getPriorityColor(priority) {
    const map = { High: "#ef4444", Medium: "#eab308", Low: "#22c55e" };
    return map[priority] || "#64748b";
}

export const priorityOrder = { High: 1, Medium: 2, Low: 3, Optional: 4 };

/* ── Due-date generators ── */
export function generateInitialDueDate(period) {
    // Use the global selected date as the base for new habit due dates
    var d = getToday();
    if (period === "Weekly") d.setDate(d.getDate() + 7);
    if (period === "Monthly") d.setMonth(d.getMonth() + 1);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
}

export function updateNextDueDate(habit) {
    const d = new Date(habit.dueDate);
    if      (habit.period === "Daily")   d.setDate(d.getDate() + 1);
    else if (habit.period === "Weekly")  d.setDate(d.getDate() + 7);
    else if (habit.period === "Monthly") d.setMonth(d.getMonth() + 1);
    else return;   // "Today" — never advances
    d.setHours(12, 0, 0, 0);
    habit.dueDate = d.toISOString();
}

/* ── XP / Level ── */
export function calculateTotalXP(habits) {
    const xpPer = getAppSettings().xpPerCompletion || CONFIG.XP_PER_COMPLETION || 10;
    return habits.reduce((sum, h) => sum + h.completedDates.length * xpPer, 0);
}

export function calculateLevel(habits) {
    const levelXp = CONFIG.LEVEL_XP_THRESHOLD || 100;
    return Math.floor(calculateTotalXP(habits) / levelXp) + 1;
}

export function calculateWeeklyPoints(habits) {
    const xpPer = getAppSettings().xpPerCompletion || CONFIG.XP_PER_COMPLETION || 10;
    // Use global date so the weekly window respects the Time Setter
    var cutoff = getToday();
    cutoff.setDate(cutoff.getDate() - 7);
    var pts = 0;
    habits.forEach(function (h) {
        h.completedDates.forEach(function (ds) {
            if (new Date(ds) >= cutoff) pts += xpPer;
        });
    });
    return pts;
}

/* ── Date helpers ── */

/** Returns the currently "selected" date string (YYYY-MM-DD).
 *  Defaults to today unless the user has picked a different date. */
export function getTodayStr() {
    return getState()?.selectedDate || getLocalDateKey(new Date());
}

/** Returns a Date object at midnight for the selected date. */
export function getToday() {
    const d = new Date(getTodayStr() + "T00:00:00");
    d.setHours(0, 0, 0, 0);
    return d;
}

export function formatDateDMY(isoStr) {
    if (!isoStr) return "—";
    return new Date(isoStr).toLocaleDateString("en-GB", {
        day: "2-digit", month: "2-digit", year: "numeric"
    });
}

export function isDateWithinRange(isoDateStr, start, end) {
    if (!isoDateStr) return false;
    const d = new Date(isoDateStr + "T00:00:00");
    d.setHours(0, 0, 0, 0);
    return d >= start && d <= end;
}

/* ── DOM helpers ── */
export function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

export function setBar(id, pct, gradient) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = Math.min(pct, 100) + "%";
    if (gradient) el.style.background = gradient;
}
