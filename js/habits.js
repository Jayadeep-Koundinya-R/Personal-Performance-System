/**
 * habits.js
 * Habit data management — CRUD, streak logic, daily reset, and the
 * Habit Manager UI renderer.
 *
 * ARCHITECTURE NOTE:
 * This module never imports from dashboard.js. When habit data changes,
 * it fires a "habitsUpdated" CustomEvent on document. dashboard.js and
 * any other UI module listen for that event and re-render themselves.
 * This breaks the circular dependency that existed before.
 */

import { getData, saveData } from './storageService.js';
import { getAppSettings } from './config.js';
import { getState, updateState } from './state.js';
import {
    generateInitialDueDate, updateNextDueDate,
    calculateWeeklyPoints, getLocalDateKey, getToday, getTodayStr, formatDateDMY
} from './utils.js';
import { showXpPop, showPerfectDayModal, checkStreakMilestone, showReflectionNudge } from './effects.js';

/* ── Notify all listeners that habit data has changed ── */
function notifyHabitsUpdated() {
    document.dispatchEvent(new CustomEvent("habitsUpdated"));
}

/* ─────────────────────────────────────
   INIT & SAVE
───────────────────────────────────── */
export function initHabits(user) {
    const storageKey  = `habits_${user.email || "guest"}`;
    const statsKey    = `stats_${user.email || "guest"}`;
    const loadedHabits = getData(storageKey, []);
    const loadedStats  = getData(statsKey, null);
    
    updateState({ habits: loadedHabits, storageKey, statsKey });
    
    // Merge loaded stats into state
    if (loadedStats) {
        const currentStats = getState().stats;
        updateState({ stats: { ...currentStats, ...loadedStats } });
    }
    
    dailyReset();
    return getState().habits;
}

export function saveHabits() {
    const { habits, storageKey } = getState();
    saveData(storageKey, habits);
}

export function saveStats() {
    const { stats, statsKey } = getState();
    if (statsKey) saveData(statsKey, stats);
}

/* ─────────────────────────────────────
   DAILY RESET
   Runs on every app open. Advances due dates that have passed and
   burns freeze credits (or resets streaks) for missed days.
───────────────────────────────────── */
function dailyReset() {
    const today   = getToday();
    const todayStr= getTodayStr();
    let   changed = false;
    let   statsChanged = false;
    const state = getState();
    const habits = state.habits;
    const stats = state.stats;

    // --- Login Streak Logic ---
    if (stats.lastLoginDate !== todayStr) {
        if (stats.lastLoginDate) {
            // Compare using local date strings to avoid timezone drift
            const lastDate = new Date(stats.lastLoginDate + 'T00:00:00');
            const todayDate = new Date(todayStr + 'T00:00:00');
            const diff = Math.round((todayDate - lastDate) / 864e5);
            if (diff === 1) stats.loginStreak++;
            else if (diff > 1) stats.loginStreak = 1;
        } else {
            stats.loginStreak = 1;
        }
        stats.lastLoginDate = todayStr;
        statsChanged = true;
    }

    habits.forEach(habit => {
        if (habit.period === "Today") {
            // Remove "Today Only" habits whose creation date has passed
            const dueDateStr = getLocalDateKey(habit.dueDate);
            if (dueDateStr < todayStr) {
                changed = true; // mark for removal below
                habit._expired = true;
            }
            return;
        }

        // Parse due date using local date key to avoid timezone shifts
        const dueDateStr = getLocalDateKey(habit.dueDate);
        const dueDate = new Date(dueDateStr + 'T00:00:00');

        if (dueDate < today) {
            const wasCompleted = habit.completedDates.includes(dueDateStr);

            if (!wasCompleted && habit.streak > 0) {
                if (habit.freezeCredits > 0) {
                    habit.freezeCredits--;
                    stats.totalCreditsUsed = (stats.totalCreditsUsed || 0) + 1;
                    statsChanged = true;
                }
                else {
                    habit.streak = 0;
                }
            }

            // Advance due date until it's >= today
            while (dueDate < today) {
                updateNextDueDate(habit);
                const newDueDateStr = getLocalDateKey(habit.dueDate);
                dueDate.setTime(new Date(newDueDateStr + 'T00:00:00').getTime());
            }
            changed = true;
        }
    });

    if (changed) {
        // Remove expired "Today Only" habits
        const cleaned = habits.filter(h => !h._expired);
        if (cleaned.length !== habits.length) {
            updateState({ habits: cleaned });
        }
        saveHabits();
    }
    if (statsChanged) {
        updateState({ stats });
        saveStats();
    }
}

