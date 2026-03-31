/**
 * main.js
 * Central entry point. Wires all modules together.
 *
 * Data flow:
 *   User action → habits.js mutates state + fires "habitsUpdated"
 *   → main.js listener calls all render functions
 *   → UI updates
 *
 * This one-way flow eliminates circular dependencies.
 */

import { checkAuth }                                    from './auth.js';
import { getData, saveData }                            from './storageService.js';
import { updateState }                                  from './state.js';
import { getTodayStr }                                  from './utils.js';
import { initHabits, setupAddHabitButton, setupEditModal, renderHabits, closeEditModal } from './habits.js';
import { setupNavigation, handleHamburger, closeMobileSidebar } from './nav.js';
import { exportToPDF }                                  from './app.js';
import { setupReflections, rfl_save, rfl_setMood, rfl_delete } from './reflection.js';
import { setupReminders, rem_save, rem_toggle, rem_delete }     from './reminder.js';
import {
    renderDashboard, renderDailyTracker, renderStreakSection,
    renderHabitSuccessRates, renderHeatmap, setupSettings,
    updateWeeklyChart, updateAllStats, setupDashboardFilter,
    setupAnalyticsFilter
} from './dashboard.js';
import { notif_requestPermission, notif_stop } from './notifications.js';

/* ─────────────────────────────────────
   BOOT
───────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Auth guard
    const user = checkAuth();
    if (!user) return;

    // 2. Load habit data into state
    initHabits(user);

    // 3. Wire navigation + sidebar
    setupNavigation();

    // 4. Wire filter dropdowns
    setupDashboardFilter();
    setupAnalyticsFilter();

    // 5. Wire habit form
    setupAddHabitButton();
    setupEditModal();

    // 6. Wire settings panel
    setupSettings(user);

    // 7. Wire reflection + reminder modules
    setupReflections();
    setupReminders();

    // 8. Set date picker to today
    const dateSetter = document.getElementById("appDateSetter");
    if (dateSetter) dateSetter.value = getTodayStr();

    // 9. Load persisted preferences
    _loadSettings(user);

    // 10. Initial full render
    _renderAll();
});

/* ─────────────────────────────────────
   HABITS UPDATED — single listener
   habits.js fires this whenever data changes.
   We re-render everything from here.
───────────────────────────────────── */
document.addEventListener("habitsUpdated", () => {
    _renderAll();
});

function _renderAll() {
    renderDashboard();
    renderDailyTracker();
    renderStreakSection();
    renderHabitSuccessRates();
    renderHeatmap();
    renderHabits();
    updateAllStats();
}

/* ─────────────────────────────────────
   PERSISTED PREFERENCES
───────────────────────────────────── */
function _loadSettings(user) {
    const key     = "pps_prefs_" + (user.email || "guest");
    const prefs   = getData(key, {});
    const xpEl    = document.getElementById("xpPerHabit");
    const freezeEl = document.getElementById("defaultFreeze");

    if (xpEl)    xpEl.value    = prefs.xpPerHabit    ?? 10;
    if (freezeEl) freezeEl.value = prefs.defaultFreeze ?? 2;

    const savePrefs = () => {
        saveData(key, {
            xpPerHabit:    parseInt(xpEl?.value    || 10) || 10,
            defaultFreeze: parseInt(freezeEl?.value || 2)  || 2
        });
    };

    xpEl?.addEventListener("change",    savePrefs);
    freezeEl?.addEventListener("change", savePrefs);
}

/* ─────────────────────────────────────
   GLOBAL WINDOW BINDINGS
   ES Modules don't expose to global scope.
   HTML inline handlers (onclick="...") need these.
───────────────────────────────────── */
window.toggleMobileSidebar    = handleHamburger;
window.closeMobileSidebar     = closeMobileSidebar;
window.renderHeatmap          = renderHeatmap;
window.rfl_setMood            = rfl_setMood;
window.rfl_save               = rfl_save;
window.rfl_delete             = rfl_delete;
window.notif_requestPermission = notif_requestPermission;
window.notif_stop             = notif_stop;
window.rem_save               = rem_save;
window.rem_toggle             = rem_toggle;
window.rem_delete             = rem_delete;
window.closeEditModal         = closeEditModal;
window.exportToPDF            = exportToPDF;

window.setTimeSetter = (dateStr) => {
    if (!dateStr) return;
    updateState({ selectedDate: dateStr });
    _renderAll();
};
