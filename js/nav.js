import { renderDashboard, renderDailyTracker, renderHabitSuccessRates, updateWeeklyChart, updateCompletionStats, renderHeatmap, renderStreakSection } from './dashboard.js';
import { renderHabits } from './habits.js';
import { rfl_render } from './reflection.js';
import { rem_render } from './reminder.js';

/* ================= NAVIGATION =================
   FIX: your friend's nav.js called rfl_render() / rem_render()
   (inline-script names) but reflection.js / reminder.js define
   renderReflections() / renderReminders().  Unified here.
   ================================================ */

export function setupNavigation() {
    var navItems = document.querySelectorAll(".nav-item");
    var sections = document.querySelectorAll(".section");

    navItems.forEach(function (item) {
        item.addEventListener("click", function () {

            navItems.forEach(function (n) { n.classList.remove("active"); });
            sections.forEach(function (s) { s.classList.remove("active-section"); });

            item.classList.add("active");

            var sectionId = item.dataset.section;
            var target    = document.getElementById(sectionId);
            if (target) target.classList.add("active-section");

            /* Re-render section on every visit — fresh data guaranteed */
            switch (sectionId) {

                case "dashboardSection":
                    renderDashboard();
                    break;

                case "dailyTrackerSection":
                    renderDailyTracker();
                    updateProgressWidget();
                    break;

                case "analyticsSection":
                    renderHabitSuccessRates();
                    updateWeeklyChart();
                    updateCompletionStats();
                    renderHeatmap();
                    break;

                case "streakSection":
                    renderStreakSection();
                    updateCompletionStats();
                    break;

                case "reflectionSection":
                    if (typeof rfl_render === "function") rfl_render();
                    break;

                case "habitManagerSection":
                    renderHabits();
                    break;

                case "reminderSection":
                    if (typeof rem_render === "function") rem_render();
                    break;

                case "settingsSection":
                    /* nothing dynamic */
                    break;
            }

            /* Close mobile sidebar after navigation */
            if (window.innerWidth <= 768) closeMobileSidebar();
        });
    });
}

/* ── Mobile sidebar ── */
export function toggleMobileSidebar() {
    var sidebar = document.getElementById("sidebar");
    var overlay = document.getElementById("sidebarOverlay");
    if (!sidebar || !overlay) return;
    var isOpen = sidebar.classList.contains("open");
    if (isOpen) closeMobileSidebar();
    else        openMobileSidebar();
}

export function openMobileSidebar() {
    var sidebar = document.getElementById("sidebar");
    var overlay = document.getElementById("sidebarOverlay");
    if (sidebar) sidebar.classList.add("open");
    if (overlay) overlay.classList.add("open");
    document.body.style.overflow = "hidden";
}

export function closeMobileSidebar() {
    var sidebar = document.getElementById("sidebar");
    var overlay = document.getElementById("sidebarOverlay");
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    document.body.style.overflow = "";
}

/* Close on overlay tap */
document.addEventListener("DOMContentLoaded", function () {
    var overlay = document.getElementById("sidebarOverlay");
    if (overlay) overlay.addEventListener("click", closeMobileSidebar);

    /* Close on ESC */
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeMobileSidebar();
    });

    /* Close when viewport widens past mobile breakpoint */
    window.addEventListener("resize", function () {
        if (window.innerWidth > 768) closeMobileSidebar();
    });
});