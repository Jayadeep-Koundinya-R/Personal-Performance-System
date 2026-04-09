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
import { initTasks, renderTasks } from './tasks.js';
import {
    renderDashboard, renderDailyTracker, renderStreakSection,
    renderHabitSuccessRates, renderHeatmap, setupSettings,
    updateWeeklyChart, updateAllStats, setupDashboardFilter,
    setupAnalyticsFilter
} from './dashboard.js';
import { notif_requestPermission, notif_startChecker, notif_stop } from './notifications.js';
import { initTheme, bindThemeToggles } from './theme.js';
import { renderAchievements } from './achievements.js';
import { renderSocial } from './social.js';

const QUOTES = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { text: "Small acts, when multiplied by millions of people, can transform the world.", author: "Howard Zinn" },
    { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
    { text: "Your net worth is your network.", author: "Porter Gale" },
    { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
    { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
    { text: "The vision that you glorify in your mind... this you will at last build your life by.", author: "James Allen" }
];

document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth();
    if (!user) return;

    // Fix Greeting Flash: Update immediately as the first action
    _updateGreeting(user);
    _initDailyQuote();

    initHabits(user);
    setupNavigation();
    setupDashboardFilter();
    setupAnalyticsFilter();
    setupAddHabitButton();
    setupEditModal();
    setupSettings(user);
    setupReflections();
    initTasks(user);
    setupReminders();
    notif_startChecker();

    const dateSetter = document.getElementById('appDateSetter');
    if (dateSetter) dateSetter.value = getTodayStr();

    initTheme();
    bindThemeToggles();
    _renderAll();
});

document.addEventListener('habitsUpdated', () => _renderAll());
document.addEventListener('remindersUpdated', () => _renderAll());
document.addEventListener('notificationAlertsUpdated', () => _renderAll());
document.addEventListener('tasksUpdated', () => _renderAll());

function _renderAll() {
    renderDashboard();
    renderDailyTracker();
    renderStreakSection();
    renderHabitSuccessRates();
    renderHeatmap();
    renderHabits();
    renderTasks();
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

    const storedName = !user.isGuest && user.email
        ? getData(`pps_name_${user.email}`, '')
        : getData('pps_name_guest', '');
    const displayName = user.isGuest
        ? (storedName || 'Apex Performer')
        : (storedName || user.name || user.email.split('@')[0]);
    el.innerHTML = `${greet}, <span style="color:var(--accent);">${displayName}</span>! 👋`;
}

function _updateDashboardExtras() {
    const state = getState();
    const habits = state.habits || [];

    const categories = habits.reduce((acc, h) => {
        const cat = h.category || 'General';
        const count = (h.completedDates || []).length;
        acc[cat] = (acc[cat] || 0) + count;
        return acc;
    }, {});
    const bestCat = Object.entries(categories)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const bestCatEl = document.getElementById('bestCategoryDisplay');
    if (bestCatEl) bestCatEl.textContent = bestCat;

    const totalHabEl = document.getElementById('totalHabitsDisplay');
    if (totalHabEl) totalHabEl.textContent = `${habits.length} tracked`;

    let totalDone = 0;
    habits.forEach(h => {
        totalDone += (h.completedDates || []).length;
    });
    const allDoneEl = document.getElementById('allTimeDoneDisplay');
    if (allDoneEl) allDoneEl.textContent = `${totalDone} completions`;
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

function _initDailyQuote() {
    const dateIndex = new Date().getDate();
    const quote = QUOTES[dateIndex % QUOTES.length];

    const textEl = document.getElementById('quoteText');
    const authEl = document.getElementById('quoteAuthor');
    if (textEl) textEl.textContent = `"${quote.text}"`;
    if (authEl) authEl.textContent = `— ${quote.author}`;
}

window.setTimeSetter = function(dateStr) {
    if (!dateStr || dateStr.length < 10) return;
    const testDate = new Date(dateStr);
    if (isNaN(testDate.getTime())) return;
    
    updateState({ selectedDate: dateStr });
    _renderAll();
};

window.updateDashboardExtras = _updateDashboardExtras;
