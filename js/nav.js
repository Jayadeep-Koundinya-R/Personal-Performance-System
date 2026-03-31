/**
 * nav.js
 * Sidebar navigation — section switching and mobile sidebar toggle.
 * All sidebar open/close logic lives here. app.js delegates to these.
 */

import {
    renderDashboard, renderDailyTracker, renderHabitSuccessRates,
    updateWeeklyChart, updateCompletionStats, renderHeatmap,
    renderStreakSection, updateProgressWidget
} from './dashboard.js';
import { renderHabits } from './habits.js';
import { rfl_render }   from './reflection.js';
import { rem_render }   from './reminder.js';

const MOBILE_BP = 768;

/* ─────────────────────────────────────
   SECTION NAVIGATION
───────────────────────────────────── */
export function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".section");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(n => n.classList.remove("active"));
            sections.forEach(s => s.classList.remove("active-section"));

            item.classList.add("active");

            const sectionId = item.dataset.section;
            const target    = document.getElementById(sectionId);
            if (target) target.classList.add("active-section");

            switch (sectionId) {
                case "dashboardSection":
                    renderDashboard();
                    break;
                case "dailyTrackerSection":
                    renderDailyTracker();
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
                    rfl_render();
                    break;
                case "habitManagerSection":
                    renderHabits();
                    break;
                case "reminderSection":
                    rem_render();
                    break;
            }

            if (window.innerWidth <= MOBILE_BP) closeMobileSidebar();
        });
    });
}

/* ─────────────────────────────────────
   MOBILE SIDEBAR
───────────────────────────────────── */
export function toggleMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    if (sidebar.classList.contains("open")) closeMobileSidebar();
    else                                    openMobileSidebar();
}

export function openMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (sidebar) sidebar.classList.add("open");
    if (overlay) overlay.classList.add("open");
    document.body.style.overflow = "hidden";
}

export function closeMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    document.body.style.overflow = "";
}

/* ─────────────────────────────────────
   DESKTOP SIDEBAR COLLAPSE
───────────────────────────────────── */
export function toggleDesktopSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    const collapsed = sidebar.classList.toggle("collapsed");
    import('./storageService.js').then(({ saveData }) => {
        saveData("pps_sidebar_collapsed", collapsed ? "1" : "0");
    });
}

/* ─────────────────────────────────────
   UNIFIED HAMBURGER HANDLER
   Called by both the sidebar-header button (desktop)
   and the floating mobile button.
───────────────────────────────────── */
export function handleHamburger() {
    if (window.innerWidth <= MOBILE_BP) toggleMobileSidebar();
    else                                toggleDesktopSidebar();
}

/* ─────────────────────────────────────
   DOM INIT
───────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
    // Restore desktop collapsed state
    const sidebar = document.getElementById("sidebar");
    if (sidebar && window.innerWidth > MOBILE_BP) {
        import('./storageService.js').then(({ getData }) => {
            if (getData("pps_sidebar_collapsed") === "1") {
                sidebar.classList.add("collapsed");
            }
        });
    }

    // Overlay tap closes sidebar
    const overlay = document.getElementById("sidebarOverlay");
    if (overlay) overlay.addEventListener("click", closeMobileSidebar);

    // ESC closes sidebar
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") closeMobileSidebar();
    });

    // Resize cleanup
    window.addEventListener("resize", () => {
        if (window.innerWidth > MOBILE_BP) {
            closeMobileSidebar();
            document.body.style.overflow = "";
        }
    });
});
