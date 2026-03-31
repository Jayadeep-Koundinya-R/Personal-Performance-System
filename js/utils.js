/**
 * utils.js
 * Pure helper functions — no DOM, no side-effects, no imports from app modules.
 * Safe to import from anywhere without creating circular dependencies.
 */

import { CONFIG } from './config.js';
import { getState } from './state.js';

/* ── Priority ── */
export function getPriorityColor(priority) {
    const map = { High: "#ef4444", Medium: "#eab308", Low: "#22c55e" };
    return map[priority] || "#64748b";
}

export const priorityOrder = { High: 1, Medium: 2, Low: 3, Optional: 4 };

/* ── Due-date generators ── */
export function generateInitialDueDate(period) {
    const d = new Date();
    if (period === "Weekly")  d.setDate(d.getDate() + 7);
    if (period === "Monthly") d.setMonth(d.getMonth() + 1);
    return d.toISOString();
}

export function updateNextDueDate(habit) {
    const d = new Date(habit.dueDate);
    if      (habit.period === "Daily")   d.setDate(d.getDate() + 1);
    else if (habit.period === "Weekly")  d.setDate(d.getDate() + 7);
    else if (habit.period === "Monthly") d.setMonth(d.getMonth() + 1);
    else return;   // "Today" — never advances
    habit.dueDate = d.toISOString();
}

/* ── XP / Level ── */
const XP_PER = CONFIG.XP_PER_COMPLETION  || 10;
const LVL_XP = CONFIG.LEVEL_XP_THRESHOLD || 100;

export function calculateTotalXP(habits) {
    return habits.reduce((sum, h) => sum + h.completedDates.length * XP_PER, 0);
}

export function calculateLevel(habits) {
    return Math.floor(calculateTotalXP(habits) / LVL_XP) + 1;
}

export function calculateWeeklyPoints(habits) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    let pts = 0;
    habits.forEach(h => {
        h.completedDates.forEach(ds => {
            if (new Date(ds) >= cutoff) pts += XP_PER;
        });
    });
    return pts;
}

/* ── Date helpers ── */

/** Returns the currently "selected" date string (YYYY-MM-DD).
 *  Defaults to today unless the user has picked a different date. */
export function getTodayStr() {
    return getState()?.selectedDate || new Date().toISOString().split("T")[0];
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
