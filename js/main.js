/* ================= MAIN INITIALIZATION ================= */

document.addEventListener("DOMContentLoaded", () => {
    const user = checkAuth();
    if (!user) return;

    initHabits(user);
    setupNavigation();
    setupAddHabitButton();
    setupEditModal();
    setupSettings(user);

    renderHabits();
    renderDashboard();
    renderDailyTracker();
    renderStreakSection();
    renderHabitSuccessRates();
    renderHeatmap();
});