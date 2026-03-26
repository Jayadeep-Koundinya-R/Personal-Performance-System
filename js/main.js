/* ================= MAIN ENTRY MODULE =================
   This file acts as the central conductor for the entire SPA,
   wiring together decoupled ES Modules.
   ======================================================= */

import { CONFIG } from './config.js';
import { state, updateState, getState } from './state.js';
import { getTodayStr, calculateWeeklyPoints } from './utils.js';
import { checkAuth } from './auth.js';
import { getData, saveData } from './storageService.js';
import {
    initHabits, setupAddHabitButton, setupEditModal,
    renderHabits, closeEditModal
} from './habits.js';
import { setupNavigation } from './nav.js';
import { exportToPDF, toggleMobileSidebar, closeMobileSidebar } from './app.js';
import { setupReflections, rfl_save, rfl_setMood, rfl_delete } from './reflection.js';
import { setupReminders, rem_save, rem_toggle, rem_delete } from './reminder.js';
import { renderDashboard, renderHabitSuccessRates, renderHeatmap, setupSettings, renderDailyTracker, renderStreakSection } from './dashboard.js';
import { notif_requestPermission, notif_stop } from './notifications.js';

document.addEventListener("DOMContentLoaded", function () {
    /* 1 ── Auth guard */
    const user = checkAuth();
    if (!user) return;

    /* 2 ── Core data */
    initHabits(user);

    /* 3 ── UI wiring */
    const dateSetter = document.getElementById("appDateSetter");
    if (dateSetter) dateSetter.value = getTodayStr();
    setupNavigation();
    setupAddHabitButton();
    setupEditModal();
    setupSettings(user);

    /* 4 ── Section-specific inits */
    if (typeof setupReflections === "function") setupReflections();
    if (typeof setupReminders === "function") setupReminders();

    /* 5 ── Initial renders */
    renderHabits();
    renderDashboard();
    renderDailyTracker();
    renderStreakSection();
    renderHabitSuccessRates();
    renderHeatmap();

    /* 6 ── Load persisted settings */
    loadSettings(user);
});

/* ── Load + apply persisted preference values into settings UI ── */
function loadSettings(user) {
    const key = "pps_prefs_" + (user.email || "guest");
    let prefs = getData(key, {});

    const xpEl = document.getElementById("xpPerHabit");
    const freezeEl = document.getElementById("defaultFreeze");

    if (xpEl) xpEl.value = prefs.xpPerHabit != null ? prefs.xpPerHabit : 10;
    if (freezeEl) freezeEl.value = prefs.defaultFreeze != null ? prefs.defaultFreeze : 2;

    function savePrefs() {
        const newPrefs = {
            xpPerHabit: parseInt(xpEl ? xpEl.value : 10) || 10,
            defaultFreeze: parseInt(freezeEl ? freezeEl.value : 2) || 2
        };
        saveData(key, newPrefs);
    }

    if (xpEl) xpEl.addEventListener("change", savePrefs);
    if (freezeEl) freezeEl.addEventListener("change", savePrefs);
}

/* =====================================================================
 * HTML EVENT HANDLERS
 * Attaching strictly the functions used in dashboard.html inline attributes 
 * to the global window object. This fixes the broken UI buttons because 
 * ES Modules do not automatically expose local functions.
 * ===================================================================== */
window.toggleMobileSidebar = toggleMobileSidebar;
window.closeMobileSidebar = closeMobileSidebar;
window.renderHeatmap = renderHeatmap;
window.rfl_setMood = rfl_setMood;
window.rfl_save = rfl_save;
window.rfl_delete = rfl_delete;
window.notif_requestPermission = notif_requestPermission;
window.notif_stop = notif_stop;
window.rem_save = rem_save;
window.rem_toggle = rem_toggle;
window.rem_delete = rem_delete;
window.closeEditModal = closeEditModal;
window.exportToPDF = exportToPDF;

// Time setter global window binding
window.setTimeSetter = function(dateStr) {
    if (!dateStr) return;
    updateState({ selectedDate: dateStr });
    
    if (typeof renderDashboard === "function") renderDashboard();
    if (typeof renderDailyTracker === "function") renderDailyTracker();
    if (typeof renderHabits === "function") renderHabits();
};