/* ================= MAIN INITIALIZATION ================= */

document.addEventListener("DOMContentLoaded", () => {
    const user = checkAuth();
    if(!user) return;

    initHabits(user);
    setupNavigation();
    setupAddHabitButton();
    setupEditModal();
    setupSettings(user);
    setupReflections(user);
    setupReminders(user);

    renderHabits();
    renderDashboard();
    renderDailyTracker();
    renderStreakSection();
    renderHabitSuccessRates();
});