/* ─────────────────────────────────────
   ADD HABIT
───────────────────────────────────── */
export function addHabit(name, category, period, priority, startDate) {
    const dueDate = startDate
        ? new Date(startDate + "T12:00:00").toISOString()
        : generateInitialDueDate(period);

    const newHabit = {
        id:                Date.now(),
        name,
        category:          category || "Uncategorized",
        priority,
        period,
        dueDate,
        completedDates:    [],
        streak:            0,
        lastCompletedDate: null,
        freezeCredits:     getAppSettings().maxFreezeCredits
    };

    const { habits } = getState();
    habits.push(newHabit);
    updateState({ habits });
    saveHabits();
    notifyHabitsUpdated();
    return newHabit;
}

/* ─────────────────────────────────────
   DELETE HABIT (with undo)
───────────────────────────────────── */
let _deletedHabit = null;
let _undoTimer = null;

export function deleteHabit(id) {
    const { habits } = getState();
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    // Stash for undo
    _deletedHabit = { habit, index: habits.indexOf(habit) };
    clearTimeout(_undoTimer);

    updateState({ habits: habits.filter(h => h.id !== id) });
    saveHabits();
    notifyHabitsUpdated();
    _showUndoToast(habit.name);

    // Auto-clear undo after 5 seconds
    _undoTimer = setTimeout(() => {
        _deletedHabit = null;
        _hideUndoToast();
    }, 5000);
}

function _showUndoToast(name) {
    let toast = document.getElementById('_pps_undo_toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = '_pps_undo_toast';
        toast.style.cssText = `
            position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
            background:var(--card); border:1px solid var(--border-bright);
            color:var(--text); padding:12px 20px; border-radius:12px;
            font-size:13px; font-weight:500; z-index:9999;
            display:flex; align-items:center; gap:14px;
            box-shadow:0 8px 32px rgba(0,0,0,0.4);
            animation: fadeUp .2s ease;
        `;
        document.body.appendChild(toast);
    }
    toast.innerHTML = `
        <span>"${name}" deleted</span>
        <button onclick="window._pps_undoDelete()" style="
            background:var(--accent-dim); color:var(--accent);
            border:1px solid var(--accent); border-radius:8px;
            padding:4px 12px; font-size:12px; font-weight:700; cursor:pointer;">
            Undo
        </button>
    `;
    toast.style.display = 'flex';
}

function _hideUndoToast() {
    const toast = document.getElementById('_pps_undo_toast');
    if (toast) toast.style.display = 'none';
}

// Exposed globally so the inline onclick can reach it
if (typeof window !== 'undefined') {
    window._pps_undoDelete = function () {
        if (!_deletedHabit) return;
        clearTimeout(_undoTimer);
        const { habits } = getState();
        const restored = [...habits];
        restored.splice(_deletedHabit.index, 0, _deletedHabit.habit);
        updateState({ habits: restored });
        saveHabits();
        notifyHabitsUpdated();
        _deletedHabit = null;
        _hideUndoToast();
    };
}

/* ─────────────────────────────────────
   IS HABIT DUE TODAY?
───────────────────────────────────── */
export function isHabitDueOn(habit, dateStr) {
    if (!habit.dueDate || !dateStr) return false;
    const dueStr = getLocalDateKey(habit.dueDate);
    return dueStr === dateStr;
}

export function isHabitDueToday(habit) {
    return isHabitDueOn(habit, getTodayStr());
}

