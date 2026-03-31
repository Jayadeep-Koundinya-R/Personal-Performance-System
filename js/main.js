/**
 * main.js
 * Central entry point. Wires all modules together.
 */

import { checkAuth } from './auth.js';
import { getData, saveData } from './storageService.js';
import { getState, updateState } from './state.js';
import { getTodayStr } from './utils.js';
import { initHabits, setupAddHabitButton, setupEditModal, renderHabits, closeEditModal } from './habits.js';
import { setupNavigation, handleHamburger, closeMobileSidebar } from './nav.js';
import { exportToPDF } from './app.js';
import { setupReflections, rfl_save, rfl_setMood, rfl_delete, rfl_render } from './reflection.js';
import { setupReminders, rem_save, rem_toggle, rem_delete, rem_render } from './reminder.js';
import {
    renderDashboard, renderDailyTracker, renderStreakSection,
    renderHabitSuccessRates, renderHeatmap, setupSettings,
    updateWeeklyChart, updateAllStats, setupDashboardFilter,
    setupAnalyticsFilter
} from './dashboard.js';
import { notif_requestPermission, notif_stop } from './notifications.js';
import { initTheme, bindThemeToggles } from './theme.js';
import { renderAchievements } from './achievements.js';
import { renderSocial } from './social.js';

document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth();
    if (!user) return;

    initHabits(user);
    setupNavigation();
    setupDashboardFilter();
    setupAnalyticsFilter();
    setupAddHabitButton();
    setupEditModal();
    setupSettings(user);
    setupReflections();
    setupReminders();

    const dateSetter = document.getElementById('appDateSetter');
    if (dateSetter) dateSetter.value = getTodayStr();

    _loadSettings(user);
    initTheme();
    bindThemeToggles();
    _renderAll();
    _updateGreeting(user);
});

document.addEventListener('habitsUpdated', () => {
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
    rfl_render();
    rem_render();

    if (document.getElementById('achievementsSection')?.classList.contains('active-section')) {
        renderAchievements();
    }
    if (document.getElementById('socialSection')?.classList.contains('active-section')) {
        renderSocial();
    }

    _updateDashboardExtras();
}

function _updateGreeting(user) {
    const el = document.getElementById('greetingDisplay');
    if (!el) return;

    const hour = new Date().getHours();
    let greet = 'Good Day';
    if (hour < 12) greet = 'Good Morning';
    else if (hour < 18) greet = 'Good Afternoon';
    else greet = 'Good Evening';

    const name = user.isGuest ? 'Guest' : user.email.split('@')[0];
    el.innerHTML = `${greet}, <span style="color:var(--accent);">${name}</span>! 👋`;
}

function _updateDashboardExtras() {
    const state = getState();
    const habits = state.habits || [];

    const categories = habits.reduce((acc, h) => {
        const cat = h.category || 'General';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});
    const bestCat = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const bestCatEl = document.getElementById('bestCategoryDisplay');
    if (bestCatEl) bestCatEl.textContent = bestCat;

    const totalHabEl = document.getElementById('totalHabitsDisplay');
    if (totalHabEl) totalHabEl.textContent = `${habits.length} tracked`;

    let totalDone = 0;
    habits.forEach(h => {
        if (h.completedDays) totalDone += Object.values(h.completedDays).filter(v => v === true).length;
    });
    const allDoneEl = document.getElementById('allTimeDoneDisplay');
    if (allDoneEl) allDoneEl.textContent = `${totalDone} completions`;
}

function _loadSettings(user) {
    const key = 'pps_prefs_' + (user.email || 'guest');
    const prefs = getData(key, {});
    const xpEl = document.getElementById('xpPerHabit');
    const freezeEl = document.getElementById('defaultFreeze');

    if (xpEl) xpEl.value = prefs.xpPerHabit ?? 10;
    if (freezeEl) freezeEl.value = prefs.defaultFreeze ?? 2;

    const savePrefs = () => {
        saveData(key, {
            xpPerHabit: parseInt(xpEl?.value || 10, 10) || 10,
            defaultFreeze: parseInt(freezeEl?.value || 2, 10) || 2
        });
    };

    xpEl?.addEventListener('change', savePrefs);
    freezeEl?.addEventListener('change', savePrefs);
}

window.toggleMobileSidebar = handleHamburger;
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

window.setTimeSetter = function(dateStr) {
    if (!dateStr) return;
    updateState({ selectedDate: dateStr });
    _renderAll();
};
