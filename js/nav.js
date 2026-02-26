/* ================= NAVIGATION ================= */

function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".section");

    navItems.forEach(item => {
        item.addEventListener("click", () => {

            // Remove active from all
            navItems.forEach(n => n.classList.remove("active"));
            sections.forEach(s => s.classList.remove("active-section"));

            // Set active
            item.classList.add("active");
            const sectionId = item.dataset.section;
            const target = document.getElementById(sectionId);
            if (target) target.classList.add("active-section");

            // ── Re-render the correct section on every visit ──
            // This is the professional pattern: each section renders
            // fresh data when you navigate to it, not just on load.
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
                    // THIS was the bug — never called on nav
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

                case "settingsSection":
                    // nothing dynamic to re-render
                    break;
            }
        });
    });
}