/* ─────────────────────────────────────
   COMPLETION LOGIC
───────────────────────────────────── */
export function updateHabitCompletion(habit, isCompleted, anchorEl = null) {
    // Always use the global selected date, not real system clock
    const todayStr = getTodayStr();
    const prevStreak = habit.streak || 0;

    if (isCompleted) {
        if (!habit.completedDates.includes(todayStr))
            habit.completedDates.push(todayStr);

        if (habit.lastCompletedDate) {
            const diff = Math.round(
                (new Date(todayStr) - new Date(habit.lastCompletedDate)) / 864e5
            );
            if      (diff === 1) habit.streak++;
            else if (diff === 0) { /* same day — no change */ }
            else                 habit.streak = 1;
        } else {
            habit.streak = 1;
        }
        habit.lastCompletedDate = todayStr;

        // XP pop effect
        const { xpPerCompletion } = getAppSettings();
        showXpPop(anchorEl, xpPerCompletion);

        // Streak milestone check
        if (habit.streak > prevStreak) {
            checkStreakMilestone(habit.streak);
        }

    } else {
        habit.completedDates = habit.completedDates.filter(d => d !== todayStr);
        if (habit.completedDates.length > 0) {
            habit.completedDates.sort();
            habit.lastCompletedDate = habit.completedDates[habit.completedDates.length - 1];
            habit.streak = _calcStreakFromDates(habit.completedDates, habit.period);
        } else {
            habit.lastCompletedDate = null;
            habit.streak = 0;
        }
    }

    // --- Perfect Day Logic ---
    const state = getState();
    const stats = state.stats;
    const allHabits = state.habits;

    const dueToday = allHabits.filter(h => isHabitDueToday(h));
    const allDone = dueToday.length > 0 && dueToday.every(h => h.completedDates.includes(todayStr));

    if (!stats.perfectDays) stats.perfectDays = [];

    if (allDone && !stats.perfectDays.includes(todayStr)) {
        stats.perfectDays.push(todayStr);
        updateState({ stats });
        saveStats();
        // Fire perfect day celebration
        setTimeout(() => showPerfectDayModal(stats.streak || 0), 600);
    } else if (!allDone && stats.perfectDays.includes(todayStr)) {
        stats.perfectDays = stats.perfectDays.filter(d => d !== todayStr);
        updateState({ stats });
        saveStats();
    }

    // Gentle reflection nudge after first completion of the day
    if (isCompleted) {
        const doneToday = allHabits.filter(h => h.completedDates.includes(todayStr));
        if (doneToday.length === 1 && !allDone) {
            showReflectionNudge();
        }
    }

    saveHabits();
    notifyHabitsUpdated();
}

function _calcStreakFromDates(dates, period = 'Daily') {
    if (!dates || !dates.length) return 0;
    const sorted = [...dates].sort().reverse();
    let streak = 1;

    // Expected gap in days between consecutive completions per period
    const expectedGap = period === 'Weekly' ? 7 : period === 'Monthly' ? 30 : 1;
    // Allow ±1 day tolerance for weekly/monthly to handle month-length variation
    const tolerance = period === 'Daily' ? 0 : 2;

    for (let i = 0; i < sorted.length - 1; i++) {
        const diff = Math.round((new Date(sorted[i]) - new Date(sorted[i + 1])) / 864e5);
        if (diff >= expectedGap - tolerance && diff <= expectedGap + tolerance) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

/* ─────────────────────────────────────
   RENDER HABIT LIST (Habit Manager)
───────────────────────────────────── */
export function renderHabits() {
    const habitList  = document.getElementById("habitList");
    const habitCount = document.getElementById("habitCount");
    if (!habitList) return;

    const { habits } = getState();
    if (habitCount) habitCount.textContent = habits.length;

    if (habits.length === 0) {
        habitList.innerHTML = `<p class="empty-text">No habits yet — add one above.</p>`;
        return;
    }

    habitList.innerHTML = "";
    habits.forEach((habit, idx) => {
        const card = document.createElement("div");
        card.className = "habit-card";
        card.setAttribute("draggable", "true");
        card.dataset.idx = idx;

        const priClass = {
            High: "pri-high", Medium: "pri-medium",
            Low:  "pri-low",  Optional: "pri-optional"
        }[habit.priority] || "pri-optional";

        card.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                <span class="drag-handle" title="Drag to reorder" style="cursor:grab;color:var(--muted);font-size:16px;flex-shrink:0;">⠿</span>
                <div class="habit-info">
                    <h4>${habit.name}</h4>
                    <div class="habit-meta">
                        ${habit.category}
                        &nbsp;•&nbsp; ${habit.period}
                        &nbsp;•&nbsp; Next due: ${formatDateDMY(habit.dueDate)}
                        &nbsp;•&nbsp; 🔥 ${habit.streak} streak
                    </div>
                </div>
            </div>
            <div class="habit-actions">
                <span class="pri-badge ${priClass}">${habit.priority}</span>
                <button class="ghost-btn edit-btn"   data-id="${habit.id}">Edit</button>
                <button class="danger-btn delete-btn" data-id="${habit.id}" aria-label="Delete habit ${habit.name}">Delete</button>
            </div>`;

        card.querySelector(".delete-btn").addEventListener("click", () => {
            deleteHabit(habit.id);
            renderHabits();
        });

        card.querySelector(".edit-btn").addEventListener("click", () => {
            openEditModal(habit);
        });

        // Drag-to-reorder
        card.addEventListener("dragstart", e => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", idx);
            card.style.opacity = "0.4";
        });
        card.addEventListener("dragend", () => { card.style.opacity = ""; });
        card.addEventListener("dragover", e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            card.style.borderTop = "2px solid var(--accent)";
        });
        card.addEventListener("dragleave", () => { card.style.borderTop = ""; });
        card.addEventListener("drop", e => {
            e.preventDefault();
            card.style.borderTop = "";
            const fromIdx = Number(e.dataTransfer.getData("text/plain"));
            const toIdx = idx;
            if (fromIdx === toIdx) return;
            const { habits: h } = getState();
            const reordered = [...h];
            const [moved] = reordered.splice(fromIdx, 1);
            reordered.splice(toIdx, 0, moved);
            updateState({ habits: reordered });
            saveHabits();
            renderHabits();
        });

        habitList.appendChild(card);
    });

    // Update weekly points wherever it's displayed
    document.querySelectorAll("#weeklyPoints").forEach(el => {
        el.textContent = calculateWeeklyPoints(habits);
    });
}

/* ─────────────────────────────────────
   EDIT MODAL
───────────────────────────────────── */
export function openEditModal(habit) {
    document.getElementById("editHabitId").value       = habit.id;
    document.getElementById("editHabitName").value     = habit.name;
    document.getElementById("editHabitCategory").value = habit.category;
    document.getElementById("editHabitPeriod").value   = habit.period;

    const dueDateInput = habit.dueDate
        ? getLocalDateKey(habit.dueDate)
        : "";
    document.getElementById("editHabitDate").value = dueDateInput;

    document.querySelectorAll('input[name="editPriority"]').forEach(r => {
        r.checked = r.value === habit.priority;
    });

    document.getElementById("editModal").classList.add("open");
}

export function closeEditModal() {
    document.getElementById("editModal").classList.remove("open");
}

export function setupEditModal() {
    document.getElementById("editModalClose")
        ?.addEventListener("click", closeEditModal);

    document.getElementById("editModal")
        ?.addEventListener("click", function (e) {
            if (e.target === this) closeEditModal();
        });

    document.getElementById("saveEditBtn")
        ?.addEventListener("click", () => {
            const id       = parseInt(document.getElementById("editHabitId").value);
            const name     = document.getElementById("editHabitName").value.trim();
            const category = document.getElementById("editHabitCategory").value.trim();
            const period   = document.getElementById("editHabitPeriod").value;
            const dateVal  = document.getElementById("editHabitDate").value;
            const priority = document.querySelector('input[name="editPriority"]:checked')?.value || "Optional";

            if (!name) { alert("Habit name is required."); return; }

            const { habits } = getState();
            const habit = habits.find(h => h.id === id);
            if (!habit) return;

            habit.name     = name;
            habit.category = category || "Uncategorized";
            habit.period   = period;
            habit.priority = priority;
            if (dateVal) habit.dueDate = new Date(dateVal + "T12:00:00").toISOString();

            saveHabits();
            renderHabits();
            notifyHabitsUpdated();
            closeEditModal();
        });
}

/* ─────────────────────────────────────
   ADD HABIT BUTTON
───────────────────────────────────── */
export function setupAddHabitButton() {
    const btn = document.getElementById("addHabitBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
        const name      = document.getElementById("habitName")?.value.trim();
        const category  = document.getElementById("habitCategory")?.value.trim();
        const period    = document.getElementById("habitPeriod")?.value || "Daily";
        const priority  = document.querySelector('input[name="priority"]:checked')?.value || "Optional";
        const startDate = document.getElementById("habitStartDate")?.value || null;

        const errorEl = document.getElementById("habitError");
        if (!name) { if (errorEl) errorEl.style.display = "block"; return; }
        if (errorEl) errorEl.style.display = "none";

        addHabit(name, category, period, priority, startDate);
        renderHabits();

        // Reset form
        document.getElementById("habitName").value     = "";
        document.getElementById("habitCategory").value = "";
        document.getElementById("habitPeriod").value   = "Daily";
        const sd = document.getElementById("habitStartDate");
        if (sd) sd.value = "";
        const hr = document.querySelector('input[name="priority"][value="High"]');
        if (hr) hr.checked = true;
    });
}
